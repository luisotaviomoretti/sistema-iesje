-- Verificar se há dados na tabela previous_year_students
SELECT 
    COUNT(*) as total_registros,
    academic_year,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro
FROM previous_year_students
GROUP BY academic_year
ORDER BY academic_year DESC;

-- Listar os primeiros 10 registros para teste
SELECT 
    id,
    student_cpf,
    student_name,
    series_name,
    guardian1_name,
    guardian2_name,
    academic_year,
    created_at
FROM previous_year_students
ORDER BY created_at DESC
LIMIT 10;

-- Verificar se há registros para o ano anterior (2024)
SELECT COUNT(*) as total_2024
FROM previous_year_students
WHERE academic_year = '2024';

-- Buscar um CPF específico para teste
SELECT 
    student_cpf,
    student_name,
    series_name,
    guardian1_name,
    guardian2_name,
    academic_year
FROM previous_year_students
WHERE student_cpf IS NOT NULL
LIMIT 5;

-- Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'previous_year_students'
ORDER BY ordinal_position;