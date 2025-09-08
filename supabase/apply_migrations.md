# Como aplicar as migrações no Supabase

## Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no [Supabase Dashboard](https://app.supabase.com)
2. Vá para **SQL Editor** no menu lateral
3. Copie e cole o conteúdo de cada arquivo na ordem:
   - `011_create_discount_documents.sql`
   - `012_populate_discount_documents.sql`
4. Execute cada script clicando em **Run**

## Opção 2: Via Supabase CLI

```bash
# Se ainda não vinculou o projeto
npx supabase link --project-ref [SEU_PROJECT_REF]

# Aplicar migrações
npx supabase db push
```

## Opção 3: Script SQL Combinado

Execute os arquivos SQL na seguinte ordem:

### 1. Criar estrutura da tabela (011_create_discount_documents.sql)
### 2. Popular dados iniciais (012_populate_discount_documents.sql)

## Verificação

Após aplicar as migrações, execute estas queries para verificar:

```sql
-- Verificar se a tabela foi criada
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'discount_documents'
);

-- Contar documentos inseridos
SELECT 
  td.codigo,
  td.nome,
  COUNT(dd.id) as total_documentos
FROM tipos_desconto td
LEFT JOIN discount_documents dd ON dd.discount_id = td.id
WHERE td.ativo = true
GROUP BY td.codigo, td.nome
ORDER BY td.codigo;

-- Testar função de busca
SELECT * FROM get_discount_documents(ARRAY['IIR', 'RES']);
```

## Estrutura Criada

- ✅ Tabela `discount_documents` com todos os campos necessários
- ✅ Políticas RLS para segurança
- ✅ Função `get_discount_documents` para buscar documentos por código
- ✅ View `v_discount_documents` para facilitar queries
- ✅ Trigger para atualizar `updated_at` automaticamente
- ✅ Índices para otimização de performance

## Documentos Populados por Desconto

- **IIR** (Irmãos): 2 documentos
- **RES** (Residência): 2 documentos  
- **PASS** (Professor IESJE): 3 documentos
- **PBS** (Professor Externo): 3 documentos
- **COL** (Funcionário IESJE): 3 documentos
- **SAE** (Funcionário Externo): 3 documentos
- **ABI** (Bolsa Integral): 5 documentos
- **ABP** (Bolsa Parcial): 3 documentos
- **PAV** (Pagamento à Vista): 1 documento
- **COM** (Comercial): 1 documento

Total: ~27 documentos cadastrados