# Painel Administrativo - Sistema IESJE

## Estratégia para Painel Administrativo - Sistema IESJE

### **1. GESTÃO DE DESCONTOS**

**1.1 Configuração de Tipos de Desconto**
- ✅ **CRUD completo** (Create, Read, Update, Delete/Disable)
- ✅ **Campos configuráveis**: código, descrição, percentual, variável/fixo
- ✅ **Documentos obrigatórios** por tipo de desconto
- ✅ **Níveis de aprovação** (Automática, Coordenação, Direção)
- ✅ **Status ativo/inativo** para descontos temporários
- ✅ **Histórico de alterações** (quem, quando, o que mudou)

**1.2 Regras de Negócio Configuráveis**
- ✅ **Limite máximo de desconto cumulativo** (atualmente 60%)
- ✅ **Regras de combinação** (quais descontos podem se acumular)
- ✅ **Descontos mutuamente excludentes**
- ✅ **Vigência temporal** para campanhas sazonais

### **2. GESTÃO GEOGRÁFICA (CEP)**

**2.1 Classificação de CEPs**
- ✅ **Interface para cadastrar faixas de CEP** por categoria
- ✅ **Categorias**: Fora de Poços, Baixa Renda, Alta Renda
- ✅ **Import/Export em massa** via CSV
- ✅ **Mapa visual** para validação das regiões
- ✅ **Percentuais específicos** por categoria de CEP

**2.2 Validação Automática**
- ✅ **API de consulta CEP** integrada
- ✅ **Cache local** para performance
- ✅ **Atualização automática** de classificações

### **3. GESTÃO FINANCEIRA**

**3.1 Valores de Mensalidades**
- ✅ **Tabela de valores por série/ano**
- ✅ **Reajustes anuais** com histórico
- ✅ **Diferentes modalidades** (integral, semi-integral)
- ✅ **Valores promocionais** para períodos específicos

**3.2 Simulador de Cenários**
- ✅ **Calculadora de impacto** financeiro dos descontos
- ✅ **Projeções de receita** por tipo de desconto
- ✅ **Relatórios de renúncia fiscal**

### **4. GESTÃO DE USUÁRIOS E PERMISSÕES**

**4.1 Controle de Acesso**
- ✅ **Roles**: Super Admin, Coordenador, Operador
- ✅ **Permissões granulares** por módulo
- ✅ **Auditoria de ações** (logs de atividade)
- ✅ **Sessões e timeout** de segurança

**4.2 Workflow de Aprovações**
- ✅ **Fila de aprovações** pendentes
- ✅ **Notificações automáticas** por email/sistema
- ✅ **Escalation automático** por tempo
- ✅ **Histórico de decisões** com justificativas

### **5. RELATÓRIOS E ANALYTICS**

**5.1 Dashboards Executivos**
- ✅ **KPIs em tempo real**: matrículas, descontos aplicados, receita
- ✅ **Gráficos interativos** com filtros por período/tipo
- ✅ **Comparativos** ano a ano
- ✅ **Alertas automáticos** para métricas críticas

**5.2 Relatórios Operacionais**
- ✅ **Relatório de descontos** por categoria/período
- ✅ **Análise geográfica** de matrículas
- ✅ **Documentos pendentes** de validação
- ✅ **Inadimplência** e risco

### **6. CONFIGURAÇÕES DO SISTEMA**

**6.1 Parâmetros Gerais**
- ✅ **Dados institucionais** (logo, contatos, endereço)
- ✅ **Templates de documentos** (contratos, propostas)
- ✅ **Calendário acadêmico** (datas importantes)
- ✅ **Configurações de email** e notificações

**6.2 Integrações**
- ✅ **APIs externas** (CEP, CPF/CNPJ, email)
- ✅ **Backup automático** de dados
- ✅ **Sincronização** com sistemas contábeis
- ✅ **Logs de sistema** e monitoramento

### **7. GESTÃO DE PROCESSOS**

**7.1 Workflow de Matrícula**
- ✅ **Configurar etapas obrigatórias** do processo
- ✅ **Documentos por tipo de matrícula**
- ✅ **Prazos e lembretes** automáticos
- ✅ **Templates de comunicação**

**7.2 Campanhas e Promoções**
- ✅ **Período de matrículas** com desconto especial
- ✅ **Cotas limitadas** por tipo de desconto
- ✅ **Marketing direto** via sistema

---

## **ESTRUTURA DE DADOS SUGERIDA**

### **Novas Entidades para Configurações**

```typescript
// Configurações de Sistema
interface SystemConfig {
  id: string;
  chave: string; // "max_desconto_total", "logo_url", etc.
  valor: string | number | boolean;
  descricao: string;
  categoria: "financeiro" | "geral" | "integracao";
  updated_by: string;
  updated_at: string;
}

// Faixas de CEP Configuráveis
interface CepRange {
  id: string;
  cep_inicio: string;
  cep_fim: string;
  categoria: "fora" | "baixa" | "alta";
  percentual_desconto: number;
  ativo: boolean;
  created_at: string;
}

// Histórico de Alterações
interface ConfigHistory {
  id: string;
  tabela: string;
  registro_id: string;
  campos_alterados: Record<string, any>;
  usuario_id: string;
  timestamp: string;
  motivo?: string;
}

// Usuários e Permissões
interface User {
  id: string;
  nome: string;
  email: string;
  role: "super_admin" | "coordenador" | "operador";
  permissions: string[];
  ativo: boolean;
  created_at: string;
  last_login?: string;
}

// Workflow de Aprovações
interface ApprovalFlow {
  id: string;
  tipo: "desconto" | "matricula" | "documento";
  registro_id: string;
  status: "pendente" | "aprovado" | "rejeitado";
  aprovador_id: string;
  comentarios?: string;
  created_at: string;
  resolved_at?: string;
}
```

---

## **INTERFACE E NAVEGAÇÃO DO PAINEL ADMIN**

### **Estrutura de Menu Principal**
```
🏠 Dashboard
├── 📊 Visão Geral (KPIs, gráficos)
├── 📈 Analytics Avançados

💰 Gestão Financeira
├── 🏷️ Tipos de Desconto
├── 💵 Valores de Mensalidade
├── 🧮 Simulador de Cenários
├── 📋 Relatórios Financeiros

🗺️ Gestão Geográfica
├── 📍 Configuração de CEPs
├── 🗺️ Mapa de Regiões
├── 📥 Import/Export CEPs

👥 Gestão de Usuários
├── 👤 Usuários e Permissões
├── ✅ Fila de Aprovações
├── 📝 Logs de Auditoria

⚙️ Configurações
├── 🏢 Dados Institucionais
├── 🔧 Parâmetros do Sistema
├── 🔗 Integrações
├── 📄 Templates de Documentos

📊 Relatórios
├── 📈 Matrículas e Descontos
├── 🗺️ Análise Geográfica  
├── ⏰ Documentos Pendentes
├── 💳 Inadimplência
```

### **Componentes de Interface Sugeridos**

**Dashboard Principal**
- Cards com métricas principais (matrículas hoje/mês, descontos aplicados, receita)
- Gráficos de linha para tendências temporais
- Alertas para ações pendentes de aprovação
- Atalhos rápidos para funções mais usadas

**Gestão de Descontos**
- Lista/tabela com filtros e busca
- Modal/form para criação/edição
- Toggle para ativar/desativar tipos
- Histórico de alterações por item

**Configuração de CEPs**
- Interface de mapa para visualização
- Upload de CSV para importação em massa
- Tabela editável para faixas específicas
- Simulador de CEP para testar classificação

---

## **FLUXO DE IMPLEMENTAÇÃO SUGERIDO**

### **FASE 1 - Core Admin (MVP) - 2-3 semanas**
1. **Dashboard básico** com métricas essenciais
2. **CRUD de tipos de desconto** (substitui constants.ts)
3. **Configuração básica de CEPs** (substitui lógica hardcoded)
4. **Controle básico de usuários** e autenticação admin

**Entregáveis:**
- Tela de login administrativa
- Dashboard com KPIs básicos
- Gestão completa de tipos de desconto
- Interface para configurar faixas de CEP

### **FASE 2 - Operacional - 3-4 semanas**
1. **Workflow de aprovações** (fila de pendências)
2. **Relatórios essenciais** (descontos aplicados, matrículas por região)
3. **Configurações avançadas** (valores de mensalidade, parâmetros globais)
4. **Sistema de auditoria** (logs de alterações)

**Entregáveis:**
- Sistema de aprovações multi-nível
- Relatórios em PDF/Excel
- Configurações dinâmicas do sistema
- Trilha de auditoria completa

### **FASE 3 - Analytics e Otimização - 2-3 semanas**
1. **Dashboard avançado** com gráficos interativos
2. **Simulador de cenários** financeiros
3. **Relatórios customizáveis** pelo usuário
4. **Integrações externas** (APIs, backups automáticos)

**Entregáveis:**
- Dashboards executivos com drill-down
- Ferramenta de simulação de impacto
- Builder de relatórios personalizados
- Integrações com sistemas externos

---

## **CONSIDERAÇÕES TÉCNICAS PARA IMPLEMENTAÇÃO**

### **Arquitetura Recomendada**

**Frontend (React/TypeScript)**
- Páginas administrativas separadas com roteamento protegido
- Context para gerenciamento de estado administrativo
- Componentes reutilizáveis para formulários e tabelas
- Hooks específicos para operações administrativas

**Backend/Dados**
- Migração gradual de dados hardcoded para banco configurável
- APIs específicas para operações administrativas
- Sistema de cache para configurações frequentemente acessadas
- Validação rigorosa de permissões em todas as operações

**Estrutura de Pastas Sugerida**
```
src/
├── features/
│   ├── admin/
│   │   ├── components/
│   │   │   ├── Dashboard/
│   │   │   ├── DiscountManagement/
│   │   │   ├── CepConfiguration/
│   │   │   ├── UserManagement/
│   │   │   └── Reports/
│   │   ├── hooks/
│   │   │   ├── useAdminAuth.ts
│   │   │   ├── useDiscountCRUD.ts
│   │   │   └── useCepConfiguration.ts
│   │   ├── types.ts
│   │   └── utils/
│   └── enrollment/ (existente)
├── pages/
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── DiscountManagement.tsx
│   │   ├── CepConfiguration.tsx
│   │   └── Reports.tsx
│   └── ... (páginas existentes)
```

---

## **CONSIDERAÇÕES IMPORTANTES PARA GO-LIVE**

### **Segurança e Compliance**
- **Autenticação robusta** (2FA para admins)
- **Logs completos** de todas as alterações críticas
- **Backup automático** antes de qualquer mudança em configurações
- **Validação rigorosa** de dados de entrada
- **Controle de sessão** e timeout automático

### **Performance e Escalabilidade**
- **Cache inteligente** para configurações frequentes
- **Lazy loading** em listas grandes
- **Paginação** em todos os grids
- **Otimização de queries** para relatórios

### **Usabilidade e Treinamento**
- **Interface intuitiva** seguindo padrões do sistema atual
- **Tooltips e help texts** em campos críticos
- **Confirmações** para ações destrutivas
- **Breadcrumbs** e navegação clara
- **Guias de treinamento** integrados

### **Integração com Sistema Atual**
- **Migração** gradual dos dados hardcoded para configuráveis
- **Compatibilidade** com fluxos existentes
- **Rollback** fácil em caso de problemas
- **Testing** extensivo em ambiente staging

### **Checklist de Go-Live**
- [ ] Migração de todos os tipos de desconto do constants.ts para banco
- [ ] Migração da lógica de CEP hardcoded para configurável
- [ ] Sistema de backup automático funcionando
- [ ] Logs de auditoria capturando todas as ações críticas
- [ ] Testes de carga e performance aprovados
- [ ] Treinamento da equipe administrativa concluído
- [ ] Documentação técnica e de usuário completa
- [ ] Plano de rollback testado e validado

---

## **BENEFÍCIOS ESPERADOS**

### **Para a Instituição**
- **Autonomia total** para gerenciar regras de desconto
- **Flexibilidade** para campanhas promocionais
- **Controle rigoroso** de todas as alterações
- **Visibilidade completa** do impacto financeiro
- **Redução de dependência** de alterações de código

### **Para a Equipe de TI**
- **Menos manutenção** de código hardcoded
- **Facilidade de suporte** através de logs e auditoria
- **Desenvolvimento mais ágil** de novas funcionalidades
- **Sistema mais estável** com configurações centralizadas

### **Para os Usuários Finais**
- **Processo mais rápido** de matrícula (configurações otimizadas)
- **Menos erros** devido à automação de regras
- **Experiência mais consistente** em todo o sistema

Essa estrutura garante que o sistema seja **flexível**, **seguro** e **preparado para crescimento** após o go-live, permitindo que a equipe do IESJE tenha controle total sobre as regras de negócio sem depender de alterações de código.