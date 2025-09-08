# 🎓 Plano High-Level: Fluxo de Rematrícula - IESJE (Arquitetura com Nova Tabela)

## 📋 Objetivo Geral
Implementar um fluxo completo de **rematrícula** para alunos já cadastrados no ano anterior, utilizando uma **nova tabela dedicada** (`previous_year_students`) no Supabase, integrando-se de forma robusta ao Sistema de Matrículas e ao Painel Administrativo existentes.

---

## 🔄 MACRO-ETAPA 1: Validação de CPF na Página Inicial

### 🎯 **Objetivo**
Implementar sistema de validação dupla na página inicial (`/`) que direciona o usuário para o fluxo correto baseado no histórico do CPF, consultando a nova tabela dedicada de alunos do ano anterior.

### 📊 **Lógica de Validação**
```
┌─────────────────┐
│ Usuário digita  │
│ CPF na página   │  
│ inicial (/)     │
└─────┬───────────┘
      │
      ▼
┌─────────────────┐    SIM   ┌──────────────────────┐
│ CPF existe na   │ ────────▶│ FLUXO DE REMATRÍCULA │
│ tabela          │          │ (one-page form)      │
│ previous_year_  │          └──────────────────────┘
│ students?       │
└─────┬───────────┘
      │ NÃO
      ▼
┌─────────────────┐    SIM   ┌──────────────────────┐
│ CPF existe na   │ ────────▶│ MENSAGEM DE ERRO:    │
│ tabela          │          │ "CPF já cadastrado   │
│ enrollments     │          │ para 2026"          │
│ (ano atual)?    │          └──────────────────────┘
└─────┬───────────┘
      │ NÃO
      ▼
┌─────────────────┐
│ FLUXO NOVO      │
│ ALUNO           │
│ (/nova-matric.) │
└─────────────────┘
```

### 🛠️ **Implementação Técnica**
- **Hook**: Criar `useStudentValidation(cpf)` que consulta:
  1. **Nova Tabela**: `previous_year_students` (dados de 2025)
  2. **Tabela Atual**: `enrollments` (ano atual 2026)
- **Estados**:
  - `isValidating: boolean`
  - `validationResult: 'not_found' | 'previous_year' | 'current_year'`
  - `studentData: PreviousYearStudentData | null`

### 🗄️ **Nova Arquitetura de Dados**
```typescript
// Dados vindos da nova tabela previous_year_students
interface PreviousYearStudentData {
  id: string
  student_name: string
  student_cpf: string
  student_rg?: string
  student_birth_date: Date
  student_gender: 'M' | 'F' | 'other'
  student_escola: 'pelicano' | 'sete_setembro'
  
  // Dados acadêmicos do ano anterior
  series_id: string
  series_name: string // Ex: "5º ano"
  track_id: string
  track_name: string
  shift: 'morning' | 'afternoon' | 'night'
  
  // Dados dos responsáveis
  guardian1_name: string
  guardian1_cpf: string
  guardian1_phone: string
  guardian1_email: string
  guardian1_relationship: string
  guardian2_name?: string
  guardian2_cpf?: string
  guardian2_phone?: string
  guardian2_email?: string
  guardian2_relationship?: string
  
  // Endereço
  address_cep: string
  address_street: string
  address_number: string
  address_complement?: string
  address_district: string
  address_city: string
  address_state: string
  
  // Dados financeiros do ano anterior
  base_value: number
  total_discount_percentage: number
  final_monthly_value: number
  
  // Descontos aplicados no ano anterior
  applied_discounts: Array<{
    discount_id: string
    discount_code: string
    discount_name: string
    percentage_applied: number
    category: string
  }>
  
  // Metadados
  academic_year: string // "2025"
  enrollment_date: Date
  created_at: Date
  updated_at: Date
}
```

---

## 🏗️ MACRO-ETAPA 2: Componente One-Page de Rematrícula

### 🎯 **Objetivo**
Criar uma experiência de rematrícula simplificada em uma única tela, reutilizando a infraestrutura existente de formulários e validações.

### 📋 **Estrutura do Componente**
```
📂 src/features/rematricula/
├── 📄 pages/
│   └── Rematricula.tsx (página principal)
├── 📄 components/
│   ├── RematriculaForm.tsx (formulário principal)
│   ├── PrefilledDataSection.tsx (dados pré-preenchidos)
│   ├── SeriesSelector.tsx (seleção de nova série)
│   ├── PreviousSeriesDisplay.tsx (exibição série anterior)
│   └── DiscountMigration.tsx (migração de descontos)
├── 📄 hooks/
│   ├── useRematricula.ts (lógica principal)
│   ├── usePrefilledData.ts (dados pré-preenchidos)
│   └── useSeriesProgression.ts (progressão de série)
└── 📄 services/
    ├── rematriculaApi.ts (APIs específicas)
    └── seriesProgression.ts (lógica de progressão)
```

### 🔧 **Funcionalidades**
1. **Dados Pré-preenchidos**:
   - Buscar todos os dados do aluno do ano anterior
   - Permitir edição de campos essenciais (telefone, email, endereço)
   - Campos não editáveis: CPF, RG, data nascimento

2. **Seleção de Série**:
   - Mostrar série anterior (somente leitura)
   - Dropdown com séries disponíveis para o ano atual
   - Validação de progressão lógica (ex: 5º ano → 6º ano)
   - Filtro por escola do usuário logado

3. **Sistema de Descontos**:
   - Carregar descontos aplicados no ano anterior
   - Sugerir manutenção dos mesmos descontos
   - Permitir alteração usando sistema existente de trilhos
   - Validação de eligibilidade para novos descontos

### 🎨 **Layout Visual**
```
┌─────────────────────────────────────────────────────────┐
│ 🎓 REMATRÍCULA 2026 - [Nome do Aluno]                 │
├─────────────────────────────────────────────────────────┤
│ 👤 DADOS DO ALUNO (pré-preenchidos, alguns editáveis) │
│ 👨‍👩‍👧‍👦 RESPONSÁVEIS (editáveis)                          │  
│ 🏠 ENDEREÇO (editável)                                 │
│ 📚 ACADÊMICO:                                          │
│    • Série anterior: [5º ano] (somente leitura)       │
│    • Nova série: [Dropdown: 6º ano] ⬅ obrigatório     │
│    • Trilha: [mesmo do ano anterior ou novo]          │
│ 💰 DESCONTOS:                                          │
│    • Do ano anterior: [IIR 10%, CEP 5%]               │
│    • Manter os mesmos? [Sim/Não]                      │  
│    • Se não: [Sistema de seleção existente]           │
│ 📄 RESUMO FINANCEIRO (calculado automaticamente)       │
│ [📄 Gerar PDF] [✅ Confirmar Rematrícula]             │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 MACRO-ETAPA 3: Integração com Sistema de Descontos

### 🎯 **Objetivo**
Reutilizar 100% do sistema de descontos existente, adaptando apenas para o contexto de rematrícula.

### 🔗 **Pontos de Integração**
1. **Hooks Reutilizados**:
   - `useEligibleDiscounts(cep, allDiscounts, trilhoType)`
   - `useDiscountValidation(selectedDiscounts)`
   - `useDiscountDocuments(selectedDiscounts)`

2. **Lógica de Migração**:
   ```typescript
   interface DiscountMigrationStrategy {
     maintainPrevious: boolean // Manter descontos do ano anterior
     previousDiscounts: PreviousDiscount[]
     eligibleDiscounts: EligibleDiscount[] // Baseado no CEP atual
     
     // Se mantiver: validar se ainda são elegíveis
     validatePreviousEligibility(): ValidationResult
     
     // Se alterar: usar sistema completo de seleção
     allowFullSelection(): void
   }
   ```

3. **Validações Específicas**:
   - Descontos do ano anterior ainda são válidos?
   - CEP mudou → recalcular elegibilidade CEP
   - Família mudou → recalcular desconto irmãos
   - Situação profissional mudou → validar descontos profissionais

### 🧮 **Cálculo de Pricing**
- Reutilizar `usePricingData()` e `useCapCalculation()`
- Considerar valor da nova série selecionada
- Aplicar mesma lógica de trilhos de aprovação

---

## 📄 MACRO-ETAPA 4: Geração de PDF

### 🎯 **Objetivo**
Reutilizar 100% do sistema de geração de PDF existente, apenas adaptando o cabeçalho para indicar "REMATRÍCULA".

### 🔧 **Implementação**
```typescript
interface RematriculaProposalData extends ProposalData {
  isRematricula: true
  previousYear: string // "2025" 
  previousSeries: string // "5º ano"
  newSeries: string // "6º ano"
  keptDiscounts: boolean // Manteve descontos anteriores
  discountChanges?: {
    removed: string[]
    added: string[]  
  }
}
```

### 🎨 **Adaptações Visuais**
- **Cabeçalho**: "PROPOSTA DE REMATRÍCULA 2026"
- **Seção adicional**: "Dados da Matrícula Anterior"
  - Série anterior: [5º ano]
  - Descontos anteriores mantidos: [Sim/Não]
  - Se alterados: listar mudanças
- **Resto**: Idêntico ao PDF de nova matrícula

---

## 🎛️ MACRO-ETAPA 5: Integração com Painel Administrativo

### 🎯 **Objetivo**
Garantir que rematrículas apareçam no painel administrativo com as mesmas funcionalidades de uma matrícula nova.

### 🔗 **Pontos de Integração**

#### 1. **Tabela `enrollments`**
- Adicionar campo `is_rematricula: boolean`
- Adicionar campo `previous_enrollment_id: uuid` (referência ao enrollment do ano anterior)
- Manter todos os outros campos idênticos

#### 2. **Lista de Matrículas (`/admin/matriculas`)**
- Indicador visual para rematrículas (ícone 🔄)
- Filtro adicional: "Apenas rematrículas" / "Apenas novas"
- Coluna adicional: "Série anterior" (se for rematrícula)

#### 3. **Funcionalidades Idênticas**
- ✅ Editar matrícula
- ✅ Soft delete
- ✅ Baixar PDF  
- ✅ Aprovar/rejeitar (se necessário)
- ✅ Visualizar histórico

#### 4. **Página `/matriculas-recentes`**
- Exibir rematrículas junto com novas matrículas
- Mesmo sistema de filtros e busca
- Indicador visual de tipo

### 📊 **Dashboard Estatísticas**
```typescript
interface EnrollmentStats {
  total: number
  newEnrollments: number    // Novas matrículas
  reenrollments: number     // Rematrículas  
  byMonth: {
    month: string
    new: number
    reenrollments: number
  }[]
}
```

---

## 🗃️ MACRO-ETAPA 6: Nova Estrutura de Banco de Dados

### 🎯 **Objetivo**
Criar uma nova tabela dedicada (`previous_year_students`) para armazenar dados de alunos do ano anterior, separando completamente do sistema atual de matrículas.

### 🔧 **Migração Nova: `020_create_previous_year_students.sql`**
```sql
-- =====================================================
-- MIGRATION: 020_create_previous_year_students.sql
-- DESCRIÇÃO: Criação da tabela para alunos do ano anterior (2025)
--            Sistema de rematrícula com arquitetura separada
-- DATA: 2025-01-15
-- =====================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================
-- TABELA PRINCIPAL: previous_year_students
-- ============================
CREATE TABLE IF NOT EXISTS public.previous_year_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Dados do Aluno
  student_name TEXT NOT NULL,
  student_cpf TEXT NOT NULL UNIQUE,
  student_rg TEXT,
  student_birth_date DATE NOT NULL,
  student_gender TEXT CHECK (student_gender IN ('M', 'F', 'other')),
  student_escola TEXT CHECK (student_escola IN ('pelicano', 'sete_setembro')) NOT NULL,

  -- Dados Acadêmicos do Ano Anterior
  series_id TEXT NOT NULL,
  series_name TEXT NOT NULL, -- Ex: "5º ano"
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'afternoon', 'night')),

  -- Dados do Responsável Principal
  guardian1_name TEXT NOT NULL,
  guardian1_cpf TEXT NOT NULL,
  guardian1_phone TEXT NOT NULL,
  guardian1_email TEXT NOT NULL,
  guardian1_relationship TEXT NOT NULL,

  -- Dados do Responsável Secundário (Opcional)
  guardian2_name TEXT,
  guardian2_cpf TEXT,
  guardian2_phone TEXT,
  guardian2_email TEXT,
  guardian2_relationship TEXT,

  -- Endereço
  address_cep TEXT NOT NULL,
  address_street TEXT NOT NULL,
  address_number TEXT NOT NULL,
  address_complement TEXT,
  address_district TEXT NOT NULL,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,

  -- Resumo Financeiro do Ano Anterior
  base_value NUMERIC(10,2) NOT NULL,
  total_discount_percentage NUMERIC(5,2) DEFAULT 0,
  total_discount_value NUMERIC(10,2) DEFAULT 0,
  final_monthly_value NUMERIC(10,2) NOT NULL,
  material_cost NUMERIC(10,2) DEFAULT 0,

  -- Metadados
  academic_year TEXT NOT NULL DEFAULT '2025',
  enrollment_date DATE NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.previous_year_students IS 'Alunos matriculados no ano anterior (2025) para sistema de rematrícula';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_previous_students_cpf ON public.previous_year_students(student_cpf);
CREATE INDEX IF NOT EXISTS idx_previous_students_escola ON public.previous_year_students(student_escola);
CREATE INDEX IF NOT EXISTS idx_previous_students_academic_year ON public.previous_year_students(academic_year);

-- Trigger para updated_at
CREATE TRIGGER update_previous_year_students_updated_at
  BEFORE UPDATE ON public.previous_year_students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ==================================
-- TABELA: previous_year_student_discounts (filha)
-- ==================================
CREATE TABLE IF NOT EXISTS public.previous_year_student_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.previous_year_students(id) ON DELETE CASCADE,

  discount_id TEXT NOT NULL,
  discount_code TEXT NOT NULL,
  discount_name TEXT NOT NULL,
  discount_category TEXT NOT NULL,
  percentage_applied NUMERIC(5,2) NOT NULL,
  value_applied NUMERIC(10,2) NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prev_student_discounts_student_id ON public.previous_year_student_discounts(student_id);
COMMENT ON TABLE public.previous_year_student_discounts IS 'Descontos aplicados aos alunos do ano anterior';

-- ============================
-- ALTERAÇÕES NA TABELA enrollments (mínimas)
-- ============================
-- Adicionar apenas campos para referenciar rematrícula
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS 
  is_rematricula BOOLEAN DEFAULT FALSE;
  
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS 
  previous_year_student_id UUID REFERENCES public.previous_year_students(id);

-- Índice para rastreamento de rematrículas
CREATE INDEX IF NOT EXISTS idx_enrollments_rematricula ON public.enrollments(is_rematricula);
CREATE INDEX IF NOT EXISTS idx_enrollments_previous_student ON public.enrollments(previous_year_student_id);

-- ============================
-- RLS: Habilitar segurança
-- ============================
ALTER TABLE public.previous_year_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.previous_year_student_discounts ENABLE ROW LEVEL SECURITY;

-- Políticas: Leitura pública para rematrícula, gestão por admins
CREATE POLICY "Público pode ler previous_year_students"
  ON public.previous_year_students
  FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar previous_year_students"
  ON public.previous_year_students
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Políticas para descontos
CREATE POLICY "Público pode ler previous_year_student_discounts"
  ON public.previous_year_student_discounts
  FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar previous_year_student_discounts"
  ON public.previous_year_student_discounts
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Grants
GRANT SELECT ON public.previous_year_students TO anon, authenticated;
GRANT SELECT ON public.previous_year_student_discounts TO anon, authenticated;
GRANT ALL ON public.previous_year_students TO service_role;
GRANT ALL ON public.previous_year_student_discounts TO service_role;

-- ============================
-- FUNÇÕES AUXILIARES
-- ============================
-- Função para buscar aluno do ano anterior por CPF
CREATE OR REPLACE FUNCTION get_previous_year_student_by_cpf(cpf_param TEXT)
RETURNS public.previous_year_students AS $$
DECLARE
  student_record public.previous_year_students;
BEGIN
  SELECT * INTO student_record
  FROM public.previous_year_students
  WHERE student_cpf = cpf_param
  LIMIT 1;
  
  RETURN student_record;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar descontos do aluno do ano anterior
CREATE OR REPLACE FUNCTION get_previous_year_student_discounts(student_id_param UUID)
RETURNS SETOF public.previous_year_student_discounts AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.previous_year_student_discounts
  WHERE student_id = student_id_param
  ORDER BY created_at;
END;
$$ LANGUAGE plpgsql;

-- ============================
-- DADOS DE EXEMPLO/TESTE
-- ============================
-- Inserir alguns dados de exemplo para testes
INSERT INTO public.previous_year_students (
  student_name, student_cpf, student_birth_date, student_gender, student_escola,
  series_id, series_name, track_id, track_name, shift,
  guardian1_name, guardian1_cpf, guardian1_phone, guardian1_email, guardian1_relationship,
  address_cep, address_street, address_number, address_district, address_city, address_state,
  base_value, total_discount_percentage, total_discount_value, final_monthly_value,
  academic_year, enrollment_date
) VALUES 
(
  'João Silva Santos', '12345678901', '2010-05-15', 'M', 'pelicano',
  'ef1_5ano', '5º ano', 'regular', 'Trilha Regular', 'morning',
  'Maria Silva Santos', '98765432101', '(35) 99999-1234', 'maria@email.com', 'mae',
  '37701000', 'Rua das Flores', '123', 'Centro', 'Poços de Caldas', 'MG',
  1100.00, 15.0, 165.00, 935.00,
  '2025', '2025-02-15'
),
(
  'Ana Costa Oliveira', '11122233344', '2008-08-20', 'F', 'sete_setembro',
  'ef2_7ano', '7º ano', 'integral', 'Trilha Integral', 'morning',
  'Carlos Costa Oliveira', '44433322211', '(35) 98888-5678', 'carlos@email.com', 'pai',
  '37715000', 'Av. Central', '456', 'Jardim Quisisana', 'Poços de Caldas', 'MG',
  1300.00, 20.0, 260.00, 1040.00,
  '2025', '2025-01-30'
) ON CONFLICT (student_cpf) DO NOTHING;

-- Inserir descontos de exemplo
INSERT INTO public.previous_year_student_discounts (
  student_id, discount_id, discount_code, discount_name, discount_category, 
  percentage_applied, value_applied
) 
SELECT 
  pys.id, 'iir_10', 'IIR', 'Irmãos Carnal', 'familiar', 10.0, 110.00
FROM public.previous_year_students pys 
WHERE pys.student_cpf = '12345678901'
UNION ALL
SELECT 
  pys.id, 'cep5', 'CEP5', 'CEP Bairro Menor Renda', 'geografico', 5.0, 55.00
FROM public.previous_year_students pys 
WHERE pys.student_cpf = '12345678901'
UNION ALL
SELECT 
  pys.id, 'res_20', 'RES', 'Residência Outra Cidade', 'geografico', 20.0, 260.00
FROM public.previous_year_students pys 
WHERE pys.student_cpf = '11122233344';
```

### 🎯 **Vantagens da Nova Arquitetura**
1. **Separação Limpa**: Dados de anos diferentes em tabelas diferentes
2. **Performance**: Índices específicos para consultas de rematrícula
3. **Escalabilidade**: Facilita criação de tabelas para outros anos
4. **Manutenibilidade**: Estrutura clara e específica para cada finalidade
5. **Histórico**: Preserva dados históricos sem interferir no sistema atual

---

## 🚀 MACRO-ETAPA 7: Implementação de Rotas

### 🎯 **Objetivo** 
Adicionar as rotas necessárias ao sistema de routing existente.

### 🛤️ **Novas Rotas**
```typescript
// src/App.tsx - Adicionar rotas
<Routes>
  {/* ... rotas existentes */}
  
  {/* Nova rota de rematrícula */}
  <Route path="/rematricula/:cpf" element={<Rematricula />} />
  
  {/* Redirect da página inicial para rematrícula */}
  <Route path="/rematricula" element={<Navigate to="/" />} />
</Routes>
```

### 🔄 **Fluxo de Navegação**
```
Página Inicial (/) 
  → Usuário digita CPF
  → Se CPF encontrado em 2025: 
    → Navigate to `/rematricula/${cpf}`
    → Componente Rematricula carrega dados
```

---

## ⚡ MACRO-ETAPA 8: Performance e Otimizações

### 🎯 **Objetivo**
Garantir que o fluxo de rematrícula seja performático e robusto.

### 🔧 **Estratégias**
1. **Cache de Dados**:
   ```typescript
   // Cache dos dados do ano anterior por 1 hora
   const { data: previousData } = useQuery({
     queryKey: ['previous-year-student', cpf],
     queryFn: () => getPreviousYearStudentData(cpf),
     staleTime: 1000 * 60 * 60, // 1 hora
     cacheTime: 1000 * 60 * 60 * 2 // 2 horas
   })
   ```

2. **Loading States**:
   - Loading inicial (busca dados anteriores)
   - Loading de validação de descontos
   - Loading de geração de PDF
   - Loading de submissão

3. **Error Handling**:
   - CPF não encontrado no ano anterior
   - CPF já matriculado no ano atual
   - Erro ao carregar dados de séries/trilhos
   - Falha na geração de PDF
   - Erro na submissão

4. **Validações Client-side**:
   - Validar se nova série é progressão lógica
   - Validar se descontos anteriores ainda são elegíveis
   - Validar dados obrigatórios antes de submeter

---

## 🧪 MACRO-ETAPA 9: Testes e Validações

### 🎯 **Objetivo**
Definir cenários de teste para garantir robustez do fluxo.

### 🧪 **Cenários de Teste**

#### 1. **Validação de CPF**
- ✅ CPF válido encontrado no ano anterior
- ✅ CPF não encontrado em nenhum ano
- ✅ CPF já cadastrado no ano atual
- ✅ CPF inválido (formato)

#### 2. **Carregamento de Dados**
- ✅ Dados completos do ano anterior
- ✅ Dados parciais (responsável secundário ausente)
- ✅ Múltiplas matrículas do mesmo CPF em 2025 (usar a mais recente)

#### 3. **Sistema de Descontos**
- ✅ Manter descontos anteriores elegíveis
- ✅ Detectar descontos não elegíveis (CEP mudou)
- ✅ Adicionar novos descontos
- ✅ Remover descontos anteriores

#### 4. **Progressão de Série**
- ✅ Progressão normal (5º → 6º ano)
- ✅ Mudança de escola (Pelicano → Sete de Setembro)
- ✅ Repetência (mesma série)
- ✅ Série fora da sequência lógica

#### 5. **Integração Administrativa**
- ✅ Rematrícula aparece no painel admin
- ✅ Campos específicos são exibidos
- ✅ Funcionalidades de edição/exclusão funcionam
- ✅ PDF é gerado corretamente

---

## 📈 MACRO-ETAPA 10: Monitoramento e Métricas

### 🎯 **Objetivo**
Implementar tracking para acompanhar o sucesso do fluxo de rematrícula.

### 📊 **Métricas a Acompanhar**
```typescript
interface RematriculaMetrics {
  // Funil de conversão
  cpfValidations: number      // CPFs consultados
  eligibleForRematricula: number // CPFs encontrados em 2025
  startedRematricula: number  // Iniciaram o formulário
  completedRematricula: number // Finalizaram com sucesso
  
  // Performance
  averageTimeToComplete: number // Tempo médio para completar
  errorRate: number             // Taxa de erro
  
  // Comportamento
  keptAllDiscounts: number    // Mantiveram todos os descontos
  changedDiscounts: number    // Alteraram descontos
  seriesProgression: Record<string, number> // Ex: "5º→6º": 150
  
  // Administrativo
  requiresApproval: number    // Que precisam aprovação
  autoApproved: number       // Aprovação automática
}
```

### 📝 **Logs de Auditoria**
```typescript
// Adicionar logs específicos para rematrícula
audit_logs:
- "rematricula_started" → { cpf, previous_enrollment_id }
- "rematricula_discounts_changed" → { removed: [], added: [] }
- "rematricula_completed" → { enrollment_id, approval_level }
- "rematricula_error" → { error_type, error_message }
```

---

## 🎯 CRONOGRAMA DE IMPLEMENTAÇÃO

### **Fase 1: Fundação (Semana 1-2)**
- [ ] Migração de banco (`020_add_rematricula_support.sql`)
- [ ] Hook `useStudentValidation` 
- [ ] Validação de CPF na página inicial
- [ ] Estrutura base de componentes

### **Fase 2: Formulário de Rematrícula (Semana 3-4)**
- [ ] Componente `RematriculaForm`
- [ ] Sistema de dados pré-preenchidos
- [ ] Seleção de série com validação
- [ ] Integração com sistema de descontos

### **Fase 3: PDF e Finalização (Semana 5)**
- [ ] Adaptação do gerador de PDF
- [ ] Submissão e gravação no banco
- [ ] Testes de fluxo completo

### **Fase 4: Integração Administrativa (Semana 6)**
- [ ] Atualização do painel administrativo
- [ ] Filtros e visualizações específicas
- [ ] Funcionalidades de gestão

### **Fase 5: Testes e Refinamentos (Semana 7-8)**
- [ ] Testes automatizados
- [ ] Testes de usabilidade
- [ ] Performance optimization
- [ ] Documentação técnica

---

## ✅ CHECKLIST DE ENTREGA

### **Funcionalidades Core**
- [ ] ✅ Validação de CPF na página inicial
- [ ] ✅ Formulário one-page de rematrícula
- [ ] ✅ Sistema de descontos integrado
- [ ] ✅ Geração de PDF específico para rematrícula
- [ ] ✅ Gravação na tabela `enrollments`
- [ ] ✅ Integração completa com painel administrativo

### **Qualidade e Performance**
- [ ] ✅ Loading states em todas as operações
- [ ] ✅ Error handling robusto
- [ ] ✅ Validações client-side e server-side
- [ ] ✅ Cache de dados otimizado
- [ ] ✅ Responsividade mobile

### **Integração e Consistência**
- [ ] ✅ Mesma UX do fluxo de nova matrícula
- [ ] ✅ Reutilização máxima de componentes existentes
- [ ] ✅ Consistência visual e de comportamento
- [ ] ✅ Compatibilidade com sistema de permissões

### **Monitoramento e Manutenibilidade**
- [ ] ✅ Logs de auditoria implementados
- [ ] ✅ Métricas de conversão configuradas
- [ ] ✅ Documentação técnica completa
- [ ] ✅ Testes automatizados cobrindo cenários críticos

---

## 🏆 RESULTADOS ESPERADOS

### **Experiência do Usuário**
- ⚡ **Velocidade**: Rematrícula em **menos de 2 minutos**
- 🎯 **Simplicidade**: **Uma única tela** para todo o processo
- ✅ **Conveniência**: **Dados pré-preenchidos** do ano anterior
- 🔄 **Flexibilidade**: Manter ou alterar descontos facilmente

### **Eficiência Administrativa**
- 📊 **Visibilidade**: Rematrículas integradas ao painel existente
- 🔍 **Rastreabilidade**: Histórico completo de mudanças
- ⚖️ **Consistência**: Mesmo fluxo de aprovação e gestão
- 📈 **Métricas**: Dashboard com dados de rematrícula

### **Robustez Técnica**
- 🛡️ **Segurança**: Mesmas validações e permissões
- ⚡ **Performance**: Cache inteligente e operações otimizadas
- 🔧 **Manutenibilidade**: Código reutilizado e bem estruturado
- 📚 **Escalabilidade**: Preparado para grandes volumes

---

## 📚 DOCUMENTAÇÃO TÉCNICA

### **Arquivos Principais (Nova Arquitetura)**
```
src/features/rematricula/
├── pages/Rematricula.tsx
├── hooks/useRematricula.ts
├── hooks/usePreviousYearStudent.ts (novo - acessa nova tabela)
├── components/RematriculaForm.tsx
├── components/PreviousYearDataDisplay.tsx (novo)
└── services/previousYearStudentsApi.ts (novo)

src/features/enrollment/
├── hooks/useStudentValidation.ts (novo - consulta ambas tabelas)
└── components/StudentValidation.tsx (novo)

supabase/migrations/
└── 020_create_previous_year_students.sql (nova arquitetura)
```

### **APIs Principais (Nova Arquitetura)**
- `GET /api/students/validate-cpf/:cpf` - Validação em ambas tabelas
- `GET /api/previous-year-students/:cpf` - Busca na nova tabela dedicada
- `GET /api/previous-year-students/:id/discounts` - Descontos do ano anterior
- `POST /api/enrollments` - Criação com referência (previous_year_student_id)

### **Hooks Principais (Atualizados)**
- `useStudentValidation(cpf)` - Consulta `previous_year_students` e `enrollments`
- `usePreviousYearStudent(cpf)` - Hook específico para nova tabela
- `useRematricula(previousStudentData)` - Lógica do formulário com dados pré-carregados
- `useSeriesProgression(currentSeries)` - Validação de progressão

### **Funções SQL Principais**
- `get_previous_year_student_by_cpf(cpf)` - Busca aluno do ano anterior
- `get_previous_year_student_discounts(student_id)` - Busca descontos aplicados

---

**🎯 Este plano garante uma implementação robusta, escalável e consistente do fluxo de rematrícula, reutilizando ao máximo a infraestrutura existente e mantendo a qualidade técnica do sistema.**