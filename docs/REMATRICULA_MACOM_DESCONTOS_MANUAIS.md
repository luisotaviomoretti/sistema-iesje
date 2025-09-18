# Rematrícula – Fluxo específico para alunos do trilho "maçom" (sem Desconto Sugerido + seleção manual de 1 desconto)

Este documento define o plano de implementação, em fases, para tratar alunos cujo `track_name` (trilho) no `previous_year_students` é "maçom". Para esses casos, o fluxo padrão de Rematrícula NÃO deve apresentar o "Desconto Sugerido". Em vez disso, o usuário poderá clicar em "Adicionar Desconto" e selecionar manualmente apenas 1 desconto dentre os tipos elegíveis (categorias `especial` e `negociacao` da tabela `tipos_desconto`).

O plano prioriza execução segura, diligente e inteligente, mantendo arquitetura Supabase-first, sem mudanças disruptivas e preservando a integridade e o funcionamento atual do sistema.

---

## Objetivos
- Remover o "Desconto Sugerido" apenas para alunos previos com trilho "maçom".
- Permitir adição manual de desconto (apenas um) via modal dedicado, listando descontos de `tipos_desconto` com categorias `especial` e `negociacao`.
- Garantir que a UI, o cálculo financeiro e o payload de finalização reflitam fielmente a escolha do usuário.
- Manter o comportamento atual para todos os demais alunos (não-"maçom").

## Escopo
- Frontend (React + TypeScript) da feature de Rematrícula.
- Integração com Supabase (consulta a `tipos_desconto` e persistência via RPC `enroll_finalize`).
- Sem alterações de schema em banco, sem mudanças nas RLS. Uso de `system_config` para flags/rollout.

## Definições
- "Aluno maçom": read model carregado de `previous_year_students` com `track_name` igual a "maçom" (detecção com normalização de acentos e case-insensitive: "maçom" ≈ "macom").
- Descontos elegíveis: registros em `tipos_desconto` com `trilho IN ('especial', 'negociacao')` e ativos.
- Seleção manual única: exatamente 0 ou 1 desconto selecionado; nunca mais de 1. (O usuário pode optar por nenhum.)

---

## Fases (seguras e não-disruptivas)

### F0 – Preparação e Flags
- Criar chaves em `system_config` (públicas) para rollout e parametrização:
  - `rematricula.macom.enabled` (boolean, default: false) – liga o comportamento especial.
  - `rematricula.macom.discount.categories` (string, default: "especial,negociacao").
  - `rematricula.macom.one_discount_only` (boolean, default: true).
  - `rematricula.macom.hide_suggested` (boolean, default: true).
- Documentar no Admin (`SystemConfigurations.tsx`) as novas flags para permitir habilitar por ambiente.

### F1 – Detecção de aluno "maçom"
- Implementar utilitário `isMacomTrack(readModel)` que:
  - Checa `readModel.meta.source === 'previous_year'` e `readModel.academic.track_name`.
  - Normaliza acentos e case; retorna true se contiver "macom".
- Não altera contratos de tipos; função pura e reutilizável.

### F2 – Ocultar Desconto Sugerido no fluxo
- Em `RematriculaDetailsPage.tsx`:
  - Quando `isMacomTrack(...) && macom.enabled && macom.hide_suggested`, forçar `suggestedPercentage = null` (ou 0) em todos os pontos que hoje abastecem o "sugerido".
  - UI de origem de descontos deve mostrar “sem descontos selecionados” até o usuário clicar em "Adicionar Desconto".
  - Preservar comportamento atual para não-"maçom".

### F3 – Botão "Adicionar Desconto" (card de Descontos)
- No `DiscountSelectionCard.tsx`:
  - Quando `isMacomTrack(...)`, exibir botão primário “Adicionar Desconto”.
  - Desativar qualquer UI de seleção múltipla existente; não mostrar trilho de “herdar desconto” para este caso.
  - Ao clicar, abrir modal de Seleção Manual (F4).

### F4 – Modal de Seleção Manual (único desconto)
- Criar `ManualDiscountModal.tsx` (novo componente):
  - Busca com React Query: `tipos_desconto` filtrando por `trilho IN (config.categories)` e `ativo = true`.
  - Listagem elegante (ShadCN/Radix) mostrando `codigo` e `descricao`.
  - Permitir escolher apenas 1 item (comportamento radio). Botões: “Cancelar” | “Selecionar”.
  - A seleção substitui qualquer desconto manual anterior do estado.
- Acessibilidade: foco, rolagem, feedback de loading/erro de rede.
- Performance: cache em memória (staleTime adequado), sem revalidar agressivamente.

### F5 – Integração com cálculo financeiro
- `RematriculaPricingService.calculate` já calcula com base na lista informada. Garantir que:
  - Para "maçom" com 0 descontos selecionados, `effectiveDiscounts = []` (sem fallback para sugerido).
  - Para 1 desconto selecionado, calcular normalmente.
- Atualizar `FinancialBreakdownCard` e o resumo do modal de finalização para refletir a origem “selecionado manualmente”.

### F6 – Payload de finalização e PDF
- Em `RematriculaSubmissionService.buildPayload`:
  - Se `isMacomTrack(...)` e `selectedDiscounts.length === 0`, não injetar qualquer desconto "sugerido" (zerado).
  - Se houver 1 selecionado, enviar como hoje (id/codigo/percentual/trilho).
- Geração de PDF permanece invariável; apenas refletirá os descontos enviados.

### F7 – Auditoria e Telemetria
- Log (dev) discriminalizado quando o fluxo "maçom" estiver ativo (sem PII sensível).
- Eventos mínimos: abriu modal, listagem carregada, desconto selecionado/trocado, finalizou sem desconto.
- Sem persistência adicional; usar console em DEV e hooks de telemetria padrão quando disponíveis.

### F8 – Testes
- Unitários:
  - `isMacomTrack()` com variações: "maçom", "MACOM", "maÇom", valores nulos, fonte `enrollment`.
  - Modal: permite selecionar apenas 1; exibe corretamente `codigo` e `descricao`.
- Integração (React Testing Library):
  - Oculta "Desconto Sugerido" para "maçom"; mostra botão "Adicionar Desconto".
  - Fluxo feliz: escolher 1 desconto e ver cálculo atualizado.
  - Fluxo sem escolha: finalizar com 0 desconto, sem erros.
- E2E (manual ou Cypress):
  - DEV e STG com `rematricula.macom.enabled = true`.

### F9 – Rollout seguro
- Flags desligadas por padrão. Habilitar por ambiente:
  - DEV: habilitar tudo e validar.
  - STG: habilitar para subset (se houver feature gates por usuário/escola) ou global com monitoramento.
  - PROD: habilitar de forma gradual.
- Plano de rollback:
  - Desligar `rematricula.macom.enabled` e `rematricula.macom.hide_suggested` para voltar ao comportamento anterior instantaneamente.

---

## Detalhamento técnico

### 1) Detecção do trilho "maçom"
- Utilitário `isMacomTrack(readModel: RematriculaReadModel): boolean`:
  - `const raw = readModel?.academic?.track_name || ''`
  - `const norm = raw.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()`
  - `return norm.includes('macom')`
- Usar somente no front; nenhuma mudança no backend.

### 2) Config e carregamento
- Reusar serviço `config.service` com novas chaves:
  - `getMacomConfig()` (ou reaproveitar `getPublicConfig` com prefixo `rematricula.macom.*`).
- Cache com React Query (staleTime 5 min).

### 3) UI/UX – `DiscountSelectionCard.tsx`
- Props novas (não-disruptivas):
  - `manualOnly?: boolean` – quando true, esconde UI de herança/sugerido e mostra botão “Adicionar Desconto”.
  - `onRequestManualSelection?: () => void` – abre o modal.
- Para não-"maçom", `manualOnly` é false e nada muda.

### 4) Modal – `ManualDiscountModal.tsx` (novo)
- Busca: `supabase.from('tipos_desconto').select('id,codigo,descricao,trilho,percentual,ativo').in('trilho', config.categories).eq('ativo', true).order('codigo')`.
- Render:
  - Lista com radio (um por vez). Visual padrão ShadCN.
  - Exibir `codigo` forte e `descricao` em texto secundário.
  - Ação “Selecionar” retorna item único para o chamador.

### 5) Estado e cálculo
- Em `RematriculaDetailsPage.tsx`:
  - Quando `isMacomTrack()`, não passar `suggestedPercentage` para `DiscountSelectionCard` nem para `FinancialBreakdownCard`.
  - Armazenar `selectedDiscounts` como um array de 0 ou 1 item.
  - Ao escolher um novo desconto no modal, substituir o item do estado.
- `RematriculaPricingService.calculate(series, discounts)` permanece inalterado.

### 6) Finalização e PDF
- `RematriculaFinalizeModal.tsx`: o resumo deve indicar “selecionados nesta página” quando houver 1 desconto, ou mostrar “Nenhum desconto selecionado” quando vazio.
- `RematriculaSubmissionService.buildPayload(...)` já formata descontos individuais; basta garantir que não haverá fallback ao sugerido quando `isMacomTrack()`.

### 7) Segurança e RLS
- Nenhuma mudança de RLS.
- Apenas leitura de `tipos_desconto` (pública/anon/autenticado conforme já permitido). Se necessário, criar view segura no futuro.

### 8) Performance e cache
- Reutilizar React Query para `tipos_desconto` com `staleTime` 5–10 minutos.
- Sem chamadas redundantes (buscar apenas ao abrir o modal, com cache).

### 9) Observabilidade
- Logs de DEV com prefixo `[Rematricula-MACOM]` nos pontos-chave.
- Em PROD, manter logs mínimos e sem PII.

---

## Critérios de Aceite
- Para alunos com trilho "maçom":
  - [ ] O "Desconto Sugerido" não aparece em nenhuma seção.
  - [ ] O Card de Descontos exibe botão “Adicionar Desconto”.
  - [ ] O modal lista somente descontos de categorias `especial` e `negociacao`.
  - [ ] É possível selecionar no máximo 1 desconto; ao confirmar, ele aparece na UI e no cálculo.
  - [ ] É possível finalizar sem desconto (0 selecionados) sem erros.
  - [ ] O PDF e o payload final refletem a seleção (ou ausência) de desconto manual.
- Para alunos NÃO "maçom":
  - [ ] Nada muda no comportamento atual (regressão zero).

---

## Plano de Testes (resumo)
- Unit: `isMacomTrack`, normalização de acentos; formatação de itens no modal.
- Integração: 
  - Ocultação do sugerido + exibição do botão; 
  - Seleção única; 
  - Cálculo atualizado; 
  - Finalização sem desconto.
- E2E: fluxo completo em DEV/STG com flags ligadas.

---

## Rollout & Rollback
- Habilitar `rematricula.macom.enabled` por ambiente.
- Monitorar erros no console/telemetria.
- Em caso de problema: desligar flag(s) e invalidar cache do app (refresh) – sem deploy.

---

## Impacto nos arquivos (previsão)
- `src/features/rematricula-v2/pages/RematriculaDetailsPage.tsx` – gating e integração do modal.
- `src/features/rematricula-v2/components/sections/DiscountSelectionCard.tsx` – suporte a `manualOnly` e botão.
- `src/features/rematricula-v2/components/modals/ManualDiscountModal.tsx` – NOVO.
- `src/features/rematricula-v2/services/rematriculaSubmissionService.ts` – impedir fallback do sugerido para "maçom".
- `src/lib/config/config.service.ts` – novas getters de flags/macros.
- `src/pages/admin/SystemConfigurations.tsx` – adicionar toggles/config.

---

## Riscos e Mitigações
- Detecção incorreta de "maçom": usar normalização de acento e case-insensitive. Adicionar testes.
- Seleção múltipla por engano: UI tipo radio + validação de comprimento na submissão (opcional).
- Cálculo financeiro divergente: manter service centralizado; snapshots antes/depois em DEV.

---

## Próximos Passos
1. Criar chaves em `system_config` e toggles no Admin (F0).
2. Implementar `isMacomTrack` e gating de sugerido (F1–F2).
3. Adicionar botão no Card e o novo modal (F3–F4).
4. Garantir integração cálculo/payload (F5–F6).
5. Cobrir testes mínimos e executar rollout DEV→STG→PROD (F7–F9).
