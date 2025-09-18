-- Testes rápidos para a view v_enrollment_discounts_student

-- 1) Amostra geral (limite 20)
SELECT *
FROM public.v_enrollment_discounts_student
ORDER BY enrollment_created_at DESC
LIMIT 20;

-- 2) Filtro por CPF (ajuste o valor para seu ambiente)
-- SELECT *
-- FROM public.v_enrollment_discounts_student
-- WHERE student_cpf = '00000000191'
-- ORDER BY enrollment_created_at DESC;

-- 3) Contagem por código de desconto
SELECT discount_code, COUNT(*) AS qtd
FROM public.v_enrollment_discounts_student
GROUP BY discount_code
ORDER BY qtd DESC;

