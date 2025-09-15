-- =====================================================
-- SCRIPT DE POPULAÇÃO: previous_year_students
-- DADOS DE TESTE PARA FLUXO DE REMATRÍCULA
-- =====================================================

-- Limpar dados de teste anteriores (apenas dados de teste com academic_year = '2025')
DELETE FROM public.previous_year_students 
WHERE academic_year = '2025' 
  AND student_name LIKE 'Aluno Teste%';

-- Inserir dados de teste variados
INSERT INTO public.previous_year_students (
  -- Dados do Aluno
  student_name,
  student_cpf,
  student_rg,
  student_birth_date,
  student_gender,
  student_escola,
  
  -- Dados Acadêmicos do ano anterior
  series_id,
  series_name,
  track_id,
  track_name,
  shift,
  
  -- Responsáveis
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  guardian1_relationship,
  guardian2_name,
  guardian2_cpf,
  guardian2_phone,
  guardian2_email,
  guardian2_relationship,
  
  -- Endereço
  address_cep,
  address_street,
  address_number,
  address_complement,
  address_district,
  address_city,
  address_state,
  
  -- Dados Financeiros
  base_value,
  total_discount_percentage,
  total_discount_value,
  final_monthly_value,
  material_cost,
  
  -- Descontos aplicados (JSONB)
  applied_discounts,
  
  -- Status e metadata
  academic_year,
  status,
  created_at
) VALUES 
-- Aluno 1: Pelicano, 5º ano, com desconto de irmãos
(
  'Aluno Teste Silva',
  '11111111111',
  '1234567',
  '2013-05-15',
  'M',
  'pelicano',
  
  'serie_5ano_id',
  '5º Ano Fundamental',
  'track_regular_id',
  'Regular',
  'morning',
  
  'Maria Silva',
  '22222222222',
  '(88) 99999-1111',
  'maria.silva@email.com',
  'Mãe',
  'João Silva',
  '33333333333',
  '(88) 99999-2222',
  'joao.silva@email.com',
  'Pai',
  
  '63000-000',
  'Rua das Flores',
  '123',
  'Apto 201',
  'Centro',
  'Juazeiro do Norte',
  'CE',
  
  1200.00,
  10.00,
  120.00,
  1080.00,
  150.00,
  
  '[{"discount_id": "disc_iir", "discount_code": "IIR", "discount_name": "Desconto Irmãos", "percentage": 10, "requires_documents": true}]'::jsonb,
  
  '2025',
  'approved',
  NOW() - INTERVAL '6 months'
),

-- Aluno 2: Sete de Setembro, 2º ano, sem descontos
(
  'Aluno Teste Oliveira',
  '44444444444',
  '2345678',
  '2016-08-20',
  'F',
  'sete_setembro',
  
  'serie_2ano_id',
  '2º Ano Fundamental',
  'track_regular_id',
  'Regular',
  'afternoon',
  
  'Ana Oliveira',
  '55555555555',
  '(88) 98888-3333',
  'ana.oliveira@email.com',
  'Mãe',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  
  '63100-000',
  'Avenida Principal',
  '456',
  NULL,
  'Novo Juazeiro',
  'Juazeiro do Norte',
  'CE',
  
  950.00,
  0.00,
  0.00,
  950.00,
  100.00,
  
  '[]'::jsonb,
  
  '2025',
  'approved',
  NOW() - INTERVAL '5 months'
),

-- Aluno 3: Pelicano, 9º ano, múltiplos descontos
(
  'Aluno Teste Santos',
  '66666666666',
  '3456789',
  '2010-02-10',
  'M',
  'pelicano',
  
  'serie_9ano_id',
  '9º Ano Fundamental',
  'track_integral_id',
  'Integral',
  'morning',
  
  'Carlos Santos',
  '77777777777',
  '(88) 97777-4444',
  'carlos.santos@email.com',
  'Pai',
  'Lucia Santos',
  '88888888888',
  '(88) 97777-5555',
  'lucia.santos@email.com',
  'Mãe',
  
  '63200-000',
  'Rua do Comércio',
  '789',
  'Casa',
  'Salesianos',
  'Juazeiro do Norte',
  'CE',
  
  1500.00,
  25.00,
  375.00,
  1125.00,
  200.00,
  
  '[
    {"discount_id": "disc_iir", "discount_code": "IIR", "discount_name": "Desconto Irmãos", "percentage": 10, "requires_documents": true},
    {"discount_id": "disc_pav", "discount_code": "PAV", "discount_name": "Pagamento à Vista", "percentage": 15, "requires_documents": false}
  ]'::jsonb,
  
  '2025',
  'approved',
  NOW() - INTERVAL '4 months'
),

-- Aluno 4: Sete de Setembro, 1º ano Médio, bolsa parcial
(
  'Aluno Teste Costa',
  '99999999999',
  '4567890',
  '2008-11-25',
  'F',
  'sete_setembro',
  
  'serie_1medio_id',
  '1º Ano Médio',
  'track_regular_id',
  'Regular',
  'morning',
  
  'Patricia Costa',
  '00011111111',
  '(88) 96666-7777',
  'patricia.costa@email.com',
  'Mãe',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  
  '63300-000',
  'Rua São Francisco',
  '321',
  NULL,
  'São José',
  'Juazeiro do Norte',
  'CE',
  
  1800.00,
  50.00,
  900.00,
  900.00,
  250.00,
  
  '[{"discount_id": "disc_abp", "discount_code": "ABP", "discount_name": "Bolsa Parcial Filantropia", "percentage": 50, "requires_documents": true}]'::jsonb,
  
  '2025',
  'approved',
  NOW() - INTERVAL '3 months'
),

-- Aluno 5: Pelicano, 7º ano, desconto CEP
(
  'Aluno Teste Pereira',
  '11122233344',
  '5678901',
  '2011-07-30',
  'M',
  'pelicano',
  
  'serie_7ano_id',
  '7º Ano Fundamental',
  'track_regular_id',
  'Regular',
  'afternoon',
  
  'Roberto Pereira',
  '22233344455',
  '(88) 95555-8888',
  'roberto.pereira@email.com',
  'Pai',
  'Sandra Pereira',
  '33344455566',
  '(88) 95555-9999',
  'sandra.pereira@email.com',
  'Mãe',
  
  '63400-000',
  'Avenida Leão Sampaio',
  '654',
  'Bloco B, Apto 102',
  'Triângulo',
  'Juazeiro do Norte',
  'CE',
  
  1350.00,
  20.00,
  270.00,
  1080.00,
  180.00,
  
  '[{"discount_id": "disc_cep", "discount_code": "CEP", "discount_name": "Desconto Regional", "percentage": 20, "requires_documents": false}]'::jsonb,
  
  '2025',
  'approved',
  NOW() - INTERVAL '2 months'
),

-- Aluno 6: CPF para teste de bloqueio (já matriculado em 2026)
-- Este não deveria permitir rematrícula pois já está no ano atual
(
  'Aluno Teste Bloqueado',
  '12345678900',
  '6789012',
  '2014-03-10',
  'F',
  'sete_setembro',
  
  'serie_4ano_id',
  '4º Ano Fundamental',
  'track_regular_id',
  'Regular',
  'morning',
  
  'Teste Bloqueado Responsável',
  '98765432100',
  '(88) 94444-0000',
  'bloqueado@email.com',
  'Mãe',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  
  '63500-000',
  'Rua Teste',
  '999',
  NULL,
  'Teste',
  'Juazeiro do Norte',
  'CE',
  
  1100.00,
  0.00,
  0.00,
  1100.00,
  130.00,
  
  '[]'::jsonb,
  
  '2025',
  'approved',
  NOW() - INTERVAL '1 month'
);

-- Criar alguns registros com status diferentes para teste
UPDATE public.previous_year_students 
SET status = 'draft' 
WHERE student_cpf = '111.111.111-11';

UPDATE public.previous_year_students 
SET status = 'submitted' 
WHERE student_cpf = '44444444444';

-- Verificar dados inseridos
SELECT 
  student_name,
  student_cpf,
  student_escola,
  series_name,
  final_monthly_value,
  total_discount_percentage,
  status,
  academic_year
FROM public.previous_year_students
WHERE academic_year = '2025'
ORDER BY created_at DESC;

-- =====================================================
-- INSTRUÇÕES DE USO PARA TESTE
-- =====================================================
-- 
-- CPFs válidos para teste de rematrícula (apenas números):
-- 
-- 1. 11111111111 - Aluno do Pelicano, 5º ano, com desconto irmãos (10%)
-- 2. 44444444444 - Aluno Sete de Setembro, 2º ano, sem descontos
-- 3. 66666666666 - Aluno do Pelicano, 9º ano, múltiplos descontos (25%)
-- 4. 99999999999 - Aluno Sete de Setembro, 1º Médio, bolsa parcial (50%)
-- 5. 11122233344 - Aluno do Pelicano, 7º ano, desconto CEP (20%)
-- 6. 12345678900 - BLOQUEADO (simular já matriculado em 2026)
-- 
-- CPF não encontrado (novo aluno):
-- Qualquer outro CPF diferente dos listados acima (ex: 98765432199)
-- 
-- IMPORTANTE: Os CPFs devem ser digitados APENAS COM NÚMEROS (sem pontos e hífen)
-- 
-- Para testar o fluxo:
-- 1. Acesse a página inicial (/)
-- 2. Digite um dos CPFs de teste (apenas números)
-- 3. Sistema deve validar:
--    - Se CPF está em previous_year_students → Redireciona para rematrícula
--    - Se CPF está em enrollments (2026) → Mostra erro "já matriculado"
--    - Se CPF não existe → Redireciona para nova matrícula
-- 
-- =====================================================