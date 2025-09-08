# FASE ZERO - Etapa 1: Backup e Documentação
## Sistema de Rematrícula - Estado Atual

**Data:** 2025-09-08  
**Responsável:** Software Architect  
**Status:** Em execução

---

## 1. INVENTÁRIO DE ARQUIVOS EXISTENTES

### 1.1 Estrutura Atual do Sistema de Rematrícula

```
src/features/rematricula/
├── hooks/
├── pages/
├── services/
├── types/
└── utils/
```

### 1.2 Arquivos Principais Identificados

#### Páginas
- `src/pages/Rematricula.tsx` (modificado)

#### Feature Module
- `src/features/rematricula/` (8 arquivos TypeScript)
  - hooks/
  - pages/
  - services/
  - types/
  - utils/

### 1.3 Documentação Relacionada
- `REMATRICULA_IMPLEMENTACAO_RELATORIO.md` - Relatório técnico das fases 1-5
- `PLANO_FLUXO_REMATRICULA.md` - Regras de negócio e fluxo
- `PLANO_REMATRICULA_INDEPENDENTE.md` - Plano de implementação independente
- `PLANO_DIAGNOSTICO_REMATRICULA_LOOPS.md` - Diagnóstico de problemas

---

## 2. ESTADO ATUAL DA IMPLEMENTAÇÃO

### 2.1 Funcionalidades Implementadas (Parcialmente)

#### Backend (Supabase)
- **Tabelas criadas:**
  - `previous_year_students` - Base de dados 2025
  - `validation_audit` - Auditoria de validações
  
- **Edge Functions:**
  - `validate_cpf` - Classificação de CPF
  - `get_previous_year_student` - Prefill de dados

- **Migrações aplicadas:**
  - 020_create_previous_year_students.sql
  - 021_align_previous_year_students_with_enrollments.sql
  - 022_add_cpf_digits_columns.sql

#### Frontend
- **Hooks desenvolvidos:**
  - `useStudentValidation` - Validação de CPF
  - `useRematriculaForm` - Gestão do formulário
  - `useAcademicProgression` - Progressão acadêmica
  - `useRematriculaDiscounts` - Gestão de descontos

- **Páginas:**
  - `OnePageRematricula` - Interface unificada
  - Página de identificação com validação

### 2.2 Problemas Conhecidos

1. **CORS Issues**
   - Preflight falhando em `get_previous_year_student`
   - Headers incompletos nas Edge Functions

2. **Loops de Renderização**
   - Múltiplas chamadas em `useSeries`/`useTracks`
   - Auto-load removido mas ainda há ruído

3. **Matching de CPF**
   - Problema com máscaras resolvido via `student_cpf_digits`
   - Índices criados mas precisam validação

4. **Ambiente**
   - Possível desalinhamento entre projetos Supabase
   - Service Role Keys podem estar incorretas

---

## 3. DEPENDÊNCIAS E INTEGRAÇÕES

### 3.1 Dependências do Sistema Principal
- `useEnrollmentForm` - NÃO deve ser usado na rematrícula
- `src/features/matricula-nova/` - Sistema de nova matrícula (preservar intacto)
- `src/features/enrollment/` - Sistema de elegibilidade de descontos

### 3.2 Integrações Externas
- Supabase Edge Functions
- Sistema de CEP (ViaCEP)
- Geração de PDF (jsPDF)

### 3.3 Componentes Compartilhados
- Sistema de autenticação admin
- Componentes UI (shadcn)
- Hooks de dados (series, tracks, discounts)

---

## 4. ANÁLISE DE IMPACTO

### 4.1 Áreas Afetadas pela Limpeza
- **Baixo Impacto:**
  - Remoção de código parcial em `/features/rematricula`
  - Limpeza de hooks não utilizados

- **Médio Impacto:**
  - Ajustes em rotas do React Router
  - Modificação de imports em páginas

- **Alto Impacto:**
  - Nenhum identificado (sistema isolado)

### 4.2 Riscos Identificados
1. **Risco Baixo:** Perda de código experimental útil
2. **Risco Médio:** Quebra temporária do fluxo de rematrícula
3. **Mitigação:** Backup completo antes de qualquer deleção

---

## 5. PLANO DE BACKUP

### 5.1 Estratégia de Backup
```bash
# Criar branch de backup
git checkout -b backup/rematricula-phase-zero-$(date +%Y%m%d)

# Criar arquivo tar com estado atual
tar -czf rematricula_backup_20250908.tar.gz \
  src/features/rematricula/ \
  src/pages/Rematricula.tsx \
  supabase/functions/validate_cpf/ \
  supabase/functions/get_previous_year_student/

# Documentar hashes dos arquivos
find src/features/rematricula -type f -exec sha256sum {} \;
```

### 5.2 Estrutura de Backup Recomendada
```
backups/
└── 2025-09-08/
    ├── rematricula_feature/  # Cópia completa do feature
    ├── pages/                 # Páginas relacionadas
    ├── functions/             # Edge Functions
    ├── migrations/            # Migrações SQL
    └── checksums.txt          # Hashes SHA256
```

---

## 6. PRÓXIMOS PASSOS

### 6.1 Ações Imediatas (Etapa 1)
- [x] Documentar estado atual
- [ ] Criar branch de backup
- [ ] Copiar arquivos para diretório de backup
- [ ] Gerar checksums de validação

### 6.2 Preparação para Etapa 2
- [ ] Identificar imports e referências
- [ ] Mapear rotas afetadas
- [ ] Preparar scripts de limpeza

---

## 7. COMANDOS DE BACKUP

```bash
# 1. Criar branch de backup
git checkout -b backup/rematricula-phase-zero-20250908

# 2. Criar diretório de backup
mkdir -p backups/2025-09-08

# 3. Copiar arquivos
cp -r src/features/rematricula backups/2025-09-08/rematricula_feature
cp src/pages/Rematricula.tsx backups/2025-09-08/pages/

# 4. Gerar checksums
find backups/2025-09-08 -type f -exec sha256sum {} \; > backups/2025-09-08/checksums.txt

# 5. Commit do backup
git add backups/
git commit -m "backup: Estado completo do sistema de rematrícula antes da Fase Zero"
```

---

## 8. VALIDAÇÃO DO BACKUP

### Checklist de Validação
- [ ] Branch de backup criado
- [ ] Arquivos copiados para diretório seguro
- [ ] Checksums gerados e salvos
- [ ] Commit realizado
- [ ] Documentação atualizada

### Comando de Verificação
```bash
# Verificar integridade
sha256sum -c backups/2025-09-08/checksums.txt
```

---

**Status:** Documentação completa. Aguardando execução dos comandos de backup.