-- Teste de verificação — Flag de Observações (Aluno Novo)
SELECT chave, valor, categoria
FROM public.system_configs
WHERE chave = 'novomatricula.payment_notes.enabled';
