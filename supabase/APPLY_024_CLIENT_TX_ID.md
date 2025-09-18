# Aplicar Migração 024 – client_tx_id em enrollments

Esta migração adiciona a coluna `client_tx_id` a `public.enrollments` com um índice único parcial para suportar idempotência de submissões no fluxo de matrícula, sem alterar a arquitetura atual.

## Como aplicar

- Via Supabase CLI (recomendado em times):
  - `npx supabase link --project-ref <SEU_PROJECT_REF>`
  - `npx supabase db push`

- Via Dashboard (SQL Editor):
  - Abra o conteúdo de `supabase/migrations/024_add_client_tx_id_to_enrollments.sql`
  - Cole e execute no SQL Editor.

## Verificação

- Execute `supabase/test_client_tx_id.sql` no SQL Editor para checar:
  - Existência da coluna `client_tx_id`.
  - Existência do índice único parcial `idx_enrollments_client_tx_id_unique`.

## Notas

- O índice é parcial (apenas valores não nulos), permitindo múltiplos registros com `client_tx_id = NULL`.
- Não há mudança de RLS nesta migração; políticas atuais seguem válidas.
- Este campo poderá ser utilizado por uma futura RPC transacional (`enroll_finalize`) para garantir idempotência em reenvios do front.

