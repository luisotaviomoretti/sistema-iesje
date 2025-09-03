-- Criação da tabela series para gerenciamento de séries/anos escolares e seus valores
CREATE TABLE series (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    ano_serie VARCHAR(50) NOT NULL,
    valor_mensal_com_material DECIMAL(10,2) NOT NULL CHECK (valor_mensal_com_material >= 0),
    valor_material DECIMAL(10,2) NOT NULL CHECK (valor_material >= 0),
    valor_mensal_sem_material DECIMAL(10,2) NOT NULL CHECK (valor_mensal_sem_material >= 0),
    ordem INTEGER NOT NULL CHECK (ordem > 0),
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários explicativos
COMMENT ON TABLE series IS 'Séries/anos escolares com valores mensais e anuais';
COMMENT ON COLUMN series.nome IS 'Nome descritivo da série (ex: 1º Ano Fundamental)';
COMMENT ON COLUMN series.ano_serie IS 'Código oficial da série (ex: 1º Ano)';
COMMENT ON COLUMN series.valor_mensal_com_material IS 'Valor da mensalidade incluindo material escolar';
COMMENT ON COLUMN series.valor_material IS 'Valor específico cobrado pelo material escolar';
COMMENT ON COLUMN series.valor_mensal_sem_material IS 'Valor da mensalidade sem material (calculado)';
COMMENT ON COLUMN series.ordem IS 'Ordem de exibição das séries (1 = primeiro)';
COMMENT ON COLUMN series.ativo IS 'Se a série está ativa no sistema';

-- Índices para performance
CREATE INDEX idx_series_ativo ON series(ativo);
CREATE INDEX idx_series_ordem ON series(ordem);
CREATE UNIQUE INDEX idx_series_nome_ativo ON series(nome) WHERE ativo = true;
CREATE UNIQUE INDEX idx_series_ano_ativo ON series(ano_serie) WHERE ativo = true;
CREATE UNIQUE INDEX idx_series_ordem_ativo ON series(ordem) WHERE ativo = true;

-- Constraint para garantir que valor com material >= valor sem material
ALTER TABLE series ADD CONSTRAINT check_valor_com_maior_sem 
CHECK (valor_mensal_com_material >= valor_mensal_sem_material);

-- Constraint para garantir lógica do material
ALTER TABLE series ADD CONSTRAINT check_valor_material_logica 
CHECK (ABS((valor_mensal_com_material - valor_mensal_sem_material) - valor_material) <= (valor_material * 0.1));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_series_updated_at 
    BEFORE UPDATE ON series 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Dados iniciais para teste (séries comuns do ensino fundamental e médio)
INSERT INTO series (nome, ano_serie, valor_mensal_com_material, valor_material, valor_mensal_sem_material, ordem, ativo) VALUES
('Berçário', 'Berçário', 800.00, 50.00, 750.00, 1, true),
('Maternal I', 'Maternal I', 850.00, 60.00, 790.00, 2, true),
('Maternal II', 'Maternal II', 900.00, 70.00, 830.00, 3, true),
('Jardim I', 'Jardim I', 950.00, 80.00, 870.00, 4, true),
('Jardim II', 'Jardim II', 1000.00, 90.00, 910.00, 5, true),
('1º Ano Fundamental', '1º Ano', 1100.00, 120.00, 980.00, 6, true),
('2º Ano Fundamental', '2º Ano', 1150.00, 130.00, 1020.00, 7, true),
('3º Ano Fundamental', '3º Ano', 1200.00, 140.00, 1060.00, 8, true),
('4º Ano Fundamental', '4º Ano', 1250.00, 150.00, 1100.00, 9, true),
('5º Ano Fundamental', '5º Ano', 1300.00, 160.00, 1140.00, 10, true),
('6º Ano Fundamental', '6º Ano', 1400.00, 180.00, 1220.00, 11, true),
('7º Ano Fundamental', '7º Ano', 1450.00, 190.00, 1260.00, 12, true),
('8º Ano Fundamental', '8º Ano', 1500.00, 200.00, 1300.00, 13, true),
('9º Ano Fundamental', '9º Ano', 1550.00, 210.00, 1340.00, 14, true),
('1º Ano Médio', '1º Médio', 1700.00, 250.00, 1450.00, 15, true),
('2º Ano Médio', '2º Médio', 1750.00, 260.00, 1490.00, 16, true),
('3º Ano Médio', '3º Médio', 1800.00, 270.00, 1530.00, 17, true);

-- Habilitar RLS (Row Level Security)
ALTER TABLE series ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT a todos os usuários autenticados
CREATE POLICY "Permitir SELECT para usuários autenticados" ON series
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir INSERT/UPDATE/DELETE apenas para admins
CREATE POLICY "Permitir modificação apenas para admins" ON series
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND ativo = true
            AND role IN ('super_admin', 'coordenador')
        )
    );

-- Grant permissions
GRANT SELECT ON series TO authenticated;
GRANT ALL ON series TO service_role;