# 🎯 Sistema de Trilhos de Desconto - Design & Implementação

## Visão Geral

Este documento define a estratégia design-first para implementação do sistema de trilhos de desconto na etapa 5 do processo de matrícula, garantindo uma experiência de usuário intuitiva e eficiente.

---

## 🎨 ANÁLISE DA JORNADA DO USUÁRIO (Design-First)

### **Momento 1: Chegada na Etapa 5**
**Pergunta mental do usuário:** *"Que tipos de desconto posso ter?"*

**Proposta de Interface:**
- **3 Cards grandes lado a lado** representando os trilhos
- Visual de "escolha única" - apenas 1 trilho por matrícula
- Cada card com:
  - Ícone distintivo e cores únicas
  - Título claro e objetivo
  - Explicação simples das regras
  - Exemplo de valor/percentual
  - Indicador visual de "exclusividade"
  - Estado de seleção claro

### **Momento 2: Seleção do Trilho**
**Pergunta mental:** *"Qual me dá mais vantagem?"*

**Cards Propostos:**

```
🌟 TRILHO A - ESPECIAL
"Descontos Altos Exclusivos"
• Bolsas de Filantropia
• Filhos de Funcionários  
• Até 100% de desconto
• ⚠️ Bloqueia outros descontos
[Selecionar Trilho]

📋 TRILHO B - COMBINADO  
"Regular + Negociação"
• Irmãos, Pagamento à Vista
• + Descontos comerciais
• Cap total: até 25%
• 💡 Melhor custo-benefício
[Selecionar Trilho]

🤝 TRILHO C - COMERCIAL
"Apenas Negociação"
• CEP, Adimplência
• Descontos comerciais
• Cap total: até 12%
• 🔄 Máxima flexibilidade
[Selecionar Trilho]
```

### **Momento 3: Seleção de Descontos Específicos**
**Pergunta mental:** *"Quais descontos posso aplicar neste trilho?"*

**Interface Dinâmica:**
- **Barra de progresso do cap** no topo da tela
- **Breadcrumb:** "Etapa 5 > Trilho B Selecionado > Escolha seus Descontos"
- Lista filtrada mostrando apenas descontos compatíveis
- **Descontos incompatíveis:** visualmente desabilitados/ocultos
- **Calculadora em tempo real:** valor final atualizado a cada seleção
- **Sistema de cores:** verde (ok), amarelo (próximo ao limite), vermelho (excedeu)
- **Tooltips explicativos** para cada tipo de desconto

### **Momento 4: Validação e Feedback**
**Pergunta mental:** *"Está tudo certo? Posso mudar?"*

**Interface de Confirmação:**
- Resumo visual do trilho escolhido
- Lista clara de descontos aplicados com valores
- **Valor final destacado** com economia total
- **Botão "Alterar Trilho"** (volta ao Momento 1)
- **Documentos necessários** listados claramente
- **Próximos passos** explicados

---

## 📋 PLANO DE IMPLEMENTAÇÃO TÉCNICA

### **1. AJUSTES NO BANCO DE DADOS**

#### **1.1 Nova Estrutura de Trilhos**

```sql
-- Tabela principal de trilhos
CREATE TABLE trilhos_desconto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(50) NOT NULL UNIQUE, -- 'especial', 'combinado', 'comercial'
  titulo VARCHAR(100) NOT NULL, -- "Desconto Especial", "Regular + Negociação"
  descricao TEXT,
  icone VARCHAR(10), -- emoji ou classe CSS
  cor_primaria VARCHAR(7), -- hex color
  cap_maximo DECIMAL(5,2), -- NULL para especial, valor para outros
  ativo BOOLEAN DEFAULT true,
  ordem_exibicao INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de regras de compatibilidade entre trilhos e categorias
CREATE TABLE regras_trilhos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trilho_id UUID REFERENCES trilhos_desconto(id) ON DELETE CASCADE,
  categoria_permitida categoria_desconto NOT NULL,
  pode_combinar_com categoria_desconto[], -- categorias que podem ser combinadas
  prioridade INTEGER DEFAULT 0, -- ordem de exibição dentro do trilho
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações administrativas de caps
CREATE TABLE config_caps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cap_with_secondary DECIMAL(5,2) DEFAULT 25.00, -- Trilho B
  cap_without_secondary DECIMAL(5,2) DEFAULT 12.00, -- Trilho C
  updated_by UUID REFERENCES admin_users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auditoria: registrar trilho escolhido em cada matrícula
ALTER TABLE matriculas ADD COLUMN trilho_escolhido VARCHAR(20);
ALTER TABLE matriculas ADD COLUMN cap_aplicado DECIMAL(5,2);
ALTER TABLE matriculas ADD COLUMN trilho_metadata JSONB; -- dados extras do trilho

-- Índices para performance
CREATE INDEX idx_trilhos_ativo ON trilhos_desconto(ativo, ordem_exibicao);
CREATE INDEX idx_regras_trilho ON regras_trilhos(trilho_id, categoria_permitida);
CREATE INDEX idx_matriculas_trilho ON matriculas(trilho_escolhido);
```

#### **1.2 Seeds/Dados Iniciais**

```sql
-- Inserir trilhos padrão
INSERT INTO trilhos_desconto (nome, titulo, descricao, icone, cor_primaria, cap_maximo, ordem_exibicao) VALUES
('especial', 'Desconto Especial', 'Bolsas de filantropia e filhos de funcionários com descontos exclusivos', '🌟', '#8B5CF6', NULL, 1),
('combinado', 'Regular + Negociação', 'Combine descontos regulares com comerciais até o limite permitido', '📋', '#3B82F6', 25.00, 2),
('comercial', 'Apenas Negociação', 'Descontos comerciais com flexibilidade de negociação', '🤝', '#F59E0B', 12.00, 3);

-- Configurar regras de compatibilidade
INSERT INTO regras_trilhos (trilho_id, categoria_permitida, pode_combinar_com) VALUES
-- Trilho Especial: apenas especiais, sem combinação
((SELECT id FROM trilhos_desconto WHERE nome = 'especial'), 'especial', ARRAY[]::categoria_desconto[]),
-- Trilho Combinado: regulares + negociação
((SELECT id FROM trilhos_desconto WHERE nome = 'combinado'), 'regular', ARRAY['negociacao']),
((SELECT id FROM trilhos_desconto WHERE nome = 'combinado'), 'negociacao', ARRAY['regular']),
-- Trilho Comercial: apenas negociação
((SELECT id FROM trilhos_desconto WHERE nome = 'comercial'), 'negociacao', ARRAY[]::categoria_desconto[]);

-- Configuração inicial de caps
INSERT INTO config_caps (cap_with_secondary, cap_without_secondary) VALUES (25.00, 12.00);
```

### **2. AJUSTES NO BACKEND/HOOKS**

#### **2.1 Novos Hooks React Query**

```typescript
// Hook para buscar trilhos disponíveis
export const useDiscountTracks = () => {
  return useQuery({
    queryKey: ['discount-tracks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select(`
          *,
          regras:regras_trilhos(
            categoria_permitida,
            pode_combinar_com,
            prioridade
          )
        `)
        .eq('ativo', true)
        .order('ordem_exibicao');
      
      if (error) throw error;
      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  });
};

// Hook para validar compatibilidade de desconto com trilho
export const useTrackCompatibility = (trackId: string) => {
  return useQuery({
    queryKey: ['track-compatibility', trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regras_trilhos')
        .select('*')
        .eq('trilho_id', trackId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!trackId,
  });
};

// Hook para buscar configurações de caps
export const useCapLimits = () => {
  return useQuery({
    queryKey: ['cap-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_caps')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    },
  });
};

// Hook para validação em tempo real
export const useTrackValidation = (
  selectedTrack: string, 
  selectedDiscounts: Desconto[]
) => {
  return useMemo(() => {
    // Lógica de validação
    // - Verificar se descontos são compatíveis com o trilho
    // - Calcular total de desconto
    // - Verificar se excede o cap
    // - Retornar status e mensagens
    
    return {
      isValid: boolean,
      totalDiscount: number,
      remainingCap: number,
      errors: string[],
      warnings: string[]
    };
  }, [selectedTrack, selectedDiscounts]);
};
```

#### **2.2 Tipos TypeScript**

```typescript
export interface TrilhoDesconto {
  id: string;
  nome: 'especial' | 'combinado' | 'comercial';
  titulo: string;
  descricao: string;
  icone: string;
  cor_primaria: string;
  cap_maximo: number | null;
  ativo: boolean;
  ordem_exibicao: number;
  regras: RegraTrilho[];
}

export interface RegraTrilho {
  id: string;
  trilho_id: string;
  categoria_permitida: CategoriaDesconto;
  pode_combinar_com: CategoriaDesconto[];
  prioridade: number;
}

export interface ConfigCaps {
  id: string;
  cap_with_secondary: number;
  cap_without_secondary: number;
  updated_by: string;
  updated_at: string;
}

export interface TrackValidationResult {
  isValid: boolean;
  totalDiscount: number;
  remainingCap: number;
  capPercentage: number;
  errors: string[];
  warnings: string[];
  appliedDiscounts: Desconto[];
}
```

### **3. AJUSTES NO PAINEL ADMINISTRATIVO**

#### **3.1 Nova Seção: "Configuração de Trilhos"**

**Menu Principal:**
```
📊 Dashboard
👥 Usuários Admin
📋 Séries/Anos
🎯 Tipos de Desconto
🛤️ Trilhos de Desconto ← NOVO
🏠 Faixas CEP
⚙️ Configurações Sistema
```

**Funcionalidades da Nova Seção:**

1. **Gerenciar Caps de Desconto**
   - Interface para definir CAP_WITH_SECONDARY e CAP_WITHOUT_SECONDARY
   - Histórico de mudanças nos caps
   - Simulador de impacto das mudanças

2. **Controle de Trilhos**
   - Habilitar/Desabilitar trilhos por período
   - Configurar ordem de exibição
   - Personalizar textos e cores

3. **Relatórios de Uso**
   - Estatísticas de uso por trilho
   - Análise de descontos mais aplicados
   - Relatório de caps atingidos

4. **Simulador de Trilhos**
   - Ferramenta para testar combinações
   - Validação de regras de negócio
   - Preview da interface do usuário

5. **Regras de Negócio**
   - Interface para ajustar compatibilidades
   - Configurar exceções por período
   - Definir regras especiais por escola

#### **3.2 Componentes Admin Propostos**

```typescript
// Componentes para o painel admin
<TrackManagement>
  <TrackConfigCard trilho="especial" />
  <TrackConfigCard trilho="combinado" />
  <TrackConfigCard trilho="comercial" />
</TrackManagement>

<CapLimitsConfiguration>
  <CapSlider 
    label="Cap com Secundário (Trilho B)"
    value={capWithSecondary}
    max={50}
    onChange={updateCapWithSecondary}
  />
  <CapSlider 
    label="Cap sem Secundário (Trilho C)"
    value={capWithoutSecondary}
    max={25}
    onChange={updateCapWithoutSecondary}
  />
</CapLimitsConfiguration>

<TrackReports>
  <UsageChart />
  <DiscountDistribution />
  <CapUtilization />
</TrackReports>
```

### **4. AJUSTES NO SISTEMA DE MATRÍCULA**

#### **4.1 Nova Interface da Etapa 5**

**Estrutura de Componentes:**

```typescript
<DiscountTrackWizard>
  {/* Passo 1: Seleção do Trilho */}
  <TrackSelectionStep>
    <StepHeader 
      title="Escolha seu Trilho de Desconto"
      description="Selecione apenas UMA opção que melhor se adequa ao seu perfil"
    />
    <TrackCardsContainer>
      <TrackCard 
        trilho="especial"
        selected={selectedTrack === 'especial'}
        disabled={!canSelectSpecial}
        onClick={handleTrackSelection}
      />
      <TrackCard 
        trilho="combinado"
        selected={selectedTrack === 'combinado'}
        onClick={handleTrackSelection}
      />
      <TrackCard 
        trilho="comercial"
        selected={selectedTrack === 'comercial'}
        onClick={handleTrackSelection}
      />
    </TrackCardsContainer>
  </TrackSelectionStep>
  
  {/* Passo 2: Seleção de Descontos Específicos */}
  <DiscountSelectionStep visible={!!selectedTrack}>
    <CapProgressBar 
      current={currentDiscountTotal}
      maximum={trackCapLimit}
      trackType={selectedTrack}
    />
    <DiscountFilters>
      <CategoryFilter categories={availableCategories} />
      <SearchFilter placeholder="Buscar desconto..." />
    </DiscountFilters>
    <FilteredDiscountList 
      trilho={selectedTrack}
      onDiscountToggle={handleDiscountToggle}
      selectedDiscounts={selectedDiscounts}
      compatibilityRules={trackRules}
    />
    <RealTimeCalculator 
      baseMensal={baseMensal}
      selectedDiscounts={selectedDiscounts}
      onCalculationUpdate={handleCalculationUpdate}
    />
  </DiscountSelectionStep>
  
  {/* Passo 3: Confirmação */}
  <ConfirmationStep visible={selectedDiscounts.length > 0}>
    <TrackSummary 
      trilho={selectedTrack}
      totalDiscountPercentage={totalDiscount}
      capUsed={capPercentage}
    />
    <AppliedDiscountsList 
      discounts={selectedDiscounts}
      onRemoveDiscount={handleRemoveDiscount}
    />
    <FinalValueDisplay 
      originalValue={baseMensal}
      finalValue={finalValue}
      totalSavings={totalSavings}
    />
    <DocumentRequirements 
      requiredDocs={requiredDocuments}
    />
    <ActionButtons>
      <Button variant="outline" onClick={handleChangeTrack}>
        Alterar Trilho
      </Button>
      <Button onClick={handleConfirmDiscounts}>
        Confirmar Descontos
      </Button>
    </ActionButtons>
  </ConfirmationStep>
</DiscountTrackWizard>
```

#### **4.2 Componentes de UI Detalhados**

**1. TrackCard - Card de Seleção de Trilho**
```typescript
interface TrackCardProps {
  trilho: TrilhoDesconto;
  selected: boolean;
  disabled?: boolean;
  onClick: (trilho: string) => void;
}

const TrackCard: FC<TrackCardProps> = ({ trilho, selected, disabled, onClick }) => {
  return (
    <Card 
      className={`
        cursor-pointer transition-all duration-200 hover:shadow-lg
        ${selected ? 'ring-2 ring-primary shadow-lg scale-105' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      onClick={() => !disabled && onClick(trilho.nome)}
    >
      <CardContent className="p-6 text-center">
        <div className="text-4xl mb-4">{trilho.icone}</div>
        <h3 className="text-xl font-bold mb-2">{trilho.titulo}</h3>
        <p className="text-muted-foreground mb-4">{trilho.descricao}</p>
        
        {trilho.cap_maximo && (
          <Badge variant="outline" className="mb-4">
            Cap máximo: {trilho.cap_maximo}%
          </Badge>
        )}
        
        <div className="space-y-2">
          {/* Exemplos de descontos do trilho */}
          <div className="text-sm text-muted-foreground">
            Exemplos: IIR, PAV, CEP
          </div>
        </div>
        
        {selected && (
          <div className="mt-4 flex items-center justify-center text-primary">
            <Check className="h-5 w-5 mr-2" />
            Trilho Selecionado
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

**2. CapProgressBar - Barra de Progresso do Cap**
```typescript
interface CapProgressBarProps {
  current: number;
  maximum: number;
  trackType: string;
}

const CapProgressBar: FC<CapProgressBarProps> = ({ current, maximum, trackType }) => {
  const percentage = (current / maximum) * 100;
  const isNearLimit = percentage > 80;
  const isOverLimit = percentage > 100;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">
          Uso do Cap de Desconto ({trackType})
        </span>
        <span className={`text-sm font-bold ${
          isOverLimit ? 'text-red-600' : 
          isNearLimit ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {current.toFixed(1)}% de {maximum}%
        </span>
      </div>
      
      <Progress 
        value={Math.min(percentage, 100)} 
        className={`h-3 ${
          isOverLimit ? '[&>div]:bg-red-500' :
          isNearLimit ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
        }`}
      />
      
      {isOverLimit && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Cap de desconto excedido! Remova alguns descontos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
```

**3. RealTimeDiscountCalculator - Calculadora em Tempo Real**
```typescript
interface RealTimeCalculatorProps {
  baseMensal: number;
  selectedDiscounts: Desconto[];
  onCalculationUpdate: (result: CalculationResult) => void;
}

const RealTimeCalculator: FC<RealTimeCalculatorProps> = ({ 
  baseMensal, 
  selectedDiscounts, 
  onCalculationUpdate 
}) => {
  const calculation = useMemo(() => {
    const totalDiscount = selectedDiscounts.reduce((sum, discount) => 
      sum + (discount.percentual_aplicado || 0), 0
    );
    
    const discountValue = (baseMensal * totalDiscount) / 100;
    const finalValue = baseMensal - discountValue;
    
    return {
      totalDiscount,
      discountValue,
      finalValue,
      savings: discountValue
    };
  }, [baseMensal, selectedDiscounts]);
  
  useEffect(() => {
    onCalculationUpdate(calculation);
  }, [calculation, onCalculationUpdate]);
  
  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-green-200">
      <CardContent className="p-4">
        <h4 className="font-semibold mb-3 flex items-center">
          <Calculator className="h-5 w-5 mr-2 text-green-600" />
          Cálculo em Tempo Real
        </h4>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Valor Base:</span>
            <div className="font-bold">R$ {baseMensal.toFixed(2)}</div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Total Desconto:</span>
            <div className="font-bold text-green-600">
              {calculation.totalDiscount.toFixed(1)}%
            </div>
          </div>
          
          <div>
            <span className="text-muted-foreground">Valor Desconto:</span>
            <div className="font-bold text-green-600">
              -R$ {calculation.discountValue.toFixed(2)}
            </div>
          </div>
          
          <div className="p-2 bg-white rounded border">
            <span className="text-muted-foreground">Valor Final:</span>
            <div className="font-bold text-lg text-primary">
              R$ {calculation.finalValue.toFixed(2)}
            </div>
          </div>
        </div>
        
        {calculation.savings > 0 && (
          <div className="mt-3 text-center">
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              💰 Você economiza R$ {calculation.savings.toFixed(2)} por mês!
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
```

---

## 🎨 PRINCÍPIOS DE UX APLICADOS

### **1. Progressive Disclosure**
- **Informações reveladas gradualmente** conforme o usuário avança
- **Trilhos apresentados primeiro**, detalhes dos descontos depois
- **Documentos necessários** mostrados apenas na confirmação

### **2. Affordance (Capacidade de Uso)**
- **Cards clicáveis** com hover states claros
- **Estados visuais distintos:** selecionado, disponível, desabilitado
- **Ícones universais** para diferentes ações

### **3. Feedback Imediato**
- **Cálculo em tempo real** do valor final
- **Barra de progresso** do cap atualizada instantaneamente
- **Validação visual** com cores (verde/amarelo/vermelho)

### **4. Error Prevention**
- **Descontos incompatíveis** automaticamente desabilitados
- **Avisos antes** de exceder limites
- **Confirmação clara** antes de trocar trilho

### **5. User Control and Freedom**
- **Botão "Alterar Trilho"** sempre visível
- **Capacidade de remover** descontos selecionados
- **Navegação livre** entre etapas

### **6. Consistency**
- **Visual padronizado** com resto do sistema IESJE
- **Terminologia consistente** entre painel admin e matrícula
- **Comportamentos previsíveis** em elementos similares

---

## 📊 MÉTRICAS DE SUCESSO

### **Métricas de UX:**
- **Taxa de conclusão** da etapa 5: > 95%
- **Tempo médio** de preenchimento: < 3 minutos
- **Taxa de erro** (caps excedidos): < 5%
- **Necessidade de suporte** para esta etapa: < 2%

### **Métricas de Negócio:**
- **Distribuição de uso** entre trilhos
- **Descontos mais aplicados** por trilho
- **Impacto financeiro** médio por trilho
- **Satisfação** dos operadores do sistema

### **Métricas Técnicas:**
- **Performance** de carregamento da etapa: < 2s
- **Responsividade** em diferentes dispositivos
- **Acessibilidade** (WCAG 2.1 AA)

---

## 🚀 FASES DE IMPLEMENTAÇÃO

### **Fase 1: Fundação (2-3 semanas)**
- ✅ Estrutura do banco de dados
- ✅ Migrations e seeds
- ✅ Hooks básicos do React Query
- ✅ Tipos TypeScript

### **Fase 2: Interface Básica (3-4 semanas)**
- ✅ Componente TrackCard
- ✅ Lógica de seleção de trilho
- ✅ Filtros básicos de desconto
- ✅ Calculadora em tempo real

### **Fase 3: Validações e UX (2-3 semanas)**
- ✅ Validação em tempo real
- ✅ Barra de progresso do cap
- ✅ Estados de erro e feedback
- ✅ Transições e animações

### **Fase 4: Painel Admin (3-4 semanas)**
- ✅ Interface de configuração de caps
- ✅ Gerenciamento de trilhos
- ✅ Relatórios básicos
- ✅ Simulador de trilhos

### **Fase 5: Refinamento (1-2 semanas)**
- ✅ Testes de usabilidade
- ✅ Ajustes de performance
- ✅ Documentação final
- ✅ Treinamento da equipe

---

## 🎯 CONSIDERAÇÕES FINAIS

Este design prioriza a **clareza e simplicidade** na tomada de decisão, reduzindo a carga cognitiva do usuário ao apresentar escolhas de forma estruturada e intuitiva.

A **arquitetura técnica flexível** permite futuras expansões do sistema sem comprometer a experiência atual, enquanto o **painel administrativo robusto** oferece controle total sobre as regras de negócio.

**Resultado esperado:** Interface que **guia naturalmente** o usuário pela lógica complexa de descontos, **sem necessidade de treinamento** ou documentação adicional, mantendo a **consistência visual** com o resto do sistema IESJE.