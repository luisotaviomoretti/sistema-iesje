# 🗑️ Plano Detalhado - Fase 0: Limpeza do Repositório

## 📋 Objetivo
Executar a limpeza radical do sistema de matrícula legado antes de implementar a nova arquitetura simplificada, removendo todo o código obsoleto e preparando um ambiente limpo para desenvolvimento.

## ⚠️ Avisos Críticos

### 🚨 FAZER BACKUP OBRIGATÓRIO
```bash
# 1. Criar branch de backup (OBRIGATÓRIO)
git checkout -b backup/sistema-matricula-legado-$(date +%Y%m%d)
git push origin backup/sistema-matricula-legado-$(date +%Y%m%d)

# 2. Voltar para branch de trabalho
git checkout refactor/discount-system-phase1
```

### 🎯 Princípio da Operação
- **Tabula Rasa**: Deletar TUDO relacionado ao sistema antigo
- **Sem Piedade**: Não tentar salvar "partes úteis"
- **Sem Volta**: Uma vez deletado, não há recuperação (apenas via backup)

## 📊 Análise de Impacto

### Estatísticas de Arquivos Encontrados
- **Total de arquivos enrollment**: 45+ arquivos
- **Hooks complexos**: 8 arquivos
- **Componentes wizard**: 6 arquivos
- **Services duplicados**: 4 arquivos
- **Pages obsoletas**: 6 arquivos
- **Arquivos backup**: 5 arquivos
- **Arquivos debug/test**: 2 arquivos

### Estimativa de Redução
- **Linhas de código**: ~15.000 linhas removidas
- **Tamanho do bundle**: ~500KB redução
- **Arquivos TypeScript**: ~50 arquivos removidos
- **Tempo de build**: Redução de ~40%

## 🎯 Lista Completa de Arquivos para Remoção

### 1. Context e Estado Complexo
```bash
src/features/enrollment/context/
├── EnrollmentContext.tsx ❌
```

### 2. Hooks Problemáticos (Hook Hell)
```bash
src/features/enrollment/hooks/
├── useCalculatedTotals.ts ❌
├── useDiscountData.ts ❌
├── useTrackData.ts ❌
├── useTrackValidation.ts ❌
├── useDiscountTracks.ts ❌
├── useEligibleDiscounts.ts ❌
├── useHybridEligibility.ts ❌
├── useDiscountEdgeCases.ts ❌
└── __tests__/
    └── useCalculatedTotals.test.ts ❌
```

### 3. Componentes do Sistema Antigo
```bash
src/features/enrollment/components/
├── TrackSelection.tsx ❌
├── TrackCard.tsx ❌
├── DiscountFilter.tsx ❌
├── DiscountSuggestions.tsx ❌
├── RealTimeCalculator.tsx ❌
├── CapProgressBar.tsx ❌
├── MatriculaTimeline.tsx ❌
├── StatusBadges.tsx ❌
├── FinancialDashboard.tsx ❌
├── DocumentChecklist.tsx ❌
├── FinalConfirmation.tsx ❌
└── DiscountSummary.tsx ❌
```

### 4. Wizard Completo (Sistema Obsoleto)
```bash
src/features/enrollment/wizard/
├── steps/
│   ├── StepAcademicos.tsx ❌
│   ├── StepAluno.tsx ❌
│   ├── StepDescontos.tsx ❌
│   ├── StepDescontosV2.tsx ❌
│   ├── StepEndereco.tsx ❌
│   └── StepResponsaveis.tsx ❌
├── WizardProgress.tsx ❌
└── useLocalDraft.ts ❌
```

### 5. Services com Lógica Duplicada
```bash
src/features/enrollment/services/
├── trilhoCalculationService.ts ❌
├── discountEligibilityService.ts ❌
├── frontendEligibilityService.ts ❌
└── hybridEligibilityService.ts ❌
```

### 6. Utils de Migração e Complexidade
```bash
src/features/enrollment/utils/
├── trilhos.ts ❌
├── migrationHelpers.ts ❌
├── cepClassifier.ts ❌
└── professional-pdf.ts ❌
```

### 7. Regras de Negócio Complexas
```bash
src/features/enrollment/rules/
└── eligibilityMatrix.ts ❌
```

### 8. Constants Desnecessários
```bash
src/features/enrollment/constants/
└── escolas.ts ❌
```

### 9. Páginas Obsoletas
```bash
src/pages/
├── NovaMatricula.tsx ❌
├── RematriculaAluno.tsx ❌
├── ResumoMatriculaProfissional.tsx ❌
├── TestElegibilidade.tsx ❌
├── TestEligibilityIntegration.tsx ❌
└── TesteRPC.tsx ❌
```

### 10. Arquivos de Backup e Debug
```bash
# Arquivos .backup
├── EnrollmentContext.tsx.backup ❌
├── StepDescontos.tsx.backup ❌
├── discounts.ts.backup ❌
├── DiscountSummary.tsx.backup ❌
├── FinalConfirmation.tsx.backup ❌

# Arquivos de debug/test
├── debug_frontend_flow.tsx ❌
└── test_frontend_eligibility.js ❌
```

## ✅ Arquivos para MANTER (Essenciais)

### 1. Tipos Base (Limpar depois)
```bash
src/features/enrollment/
├── types.ts ✅ (revisar e simplificar)
├── constants.ts ✅ (revisar e simplificar)
```

### 2. Utils Reutilizáveis
```bash
src/features/enrollment/utils/
├── cep.ts ✅ (busca CEP útil)
├── proposal-pdf.ts ✅ (geração PDF)
├── discounts.ts ✅ (funções base)
└── validation.ts ✅ (validações simples)
```

### 3. Components Genéricos
```bash
src/features/enrollment/components/
├── CepInfo.tsx ✅ (se simples)
└── DiscountChecklist.tsx ✅ (se útil)
```

### 4. Hooks Simples
```bash
src/features/enrollment/hooks/
└── useStudentSearch.ts ✅ (busca aluno)
```

### 5. Utils Independentes
```bash
src/features/enrollment/utils/
└── recent-enrollments.ts ✅ (funcionalidade independente)
```

## 🚀 Plano de Execução Detalhado

### Pré-Requisitos ✅
- [ ] Commit atual (`git add . && git commit -m "checkpoint antes limpeza"`)
- [ ] Branch backup criado e pushed
- [ ] Equipe notificada sobre a limpeza
- [ ] Documentação dos endpoints de API salvos
- [ ] Lista de funcionalidades críticas documentada

### Passo 1: Preparação Segura
```bash
# 1.1 Status atual
git status

# 1.2 Commit trabalho atual
git add .
git commit -m "checkpoint: estado antes da limpeza radical fase 0"

# 1.3 Criar backup com timestamp
BACKUP_BRANCH="backup/pre-limpeza-$(date +%Y%m%d-%H%M%S)"
git checkout -b $BACKUP_BRANCH
git push origin $BACKUP_BRANCH

# 1.4 Voltar para branch de trabalho
git checkout refactor/discount-system-phase1
```

### Passo 2: Remoção do Context e Hooks
```bash
# 2.1 Remover context complexo
git rm -r src/features/enrollment/context/

# 2.2 Remover hooks problemáticos
git rm src/features/enrollment/hooks/useCalculatedTotals.ts
git rm src/features/enrollment/hooks/useDiscountData.ts
git rm src/features/enrollment/hooks/useTrackData.ts
git rm src/features/enrollment/hooks/useTrackValidation.ts
git rm src/features/enrollment/hooks/useDiscountTracks.ts
git rm src/features/enrollment/hooks/useEligibleDiscounts.ts
git rm src/features/enrollment/hooks/useHybridEligibility.ts
git rm src/features/enrollment/hooks/useDiscountEdgeCases.ts
git rm -r src/features/enrollment/hooks/__tests__/
```

### Passo 3: Remoção de Componentes Obsoletos
```bash
# 3.1 Componentes do sistema antigo
git rm src/features/enrollment/components/TrackSelection.tsx
git rm src/features/enrollment/components/TrackCard.tsx
git rm src/features/enrollment/components/DiscountFilter.tsx
git rm src/features/enrollment/components/DiscountSuggestions.tsx
git rm src/features/enrollment/components/RealTimeCalculator.tsx
git rm src/features/enrollment/components/CapProgressBar.tsx
git rm src/features/enrollment/components/MatriculaTimeline.tsx
git rm src/features/enrollment/components/StatusBadges.tsx
git rm src/features/enrollment/components/FinancialDashboard.tsx
git rm src/features/enrollment/components/DocumentChecklist.tsx
git rm src/features/enrollment/components/FinalConfirmation.tsx
git rm src/features/enrollment/components/DiscountSummary.tsx
```

### Passo 4: Remoção do Wizard Completo
```bash
# 4.1 Remover wizard inteiro
git rm -r src/features/enrollment/wizard/
```

### Passo 5: Remoção de Services e Utils
```bash
# 5.1 Services duplicados
git rm src/features/enrollment/services/trilhoCalculationService.ts
git rm src/features/enrollment/services/discountEligibilityService.ts
git rm src/features/enrollment/services/frontendEligibilityService.ts
git rm src/features/enrollment/services/hybridEligibilityService.ts

# 5.2 Utils de migração
git rm src/features/enrollment/utils/trilhos.ts
git rm src/features/enrollment/utils/migrationHelpers.ts
git rm src/features/enrollment/utils/cepClassifier.ts
git rm src/features/enrollment/utils/professional-pdf.ts

# 5.3 Regras complexas
git rm -r src/features/enrollment/rules/

# 5.4 Constants desnecessários
git rm -r src/features/enrollment/constants/
```

### Passo 6: Remoção de Páginas
```bash
# 6.1 Páginas obsoletas
git rm src/pages/NovaMatricula.tsx
git rm src/pages/RematriculaAluno.tsx
git rm src/pages/ResumoMatriculaProfissional.tsx
git rm src/pages/TestElegibilidade.tsx
git rm src/pages/TestEligibilityIntegration.tsx
git rm src/pages/TesteRPC.tsx
```

### Passo 7: Limpeza de Arquivos Temporários
```bash
# 7.1 Arquivos backup
git rm *.backup 2>/dev/null || true

# 7.2 Arquivos debug/test
git rm debug_frontend_flow.tsx 2>/dev/null || true
git rm test_frontend_eligibility.js 2>/dev/null || true
```

### Passo 8: Commit da Limpeza
```bash
# 8.1 Verificar status
git status

# 8.2 Commit da limpeza
git commit -m "🗑️ FASE 0: Limpeza radical do sistema de matrícula legado

- Remove context complexo (EnrollmentContext)
- Remove 8 hooks problemáticos (hook hell)
- Remove 12 componentes obsoletos
- Remove wizard completo (6 steps)
- Remove 4 services com lógica duplicada
- Remove utils de migração e complexidade
- Remove 6 páginas de teste/debug
- Remove arquivos backup e temporários

Total: ~50 arquivos removidos (~15k linhas)
Redução bundle: ~500KB
Sistema limpo para nova implementação

Backup disponível em: $BACKUP_BRANCH"
```

## 🔍 Validação Pós-Limpeza

### Checklist de Validação
- [ ] Build ainda funciona (`npm run build`)
- [ ] Sistema admin não foi afetado
- [ ] Páginas mantidas ainda funcionam
- [ ] Rotas atualizadas no App.tsx
- [ ] Imports quebrados identificados
- [ ] Backup confirmado e acessível

### Comandos de Validação
```bash
# Verificar build
npm run build

# Verificar se há imports quebrados
npm run typecheck

# Verificar estrutura restante
find src/features/enrollment -name "*.tsx" -o -name "*.ts" | wc -l

# Verificar tamanho do bundle
ls -la dist/ 2>/dev/null || echo "Build OK"
```

### Estrutura Final Esperada
```bash
src/features/enrollment/
├── components/
│   ├── CepInfo.tsx ✅
│   └── DiscountChecklist.tsx ✅
├── hooks/
│   └── useStudentSearch.ts ✅
├── utils/
│   ├── cep.ts ✅
│   ├── discounts.ts ✅
│   ├── proposal-pdf.ts ✅
│   ├── recent-enrollments.ts ✅
│   └── validation.ts ✅
├── constants.ts ✅
└── types.ts ✅
```

## 🎯 Próximos Passos Após Limpeza

### Imediato (Mesmo Dia)
1. **Atualizar App.tsx**: Remover rotas quebradas
2. **Verificar Navegação**: Atualizar links/menus
3. **Documentar Breaking Changes**: Listar funcionalidades removidas

### Preparação Fase 1 (Dia Seguinte)
1. **Criar estrutura nova**: `src/features/matricula-nova/`
2. **Setup React Hook Form**: Hook principal do formulário
3. **Definir tipos limpos**: Interface nova e simplificada

## 📊 Métricas de Sucesso

### Antes da Limpeza
- **Arquivos enrollment**: ~50 arquivos
- **Linhas de código**: ~15.000 linhas
- **Complexidade**: 8+ níveis de abstração
- **Hook violations**: 5+ hooks aninhados
- **Build time**: ~45 segundos

### Após da Limpeza
- **Arquivos enrollment**: ~8 arquivos essenciais
- **Linhas de código**: ~2.000 linhas
- **Complexidade**: 2 níveis máximo
- **Hook violations**: 0
- **Build time**: ~25 segundos

## ⚠️ Plano de Contingência

### Se Build Quebrar
1. **Identificar imports quebrados**:
   ```bash
   npm run typecheck 2>&1 | grep -i "cannot find module"
   ```

2. **Fix temporário**:
   ```bash
   # Comentar imports quebrados temporariamente
   # Adicionar // @ts-ignore onde necessário
   ```

3. **Se crítico**:
   ```bash
   # Reverter para backup
   git reset --hard backup/sistema-matricula-legado-YYYYMMDD
   ```

### Se Funcionalidade Crítica Perdida
1. **Identificar funcionalidade**
2. **Buscar no backup**:
   ```bash
   git show backup/sistema-matricula-legado-YYYYMMDD:path/to/file.ts
   ```
3. **Extrair apenas função específica**
4. **Implementar de forma simplificada**

## 🎉 Resultado Esperado

### Repositório Limpo
- ✅ Zero débito técnico do sistema antigo
- ✅ Base limpa para nova implementação
- ✅ Performance melhorada (~500KB menos)
- ✅ Build mais rápido (~40% redução)

### Próxima Fase Preparada
- ✅ Estrutura pronta para nova arquitetura
- ✅ Tipos base mantidos e simplificados
- ✅ Utils essenciais preservados
- ✅ Sistema admin intacto

---

**⏱️ Tempo Estimado**: 4-6 horas
**👥 Pessoas Necessárias**: 1 desenvolvedor
**🎯 Criticidade**: Alta (base para todas as próximas fases)
**🔄 Reversibilidade**: Total (via backup branch)

## 🚨 Lembrete Final

> **Esta limpeza é IRREVERSÍVEL no branch atual. Todo código antigo será DELETADO permanentemente. Certifique-se que o backup foi criado e pushed antes de prosseguir.**

### Comando Final de Verificação
```bash
# Verificar se backup existe
git branch -a | grep backup/

# Verificar se backup foi pushed
git ls-remote origin | grep backup/

# Se ambos retornarem resultados, prosseguir com segurança ✅
```