-- Adicionar campo escola à tabela series
ALTER TABLE series ADD COLUMN IF NOT EXISTS escola VARCHAR(50) NOT NULL DEFAULT 'Sete de Setembro';

-- Comentário explicativo
COMMENT ON COLUMN series.escola IS 'Escola à qual a série pertence (Sete de Setembro ou Pelicano)';

-- Constraint para garantir apenas valores válidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_escola_valida' 
        AND table_name = 'series'
    ) THEN
        ALTER TABLE series ADD CONSTRAINT check_escola_valida 
        CHECK (escola IN ('Sete de Setembro', 'Pelicano'));
    END IF;
END $$;

-- Remover índices únicos antigos que não consideravam escola
DROP INDEX IF EXISTS idx_series_nome_ativo;
DROP INDEX IF EXISTS idx_series_ano_ativo;
DROP INDEX IF EXISTS idx_series_ordem_ativo;

-- Criar novos índices únicos considerando escola
CREATE UNIQUE INDEX IF NOT EXISTS idx_series_nome_escola_ativo ON series(nome, escola) WHERE ativo = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_series_ano_escola_ativo ON series(ano_serie, escola) WHERE ativo = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_series_ordem_escola_ativo ON series(ordem, escola) WHERE ativo = true;

-- Índice para consultas por escola
CREATE INDEX IF NOT EXISTS idx_series_escola ON series(escola);

-- Atualizar dados existentes - limpar dados duplicados primeiro se existirem
DELETE FROM series WHERE id NOT IN (
    SELECT DISTINCT ON (nome, escola) id 
    FROM series 
    ORDER BY nome, escola, created_at ASC
);

-- Distribuir séries entre escolas baseado na idade/nível
-- Séries iniciais (Berçário a 5º Ano) ficam em 'Sete de Setembro'
UPDATE series SET escola = 'Sete de Setembro' 
WHERE nome IN ('Berçário', 'Maternal I', 'Maternal II', 'Jardim I', 'Jardim II', 
               '1º Ano Fundamental', '2º Ano Fundamental', '3º Ano Fundamental', 
               '4º Ano Fundamental', '5º Ano Fundamental');

-- Séries maiores (6º Ano ao 3º Médio) ficam em 'Pelicano'
UPDATE series SET escola = 'Pelicano' 
WHERE nome IN ('6º Ano Fundamental', '7º Ano Fundamental', '8º Ano Fundamental', 
               '9º Ano Fundamental', '1º Ano Médio', '2º Ano Médio', '3º Ano Médio');

-- Criar algumas séries específicas para cada escola (se não existirem)
-- Séries específicas para Pelicano (fundamental 2 e médio)
INSERT INTO series (nome, ano_serie, valor_mensal_com_material, valor_material, valor_mensal_sem_material, ordem, escola, ativo) 
SELECT nome, ano_serie, 
       CASE 
         WHEN nome LIKE '%Fundamental%' THEN valor_mensal_com_material * 0.95
         ELSE valor_mensal_com_material
       END,
       valor_material,
       CASE 
         WHEN nome LIKE '%Fundamental%' THEN valor_mensal_sem_material * 0.95
         ELSE valor_mensal_sem_material
       END,
       ordem + 20, -- Offset para evitar conflitos
       'Pelicano', 
       ativo
FROM series 
WHERE escola = 'Sete de Setembro' 
  AND nome IN ('1º Ano Fundamental', '2º Ano Fundamental', '3º Ano Fundamental')
  AND NOT EXISTS (
    SELECT 1 FROM series s2 
    WHERE s2.nome = series.nome 
    AND s2.escola = 'Pelicano'
  );

-- Séries específicas para Sete de Setembro (ensino médio diferenciado)
INSERT INTO series (nome, ano_serie, valor_mensal_com_material, valor_material, valor_mensal_sem_material, ordem, escola, ativo) 
SELECT nome, ano_serie, 
       valor_mensal_com_material * 1.05, -- Valor ligeiramente diferente
       valor_material,
       valor_mensal_sem_material * 1.05,
       ordem + 30, -- Offset para evitar conflitos
       'Sete de Setembro', 
       ativo
FROM series 
WHERE escola = 'Pelicano' 
  AND nome IN ('6º Ano Fundamental', '7º Ano Fundamental')
  AND NOT EXISTS (
    SELECT 1 FROM series s2 
    WHERE s2.nome = series.nome 
    AND s2.escola = 'Sete de Setembro'
  );

-- Atualizar política RLS para considerar escola
DROP POLICY IF EXISTS "Permitir modificação apenas para admins" ON series;

CREATE POLICY "Permitir modificação apenas para admins" ON series
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND ativo = true
            AND role IN ('super_admin', 'coordenador')
        )
    );