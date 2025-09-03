# Sistema de Matrículas e Descontos - IESJE (Instituto São João da Escócia)

## Sobre o Sistema

Este é um sistema de gestão de matrículas e descontos para o Instituto São João da Escócia (IESJE). O sistema permite:

- **Identificação de alunos** já cadastrados
- **Rematrícula** de alunos existentes
- **Nova matrícula** para novos alunos
- **Gestão inteligente de descontos** com validação documental
- **Trilhas de aprovação** por níveis hierárquicos
- **Geração de propostas** em PDF
- **Histórico de matrículas recentes**

### Funcionalidades Principais

**Tipos de Desconto Disponíveis:**
- **IIR** - Alunos Irmãos Carnal (10%)
- **RES** - Alunos de Outras Cidades (20%)
- **PASS** - Filhos de Prof. do IESJE Sindicalizados (100%)
- **PBS** - Filhos Prof. Sind. de Outras Instituições (40%)
- **COL** - Filhos de Func. do IESJE Sindicalizados SAAE (50%)
- **SAE** - Filhos de Func. Outros Estabelec. Sindicalizados SAAE (40%)
- **ABI** - Bolsa Integral Filantropia (100%)
- **ABP** - Bolsa Parcial Filantropia (50%)
- **PAV** - Pagamento à Vista (15%)
- **Descontos Comerciais** - CEP, Adimplência e negociações especiais

**Regras de Negócio:**
- Limite máximo de **60% de desconto cumulativo** (exceto bolsas integrais)
- **Validação documental** obrigatória para cada tipo de desconto
- **Níveis de aprovação**: Automática (≤20%), Coordenação (21-50%), Direção (>50%)
- **Desconto CEP automático** baseado na localização do aluno

# Stack do Projeto

*   **Framework:** React
*   **Linguagem:** TypeScript
*   **Build Tool:** Vite
*   **Estilização:** Tailwind CSS com `shadcn/ui` (indicado pelos múltiplos componentes `@radix-ui` e `tailwind-merge`).
*   **Roteamento:** React Router (`react-router-dom`)
*   **Gerenciamento de Estado/Cache de API:** TanStack Query (`@tanstack/react-query`)
*   **Formulários:** React Hook Form (`react-hook-form`) com validação de schema por Zod (`zod`).
*   **Linting:** ESLint
*   **Componentes de UI:** Uma variedade de componentes, incluindo `recharts` para gráficos, `sonner` para notificações e `jspdf` para geração de PDFs.
