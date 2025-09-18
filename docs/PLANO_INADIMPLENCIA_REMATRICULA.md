# Plano de Inadimplência na Rematrícula (Supabase-first, seguro e não disruptivo)

Este documento define um plano em fases para implementar a checagem e o bloqueio por inadimplência exclusivamente no fluxo de Rematrícula, com ingestão de uma base CSV para a tabela `inadimplentes`, bloqueio de UI ("Iniciar" desabilitado e aviso "Verificar situação com a Tesouraria") e um painel administrativo `/admin/inadimplentes` para gestão (CRUD com soft delete). O plano prioriza segurança, rollout controlado, compatibilidade com a arquitetura atual (Supabase-first, frontend React usando Supabase Client) e ausência de mudanças disruptivas.


## 0) Objetivo, Escopo e Princípios

- Objetivo: impedir a continuidade da Rematrícula para alunos inadimplentes, com UX clara e orientação ao responsável.
- Escopo: somente fluxo de Rematrícula (Home da Rematrícula, Detalhe e Finalização). Não afeta matrícula nova, financeiro ou demais áreas.
- Princípios
  - Segurança e não-disrupção: feature flag, checks idempotentes no servidor e RLS rigorosa.
  - Supabase-first: regras e checagens no banco via RPC/SQL, frontend como orquestrador.
  - Performance e parcimônia: índices, normalização de nomes e caches de leitura no FE.
  - Auditoria e reversibilidade: soft delete com auditoria, rollback simples, publicação progressiva (DEV → STG → PROD).


## 1) Modelo de Dados (Tabela e Colunas)

Nova tabela: `public.inadimplentes` (com RLS)

- id (uuid, pk, default gen_random_uuid())
- created_at (timestamptz, default now())
- updated_at (timestamptz, default now())
- created_by (uuid, ref auth.users, null/opt)
- updated_by (uuid, ref auth.users, null/opt)
- is_active (boolean, default true) — soft delete lógico
- deleted_at (timestamptz, null)
- deleted_by (uuid, ref auth.users, null)
- deleted_reason (text, null)
- source (text, null) — origem do registro (ex.: "csv-2025-09-15")
- codigo_inadim (text) — da planilha
- student_name (text) — da planilha
- guardian1_name (text, null) — da planilha
- student_escola (text, null) — da planilha (ex.: "pelicano")
- meses_inadim (int, null) — da planilha
- student_name_norm (text, generated/maintida por trigger com `norm_text(student_name)`)
- guardian1_name_norm (text, generated/trigger `norm_text(guardian1_name)`) — opcional

Índices recomendados:
- idx_inadimplentes_active_name_norm: (student_name_norm) WHERE is_active
- idx_inadimplentes_active_guardian_norm: (guardian1_name_norm) WHERE is_active (opcional)
- idx_inadimplentes_active_school: (student_escola) WHERE is_active
- idx_inadimplentes_updated_at: (updated_at DESC)

Regras de unicidade (parciais) para evitar duplicidade ativa:
- unique_inadimplentes_active_name_guardian_school ON (student_name_norm, coalesce(guardian1_name_norm,''), coalesce(student_escola,'')) WHERE is_active

Observação sobre normalização: reutilizar `norm_text` já utilizada no projeto para classificação por nome (tag_matricula), garantindo comparações case/diacríticos-insensitive.

Tabela de auditoria (leve): `public.inadimplentes_audit`
- id, created_at
- inadimplente_id
- action (enum text: insert|update|soft_delete|restore|import)
- snapshot (jsonb) — antes/depois conforme ação
- actor (uuid)

Tabela de staging (ingestão): `public.staging_inadimplentes_raw`
- id (uuid), created_at, uploaded_by
- csv_row jsonb — linha bruta
- batch_id uuid — agrupa um upload
- processed boolean default false, error text null


## 2) RLS e Papéis

- `public.inadimplentes`: 
  - SELECT: restrito a perfis administrativos (ex.: role `admin` ou `finance`) via claim `role` no JWT.
  - INSERT/UPDATE/DELETE: apenas admin/finance.
  - O frontend da Rematrícula NÃO LÊ diretamente a tabela; utilizará RPC de checagem (SECURITY DEFINER) que retorna somente o necessário.
- `public.inadimplentes_audit`: SELECT somente admin/finance.
- `public.staging_inadimplentes_raw`: admin/finance.


## 3) RPCs (SQL) e Contratos

- `check_inadimplencia(student_name text, guardian_name text default null, user_school text default null)` → returns record
  - Saída: `{ is_inadimplente boolean, meses_inadim int, codigo_inadim text }`
  - Estratégia de match (configurável):
    - Por default: `student_name_norm` igual; se `guardian_name` informado e `rematricula.inadimplencia.match.require_guardian=true`, exigir match também por `guardian1_name_norm`.
    - Se `user_school` informado e `rematricula.inadimplencia.match.require_same_school=true`, filtrar por `student_escola = user_school`.
  - SECURITY DEFINER + RLS BYPASS, mas retorna apenas dados mínimos.

- `upsert_inadimplente(payload jsonb)` (admin)
  - Valida e normaliza; aplica dedupe ativo (conflito na unique parcial) com UPDATE.

- `soft_delete_inadimplente(id uuid, reason text)` (admin)
  - Seta `is_active=false`, `deleted_at`, `deleted_by`, `deleted_reason` + auditoria.

- `restore_inadimplente(id uuid)` (admin)
  - Seta `is_active=true`, limpa campos de delete; valida unicidade ativa.

- `ingest_inadimplentes_from_staging(batch_id uuid)` (admin)
  - Varre staging, normaliza, upsert em `inadimplentes`, marca `processed`, audita, produz relatório (quantos inseridos/atualizados/erros).

- Opcional: `get_inadimplentes(page, limit, filters)` (admin) com paginação/ordenção para o painel.


## 4) System Config (feature flags e parâmetros)

- `rematricula.inadimplencia.enabled` (boolean, default false)
- `rematricula.inadimplencia.enforcement.server_enabled` (boolean, default false) — reforço de bloqueio no servidor em `enroll_finalize`
- `rematricula.inadimplencia.ui.banner_message` (text, default "Verificar situação com a Tesouraria")
- `rematricula.inadimplencia.match.require_guardian` (boolean, default false)
- `rematricula.inadimplencia.match.require_same_school` (boolean, default false)
- `rematricula.inadimplencia.cache_ttl_ms` (int, default 300000) — cache FE
- Observação: edição no Painel Administrativo de Configs já existente; cache no FE via `config.service.ts` seguindo padrão atual do projeto.
- Observação 2: duas camadas de flags — UI controlada por `enabled`; bloqueio server-side somente quando `enforcement.server_enabled=true`.


## 5) Experiência de Usuário (Rematrícula)

- Home Rematrícula (busca por aluno/responsável)
  - Ao selecionar um aluno para visualizar/acionar o botão "Iniciar":
    - Se `rematricula.inadimplencia.enabled=false`: fluxo atual (sem checagem).
    - Se `enabled=true`: chamar RPC `check_inadimplencia` com `{student_name, guardian_name?, user_school?}`.
      - Se `is_inadimplente=true`: 
        - Exibir aviso no card/linha: "Verificar situação com a Tesouraria".
        - Desabilitar o botão Ação "Iniciar" (tooltip explicativo).
      - Caso contrário: habilitado normalmente.
  - Otimização: cache in-memory/LocalStorage do resultado por `student_name_norm` com TTL (para não reconsultar a cada foco/click).

- Detalhe da Rematrícula `/rematricula/detalhe/:student_name_slug`
  - Revalidar com `check_inadimplencia` ao montar a página (evitar burlar pelo deep-link).
  - Se inadimplente: banner bloqueante no topo e bloquear quaisquer ações (incl. continuar/editar). Navegação de volta segura.

- Finalização (RPC `enroll_finalize`)
  - Reforço server-side: se `enabled=true` e RPC `check_inadimplencia` retornar inadimplente, abortar com erro de domínio (`INADIMPLENCIA_BLOQUEADA`).
  - Mensagem de erro tratada pelo FE reafirma o banner: "Verificar situação com a Tesouraria".


## 6) Painel Administrativo `/admin/inadimplentes`

- Lista paginada, filtros por `is_active`, `student_escola`, busca por nome.
- Ações:
  - Criar novo (form): campos da tabela, validações básicas.
  - Soft delete (com motivo) e Restore.
  - Importar CSV: upload → staging → `ingest_inadimplentes_from_staging(batch_id)` → relatório de ingestão.
- Colunas principais: codigo_inadim, student_name, guardian1_name, student_escola, meses_inadim, is_active, updated_at, updated_by.
- Auditoria: link para ver histórico (de `inadimplentes_audit`).


## 7) Pipeline de Ingestão CSV (Seguro e Idempotente)

- Formato esperado (colunas conforme planilha):
  - `codigo_inadim`, `student_name`, `guardian1_name`, `student_escola`, `meses_inadim`
- Fluxo:
  1. Upload do CSV via Painel (apenas admin/finance) — guardar metadados (arquivo, autor, data) em tabela de staging e Storage opcional.
  2. Pré-validações: cabeçalhos, tipos, linhas vazias, trims, normalização prévia opcional.
  3. Inserção linha-a-linha em `staging_inadimplentes_raw` (batch_id comum).
  4. Execução de `ingest_inadimplentes_from_staging(batch_id)`:
     - Normaliza nomes (norm_text) e prepara payload.
     - Aplica UPSERT idempotente (chave única parcial por nome/guardian/escola ativa).
     - Coleta estatísticas (novos, atualizados, erros) e grava em audit.
  5. Relatório para o usuário (download CSV/JSON de erros e resumo).


## 8) Testes e Qualidade (DEV/CI)

- SQL (pgTAP) / testes de função:
  - `check_inadimplencia` cobrindo: match exato normalizado, diferença de acentos/caixa, com/sem responsável, escolas distintas, múltiplas colunas nulas.
  - RLS: garante que usuários não-admin não fazem SELECT direto na tabela.
  - UPSERT e soft delete: unicidade ativa e restauração.
- Frontend:
  - Testes de integração do fluxo: 
    - card com bloqueio e tooltip; 
    - detalhe com banner bloqueante; 
    - finalização bloqueada.
- Performance:
  - Bench simples para checagem em massa (10–50 alunos) com cache FE ligado, confirmando latência baixa.


## 9) Observabilidade e Métricas

- Funções de apoio:
  - `get_inadimplentes_stats()` — total ativos por escola, por meses_inadim faixas.
  - `get_recent_inadimplentes_changes(limit)` — últimas alterações (admin).
- Logs de erros de ingestão e auditoria de ações criticas (soft delete/restore/import).


## 10) Rollout e Segurança Operacional

- Faseamento: DEV → STG → PROD.
- Flags: publicar primeiro com `rematricula.inadimplencia.enabled=false`.
- População inicial via CSV em STG, conferência amostral com times Financeiro e Tesouraria.
- Ativação gradativa em PROD: 
  - Dia 1: enabled=true mas sem bloqueio server-side (somente UI) — monitorar métricas e falhas.
  - Dia 2: habilitar reforço em `enroll_finalize` (server-side), após validação.
- Comunicação aos times (script de mensagens e expectativas de UX).


## 11) Plano de Rollback

- Desativar `rematricula.inadimplencia.enabled`.
- Remover bloqueio server-side temporariamente (guardado por flag condicional já prevista).
- Em caso de dado incorreto: realizar soft delete/ajuste e reprocessar ingestão.
- Nenhuma migração destrutiva: manter tabela e RLS; dados ficam preservados.


## 12) Riscos e Mitigações

- Homônimos (mesmo nome de aluno):
  - Mitigar com `guardian1_name` e/ou `student_escola` via flags de match.
  - Monitorar falsos positivos/negativos e ajustar estratégia de match.
- Qualidade do CSV: 
  - Validações fortes em staging + relatório de inconsistências.
- Performance: 
  - Índices por `student_name_norm` e cache no FE.
- Privacidade: 
  - Sem CPF; RLS impede exposição dos dados completos; RPC retorna somente booleano e campos mínimos.


## 13) Backlog Futuro (opcional)

- Enriquecer match usando `student_slug`/`selection_token` se disponível no fluxo, sem expor identificadores sensíveis.
- Dashboard com tendência de inadimplência (por escola, por período).


## 14) Fases de Execução (Checklist)

- F0. Planejamento e Flags
  - Definir chaves em `system_config` e defaults (disabled), critérios de aceite, riscos e validações, sem nenhuma mudança funcional ativa no sistema:
    - Chaves em `system_config` (todas com default seguro):
      - `rematricula.inadimplencia.enabled`: false
      - `rematricula.inadimplencia.enforcement.server_enabled`: false
      - `rematricula.inadimplencia.ui.banner_message`: "Verificar situação com a Tesouraria"
      - `rematricula.inadimplencia.match.require_guardian`: false
      - `rematricula.inadimplencia.match.require_same_school`: false
      - `rematricula.inadimplencia.cache_ttl_ms`: 300000
    - Critérios de aceite da F0:
      - Documento de chaves e defaults aprovado e versionado neste plano.
      - Nomes com prefixo `rematricula.inadimplencia.` sem conflito com chaves existentes.
      - Bloqueios permanecem desligados até F5/F8 (UI e servidor).
    - Garantias de não-disrupção:
      - Defaults preservam o comportamento atual (nenhum bloqueio/checagem ativa).
      - Duas camadas de proteção: `enabled=false` e `enforcement.server_enabled=false`.
      - Nenhuma migração, RPC nova ou alteração de UI nesta fase.
    - Riscos e mitigação:
      - Colisão de nomes: mitigada por namespace dedicado.
      - Ativação acidental: mitigada por dupla flag e revisão obrigatória do plano antes de F5/F8.
    - Validações planejadas (sem execução de código nesta fase):
      - Revisão com Produto/Financeiro do texto de banner e critérios de match.
      - Preparar cadastro das chaves no Admin Configs em F6, mantendo-as ocultas/disabled até o rollout.
- F1. Migrações de Banco
  - Criar tabelas `inadimplentes`, `inadimplentes_audit`, `staging_inadimplentes_raw` + índices e triggers de normalização/updated_at.
  - Status: CONCLUÍDO nesta fase (sem execução no banco ainda; somente migração criada).
    - Arquivo: `supabase/migrations/037_create_inadimplentes_tables.sql`
    - Conteúdo principal:
      - Tabela `public.inadimplentes` com colunas de controle, soft delete (`is_active`, `deleted_*`), metadados, dados da planilha e colunas normalizadas `student_name_norm` e `guardian1_name_norm` (GENERATED via `public.norm_text`).
      - Índices parciais: `idx_inadimplentes_active_name_norm`, `idx_inadimplentes_active_guardian_norm`, `idx_inadimplentes_active_school` e `idx_inadimplentes_updated_at`.
      - Unicidade ativa parcial: `uq_inadimplentes_active_name_guardian_school` para dedupe quando `is_active=true`.
      - Trigger de `updated_at` reutilizando `public.update_updated_at_column()` (função já existente nas migrações anteriores).
      - Tabela `public.inadimplentes_audit` (leve) com índices por `created_at`, `action` e `inadimplente_id`.
      - Tabela `public.staging_inadimplentes_raw` para ingestão CSV (batch, processed, error) com índices auxiliares.
    - Salvaguardas F1:
      - Sem RLS ou policies (ficará para F2); nenhuma grant alterada.
      - Sem FKs externas (ex.: `auth.users`) para evitar acoplamento; campos `*_by` são UUID livres.
      - Idempotência: `IF NOT EXISTS` em índices e criação condicional de trigger.
      - Não há alteração de tabelas existentes do sistema, evitando impacto no fluxo atual.
- F2. RLS e Policies
  - Restringir acesso e permitir apenas RPC para FE.
  - Status: CONCLUÍDO nesta fase (criada migração; sem execução no banco ainda).
    - Arquivo: `supabase/migrations/038_rls_policies_inadimplentes.sql`
    - Modelo de acesso:
      - `inadimplentes`:
        - SELECT: somente admins (`public.is_admin_user()`).
        - INSERT/UPDATE: coordenadores e super_admin (`public.can_approve()` ou `public.is_super_admin()`).
        - DELETE: apenas super_admin (não recomendado; uso padrão é soft delete).
        - GRANTs mínimos a `authenticated`, com RLS restringindo o acesso efetivo.
      - `inadimplentes_audit`:
        - SELECT: somente admins. Gravação prevista via `service_role`/RPC.
      - `staging_inadimplentes_raw`:
        - SELECT/INSERT/UPDATE/DELETE: somente admins (para importação CSV e correções).
      - `service_role`: mantém ALL em todas as tabelas para rotinas internas e RPCs com bypass de RLS.
    - Salvaguardas F2:
      - O frontend da Rematrícula não lê tabelas diretamente; checagem será via RPC SECURITY DEFINER (F3).
      - Nenhum dado sensível exposto; políticas estritas impedem acesso por usuários não-admin.
      - Nenhuma alteração de políticas existentes de outros módulos.
- F3. RPCs
  - `check_inadimplencia`, `upsert_inadimplente`, `soft_delete_inadimplente`, `restore_inadimplente`, `ingest_inadimplentes_from_staging`, helpers de stats.
  - Status: CONCLUÍDO nesta fase (criada migração; sem execução no banco ainda).
    - Arquivo: `supabase/migrations/039_inadimplentes_rpcs.sql`
    - RPCs criadas:
      - `check_inadimplencia(student_name, guardian_name?, user_school?)` [SECURITY DEFINER, STABLE]:
        - Respeita flag `rematricula.inadimplencia.enabled` (se off, sempre retorna falso).
        - Match por `student_name_norm` com controles via flags: `match.require_guardian`, `match.require_same_school`.
        - Retorna somente `{is_inadimplente:boolean, meses_inadim:int, codigo_inadim:text}`.
        - Grant de EXECUTE para `anon, authenticated` (RLS bypass controlado pela função).
      - `upsert_inadimplente(payload jsonb)` [SECURITY DEFINER]: upsert idempotente por nome/guardião/escola normalizados, audita insert/update.
      - `soft_delete_inadimplente(id, reason)` [SECURITY DEFINER]: marca `is_active=false` e audita `soft_delete`.
      - `restore_inadimplente(id)` [SECURITY DEFINER]: restaura se não houver colisão ativa (respeita UNIQUE parcial), audita `restore`.
      - `ingest_inadimplentes_from_staging(batch_id)` [SECURITY DEFINER]: processa staging linha a linha, chama `upsert`, marca `processed`, contabiliza inseridos/atualizados/erros.
      - `get_inadimplentes_stats()` [SECURITY DEFINER]: resumo por escola dos ativos.
    - Salvaguardas F3:
      - Funções admin exigem `_ensure_admin()` (que usa `is_admin_user()`).
      - `check_inadimplencia` retorna dados mínimos e respeita flags; sem PII sensível.
      - Nenhuma alteração de contratos existentes; apenas novas funções isoladas.
- F4. Painel Administrativo
  - UI `/admin/inadimplentes` com CRUD, import CSV e auditoria.
  - Status: CONCLUÍDO (frontend implementado; sem deploy/execução ainda).
    - Página: `src/pages/admin/InadimplentesManagement.tsx`
    - Hooks: `src/features/admin/hooks/useInadimplentes.ts` (queries, mutations e ingestão)
    - Rotas: adicionada em `src/App.tsx` sob `AdminLayout` com `requiredRole="coordenador"`.
    - Menu: entrada adicionada em `AdminLayout` (link "Inadimplentes").
    - Capacidades:
      - Listagem com filtros (status ativo/inativo/todos, escola, busca por nome).
      - Estatísticas por escola via RPC `get_inadimplentes_stats`.
      - Criar/Editar via RPC `upsert_inadimplente` (auditoria aplicada no servidor).
      - Desativar (soft delete) via RPC `soft_delete_inadimplente` e Restaurar via RPC `restore_inadimplente`.
      - Importação CSV: upload → staging (`staging_inadimplentes_raw`) → RPC `ingest_inadimplentes_from_staging` (idempotente e com contagem de erros).
    - Salvaguardas F4:
      - UI expõe ações somente para `permissions.canApprove` (coordenador/super_admin), alinhado às RLS (F2).
      - Sem acesso direto do frontend público; tudo dentro do espaço /admin e com `AdminRoute`.
      - Sem alteração de contratos existentes; componentes e estilos padrão do projeto.
- F5. Integração no Fluxo de Rematrícula
  - Home (desabilitar "Iniciar" + mensagem), Detalhe (banner), Finalização (reforço server-side).
  - Status: CONCLUÍDO (guardado por flags do servidor na RPC; sem impacto quando desligado).
    - Hook: `src/features/rematricula-v2/hooks/useInadimplencia.ts`
    - Home/Busca: `src/features/rematricula-v2/pages/RematriculaBuscaPage.tsx`
      - Antes de navegar para detalhes, chama `check_inadimplencia` (via helper `checkInadimplenciaOnce`) e bloqueia "Iniciar" com toast quando inadimplente.
      - Não-disruptivo: se a flag `rematricula.inadimplencia.enabled` estiver off, o RPC retorna falso e nada muda.
    - Detalhes: `src/features/rematricula-v2/pages/RematriculaDetailsPage.tsx`
      - Mostra banner de alerta no topo quando inadimplente e desabilita o botão "Finalizar Rematrícula" (tooltip com motivo).
      - Checagem feita via `useCheckInadimplencia`, retornando apenas booleano/metadata mínima.
    - Reforço server-side:
      - Migração: `supabase/migrations/040_enroll_finalize_inadimplencia_guard.sql` (usa `check_inadimplencia` dentro da RPC `enroll_finalize`).
      - Totalmente controlado por flag (`rematricula.inadimplencia.enabled`), mantendo comportamento atual quando desligado.
    - Salvaguardas F5:
      - Nenhum acesso direto às tabelas; apenas RPC SECURITY DEFINER.
      - Sem PII sensível retornada pela checagem; apenas sinalização e metadados mínimos.
      - Integração 100% controlada por flags em `system_config` (se off, comportamento atual é preservado).
- F6. Cache e Config FE
  - Serviço de config com cache e cache de checagem de inadimplência por nome normalizado.
- F7. Testes e QA
  - pgTAP + testes FE; checklist manual com casos de homônimo/acentuação.
- F8. Rollout
  - DEV → STG → PROD com monitoramento e ativação gradual do enforcement no servidor.
- F9. Observabilidade
  - Métricas e relatórios operacionais para Financeiro/Tesouraria.


## 15) Especificação da UI (alto nível)

- Home Rematrícula
  - Badge "Inadimplente" no card/linha, tooltip com `banner_message`.
  - Botão "Iniciar" desabilitado quando inadimplente.
- Detalhe Rematrícula
  - Banner superior bloqueante com `banner_message`.
- Painel Administrativo
  - Tabela com filtros; botões: Novo, Importar CSV, Soft Delete/Restore.
  - Modal de Soft Delete com motivo obrigatório.
  - Relatório do último batch de import.


## 16) Anexos — Mapping de Campos CSV → Tabela

- codigo_inadim → codigo_inadim (text)
- student_name → student_name (text); também preenche student_name_norm via trigger
- guardian1_name → guardian1_name (text); também preenche guardian1_name_norm
- student_escola → student_escola (text)
- meses_inadim → meses_inadim (int)

Validações de ingestão: `student_name` obrigatório; `meses_inadim` numérico; trims; normalização de espaços; aceitar linhas sem `guardian1_name` ou `student_escola`.

---

Com este plano, a implementação permanece coerente com a arquitetura do projeto, minimiza riscos operacionais, protege dados sensíveis, e entrega a experiência solicitada de forma segura, diligente e controlada. 
