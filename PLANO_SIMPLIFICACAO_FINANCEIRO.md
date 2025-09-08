# 📋 PLANO DE SIMPLIFICAÇÃO DO SISTEMA FINANCEIRO - REMATRÍCULA

**Data:** 2025-09-08  
**Status:** ANÁLISE E PLANEJAMENTO

---

## 🔍 ANÁLISE DA SITUAÇÃO ATUAL

### O que foi implementado (erroneamente):
1. **FinancialCalculationEngine.ts** (426 linhas)
   - ❌ Sistema de parcelamento
   - ❌ Cálculo de multas e juros
   - ❌ Múltiplas formas de pagamento com desconto
   - ❌ Simulação de cenários
   - ❌ Validação de viabilidade financeira
   - ✅ Cálculo básico de descontos
   - ✅ Comparação com ano anterior
   - ✅ Níveis de aprovação

2. **financial.ts** (166 linhas de tipos)
   - ❌ InstallmentDetails, PaymentPlan
   - ❌ LatePaymentFees
   - ❌ PaymentMethod com descontos
   - ❌ SimulationResult
   - ✅ FinancialCalculation (parcialmente útil)
   - ✅ FinancialComparison

3. **useFinancialCalculation.ts** (298 linhas)
   - ❌ Gestão de formas de pagamento
   - ❌ Simulações automáticas
   - ❌ Cálculo de multas
   - ✅ Integração com TanStack Query
   - ✅ Cache de cálculos

---

## 🎯 O QUE REALMENTE PRECISAMOS

### Baseado no sistema de nova matrícula existente:

1. **Buscar do Supabase:**
   - `valor_mensal_com_material`
   - `valor_material` 
   - `valor_mensal_sem_material`
   - `escola` da série selecionada

2. **Cálculo simples (igual ao calculatePricing existente):**
   - Aplicar descontos sobre `valor_mensal_sem_material`
   - Verificar limite de 60% (100% para bolsas integrais)
   - Determinar nível de aprovação
   - Comparar com ano anterior

3. **Sugerir descontos do ano anterior:**
   - Carregar descontos aplicados em 2025
   - Permitir manter ou alterar

---

## 📐 ARQUITETURA SIMPLIFICADA PROPOSTA

```typescript
// 1. RematriculaPricingService.ts (substitui FinancialCalculationEngine)
export class RematriculaPricingService {
  // Reutilizar lógica de calculatePricing
  static calculatePricing(
    series: DatabaseSeries,
    selectedDiscounts: DatabaseDiscount[]
  ): PricingCalculation
  
  // Comparar com ano anterior
  static compareWithPreviousYear(
    current: PricingCalculation,
    previous: PreviousYearFinance
  ): PricingComparison
}

// 2. useRematriculaPricing.ts (substitui useFinancialCalculation)
export function useRematriculaPricing({
  selectedSeriesId,
  selectedDiscounts,
  previousYearData
}) {
  // Buscar série do Supabase
  const { data: series } = useSeriesById(selectedSeriesId)
  
  // Calcular usando mesma lógica do sistema novo
  const pricing = useMemo(() => {
    return calculatePricing({
      baseValue: series.valor_mensal_sem_material,
      discounts: selectedDiscounts
    })
  }, [series, selectedDiscounts])
  
  // Comparação simples
  const comparison = useMemo(() => {
    return compareWithPreviousYear(pricing, previousYearData)
  }, [pricing, previousYearData])
  
  return { pricing, comparison, series }
}
```

---

## 🔄 FASES DE SIMPLIFICAÇÃO

### FASE 1: Backup e Preparação
**Objetivo:** Preservar código atual antes das mudanças

```bash
# 1. Criar backup do código atual
mkdir -p backups/financial-complex/$(date +%Y%m%d)
cp src/features/rematricula-v2/services/financialCalculationEngine.ts backups/
cp src/features/rematricula-v2/types/financial.ts backups/
cp src/features/rematricula-v2/hooks/business/useFinancialCalculation.ts backups/
```

### FASE 2: Simplificar Tipos
**Objetivo:** Manter apenas tipos necessários

```typescript
// types/rematricula-pricing.ts (substitui financial.ts)
export interface RematriculaPricing {
  // Valores base da série
  seriesId: string
  seriesName: string
  baseValue: number // valor_mensal_sem_material
  materialValue: number // valor_material
  
  // Descontos aplicados
  appliedDiscounts: Array<{
    id: string
    code: string
    name: string
    percentage: number
    value: number
  }>
  
  // Totais
  totalDiscountPercentage: number
  totalDiscountValue: number
  finalMonthlyValue: number
  
  // Validações
  approvalLevel: 'automatic' | 'coordination' | 'direction'
  isValid: boolean
  warnings: string[]
}

export interface PricingComparison {
  previousYearValue: number
  currentYearValue: number
  difference: number
  percentageChange: number
}
```

### FASE 3: Reutilizar Lógica Existente
**Objetivo:** Usar calculatePricing do sistema de nova matrícula

```typescript
// services/rematriculaPricingService.ts
import { calculatePricing, determineApprovalLevel } from '../../matricula-nova/services/business/calculations'

export class RematriculaPricingService {
  static calculate(
    series: DatabaseSeries,
    discounts: DatabaseDiscount[]
  ) {
    // Reutilizar função existente
    return calculatePricing({
      baseValue: series.valor_mensal_sem_material,
      discounts,
      trackId: series.track_id
    })
  }
  
  static compare(current: number, previous: number) {
    const difference = current - previous
    const percentageChange = previous > 0 
      ? (difference / previous) * 100 
      : 0
      
    return {
      previousYearValue: previous,
      currentYearValue: current,
      difference,
      percentageChange
    }
  }
}
```

### FASE 4: Hook Simplificado
**Objetivo:** Hook focado apenas no essencial

```typescript
// hooks/business/useRematriculaPricing.ts
export function useRematriculaPricing({
  selectedSeriesId,
  selectedDiscounts,
  previousYearData
}) {
  // Buscar série do Supabase
  const { data: series } = useQuery({
    queryKey: ['series', selectedSeriesId],
    queryFn: () => supabase
      .from('series')
      .select('*')
      .eq('id', selectedSeriesId)
      .single(),
    enabled: !!selectedSeriesId
  })
  
  // Calcular pricing
  const pricing = useMemo(() => {
    if (!series?.data) return null
    
    return RematriculaPricingService.calculate(
      series.data,
      selectedDiscounts
    )
  }, [series, selectedDiscounts])
  
  // Comparação
  const comparison = useMemo(() => {
    if (!pricing || !previousYearData?.financial) return null
    
    return RematriculaPricingService.compare(
      pricing.finalValue,
      previousYearData.financial.final_monthly_value
    )
  }, [pricing, previousYearData])
  
  return {
    series: series?.data,
    pricing,
    comparison,
    isLoading: !series
  }
}
```

---

## ⚠️ IMPACTOS E DEPENDÊNCIAS

### Arquivos que dependem do sistema atual:
1. **useDiscountMigration.ts** 
   - Usa tipos de `financial.ts`
   - Precisa ajustar imports

2. **FASE_2_ETAPA_2_3_COMPLETA.md**
   - Documentação ficará desatualizada
   - Criar nova versão simplificada

### Mudanças necessárias:
1. **Imports:**
   - Trocar `FinancialCalculation` por `RematriculaPricing`
   - Remover referências a multas, juros, parcelamento

2. **Hook useDiscountMigration:**
   - Ajustar tipo de `financialImpact`
   - Simplificar para usar apenas comparação

---

## ✅ CHECKLIST DE SIMPLIFICAÇÃO

### Remover:
- [ ] Sistema de parcelamento
- [ ] Cálculo de multas e juros  
- [ ] Formas de pagamento com desconto
- [ ] Simulação de cenários
- [ ] Validação de viabilidade financeira
- [ ] Exportação em múltiplos formatos

### Manter/Adicionar:
- [ ] Busca de série do Supabase
- [ ] Cálculo básico de descontos (reutilizar existente)
- [ ] Comparação com ano anterior
- [ ] Determinação de nível de aprovação
- [ ] Sugestão de descontos do ano anterior

### Simplificar:
- [ ] Tipos TypeScript (reduzir de 166 para ~50 linhas)
- [ ] Motor de cálculo (reduzir de 426 para ~100 linhas)
- [ ] Hook (reduzir de 298 para ~80 linhas)

---

## 📊 MÉTRICAS ESPERADAS

### Antes (Atual):
- **Total:** 890 linhas
- **Complexidade:** Alta
- **Funcionalidades desnecessárias:** 70%

### Depois (Simplificado):
- **Total estimado:** ~230 linhas
- **Complexidade:** Baixa
- **Reutilização:** 80% da lógica existente
- **Funcionalidades:** 100% do necessário

---

## 🚀 ORDEM DE EXECUÇÃO

1. **Backup do código atual**
2. **Criar novos tipos simplificados**
3. **Implementar RematriculaPricingService** (reutilizando calculatePricing)
4. **Criar useRematriculaPricing** com busca do Supabase
5. **Ajustar useDiscountMigration** para novos tipos
6. **Testar compilação TypeScript**
7. **Atualizar documentação**
8. **Remover arquivos antigos**

---

## ⚡ DECISÃO NECESSÁRIA

**Confirmar antes de prosseguir:**
1. ✅ Remover toda complexidade de parcelamento/multas/juros?
2. ✅ Reutilizar calculatePricing do sistema de nova matrícula?
3. ✅ Buscar valores da série direto do Supabase?
4. ✅ Manter apenas comparação simples com ano anterior?

**Status:** AGUARDANDO APROVAÇÃO PARA EXECUTAR