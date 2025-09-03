# Supabase Migrations - Sistema IESJE

## Estrutura das Migrations

### 📁 Organização dos Arquivos
```
supabase/
├── migrations/
│   ├── 001_initial_schema.sql    # Schema inicial das tabelas
│   ├── 002_seed_data.sql         # Dados iniciais
│   ├── 003_rls_policies.sql      # Políticas de segurança
│   └── README.md                 # Esta documentação
└── README.md
```

## 🚀 Como Executar as Migrations

### Opção 1: Via Supabase Dashboard (Recomendado)
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto: `snebguohzjgkouqweavx`
3. Vá em **SQL Editor**
4. Execute os arquivos na ordem:

**Passo 1:** Execute `001_initial_schema.sql`
- Cria todas as tabelas
- Configura índices e triggers
- Estabelece constraints de integridade

**Passo 2:** Execute `002_seed_data.sql`
- Insere dados iniciais
- Configura tipos de desconto
- Define faixas de CEP
- Cria usuários administrativos

**Passo 3:** Execute `003_rls_policies.sql`
- Configura Row Level Security
- Define políticas de acesso
- Cria funções auxiliares

### Opção 2: Via Supabase CLI
```bash
# Instalar Supabase CLI
npm install supabase --save-dev

# Inicializar projeto local
npx supabase init

# Conectar ao projeto remoto
npx supabase link --project-ref snebguohzjgkouqweavx

# Aplicar migrations
npx supabase db push
```

## 📋 Verificação Pós-Migration

### 1. Verificar Tabelas Criadas
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
```

**Esperado:**
- `system_configs`
- `tipos_desconto` 
- `cep_ranges`
- `admin_users`
- `audit_logs`

### 2. Verificar Dados Iniciais
```sql
-- Tipos de desconto
SELECT codigo, descricao, ativo FROM tipos_desconto ORDER BY codigo;

-- Faixas de CEP
SELECT categoria, COUNT(*) as total FROM cep_ranges GROUP BY categoria;

-- Usuários admin
SELECT email, nome, role FROM admin_users WHERE ativo = true;

-- Configurações do sistema
SELECT chave, valor, categoria FROM system_configs ORDER BY categoria, chave;
```

### 3. Testar Funções Públicas
```sql
-- Testar classificação de CEP
SELECT * FROM classify_cep('37712345');

-- Testar configurações
SELECT get_system_config('max_desconto_total');

-- Testar tipos de desconto ativos
SELECT * FROM get_active_discount_types();
```

## 🔒 Políticas de Segurança (RLS)

### Níveis de Acesso

**Super Admin (`super_admin`)**
- ✅ Acesso completo a todas as tabelas
- ✅ Pode gerenciar usuários e configurações
- ✅ Visualiza todos os logs de auditoria

**Coordenador (`coordenador`)**
- ✅ Pode ler/editar tipos de desconto e CEPs
- ✅ Pode visualizar outros usuários
- ✅ Visualiza logs relacionados às suas ações

**Operador (`operador`)**
- ✅ Pode apenas consultar dados
- ❌ Não pode editar configurações
- ✅ Visualiza apenas seus próprios logs

**Público (Sistema de Matrícula)**
- ✅ Pode consultar tipos de desconto ativos
- ✅ Pode consultar faixas de CEP ativas
- ✅ Pode consultar configurações básicas

## 🛠️ Funções Auxiliares Disponíveis

### Para o Sistema de Matrícula
```sql
-- Obter tipos de desconto ativos
SELECT * FROM get_active_discount_types();

-- Classificar CEP
SELECT * FROM classify_cep('37712000');

-- Obter configuração
SELECT get_system_config('max_desconto_total');
```

### Para Administração
```sql
-- Verificar se usuário é admin
SELECT is_admin_user();

-- Obter papel do usuário
SELECT get_admin_role();

-- Verificar se pode aprovar
SELECT can_approve();
```

## 🎯 Dados de Teste

### Tipos de Desconto Criados
- **IIR**: Irmãos (10% - Automático)
- **RES**: Outras cidades (20% - Automático)  
- **PASS**: Prof. IESJE (100% - Direção)
- **PBS**: Prof. Externo (40% - Coordenação)
- **COL**: Func. IESJE (50% - Coordenação)
- **SAE**: Func. Externo (40% - Coordenação)
- **ABI**: Bolsa Integral (100% - Direção)
- **ABP**: Bolsa Parcial (50% - Coordenação)
- **PAV**: Pagamento à Vista (15% - Automático)
- **CEP10**: Fora de Poços (10% - Automático)
- **CEP5**: Baixa Renda (5% - Automático)
- **ADIM2**: Adimplente (2% - Automático)
- **COM_EXTRA**: Negociação (Variável - Direção)

### Usuários Admin Criados
- `admin@iesje.edu.br` - Super Admin
- `coordenacao@iesje.edu.br` - Coordenador
- `secretaria@iesje.edu.br` - Operador

### Faixas de CEP Configuradas
- **Alta Renda**: 37700-37711, 37714-37719, 37720-37799 (0%)
- **Baixa Renda**: 37712, 37713, 37715-37717 (5%)
- **Fora de Poços**: Todos os outros CEPs (10%)

## 🔍 Troubleshooting

### Erro de Permissão
Se encontrar erros de permissão, verifique:
1. RLS está habilitado nas tabelas
2. Usuário está autenticado corretamente
3. Email do usuário existe na tabela `admin_users`

### Erro de Função Não Encontrada
```sql
-- Verificar se as funções foram criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';
```

### Logs de Auditoria
```sql
-- Ver últimas ações no sistema
SELECT * FROM audit_logs 
ORDER BY timestamp DESC 
LIMIT 10;
```

## 📞 Próximos Passos

Após executar as migrations:
1. ✅ Testar conexão do frontend com Supabase
2. ✅ Implementar hooks de CRUD no React
3. ✅ Criar interfaces administrativas
4. ✅ Migrar lógica hardcoded para Supabase

---

**⚠️ Importante:** Execute as migrations em ordem e verifique cada etapa antes de prosseguir!