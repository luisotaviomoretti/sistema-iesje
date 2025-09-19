# Plano de Migração para Valores Anuais em Séries (Admin + Matrícula/Rematrícula)

Este plano define uma estratégia segura, diligente e não disruptiva para migrar a configuração e exibição de valores de séries do modelo atual (baseado em valores mensais) para um modelo que prioriza valores anuais no sistema administrativo e nos fluxos de Matrícula (Aluno Novo) e Rematrícula. O plano mapeia intervenções no banco de dados (Supabase, tabela `series`), no frontend/admin (/admin/series), nos fluxos de matrícula e rematrícula, nos payloads de finalização e na documentação/observabilidade.


## Objetivos
- Expor e operar com valores anuais no Admin (/admin/series) com três quebras:
  - Valor anual com material
  - Valor anual sem material
  - Valor anual do material
- Exibir valores anuais nos fluxos de Matrícula (Aluno Novo) e Rematrícula (UI e PDFs), mantendo compatibilidade e integridade com regras financeiras existentes.
- Garantir rollout gradual, com feature flags e fallback seguro, sem quebrar a funcionalidade atual baseada em valores mensais.


## Escopo e Premissas
- Não alterar semântica dos campos mensais existentes imediatamente. O sistema atual continuará funcionando com:
  - `valor_mensal_sem_material`
  - `valor_material` (observação: atualmente associado à diferença mensal; ver seção “Estado Atual”)
  - `valor_mensal_com_material` ≈ `valor_mensal_sem_material + valor_material` (com tolerância)
- Introduzir campos anuais paralelos e mantê-los sincronizados, com backfill inicial a partir dos valores mensais (multiplicando por 12), e consistência garantida por constraints/validações.
- No curto prazo, persistiremos no `enrollments` os campos mensais já existentes (base_value, final_monthly_value, material_cost). Campos anuais podem ser incluídos no payload e/ou planejados para persistência futura sem impacto imediato.


## Estado Atual (Mapeamento)
- Banco de dados `series` (Supabase):
  - Definida em `supabase/migrations/004_create_series_table.sql`.
  - Campos principais: `valor_mensal_com_material`, `valor_material`, `valor_mensal_sem_material` e constraints para manter `com >= sem` e `(com - sem) ~ valor_material` (tolerância 10%).
  - Campo `escola` adicionado em `005_add_escola_to_series.sql` e índices únicos considerando escola.
- Admin UI (/admin/series):
  - Página `src/pages/admin/SeriesManagement.tsx`: exibe valores mensais e calcula o anual via utilitário `calculateAnnualValue()` (x12). Visualiza e lista “Anual c/ Material” e “Anual s/ Material” somente como derivação visual.
  - Formulário `src/features/admin/components/SerieForm.tsx`: entradas mensais e um “Resumo Anual (x12)” apenas informativo. Validações Zod compatíveis com constraints atuais.
- Fluxo Rematrícula:
  - Cálculo: `src/features/rematricula-v2/services/rematriculaPricingService.ts` (usa valores “mensais” da série), e `FinancialBreakdownCard.tsx` exibe base/material/total mensais.
  - Submissão final: `src/features/rematricula-v2/services/rematriculaSubmissionService.ts` monta `p_enrollment` com
    - `base_value` (sem material), `total_discount_*`, `final_monthly_value` (sem material), `material_cost` (separado). Compatível com o RPC `enroll_finalize`.
- Fluxo Aluno Novo:
  - API e hooks usam adaptações/mocks, mas encaminham para o mesmo RPC `enroll_finalize` (ver `src/features/matricula-nova/services/api/enrollment.ts`).
- RPC `enroll_finalize`:
  - Definido em `supabase/migrations/025_create_enroll_finalize_rpc.sql`.
  - Contrato atual espera `p_enrollment` com campos mensais e `p_discounts` (detalhes dos descontos aplicados). Garante idempotência por `client_tx_id`.

Observação importante: há duas semânticas em uso em módulos distintos sobre “material”: alguns tratam material como parcela mensal somada à mensalidade; outros tratam como custo separado adicionado apenas na primeira parcela. O plano abaixo mantém compatibilidade no curto prazo e abre caminho para consolidar a semântica no médio prazo.


## Requisitos Funcionais
- Admin:
  - Permitir entrada e edição de valores ANUAIS em três campos: com material, sem material e material.
  - Manter em tela o vínculo entre anual e mensal (conversões visuais), durante a fase de transição.
  - Validar integridade (ex.: `anual_com_material ≈ anual_sem_material + anual_material`, tolerância configurável).
- Matrícula e Rematrícula (Front):
  - Exibir valores anuais em telas e PDFs, preservando cálculos de desconto baseados na lógica vigente.
  - Fallback: se campos anuais estiverem ausentes, calcular a partir dos mensais (x12) sem interromper o fluxo.
- Banco (DB):
  - Adicionar campos anuais à tabela `series` com backfill e constraints idempotentes.
  - Garantir sincronização básica e validações.
- Payloads de finalização:
  - Não quebrar contrato atual; opcionalmente, incluir campos `annual_*` no `p_enrollment` para futura persistência.


## Design de Dados (DB) – Proposição Segura
Tabela `series` (adições):
- `valor_anual_sem_material NUMERIC(12,2) NOT NULL` (backfill = `valor_mensal_sem_material * 12`).
- `valor_anual_material NUMERIC(12,2) NOT NULL` (backfill = `valor_material * 12`).
- `valor_anual_com_material NUMERIC(12,2) NOT NULL` (backfill = soma acima). 

Constraints/Validações:
- `valor_anual_com_material >= valor_anual_sem_material`.
- `ABS((valor_anual_com_material - valor_anual_sem_material) - valor_anual_material) <= (valor_anual_material * 0.1)` (tolerância 10%), espelhando a regra mensal.

Backfill seguro:
- Atualizar todas as linhas calculando anuais a partir do estado atual.
- Tornar NOT NULL após backfill e verificação.

Sincronização mínima (fase de transição):
- Manter as duas famílias de campos (mensais e anuais) com consistência advertida por validações no Admin e checks no DB.
- Opcional (posterior): triggers para manter `anual = mensal * 12` quando um lado for atualizado, enquanto estivermos em transição.

Rollout DB:
- Nova migração `047_add_annual_fields_to_series.sql` idempotente (CREATE IF NOT EXISTS + ALTER IF EXISTS + DO $$ sanity checks $$), com backfill e constraints.


## Design de Aplicação (Admin)
- `src/pages/admin/SeriesManagement.tsx`:
  - Adicionar colunas que exibem os três valores anuais do banco (não apenas x12) com destaque visual.
  - Adicionar filtro/indicadores para identificar séries com divergência anual x mensal (se houver).
- `src/features/admin/components/SerieForm.tsx`:
  - Adicionar seção “Valores Anuais” com três inputs:
    - Anual c/ Material
    - Anual s/ Material
    - Anual (Material)
  - Validar: `anual_com ≈ anual_sem + anual_material` (tolerância). 
  - Fase de transição: exibir também os campos mensais (atuais) e conversão cruzada (somente leitura), até estabilizarmos a operação com valores anuais.
  - Persistir ambos: mensais e anuais. Enquanto o Admin editar anual, recalcular mensal (ou vice-versa) conforme regra definida (ver “Estratégia de edição”).

Estratégia de edição (transitória, segura):
- Modo 1 (padrão inicial):
  - Inputs principais = Anuais. Convertemos para mensais ao salvar (divisão por 12, com arredondamento definido) e persistimos ambos.
- Modo 2 (fallback/config):
  - Inputs principais = Mensais (modo atual). Calculamos e salvamos Anuais derivando x12.
- Chave de configuração (system_config): `series.annual_values.input_mode = 'annual' | 'monthly'` para habilitar Modo 1 em DEV/STG e depois em PROD.


## Design de Aplicação (Fluxos Front – Matrícula e Rematrícula)
- Rematrícula
  - `FinancialBreakdownCard.tsx`: exibir também “Total Anual”, “Anual sem material” e “Anual (Material)”. Utilizar preferencialmente campos anuais de `series`; se ausentes, derivar de mensais x12. Não alterar por ora a lógica de cálculo de desconto (mensal), apenas a apresentação.
  - `rematriculaPricingService.ts`: manter cálculo vigente (mensal). Adicionar helpers utilitários para obter valores anuais (direto dos campos anuais da série ou derivados dos mensais).
  - PDFs: `src/features/rematricula-v2/services/pdf/*` adicionar blocos com totais anuais (base/sem material, material, com material), respeitando CAP e regras já existentes de apresentação.
- Matrícula (Aluno Novo)
  - Hooks `useSeries` e componentes de passos (Summary/Academic) devem exibir os valores anuais recebidos de `series` quando disponíveis, com fallback x12.
  - No resumo final, exibir “Total Anual” e deixar claro que o `final_monthly_value` continuará sendo o persistido no banco (alinhado ao contrato atual), enquanto o anual é informativo/contratual.


## Payloads de Finalização (RPC `enroll_finalize`)
- Contrato atual (mensal) permanece inalterado, garantindo compatibilidade:
  - `base_value`, `total_discount_percentage`, `total_discount_value`, `final_monthly_value`, `material_cost`.
- Opcional (fase posterior): incluir chaves informativas no `p_enrollment` sem exigir persistência imediata:
  - `annual_base_value`, `annual_material_value`, `annual_total_value`.
- Opcional (futuro): migrar `enrollments` para armazenar também valores anuais, com migração separada e gatilho de preenchimento (fora deste escopo imediato).


## Fases de Execução (SAFE ROLLOUT)

### F0 — Diagnóstico e Planejamento (este documento)
- Revisão do estado atual e proposta.
- Critérios de aceite definidos.

### F1 — Migração de Banco (series)
- Criar migração `047_add_annual_fields_to_series.sql`:
  - `ALTER TABLE series ADD COLUMN IF NOT EXISTS valor_anual_sem_material NUMERIC(12,2);`
  - `ALTER TABLE series ADD COLUMN IF NOT EXISTS valor_anual_material NUMERIC(12,2);`
  - `ALTER TABLE series ADD COLUMN IF NOT EXISTS valor_anual_com_material NUMERIC(12,2);`
  - Backfill: set `valor_anual_sem_material = valor_mensal_sem_material * 12`, `valor_anual_material = valor_material * 12`, `valor_anual_com_material = valor_anual_sem_material + valor_anual_material`.
  - `SET NOT NULL` após verificação.
  - Constraints de integridade anual (espelhando as mensais).
  - Índices (se necessário para relatórios). 
- Testes SQL de verificação (arquivo em `supabase/tests/`): conferir consistência e contagem de linhas afetadas.

### F2 — Feature Flag e Config
- Adicionar chaves em `system_config` (via tela admin ou seed idempotente):
  - `series.annual_values.enabled` (boolean, default false).
  - `series.annual_values.input_mode` = `'monthly' | 'annual'` (default `'monthly'`).
- Adicionar getters com cache (memória/LocalStorage) no `config.service.ts` do frontend para evitar sobrecarga.

### F3 — Admin UI (/admin/series)
- `SeriesManagement.tsx`:
  - Exibir colunas anuais do banco (sem derivar on-the-fly), com destaque visual.
  - Indicadores de divergência Anual x Mensal (se detectada) para auditoria.
- `SerieForm.tsx`:
  - Se `series.annual_values.enabled`:
    - Exibir inputs anuais (3 campos) como principais quando `input_mode = 'annual'`.
    - Exibir inputs mensais em modo leitura (ou vice-versa). 
    - Validar `anual_com ≈ anual_sem + anual_material` (tolerância).
    - Na submissão, persistir os dois lados (mensal e anual) mantendo consistência por regra clara: se o modo de entrada é anual, mensal = `anual / 12` com arredondamento definido (comunicar regra). 

### F4 — Frontend Flows (Rematrícula + Aluno Novo)
- Rematrícula:
  - `FinancialBreakdownCard.tsx`: acrescentar blocos anuais, usando campos anuais do banco com fallback x12. Não alterar payload até F5.
  - Serviço `rematriculaPricingService.ts`: helpers para retornar trio anual (base/material/total) a partir da série.
  - PDFs: incluir seção “Totais Anuais”.
- Aluno Novo:
  - Atualizar hooks e telas para exibir anuais quando disponíveis (fallback x12). 
  - Ajustar summaries e PDFs.

### F5 — Payloads (opcional imediato, recomendado)
- Atualizar `RematriculaSubmissionService.buildPayload` e `EnrollmentApiService.finalizeEnrollmentViaRpc` para incluir chaves informativas no `p_enrollment` (não obrigatórias no servidor):
  - `annual_base_value`, `annual_material_value`, `annual_total_value` (somente se `series.annual_values.enabled`).
- Servidor ignora chaves extras (JSONB), mantendo contrato atual. 

### F6 — Observabilidade, Testes e Validações
- Métricas no frontend (console/telemetria leve) para flag de uso anual e detecção de divergências calculadas vs. armazenadas.
- Testes manuais e automatizados:
  - Admin: criação/edição com valores anuais + consistência com mensais.
  - Flows: renderização de anuais, fallback x12, PDFs.
  - RPC: payloads contendo chaves extras não causam erro.

### F7 — Rollout DEV → STG → PROD e Rollback
- DEV: habilitar `series.annual_values.enabled=true`, `input_mode='annual'` e validar. 
- STG: repetir testes UAT e validações de dados.
- PROD: ativar flag; manter monitoramento. 
- Rollback: desativar flag → volta à operação 100% mensal; campos anuais permanecem no banco para futuro reuso.


## Critérios de Aceite
- Admin:
  - É possível cadastrar e editar valores anuais nas três quebras, com validação e consistência com os mensais.
  - Lista de séries exibe colunas anuais vindas do banco, sem divergências após backfill.
- Front:
  - Rematrícula e Aluno Novo exibem valores anuais corretos (com fallback x12 quando necessário) e PDFs atualizados.
  - Nenhuma quebra nos cálculos de desconto ou submissões atuais.
- RPC:
  - `enroll_finalize` continua aceitando e processando payloads atuais. Payloads contendo chaves anuais extras não geram erro.


## Riscos e Mitigações
- Divergência de semântica do “material” (mensal vs. avulso): manter compatibilidade exibindo anuais informativos e preservando o contrato mensal no banco de `enrollments`. Depois, consolidar semântica.
- Arredondamento na conversão anual↔mensal: definir regra clara (ex.: 2 casas decimais) e aplicá-la de forma idempotente.
- Carga de migração: backfill simples (multiplicação por 12) com validação e logs.


## Itens Técnicos (Resumo por Arquivo)
- Banco:
  - `supabase/migrations/047_add_annual_fields_to_series.sql` (novo)
  - `supabase/tests/test_series_annual_fields.sql` (novo, verificação)
- Admin:
  - `src/pages/admin/SeriesManagement.tsx` (exibir anuais do banco)
  - `src/features/admin/components/SerieForm.tsx` (inputs anuais + validações + sincronização)
  - `src/features/admin/hooks/useSeries.ts` (selecionar campos anuais + utilitários)
- Rematrícula:
  - `src/features/rematricula-v2/components/sections/FinancialBreakdownCard.tsx` (blocos anuais)
  - `src/features/rematricula-v2/services/rematriculaPricingService.ts` (helpers anuais)
  - `src/features/rematricula-v2/services/pdf/*` (PDF com totais anuais)
  - `src/features/rematricula-v2/services/rematriculaSubmissionService.ts` (payload com chaves anuais – opcional)
- Aluno Novo:
  - `src/features/matricula-nova/hooks/data/useSeries.ts` e/ou `useSeriesOptimized.ts` (expor anuais)
  - `src/features/matricula-nova/components/steps/*` (exibir anuais)
  - `src/features/matricula-nova/services/api/enrollment.ts` (payload com chaves anuais – opcional)
- Config/Flags:
  - `src/lib/config/config.service.ts` (getters/cache para flags `series.annual_values.*`)


## Testes e Validação
- SQL de verificação pós-migração: totais anuais = mensais*12 em 100% das linhas.
- E2E manual: criar/editar série com anuais, validar tela lista, validar exibição nos fluxos, finalizar matrículas sem erro, validar PDFs.
- Smoke tests em DEV/STG antes do go-live.


## Rollback
- Desabilitar `series.annual_values.enabled`.
- Manter campos anuais no banco (sem removê-los) para evitar qualquer perda de dados e facilitar nova tentativa.


## Próximos Passos
1. Criar a migração `047_add_annual_fields_to_series.sql` com backfill e testes de verificação.
2. Implementar flags em `system_config` e getters com cache.
3. Ajustar Admin UI para entrada e exibição de anuais.
4. Ajustar exibição dos fluxos (Rematrícula/Aluno Novo) e PDFs.
5. (Opcional) Incluir chaves anuais no payload de `enroll_finalize`.
6. Executar plano de testes + rollout DEV→STG→PROD.
