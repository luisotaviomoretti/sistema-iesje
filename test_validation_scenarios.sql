-- =====================================================
-- SCRIPT DE TESTE PARA VALIDAÇÃO DE REMATRÍCULA
-- =====================================================
-- Este script cria dados de teste para validar os 3 cenários:
-- 1. Aluno já matriculado em 2026
-- 2. Aluno do ano anterior (2025) elegível para rematrícula
-- 3. Novo aluno (não existe no sistema)

-- Limpar dados de teste anteriores (cuidado em produção!)
DELETE FROM enrollments WHERE student_cpf IN ('44444444444', '55555555555', '66666666666');
DELETE FROM previous_year_students WHERE student_cpf IN ('44444444444', '55555555555', '66666666666');

-- =====================================================
-- CENÁRIO 1: Aluno já matriculado em 2026
-- CPF: 44444444444
-- =====================================================
INSERT INTO enrollments (
  id,
  student_cpf,
  student_name,
  student_birth_date,
  student_escola,
  series_id,
  track_id,
  shift,
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  address_cep,
  address_street,
  address_number,
  address_complement,
  address_neighborhood,
  address_city,
  address_state,
  status,
  enrollment_type,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '44444444444',
  'Ana Silva - Já Matriculada 2026',
  '2015-05-15',
  'IESJE',
  (SELECT id FROM series WHERE name = '3º Ano' LIMIT 1),
  (SELECT id FROM tracks WHERE name = 'Trilha Regular' LIMIT 1),
  'morning',
  'Maria Silva',
  '77777777777',
  '88999998888',
  'maria.silva@email.com',
  '63050000',
  'Rua das Flores',
  '123',
  NULL,
  'Centro',
  'Juazeiro do Norte',
  'CE',
  'active',
  'new',
  '2026-01-05 10:00:00',
  '2026-01-05 10:00:00'
);

-- =====================================================
-- CENÁRIO 2: Aluno do ano anterior (2025) - Elegível para rematrícula
-- CPF: 55555555555
-- =====================================================
INSERT INTO previous_year_students (
  id,
  student_cpf,
  student_name,
  student_birth_date,
  student_escola,
  academic_year,
  series_name,
  track_name,
  shift,
  guardian1_name,
  guardian1_cpf,
  guardian1_phone,
  guardian1_email,
  address_cep,
  address_street,
  address_number,
  address_neighborhood,
  address_city,
  address_state,
  final_monthly_value,
  total_discount_percentage,
  status,
  created_at
) VALUES (
  gen_random_uuid(),
  '55555555555',
  'Bruno Costa - Veterano 2025',
  '2014-08-20',
  'IESJE',
  '2025',
  '3º Ano',
  'Trilha Regular',
  'morning',
  'José Costa',
  '88888888888',
  '88988887777',
  'jose.costa@email.com',
  '63050100',
  'Av. Leão Sampaio',
  '456',
  'Lagoa Seca',
  'Juazeiro do Norte',
  'CE',
  850.00,
  15.00,
  'completed',
  '2025-01-15 09:00:00'
);

-- =====================================================
-- CENÁRIO 3: Novo aluno (não existe no sistema)
-- CPF: 66666666666
-- Este CPF não será inserido em nenhuma tabela
-- =====================================================
-- Não inserimos nada para este CPF, pois ele representa um novo aluno

-- =====================================================
-- VERIFICAÇÃO DOS DADOS INSERIDOS
-- =====================================================
SELECT 'TESTE - Alunos Matriculados em 2026:' as info;
SELECT 
  student_cpf,
  student_name,
  status,
  created_at::date as data_matricula
FROM enrollments
WHERE student_cpf IN ('44444444444', '55555555555', '66666666666');

SELECT '---' as separador;
SELECT 'TESTE - Alunos do Ano Anterior (2025):' as info;
SELECT 
  student_cpf,
  student_name,
  academic_year,
  series_name
FROM previous_year_students
WHERE student_cpf IN ('44444444444', '55555555555', '66666666666');

-- =====================================================
-- RESUMO DOS CENÁRIOS DE TESTE
-- =====================================================
SELECT '=======================================' as linha;
SELECT 'CENÁRIOS DE TESTE CRIADOS:' as titulo;
SELECT '=======================================' as linha;
SELECT '1. CPF 44444444444 - Ana Silva: Já matriculada em 2026 (deve bloquear)' as cenario1;
SELECT '2. CPF 55555555555 - Bruno Costa: Veterano de 2025 (deve ir para rematrícula)' as cenario2;
SELECT '3. CPF 66666666666 - Não existe: Novo aluno (deve ir para nova matrícula)' as cenario3;
SELECT '=======================================' as linha;