# Plano: Ajuste por Cluster do Desconto Sugerido (Rematrícula)

**Status**: 🟡 Aguardando Aprovação  
**Data**: 2025-10-13  
**Comunicação**: Português (PT-BR)

---

## 1. Contexto e Objetivo

### Situação Atual
Alunos que **não** são Especial ou Maçom recebem o **Desconto Sugerido** = desconto do ano anterior (`previous_year_students.total_discount_percentage`).

**Existente:**
- ✅ CAP do Desconto Sugerido (limite máximo, ex: 20%)
- ✅ Bypass Trilho Especial (preserva desconto integral)
- ✅ Bypass MACOM (seleção manual)

### Objetivo
Permitir que o **administrador** ajuste o Desconto Sugerido por **clusters (faixas)**, aplicando **aumento/redução percentual** configurável.

### Clusters Definidos

| Cluster | Faixa | Exemplo |
|---------|-------|---------|
| **A** | 5% a <10% | Descontos baixos |
| **B** | 10% a <15% | Descontos médios-baixos |
| **C** | 15% a <20% | Descontos médios-altos |
| **D** | ≥20% | Descontos altos |

### Exemplo Prático
- **Config Admin**: Cluster D (≥20%) = **-5 pontos %**
- Aluno com 22% → **17%** (22 - 5)
- Aluno com 25% → **20%** (25 - 5)

---

## 2. Arquitetura

### Ordem de Aplicação (CRÍTICO)

```
1. Desconto Ano Anterior (previous_year_students)
2. ⭐ AJUSTE POR CLUSTER (novo)
3. CAP (limite máximo)
4. Resultado Final

🚫 EXCEÇÕES (bypassam tudo):
- Trilho Especial → desconto integral
- MACOM → seleção manual
```

**Justificativa**: Cluster = política de desconto (antes do CAP de segurança)

### Padrão (reutilização CAP/PAV)
- Config: `system_configs`
- Leitura: RPC `get_system_config`
- Cache: memória + localStorage (TTL 5min)
- Painel: `/admin/configuracoes`
- Backend: **sem mudanças**

### Pontos de Integração

| Arquivo | Mudança |
|---------|---------|
| `config.service.ts` | ➕ Adicionar funções |
| `RematriculaDetailsPage.tsx` | ✏️ Modificar useEffect (linhas 87-121) |
| `SystemConfigurations.tsx` | ➕ Adicionar card admin |

---

## 3. Chaves (system_configs)

| Chave | Tipo | Default | Descrição |
|-------|------|---------|-----------|
| `rematricula.cluster_adjustment.enabled` | boolean | false | Habilita ajuste cluster |
| `rematricula.cluster_adjustment.cluster_a.adjustment` | number | 0 | Ajuste 5-<10% (pontos %) |
| `rematricula.cluster_adjustment.cluster_b.adjustment` | number | 0 | Ajuste 10-<15% (pontos %) |
| `rematricula.cluster_adjustment.cluster_c.adjustment` | number | 0 | Ajuste 15-<20% (pontos %) |
| `rematricula.cluster_adjustment.cluster_d.adjustment` | number | 0 | Ajuste ≥20% (pontos %) |

**Categoria**: `'financeiro'` (categorias válidas: geral, financeiro, integracao, seguranca)  
**Validação**: `-100 ≤ ajuste ≤ +100`, resultado final: `0-100%`

---

## 4. Fases

### **F0: Preparação** ✅
- [x] Revisar código atual
- [x] Confirmar ordem: Cluster → CAP
- [ ] SQL pré-checagens
- [ ] **Aprovação do usuário**

### **F1: Seed (Backend)**
Criar migração com 5 chaves (enabled=false, ajustes=0). Ver detalhes na seção 5.

### **F2: Service Layer**
Adicionar em `config.service.ts`:
- Interface `ClusterAdjustmentConfig`
- Funções: `get`, `invalidate`, `prime`, `apply`
- Lógica de detecção de cluster e aplicação

### **F3: Integração**
Modificar `RematriculaDetailsPage.tsx`:
```typescript
// useEffect (linhas 87-121)
const clusterCfg = await getClusterAdjustmentConfig()
const afterCluster = applyClusterAdjustment(base, clusterCfg)

const capCfg = await getSuggestedDiscountCap()
const final = applySuggestedDiscountCap(afterCluster.finalPercent, capCfg)
```

### **F4: Painel Admin**
Card em `SystemConfigurations.tsx`:
- Toggle enabled
- 4 inputs (A/B/C/D)
- Validação -100 a +100
- Exemplos + Alert explicativo
- Salvar → invalidar cache

### **F5: UI Visual (Opcional)**
Mostrar em `DiscountSelectionCard` quando ajuste aplicado.

### **F6: Testes**
Cenários: clusters com ajustes +/-, CAP após cluster, bypasses, flag off.

### **F7: Rollout**
DEV → STG → PROD (flags off, dark launch)

---

## 5. Código Essencial

### Migração SQL (F1)
```sql
-- supabase/migrations/0XX_seed_cluster_adjustment_config.sql
INSERT INTO system_configs (chave, valor, categoria, descricao, updated_by)
VALUES
  ('rematricula.cluster_adjustment.enabled', 'false', 'financeiro', 'Habilita ajuste cluster', 'system'),
  ('rematricula.cluster_adjustment.cluster_a.adjustment', '0', 'financeiro', 'Ajuste A (5-<10%)', 'system'),
  ('rematricula.cluster_adjustment.cluster_b.adjustment', '0', 'financeiro', 'Ajuste B (10-<15%)', 'system'),
  ('rematricula.cluster_adjustment.cluster_c.adjustment', '0', 'financeiro', 'Ajuste C (15-<20%)', 'system'),
  ('rematricula.cluster_adjustment.cluster_d.adjustment', '0', 'financeiro', 'Ajuste D (≥20%)', 'system')
ON CONFLICT (chave) DO NOTHING;
```

### Service Layer (F2)
```typescript
// config.service.ts
export interface ClusterAdjustmentConfig {
  enabled: boolean
  clusterA: number
  clusterB: number
  clusterC: number
  clusterD: number
}

export async function getClusterAdjustmentConfig(): Promise<ClusterAdjustmentConfig>
export function invalidateClusterAdjustmentConfigCache(): void
export function primeClusterAdjustmentConfigCache(value: Partial<ClusterAdjustmentConfig>): void

export function applyClusterAdjustment(
  previousPercent: number,
  cfg: ClusterAdjustmentConfig
): { finalPercent: number; clusterApplied: string | null; adjustment: number } {
  const p = clamp(previousPercent, 0, 100)
  if (!cfg?.enabled) return { finalPercent: p, clusterApplied: null, adjustment: 0 }

  let adjustment = 0, clusterApplied: string | null = null
  
  if (p >= 5 && p < 10) { adjustment = cfg.clusterA; clusterApplied = 'A' }
  else if (p >= 10 && p < 15) { adjustment = cfg.clusterB; clusterApplied = 'B' }
  else if (p >= 15 && p < 20) { adjustment = cfg.clusterC; clusterApplied = 'C' }
  else if (p >= 20) { adjustment = cfg.clusterD; clusterApplied = 'D' }

  return { finalPercent: clamp(p + adjustment, 0, 100), clusterApplied, adjustment }
}
```

### Integração (F3)
```typescript
// RematriculaDetailsPage.tsx (useEffect linhas 87-121)
useEffect(() => {
  if (isSpecialTrack) {
    setCappedSuggested(baseSuggestedPercent) // bypass
    return
  }

  ;(async () => {
    const clusterCfg = await getClusterAdjustmentConfig() // ⭐ PASSO 1
    const clusterResult = applyClusterAdjustment(baseSuggestedPercent, clusterCfg)
    
    const capCfg = await getSuggestedDiscountCap() // PASSO 2
    const capResult = applySuggestedDiscountCap(clusterResult.finalPercent, capCfg)
    
    setCappedSuggested(capResult.finalPercent)
  })()
}, [baseSuggestedPercent, ...])
```

---

## 6. Cenários de Teste

| Cenário | Anterior | Cluster | Ajuste | CAP | Esperado |
|---------|----------|---------|--------|-----|----------|
| 1 | 8% | A | -2% | 20% | 6% |
| 2 | 12% | B | +3% | 20% | 15% |
| 3 | 22% | D | -5% | 20% | 17% |
| 4 | 25% | D | -5% | 20% | **20%** (CAP) |
| 5 (Especial) | 22% | - | - | - | **22%** |
| 6 (Flag OFF) | 15% | - | 0% | 20% | 15% |

---

## 7. Segurança

- **Validação**: -100 ≤ ajuste ≤ +100
- **Clamp**: 0 ≤ resultado ≤ 100
- **Fallback**: cache expirado → defaults seguros
- **Idempotência**: ON CONFLICT na migration
- **Auditoria**: `updated_by` em system_configs

---

## 8. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Conflito com CAP | Ordem clara: Cluster → CAP |
| Bypass falha | Testes específicos Especial/MACOM |
| Cache desatualizado | TTL 5min + invalidação explícita |
| Admin confuso | UI clara + exemplos + Alert |

---

## 9. Critérios de Aceite

- ✅ Admin configura 4 clusters via painel
- ✅ Ajustes aplicados corretamente
- ✅ Ordem: Cluster → CAP
- ✅ Bypass Especial/MACOM funciona
- ✅ Flags off por padrão (não disruptivo)
- ✅ Cache funciona (memória + LS)
- ✅ Validações -100 a +100
- ✅ Rollback imediato (desabilitar flags)

---

## 10. Próximos Passos

1. ✅ **Revisar plano** com usuário
2. **Aprovar** arquitetura e clusters
3. **Confirmar** ordem de aplicação
4. **Iniciar F1** (seed das chaves)

---

**Padrão seguido: CAP/PAV (reutilização total). Supabase-first. Não disruptivo.**
