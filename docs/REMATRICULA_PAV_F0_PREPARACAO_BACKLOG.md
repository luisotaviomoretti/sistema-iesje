# F0 — Preparação e Backlog (Rematrícula • Toggle Pagamento à Vista)

Objetivo: organizar o trabalho e garantir um início SEGURO, DILIGENTE e INTELIGENTE, sem alterações disruptivas na arquitetura.

## Itens Mapeados (pontos de uso)
- UI
  - `src/features/rematricula-v2/components/sections/DiscountSelectionCard.tsx`
  - `src/features/rematricula-v2/components/sections/FinancialBreakdownCard.tsx`
  - `src/features/rematricula-v2/components/RematriculaFinalizeModal.tsx`
  - `src/features/rematricula-v2/pages/RematriculaDetailsPage.tsx`
- Serviços/Tipos
  - `src/features/rematricula-v2/services/rematriculaSubmissionService.ts`
  - `src/features/rematricula-v2/services/rematriculaPricingService.ts`
  - `src/features/rematricula-v2/services/pdf/rematriculaProposalGenerator.ts`
  - `src/features/rematricula-v2/types/rematricula.ts` (modelos de dados úteis)
- Configuração/Infra
  - `src/lib/config/config.service.ts` (CAP do Sugerido)
  - `src/pages/admin/SystemConfigurations.tsx` (painel de Admin)
  - RPCs: `enroll_finalize`, `get_system_config`, `set_system_config`
  - Tabelas: `system_configs`, `enrollments`, `enrollment_discounts`, `previous_year_students`

## Confirmação: comportamento CAP do Sugerido
- Funções
  - `getSuggestedDiscountCap(options?)`: cache (memória + localStorage), TTL 5min, fallback seguro
  - `applySuggestedDiscountCap(previousPercent, cfg)`: clamp 0–100, aplica cap quando `enabled=true`
  - `invalidateSuggestedDiscountCapCache()`: invalida memória e LS
- Observações
  - Padrão de chaves atuais: `rematricula.suggested_discount_cap.enabled|percent`
  - Devemos replicar esse padrão para o PAV (enabled/percent/code/name), aproveitando o mesmo estilo de cache/backoff

## Definições (PAV)
- Chaves em `system_configs`
  - `rematricula.pav.enabled`: boolean (default false)
  - `rematricula.pav.percent`: number (0..100, default 0)
  - `rematricula.pav.code`: string (default "PAV")
  - `rematricula.pav.name`: string (default "Pagamento à Vista")
- Semântica
  - Quando o toggle PAV estiver ON, compor descontos efetivos com o item PAV (somável ao Sugerido capado)
  - Nenhuma mudança na RLS/RPC; payload apenas enriquece `p_discounts` quando PAV ativo

## Pré-Checagens (ver `supabase/tests/fase0_prechecks.sql`)
- Existência das tabelas e RPCs mencionadas
- Presença e valores atuais das chaves CAP (Sugerido)
- Acesso básico ao `system_configs` via RPC `get_system_config`

## Critérios de Saída de F0
- [ ] Todos os pontos de uso mapeados e revisados
- [ ] Confirmação do comportamento CAP (documentado acima)
- [ ] Documento de pré-checagens SQL criado e validado em DEV
- [ ] Plano de chaves do PAV definido (enabled/percent/code/name)
- [ ] Sem mudanças de código funcional nesta fase

## Observações 
- Comunicação e documentação em PT-BR
- Foco em não aumentar a superfície de requisições: reutilizar cache local (memória/LS) e invalidação explícita
- Execução por fases (DEV → STG → PROD), com flags desligadas por padrão
