# PLANO — Campo de Observações sobre a Forma de Pagamento (Rematrícula e Aluno Novo)

## Objetivo
Incluir, no final do processo de Rematrícula e do processo de Aluno Novo, um campo de texto livre onde o operador possa registrar observações referentes à forma de pagamento escolhida pelos pais. Esse conteúdo deverá:
- Ser enviado ao backend (Supabase) junto com a finalização da matrícula.
- Ser exibido no PDF da proposta entregue aos pais.
- Ser introduzido de forma segura, gradual, e sem mudanças disruptivas na arquitetura atual (Supabase-first).

## Princípios e Diretrizes
- Supabase-first, reutilizando o padrão existente de `system_config`, RPCs e cache (memória e LocalStorage).
- Alterações backward-compatible (novos campos opcionais, sem quebrar RPCs existentes).
- Rollout controlado com feature flags independentes para Rematrícula e Aluno Novo.
- Execução SUPER SEGURA, DILIGENTE e INTELIGENTE, sem comprometer integridade atual.
- UI só exibe o novo campo quando a respectiva flag estiver habilitada.
- Sem dependências cruzadas entre os fluxos: cada fluxo terá sua própria feature flag e cronograma de rollout.

## Escopo
- Adição de um campo de observações de pagamento à finalização dos dois fluxos.
- Inclusão dessas observações no PDF de proposta, com layout apropriado e controle de overflow.
- Auditoria mínima (quem inseriu e quando), sem criar fricção.
- Sem outras mudanças funcionais no cálculo de descontos, CAP, ou regras de matrícula.

## Decisões de Arquitetura
- Armazenamento primário recomendado: coluna única e opcional em `enrollments` chamada `payment_notes` (tipo `text`) — simples, não-disruptivo, e aplicável aos dois fluxos.
- Auditoria leve: colunas opcionais `payment_notes_by` (uuid) e `payment_notes_at` (timestamptz) no mesmo registro de `enrollments`.
- Sanitização e limites: truncar em 1000 caracteres no servidor; remover/normalizar quebras de linha excessivas e espaços ao redor.
- Flags independentes:
  - `rematricula.payment_notes.enabled`
  - `novomatricula.payment_notes.enabled`
- RPCs:
  - Rematrícula: adicionar parâmetro opcional `payment_notes` ao `enroll_finalize` (ou RPC equivalente).
  - Aluno Novo: adicionar parâmetro opcional `payment_notes` ao RPC final de criação (`create_enrollment` / `new_enrollment_finalize`, conforme nomenclatura vigente).
- PDF: seção “Observações sobre a Forma de Pagamento”, exibida somente quando houver conteúdo.

Observação importante sobre independência: Embora o armazenamento seja em uma única coluna (`payment_notes`), os fluxos serão implantados com flags e mudanças de UI/RPC independentes e cronogramas separados. Caso seja necessário isolamento total até no schema, há um Plano B de tabela separada (ver Apêndice A).

---

# Plano por Fluxo (Independentes)

## A. Rematrícula

### F0 — Planejamento e Feature Flag
- Criar flag: `rematricula.payment_notes.enabled` (default: false).
- Expor no Admin `/admin/configuracoes` com toggle e documentação curta.
- Atualizar serviço de config existente (cache em memória/LS) para a nova chave, reaproveitando funções já implementadas para PAV e CAP.
- Critério de aceite F0:
  - Flag aparece no Admin
  - Leitura da flag no frontend com cache.

#### Progresso (DEV)
- Implementado em 18/09/2025 (DEV) sem mudanças disruptivas:
  - Serviço de configuração: `getRematriculaPaymentNotesConfig()` com cache em memória e LocalStorage (TTL 5 min), além de `invalidateRematriculaPaymentNotesConfigCache()` e `primeRematriculaPaymentNotesConfigCache()`.
  - Chaves utilizadas: `rematricula.payment_notes.enabled` (servidor) e `cfg.rematricula_payment_notes.v1` (LocalStorage).
  - Admin: adicionado card "Rematrícula — Observações sobre a Forma de Pagamento" em `src/pages/admin/SystemConfigurations.tsx` com toggle e botão "Salvar alterações".
  - Salvamento idempotente com fallback de categorias nas criações (padrão existente), leitura pública via `usePublicSystemConfig` e invalidação de cache após salvar.
  - Dark Launch: toggle desligado por padrão; nenhuma mudança na UI de Rematrícula até ser ativado.

### F1 — Migração de Banco (Supabase)
- Adicionar colunas em `enrollments`:
  - `payment_notes text` (nullable).
  - `payment_notes_by uuid` (nullable, FK implícita a `auth.users` se aplicável).
  - `payment_notes_at timestamptz` (nullable).
- Check constraints:
  - `char_length(payment_notes) <= 1000` (garantir não-disruptivo).
- RLS: manter políticas existentes; inserção/atualização desses campos segue as mesmas permissões de finalização de matrícula (operadores/funcionários).
- Critério de aceite F1:
  - Migração aplicada em DEV.
  - Queries de leitura/escrita manuais validam limites e nulabilidade.

#### Progresso (DEV)
- 2025-09-18: Criada migração `supabase/migrations/042_add_payment_notes_to_enrollments.sql` que:
  - Adiciona colunas opcionais `payment_notes`, `payment_notes_by`, `payment_notes_at` em `public.enrollments` com `ADD COLUMN IF NOT EXISTS`.
  - Cria `CHECK (payment_notes IS NULL OR char_length(payment_notes) <= 1000)` com guarda para não duplicar a constraint.
  - Não altera RLS nem grants existentes (não-disruptivo).
  - Adiciona comentários descritivos nas colunas.
- Criado script de verificação: `supabase/tests/rematricula_payment_notes_fase1_verify.sql`.
- Aplicação recomendada em DEV:
  - Supabase Dashboard (SQL Editor) colando o conteúdo do arquivo, OU
  - Supabase CLI conforme `supabase/apply_migrations.md`.

### F2 — RPC de Finalização (Servidor)
- Atualizar `enroll_finalize(payload json)` para aceitar opcional `payment_notes`:
  - Sanitizar no servidor:
    - Trim.
    - Substring para 1000 chars.
    - Normalizar quebras de linha (p.ex. limitar a duplas consecutivas).
  - Persistir em `enrollments.payment_notes`.
  - Preencher `payment_notes_by = auth.uid()` e `payment_notes_at = now()` quando `payment_notes` não for nulo nem vazio.
- Backward-compatibility:
  - Se `payment_notes` ausente, comportamento atual permanece intacto.
- Critério de aceite F2:
  - Chamada RPC sem `payment_notes` funciona como hoje.
  - Chamada RPC com `payment_notes` persiste corretamente (verificável via SQL).

### F3 — UI (Rematrícula)
- Local: etapa final da `RematriculaDetailsPage.tsx` (ou página equivalente de finalização).
- Elementos:
  - Textarea “Observações sobre a forma de pagamento (será exibido na Proposta - PDF)”.
  - Contador de caracteres (0/1000).
  - Placeholder objetivo, sem instruções internas/sigilosas.
  - Texto de ajuda: “Conteúdo exibido no PDF da proposta. Evite dados sensíveis.”
  - Armazenamento temporário no estado local e no store do fluxo (draft), conforme padrão dos cards e edições locais.
- Gating:
  - Campo só aparece se `rematricula.payment_notes.enabled === true`.
- Validações:
  - Nenhuma obrigatoriedade (opcional).
  - Truncar no frontend para 1000 chars (UX amistosa).
- Critério de aceite F3:
  - Campo aparece apenas com flag ligada em DEV.
  - Conteúdo do campo percorre o fluxo até o payload da finalização.

#### Progresso (DEV)
- 2025-09-18: Implementado campo de Observações na etapa de confirmação (Modal de Finalização):
  - `src/features/rematricula-v2/components/RematriculaFinalizeModal.tsx`: adicionados `Textarea` + `Label`, com `maxLength=1000`, contador e help text. Controle via props `paymentNotesEnabled`/`paymentNotes`/`onChangePaymentNotes`.
  - `src/features/rematricula-v2/pages/RematriculaDetailsPage.tsx`: leitura da flag via `getRematriculaPaymentNotesConfig()`, estado local `paymentNotes`, passagem de props ao modal e envio para o serviço de submissão quando habilitado.
  - `src/features/rematricula-v2/services/rematriculaSubmissionService.ts`: inclusão opcional de `payment_notes` no payload (`p_enrollment`) quando a flag estiver ativa e houver conteúdo, com sanitização leve no cliente (normalização de quebras, colapso 3+ em 2, `slice(0, 1000)`).
  - Gating garantido: UI e envio só ocorrem se a flag estiver ativa.

### F4 — PDF (Proposta)
- Local: builder de PDF já utilizado no fluxo (ex.: `lib/pdfBuilder.ts` ou equivalente).
- Seção nova:
  - Título: “Observações sobre a Forma de Pagamento”
  - Conteúdo: texto multiline, tipografia legível, espaçamento adequado.
  - Ocultado se vazio/nulo.
- Layout:
  - Quebras de página seguras (evitar cortar no meio).
  - Testar textos longos com 3–5 linhas.
- Critério de aceite F4:
  - PDF exibindo seção somente quando houver conteúdo.
  - Sem regressões no layout existente.

### F5 — QA e Segurança
- Testes manuais:
  - Flag off: nada muda.
  - Flag on: preencher, editar, limpar; gerar PDF; conferir persistência.
- Sanitização:
  - Verificar que HTML/markup não quebra PDF (render como texto plano).
- Privacidade:
  - Confirmar com o time: conteúdo é para o PDF dos pais (não conteúdo interno sigiloso).
- Critério de aceite F5:
  - Cenários acima validados em DEV.

### F6 — Rollout
- DEV: ativar flag e validar fluxo completo.
- STG: ativar flag, treinamento e validação com dados de teste.
- PROD: ativar flag com janela de monitoramento.
- Critério de aceite F6:
  - Nenhum erro no RPC/DB.
  - Métrica de uso (quantidade de matrículas com `payment_notes` > 0) coletada via SQL simples.

### F7 — Rollback
- Desativar flag no `system_config` para ocultar a UI e parar gravações.
- Coluna permanece no schema (não disruptivo); dados mantidos.
- Se necessário, remover conteúdo via `UPDATE enrollments SET payment_notes = NULL WHERE ...` (somente se exigido por conformidade).
- Critério de aceite F7:
  - Sistema volta ao estado anterior com 1 toggle.

---

## B. Aluno Novo

Obs.: Mesma lógica e padrões da Rematrícula, mas com flags, RPC e telas específicas do fluxo de Aluno Novo. Nenhuma dependência no rollout da Rematrícula.

### F0 — Planejamento e Feature Flag
- Flag: `novomatricula.payment_notes.enabled` (default: false).
- Admin `/admin/configuracoes` com toggle e descrição.
- Critério de aceite F0:
  - Flag disponível e lida pelo frontend (DEV).

#### Progresso (DEV)
- 2025-09-18: Implementado F0 (Aluno Novo) sem mudanças disruptivas:
  - Serviço de configuração: adicionadas `getNovomatriculaPaymentNotesConfig()`, `invalidateNovomatriculaPaymentNotesConfigCache()` e `primeNovomatriculaPaymentNotesConfigCache()` em `src/lib/config/config.service.ts`, com cache em memória e LocalStorage (`cfg.novomatricula_payment_notes.v1`, TTL 5 min). Chave de servidor: `novomatricula.payment_notes.enabled`.
  - Admin: adicionado card "Aluno Novo — Observações sobre a Forma de Pagamento" em `src/pages/admin/SystemConfigurations.tsx` com toggle e ação de salvar, seguindo o mesmo padrão da Rematrícula.
  - Migração seed: criada `supabase/migrations/045_seed_novomatricula_payment_notes_flag.sql` (idempotente; insere default 'false' apenas quando ausente; categoria segura `geral`).
  - Verificação: adicionado `supabase/tests/novomatricula_payment_notes_flag_verify.sql` para checagem rápida da chave e valor.

### F1 — Migração de Banco (Supabase)
- Reutiliza as mesmas colunas de `enrollments` (já criadas em F1-Rematrícula). Nenhuma migração adicional requerida.
- Critério de aceite F1:
  - Verificar que `enrollments` já possui os campos.

### F2 — RPC de Finalização (Servidor)
- Atualizar RPC de finalização de Aluno Novo (ex.: `create_enrollment(payload json)` ou `new_enrollment_finalize`) para aceitar opcional `payment_notes`.
- Mesma sanitização e persistência:
  - `payment_notes`, `payment_notes_by = auth.uid()`, `payment_notes_at = now()`.

#### Progresso (DEV)
- 2025-09-18: Nada a alterar de RPC adicional — o fluxo de Aluno Novo utiliza a mesma RPC `public.enroll_finalize` já atualizada na migração `043_update_enroll_finalize_rpc_payment_notes.sql` para ler `payment_notes` do payload, sanitizar (CRLF→LF, trim, colapso 3+ LFs em duplas, `substring(.., 1000)`) e persistir em `enrollments.payment_notes*` quando presentes.
- Adicionado teste de verificação: `supabase/tests/novomatricula_payment_notes_fase2_verify.sql` (gera matrícula via RPC com `payment_notes` longas e valida truncamento e normalização).
- Backward-compatibility garantida.
- Critério de aceite F2:
  - Chamadas com/sem `payment_notes` funcionam.

### F3 — UI (Aluno Novo)
- Local: etapa final de confirmação/assinatura do fluxo de Aluno Novo.
- Elementos:
  - Textarea com o mesmo rótulo e comportamento.
  - Contador (0/1000), truncamento no frontend, help text.
- Gating:
  - Só aparece com `novomatricula.payment_notes.enabled === true`.
- Critério de aceite F3:
  - Campo aparece no fluxo de Aluno Novo com a flag ligada.

#### Progresso (DEV)
- 2025-09-18: Implementado campo de Observações na etapa de resumo (`SummaryStep.tsx`).
  - Gating por flag via `getNovomatriculaPaymentNotesConfig()` com TanStack Query.
  - UI elegante: Card com `Label`, `Textarea`, ajuda e contador 0/1000, posicionado antes das ações finais.
  - Sanitização leve no cliente (CRLF→LF, trim, colapso de 3+ LFs, corte em 1000). Fonte da verdade: sanitização no servidor (RPC 043).
  - Envio no payload da `enroll_finalize` quando a flag estiver ON; fallback seguro atualiza o registro após `createEnrollmentRecord` se necessário.

### F4 — PDF (Proposta)
- Reutilização da mesma seção “Observações sobre a Forma de Pagamento”.
- Geração condicional somente quando houver conteúdo.
- Critério de aceite F4:
  - PDF ok, sem regressões no layout.

#### Progresso (DEV)
- 2025-09-18: Adicionada seção condicional "Observações sobre a Forma de Pagamento" no PDF compacto (`pdfTemplatesCompact.ts`), chamada como seção F.
  - Renderização apenas quando há conteúdo (após sanitização). Limite conservador de ~8 linhas/600 caracteres para garantir 1 página.
  - `proposalGeneratorCompact.ts` passa `paymentNotes` sanitizadas para o template.
  - `SummaryStep.tsx` injeta `paymentNotes` no `ProposalData` tanto no preview quanto no download.
- Flag habilitada por padrão: criada `supabase/migrations/046_enable_novomatricula_payment_notes_flag.sql` (idempotente) para ligar a flag em DEV/STG/PROD.

### F5 — QA e Segurança
- Mesmos cenários testados do fluxo de Rematrícula, agora no contexto de Aluno Novo.
- Critério de aceite F5:
  - Fluxo íntegro em DEV.

### F6 — Rollout
- DEV → STG → PROD independentes do rollout da Rematrícula.
- Critério de aceite F6:
  - Zero regressões e erros de RPC/DB.

### F7 — Rollback
- Desativar `novomatricula.payment_notes.enabled`.
- Mesma estratégia de rollback da Rematrícula.
- Critério de aceite F7:
  - UI oculta com um toggle; sistema íntegro.

---

## Considerações de Segurança, Privacidade e UX
- O texto será exibido no PDF destinado aos pais. Orientar os operadores no help text a evitar informações internas/sigilosas.
- Sanitização no servidor (texto plano). Remover ou escapar caracteres de controle não imprimíveis.
- Limite de 1000 caracteres; contador no frontend; truncamento no servidor (fonte da verdade).
- Acesso e escrita obedecem RLS e permissões já vigentes para finalização de matrículas.
- Auditabilidade leve: `payment_notes_by` e `payment_notes_at`.

## Critérios de Aceite (Resumo)
- Flags independentes por fluxo.
- UI aparece apenas com flags ativas.
- RPCs aceitam `payment_notes` opcional sem quebrar integrações atuais.
- Dados persistidos e exibidos no PDF quando presentes.
- Rollback simples via desativação de flags.
- Nenhuma regressão nas regras de descontos, CAP e validações existentes.

## Cronograma Sugerido
- Semana 1:
  - Rematrícula F0–F2 (flag, migração, RPC).
- Semana 2:
  - Rematrícula F3–F4 (UI e PDF), QA e rollout DEV.
- Semana 3: 
  - Rematrícula rollout STG→PROD.
- Semana 4:
  - Aluno Novo F0–F7 (mesmas etapas), com rollout independente.

---

## Apêndice A — Alternativa de Schema para Isolamento Máximo
Se for exigido isolamento total até no schema (cada fluxo sem compartilhar coluna):
- Criar tabela `enrollment_payment_notes`:
  - `id bigint PK`
  - `enrollment_id bigint FK -> enrollments(id)`
  - `flow_type text check(flow_type in ('rematricula','novo'))`
  - `notes text check(char_length(notes)<=1000)`
  - `notes_by uuid`
  - `notes_at timestamptz default now()`
- Os RPCs de cada fluxo inserem/atualizam apenas seus próprios registros.
- PDF leria a nota mais recente conforme o `flow_type`.
- Trade-off: maior complexidade sem ganho claro para o caso atual, portanto recomendado somente se a exigência de isolamento extremo for mandatória.
