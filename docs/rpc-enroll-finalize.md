# RPC: enroll_finalize (Transacional)

Objetivo: Inserir matrícula e descontos de forma atômica, com idempotência via `client_tx_id`, sem alterar RLS ou a arquitetura existente.

Endpoint
- Função Postgres: `public.enroll_finalize(p_enrollment jsonb, p_discounts jsonb DEFAULT '[]', p_client_tx_id uuid DEFAULT NULL)`
- Retorno: `{ enrollment_id: uuid, created: boolean, discount_count: number }`
- Segurança: `SECURITY INVOKER` (respeita RLS atual)

Contrato do Payload
- `p_enrollment` (jsonb) – campos aceitos (whitelist):
  - Aluno: `student_name`, `student_cpf`, `student_rg?`, `student_birth_date`, `student_gender?`, `student_escola`
  - Acadêmico: `series_id`, `series_name?`, `track_id`, `track_name?`, `shift?`
  - Responsáveis: `guardian1_name`, `guardian1_cpf`, `guardian1_phone`, `guardian1_email`, `guardian1_relationship`, `guardian2_*?`
  - Endereço: `address_cep`, `address_street`, `address_number`, `address_complement?`, `address_district`, `address_city`, `address_state`
  - Financeiro: `base_value`, `total_discount_percentage`, `total_discount_value`, `final_monthly_value`, `material_cost`
  - Status: `status?` ('draft' default), `approval_level?` ('automatic' default), `approval_status?` ('pending' default)
  - PDF (opcional): `pdf_url?`, `pdf_generated_at?`
  - Tracking (opcional): `created_by_user_id?`, `created_by_user_email?`, `created_by_user_name?`, `created_by_user_type?`
- `p_discounts` (jsonb) – array de objetos com:
  - `discount_id` (string), `discount_code` (string), `discount_name` (string),
    `discount_category` (string), `percentage_applied` (numeric), `value_applied` (numeric)
  - Deduplicação por `discount_id` dentro do payload.
- `p_client_tx_id` (uuid) – identificador idempotente da submissão.

Classificação de Origem (server-side)
- A origem `tag_matricula` NÃO deve ser enviada no payload.
- A classificação é feita no servidor via trigger BEFORE INSERT em `public.enrollments`:
  - Match de `student_cpf_digits` em `public.previous_year_students` → `rematricula`.
  - Caso contrário → `novo_aluno`.
  - Sem CPF válido → `novo_aluno` (fallback seguro).
  - Essa regra se aplica tanto à RPC quanto a INSERTs diretos.

Idempotência
- Se `p_client_tx_id` for informado e existir matrícula com o mesmo valor em `enrollments.client_tx_id`, a função retorna `{ created:false }` com o `enrollment_id` existente e não reinsere descontos.

Exemplo de Chamada (Supabase JS)
```ts
const { data, error } = await supabase.rpc('enroll_finalize', {
  p_enrollment: {
    student_name: 'Fulano', student_cpf: '00000000191', student_birth_date: '2010-01-01', student_escola: 'sete_setembro',
    series_id: 'S1', series_name: '1ª Série', track_id: 'T1', track_name: 'combinado', shift: 'morning',
    guardian1_name: 'Pai', guardian1_cpf: '00000000191', guardian1_phone: '11999999999', guardian1_email: 'pai@ex.com', guardian1_relationship: 'pai',
    address_cep: '37700000', address_street: 'Rua A', address_number: '123', address_district: 'Centro', address_city: 'Poços', address_state: 'MG',
    base_value: 850, total_discount_percentage: 15, total_discount_value: 127.5, final_monthly_value: 722.5, material_cost: 50,
    created_by_user_type: 'matricula'
  },
  p_discounts: [
    { discount_id: 'D1', discount_code: 'IIR', discount_name: 'Irmãos', discount_category: 'regular', percentage_applied: 10, value_applied: 80 },
    { discount_id: 'D2', discount_code: 'PAV', discount_name: 'Pagamento à Vista', discount_category: 'negociacao', percentage_applied: 5, value_applied: 40 }
  ],
  p_client_tx_id: crypto.randomUUID()
})
```

Notas de Segurança
- A função roda como `SECURITY INVOKER` e respeita as políticas RLS atuais:
  - `enrollments`: insert público permitido (MVP), update restrito a 2h/adm.
  - `enrollment_discounts`: insert público permitido se atrelado à matrícula criada nas últimas 2h.
- Sem grants adicionais; sem alteração estrutural.

Erros Comuns
- Campos obrigatórios ausentes geram erro do Postgres (NOT NULL/check constraints).
- Tipos inválidos (datas/numéricos) geram erro de cast no Postgres.

Testes Locais
- `supabase/test_enroll_finalize.sql`: contém payload de exemplo e teste de idempotência (comentado) para DEV.

