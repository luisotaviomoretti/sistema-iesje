-- Script para testar o fluxo de validação de rematrícula
-- Execute este script no Supabase SQL Editor

-- ========================================
-- 1. LIMPAR DADOS DE TESTE
-- ========================================

-- Limpar dados de teste anteriores
DELETE FROM public.previous_year_students 
WHERE student_cpf IN ('10524864608', '11111111111', '22222222222');

DELETE FROM public.enrollments
WHERE student_cpf IN ('22222222222', '33333333333');

-- ========================================
-- 2. INSERIR DADOS DE TESTE EM previous_year_students
-- ========================================

INSERT INTO public.previous_year_students (
  -- Dados do Aluno
  student_name,
  student_cpf,
  student_rg,
  student_birth_date,
  student_gender,
  student_escola,
  
  -- Dados Acadêmicos (obrigatórios)
  series_id,
  series_name,
  track_id,
  track_name,
  shift,
  
  -- Responsável 1 (todos obrigatórios)
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  guardian1_relationship,
  
  -- Responsável 2 (opcionais)
  guardian2_name,
  guardian2_cpf,
  guardian2_phone,
  guardian2_email,
  guardian2_relationship,
  
  -- Endereço (obrigatórios exceto complement)
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
  
  -- Metadata
  academic_year,
  status,
  created_at
) VALUES 
-- CPF que você está testando: 10524864608
(
  -- Dados do Aluno
  'João Silva Santos',
  '10524864608',
  '1234567',
  '2010-05-15',
  'M',
  'pelicano',
  
  -- Dados Acadêmicos
  'serie-5ano-id',
  '5º Ano Fundamental',
  'track-regular-id',
  'Regular',
  'morning',
  
  -- Responsável 1
  'Maria Silva',
  '11122233344',
  '(88) 99999-1111',
  'maria.silva@email.com',
  'Mãe',
  
  -- Responsável 2
  'José Silva',
  '22233344455',
  '(88) 99999-2222',
  'jose.silva@email.com',
  'Pai',
  
  -- Endereço
  '63000000',
  'Rua das Flores',
  '123',
  'Apto 201',
  'Centro',
  'Juazeiro do Norte',
  'CE',
  
  -- Dados Financeiros
  1200.00,
  10.00,
  120.00,
  1080.00,
  150.00,
  
  -- Descontos aplicados
  '[{"discount_id": "disc_iir", "discount_code": "IIR", "discount_name": "Desconto Irmãos", "percentage": 10}]'::jsonb,
  
  -- Metadata
  '2025',
  'approved',
  NOW() - INTERVAL '3 months'
),
-- Outro aluno do ano anterior
(
  -- Dados do Aluno
  'Pedro Oliveira',
  '11111111111',
  '2345678',
  '2011-08-20',
  'M',
  'sete_setembro',
  
  -- Dados Acadêmicos
  'serie-4ano-id',
  '4º Ano Fundamental',
  'track-regular-id',
  'Regular',
  'afternoon',
  
  -- Responsável 1
  'Ana Oliveira',
  '22233344455',
  '(88) 98888-2222',
  'ana.oliveira@email.com',
  'Mãe',
  
  -- Responsável 2
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  
  -- Endereço
  '63100000',
  'Avenida Principal',
  '456',
  NULL,
  'Novo Juazeiro',
  'Juazeiro do Norte',
  'CE',
  
  -- Dados Financeiros
  1100.00,
  5.00,
  55.00,
  1045.00,
  100.00,
  
  -- Descontos aplicados
  '[]'::jsonb,
  
  -- Metadata
  '2025',
  'approved',
  NOW() - INTERVAL '2 months'
);

-- ========================================
-- 3. INSERIR ALUNO JÁ MATRICULADO EM 2026
-- ========================================

INSERT INTO public.enrollments (
  -- Dados do Aluno
  student_name,
  student_cpf,
  student_rg,
  student_birth_date,
  student_gender,
  student_escola,
  
  -- Dados Acadêmicos
  series_id,
  series_name,
  track_id,
  track_name,
  shift,
  
  -- Responsável 1
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  guardian1_relationship,
  
  -- Endereço
  address_cep,
  address_street,
  address_number,
  address_district,
  address_city,
  address_state,
  
  -- Dados Financeiros
  base_value,
  total_discount_percentage,
  total_discount_value,
  final_monthly_value,
  material_cost,
  
  -- Status
  status,
  approval_level,
  created_at
) VALUES (
  -- Dados do Aluno
  'Carlos Mendes',
  '22222222222',
  '3456789',
  '2012-03-10',
  'M',
  'pelicano',
  
  -- Dados Acadêmicos
  'serie-6ano-id',
  '6º Ano Fundamental',
  'track-regular-id',
  'Regular',
  'morning',
  
  -- Responsável 1
  'José Mendes',
  '33344455566',
  '(88) 97777-3333',
  'jose.mendes@email.com',
  'Pai',
  
  -- Endereço
  '63200000',
  'Rua do Comércio',
  '789',
  'Salesianos',
  'Juazeiro do Norte',
  'CE',
  
  -- Dados Financeiros
  1300.00,
  15.00,
  195.00,
  1105.00,
  150.00,
  
  -- Status
  'approved',
  'automatic',
  NOW()
);

-- ========================================
-- 4. VERIFICAR DADOS INSERIDOS
-- ========================================

-- Verificar previous_year_students
SELECT 
  student_name,
  student_cpf,
  academic_year,
  series_name,
  student_escola,
  status
FROM public.previous_year_students
WHERE student_cpf IN ('10524864608', '11111111111', '22222222222')
ORDER BY student_name;

-- Verificar enrollments (ano atual)
SELECT 
  student_name,
  student_cpf,
  EXTRACT(YEAR FROM created_at) as enrollment_year,
  series_name,
  student_escola,
  status
FROM public.enrollments
WHERE student_cpf IN ('10524864608', '11111111111', '22222222222', '33333333333')
  AND created_at >= '2026-01-01'
ORDER BY student_name;

-- ========================================
-- CENÁRIOS DE TESTE:
-- ========================================
-- 
-- 1. CPF: 10524864608 (João Silva Santos)
--    → Deve retornar: "previous_year" - Elegível para rematrícula
--    → Estava no 5º ano em 2025, pode ir para 6º ano em 2026
--
-- 2. CPF: 11111111111 (Pedro Oliveira)
--    → Deve retornar: "previous_year" - Elegível para rematrícula
--    → Estava no 4º ano em 2025, pode ir para 5º ano em 2026
--
-- 3. CPF: 22222222222 (Carlos Mendes)
--    → Deve retornar: "already_enrolled" - Já matriculado em 2026
--    → Já está no 6º ano em 2026
--
-- 4. CPF: 33333333333 (não existe)
--    → Deve retornar: "new" - Novo aluno
--    → Não existe em nenhuma tabela
--
-- ========================================

-- Para limpar os dados de teste depois:
-- DELETE FROM public.enrollments WHERE student_cpf IN ('22222222222');
-- DELETE FROM public.previous_year_students WHERE student_cpf IN ('10524864608', '11111111111');