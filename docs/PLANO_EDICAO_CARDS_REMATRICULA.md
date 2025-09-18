# PLANO — Edição nos Cards da Rematrícula (Aluno, Responsáveis, Endereço)

Objetivo: permitir que, na página `RematriculaDetailsPage` (fluxo de Rematrícula), o usuário edite dados nos cards Aluno, Responsáveis e Endereço, com um botão "Editar" que abre um modal com UI elegante. As alterações devem refletir nas demais etapas: payload enviado ao Supabase (RPC `enroll_finalize`), geração do PDF e exibição em tela. O card Acadêmico permanece somente leitura. Os demais cards continuam exatamente como estão.

Pilares: execução super segura, diligente e inteligente; sem mudanças disruptivas na arquitetura Supabase-first; preservação da integridade do sistema; rollout gradual controlado por feature flags e cache.


## 1) Escopo e Diretrizes

- Cards afetados
  - Aluno: editar todos os campos exibidos do aluno (nome, CPF, nascimento, gênero). Observação: "Escola de destino" é derivada do usuário logado (`useMatriculaAuth`) e continua somente leitura; a "origem" pode ser exibida mas não editável.
  - Acadêmico: sem edição (somente leitura).
  - Responsáveis: editar dados completos do responsável 1 e opcionalmente do responsável 2.
  - Endereço: editar CEP, rua, número, complemento, bairro, cidade, UF.
- Sem alterações nos demais componentes e seções: `NextYearSelection`, `DiscountSelectionCard`, `FinancialBreakdownCard` e `FinancialSection` continuam exatamente como estão.
- Persistência: as edições são mantidas apenas no cliente (memória + LocalStorage) até a finalização; nada é gravado em Supabase antes disso.
- Propagação: na finalização e na geração de PDF on-demand/preview, os dados editados devem ser refletidos integralmente.
- Segurança: campos sensíveis (CPF) exigem validação adicional e confirmação; campos derivados (escola de destino) permanecem bloqueados.


## 2) Arquitetura de Dados e Fluxo

- Fonte de dados atual do detalhe
  - `src/features/rematricula-v2/services/rematriculaDetailsService.ts` lê de `previous_year_students` (preferencial) e faz fallback para `enrollments`.
  - Mapeamento para `RematriculaReadModel` em `rematriculaDetailsMapper.ts` e tipos em `types/details.ts`.
- Construção de payload e submissão
  - `RematriculaSubmissionService.buildPayload()` monta `p_enrollment` e `p_discounts`.
  - `RematriculaSubmissionService.finalizeRematricula()` chama `rpc('enroll_finalize')` (migr. 025/026) para gravação atômica.
- Geração de PDF
  - `services/pdf/rematriculaProposalGenerator.ts` gera o PDF a partir de `readModel`, série e descontos selecionados.
- Estratégia para edições
  - Introduzir um "Enrollment Draft" local com overrides por seção (aluno/guardians/endereço), versionado por um `draftKey` (ex.: `token.sid` quando existir, senão `cpfDigits`).
  - Criar um util/serviço para mesclar `readModel` + `draft` sem mutar os originais: `mergeDraft(base, overrides)`.
  - Exibir sempre o `mergedModel` na UI; e usar o `mergedModel` para `buildPayload` e para o PDF.


## 3) Feature Flags e Cache (system_config)

Adicionar chaves no `system_config` com leitura via `src/lib/config/config.service.ts` (mesmo cache in-memory/LS/TTL):
- `rematricula.edit.enabled` (global on/off)
- `rematricula.edit.student.enabled`
- `rematricula.edit.guardians.enabled`
- `rematricula.edit.address.enabled`
- (opcional) `rematricula.edit.telemetry.enabled`

UI administrativa: `src/pages/admin/SystemConfigurations.tsx` — adicionar um card simples para alternar os flags acima (padrão: disabled). Cache: 5 min com fallback seguro, seguindo padrões do serviço de config atual.


## 4) Estado: Enrollment Draft Store

- Arquivo proposto: `src/features/rematricula-v2/state/enrollmentDraft.ts`
- Estrutura
  - Tipo `RematriculaDraft = Partial<RematriculaReadModel>` focado em `student`, `guardians`, `address`.
  - `draftKey` por aluno (usar `sid` do `selection_token` quando presente; senão `cpfDigits`).
  - Armazenamento em memória e LocalStorage (`lsKey = rematricula.draft.<draftKey>.v1`), com TTL curto (ex.: 24h) e opção de limpar.
- API
  - `getDraft(draftKey): RematriculaDraft`
  - `saveDraft(draftKey, partialDraft): void`
  - `clearDraft(draftKey): void`
  - Helpers por seção: `saveStudent(draftKey, studentPartial)`, `saveGuardians(...)`, `saveAddress(...)`, `clearStudent(...)`, etc.
- Merge puro
  - `mergeDraft(base: RematriculaReadModel, draft: RematriculaDraft): RematriculaReadModel`
  - Regras: valores definidos no draft sobrescrevem o base; não definidos mantêm base.


## 5) Hook utilitário: useMergedEnrollmentData

- Arquivo proposto: `src/features/rematricula-v2/hooks/useMergedEnrollmentData.ts`
- API
  - Entrada: `{ readModel, draftKey }`
  - Retorna: `{ merged, draft, setStudent, setGuardians, setAddress, clearStudent, clearGuardians, clearAddress, clearAll }`
- Implementação
  - Lê/observa o draft; computa `merged` via `mergeDraft(base, draft)` com `useMemo`.
  - Expor actions que persistem no store e re-renderizam a page.


## 6) Modais de Edição (UI/UX)

- Componentes propostos
  - `EditAlunoModal.tsx`
  - `EditResponsaveisModal.tsx`
  - `EditEnderecoModal.tsx`
- Design
  - Usar componentes do design system existente (`Dialog`, `Input`, `Select`, `Form`, `Button`), mantendo padrão de UI.
  - Botões: `Cancelar` (fecha sem salvar), `Salvar alterações` (valida e persiste no draft store).
  - Feedback: exibir mensagens de validação inline; mostrar máscara/normalize para CPF, CEP, telefone.
  - Campos derivados/bloqueados: escola de destino (somente leitura, com tooltip explicativo); origem apenas informativa.
- Validações mínimas
  - Aluno: `name` obrigatório, `cpf` válido (11 dígitos), `birth_date` data real (YYYY-MM-DD), `gender` ∈ {M, F, other}.
  - Responsáveis: `guardian1` obrigatório com CPF válido; email formato básico; telefone com 10–11 dígitos.
  - Endereço: `cep` 8 dígitos; `street`, `number`, `district`, `city`, `state` obrigatórios; `state` 2 letras.
- Confirm actions
  - Ao alterar `CPF` do aluno, exigir confirmação adicional (modal de confirmação) e destacar que a busca de dados não será refeita automaticamente; a alteração impactará o protocolo e o PDF.


## 7) Integração com a Página `RematriculaDetailsPage`

- Local: `src/features/rematricula-v2/pages/RematriculaDetailsPage.tsx`
- Inicialização
  - Calcular `draftKey` a partir de `token` (sid) ou `cpfDigits`.
  - Invocar `useMergedEnrollmentData({ readModel: data, draftKey })` quando `data` estiver carregado.
- Exibição
  - Substituir `model` usado na renderização por `merged` para os cards Aluno, Responsáveis e Endereço.
  - Card Acadêmico continua usando `model.academic` sem edição.
- Botões Editar
  - Inserir botão `Editar` no header dos cards Aluno, Responsáveis, Endereço — condicionado a flags.
  - Ao clicar, abrir o modal correspondente com valores do `merged`.
  - Ao salvar, persistir no store e refletir imediatamente na UI; exibir um `badge` “Alterado” no título do card e um link “Restaurar original” (chama `clear<Section>()`).
- Geração de PDF On-demand
  - Em "Baixar Proposta", ao montar `proposalData`, usar `merged` no campo `readModel`.
- Finalização
  - Em `onConfirm`, passar o `merged` para `RematriculaSubmissionService.finalizeRematricula({ readModel: merged, ... })` preservando a lógica atual (CAP sugerido, série selecionada, etc.).


## 8) Impacto no Payload e PDF

- Payload (`RematriculaSubmissionService.buildPayload`)
  - Sem alteração de assinatura; apenas garantir que o `readModel` passado já é o `merged`.
  - Os campos já mapeados em `p_enrollment` cobrem Aluno, Responsáveis e Endereço — as edições serão refletidas naturalmente.
- PDF (`rematriculaProposalGenerator`)
  - Usar `readModel: merged` tanto no on-demand quanto após `finalizeRematricula` (preview + download). Nenhuma mudança estrutural é necessária no gerador.


## 9) Telemetria / Auditoria leve (opcional e não disruptiva)

- Console-only no início (DEV): logar eventos `draft_saved`, `draft_cleared`, com `draftKey`, seção e campos alterados (sem PII completa, truncar CPF/CEP).
- Se necessário, fase futura: endpoint serverless opcional para registrar métricas de uso (desabilitado por padrão e controlado por flag `rematricula.edit.telemetry.enabled`).


## 10) Testes e Critérios de Aceite

- Unit
  - `mergeDraft` cobre cenários de sobrescrita parcial/total e limpeza por seção.
  - Validações de CPF/CEP/email/telefone.
- Integração manual
  - Edição em cada card persiste no draft; UI reflete imediatamente; “Restaurar original” funciona.
  - PDF on-demand reflete edições.
  - Finalização cria `enrollments` com dados editados (confirmar em consulta/Admin).
- QA/UAT
  - Flags off: nenhum botão “Editar” aparece; comportamento atual intacto.
  - Flags on seletivos por card: apenas aquele card mostra “Editar”.
- Aceite
  - Sem regressões no carregamento dos dados.
  - Nenhuma chamada adicional ao Supabase além das já existentes (detalhes, finalize, update PDF).
  - Integridade do RPC `enroll_finalize` preservada; `tag_matricula` continua classificada no servidor (trigger).


## 11) Rollout (DEV → STG → PROD)

- F0 — Planejamento e flags (esta etapa)
  - Adicionar chaves de config e leitura com cache (sem ligar na UI ainda).
- F1 — Store + Hook
  - Implementar `enrollmentDraft.ts` e `useMergedEnrollmentData.ts`.
  - Não alterar ainda a UI; cobrir com testes unitários e logs DEV.
- F2 — Modal Aluno
  - Implementar `EditAlunoModal.tsx`, integrar botão no card Aluno; behind `rematricula.edit.student.enabled`.
  - Validar e salvar no draft; exibir badge “Alterado”.
- F3 — Modal Responsáveis
  - Implementar `EditResponsaveisModal.tsx`, behind `rematricula.edit.guardians.enabled`.
- F4 — Modal Endereço
  - Implementar `EditEnderecoModal.tsx`, behind `rematricula.edit.address.enabled`.
- F5 — Propagação para PDF e Finalização
  - Garantir uso do `merged` nos pontos de geração de PDF e submissão (sem alterar serviços).
- F6 — Hardening e UX
  - Confirmação para CPF; máscaras e normalizações; restauração por seção e total.
- F7 — QA/UAT e rollout controlado
  - DEV (QA interno) → STG (UAT com usuários chave) → PROD (flags inicialmente off, ativar gradualmente por card).


## 12) Riscos e Mitigações

- Alteração de CPF pode causar inconsistências se o usuário esperar recarregar dados de origem.
  - Mitigar com aviso claro e confirmação; a origem não será recarregada automaticamente.
- Campos obrigatórios em branco após edição.
  - Validações de formulário bloqueiam `Salvar alterações` e exibem mensagens claras.
- Possível divergência entre origem (previous_year_students) e valores editados.
  - Esperado: edição local sobrescreve somente na matrícula enviada; nenhuma tentativa de atualizar a fonte histórica.
- Regressões na tela de detalhes.
  - Flags off garantem comportamento atual; monitorar logs e feedback.


## 13) Itens Técnicos Concretos (Backlog de Implementação)

- Config/Flags
  - Adicionar chaves no `config.service.ts` (cache + getters):
    - `getRematriculaEditConfig()` com `{ enabled, studentEnabled, guardiansEnabled, addressEnabled, telemetryEnabled }`.
  - UI `SystemConfigurations.tsx`: card simples para alternar chaves.
- Estado/Hooks
  - `state/enrollmentDraft.ts` + testes.
  - `hooks/useMergedEnrollmentData.ts` + testes.
- UI/Modais
  - `components/modals/EditAlunoModal.tsx`
  - `components/modals/EditResponsaveisModal.tsx`
  - `components/modals/EditEnderecoModal.tsx`
  - Integração dos botões “Editar” nos cards (sem mexer no `AcademicSection`).
- Integração Page
  - Trocar leituras para `merged` em `RematriculaDetailsPage.tsx` nos cards afetados.
  - Usar `merged` no PDF (on-demand e pós-finalização).
  - Usar `merged` em `finalizeRematricula`.
- QA/Docs
  - Documentar comportamento, flags e procedimentos de rollback.


## 14) Rollback

- Desativar todas as flags de edição em `system_config`.
- Limpar LocalStorage de drafts `rematricula.draft.*` (opcional, orientado ao suporte).
- Como não há alterações servidoras nem tabelas novas, rollback é imediato e sem impacto nos dados.


## 15) Referências no Código

- Página: `src/features/rematricula-v2/pages/RematriculaDetailsPage.tsx`
- Submissão: `src/features/rematricula-v2/services/rematriculaSubmissionService.ts`
- PDF: `src/features/rematricula-v2/services/pdf/rematriculaProposalGenerator.ts`
- Detalhes (dados): `src/features/rematricula-v2/services/rematriculaDetailsService.ts`
- Tipos/Mapeamento: `src/features/rematricula-v2/types/details.ts`, `.../rematriculaDetailsMapper.ts`
- Config (cache): `src/lib/config/config.service.ts`
- RPC e schema: `supabase/migrations/025_create_enroll_finalize_rpc.sql`, `026_fix_enroll_finalize_return_type.sql`, `014_create_enrollments.sql`


## 16) Critérios de Não-Disrupção

- Supabase-first mantido; nenhuma nova tabela/trigger/policy necessária.
- Nenhuma alteração de assinatura em serviços existentes.
- Flags desligadas por padrão e rollout gradual.
- Caching de config reusa infra existente (memória + LocalStorage + TTL) para evitar sobrecarga de requisições.
