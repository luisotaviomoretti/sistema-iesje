# Plano de Implementação - Fase 1: Core Admin (MVP)

## Objetivo da Fase 1
Criar o núcleo básico do painel administrativo com Supabase, permitindo:
- Dashboard com métricas essenciais
- CRUD completo de tipos de desconto (substituindo constants.ts)
- Configuração básica de CEPs (substituindo lógica hardcoded)
- Autenticação administrativa básica

**Duração Estimada: 2-3 semanas**

---

## 📊 ETAPA 1: Configuração do Supabase (Semana 1 - Início)

### 1.1 Setup Inicial do Projeto Supabase
**Tempo: 1-2 dias**

```bash
# Dependências necessárias
npm install @supabase/supabase-js
npm install -D @types/node
```

**Configurações de ambiente:**
```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 1.2 Schema do Banco de Dados - Fase 1
**Tempo: 1 dia**

```sql
-- Tabela de configurações do sistema
CREATE TABLE system_configs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT DEFAULT 'geral',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT
);

-- Tabela de tipos de desconto (migração do constants.ts)
CREATE TABLE tipos_desconto (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    percentual_fixo INTEGER,
    eh_variavel BOOLEAN DEFAULT FALSE,
    documentos_necessarios TEXT[], -- Array de strings
    nivel_aprovacao_requerido TEXT CHECK (nivel_aprovacao_requerido IN ('AUTOMATICA', 'COORDENACAO', 'DIRECAO')),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de faixas de CEP
CREATE TABLE cep_ranges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cep_inicio TEXT NOT NULL,
    cep_fim TEXT NOT NULL,
    categoria TEXT CHECK (categoria IN ('fora', 'baixa', 'alta')),
    percentual_desconto INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de usuários administrativos
CREATE TABLE admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    role TEXT CHECK (role IN ('super_admin', 'coordenador', 'operador')) DEFAULT 'operador',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE
);

-- Tabela de logs de auditoria
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tabela TEXT NOT NULL,
    registro_id TEXT NOT NULL,
    acao TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id UUID REFERENCES admin_users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_tipos_desconto_codigo ON tipos_desconto(codigo);
CREATE INDEX idx_tipos_desconto_ativo ON tipos_desconto(ativo);
CREATE INDEX idx_cep_ranges_categoria ON cep_ranges(categoria);
CREATE INDEX idx_audit_logs_tabela ON audit_logs(tabela);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- RLS (Row Level Security) - Configuração básica
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_desconto ENABLE ROW LEVEL SECURITY;
ALTER TABLE cep_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (refinadas posteriormente)
CREATE POLICY "Admin users can manage all data" ON system_configs FOR ALL USING (true);
CREATE POLICY "Admin users can manage discount types" ON tipos_desconto FOR ALL USING (true);
CREATE POLICY "Admin users can manage CEP ranges" ON cep_ranges FOR ALL USING (true);
CREATE POLICY "Admin users can view user data" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Admin users can view audit logs" ON audit_logs FOR SELECT USING (true);
```

### 1.3 Dados Iniciais (Seed)
**Tempo: 0.5 dia**

```sql
-- Migração dos dados do constants.ts
INSERT INTO tipos_desconto (codigo, descricao, percentual_fixo, eh_variavel, documentos_necessarios, nivel_aprovacao_requerido) VALUES
('IIR', 'Alunos Irmãos Carnal - 10%', 10, false, ARRAY['Certidão de nascimento dos irmãos', 'Comprovante de matrícula do(s) irmão(s)'], 'AUTOMATICA'),
('RES', 'Alunos de Outras Cidades - 20%', 20, false, ARRAY['Comprovante de residência de outra cidade'], 'AUTOMATICA'),
('PASS', 'Filhos de Prof. do IESJE Sindicalizados - 100%', 100, false, ARRAY['Vínculo empregatício', 'Declaração de sindicalização'], 'DIRECAO'),
('PBS', 'Filhos Prof. Sind. de Outras Instituições - 40%', 40, false, ARRAY['Comprovante de vínculo docente', 'Comprovante de sindicalização'], 'COORDENACAO'),
('COL', 'Filhos de Func. do IESJE Sindicalizados (SAAE) - 50%', 50, false, ARRAY['Vínculo com IESJE', 'Comprovante de sindicalização SAAE'], 'COORDENACAO'),
('SAE', 'Filhos de Func. Outros Estabelec. Sindicalizados (SAAE) - 40%', 40, false, ARRAY['Comprovante de vínculo empregatício', 'Comprovante SAAE'], 'COORDENACAO'),
('ABI', 'Bolsa Integral Filantropia - 100%', 100, false, ARRAY['Processo de filantropia completo'], 'DIRECAO'),
('ABP', 'Bolsa Parcial Filantropia - 50%', 50, false, ARRAY['Processo de filantropia completo'], 'COORDENACAO'),
('PAV', 'Pagamento à Vista - 15%', 15, false, ARRAY['Comprovante de pagamento integral'], 'AUTOMATICA'),
('CEP10', 'Comercial — CEP fora de Poços de Caldas - 10%', 10, false, ARRAY[]::TEXT[], 'AUTOMATICA'),
('CEP5', 'Comercial — CEP em bairro de menor renda (Poços) - 5%', 5, false, ARRAY[]::TEXT[], 'AUTOMATICA'),
('ADIM2', 'Comercial — Adimplente perfeito - 2%', 2, false, ARRAY[]::TEXT[], 'AUTOMATICA'),
('COM_EXTRA', 'Comercial — Extra (negociação) até 20%', null, true, ARRAY[]::TEXT[], 'DIRECAO');

-- Configurações iniciais do sistema
INSERT INTO system_configs (chave, valor, descricao, categoria) VALUES
('max_desconto_total', '60', 'Limite máximo de desconto cumulativo (%)', 'financeiro'),
('logo_url', '/lovable-uploads/814e5eba-7015-4421-bfe7-7094b96ef294.png', 'URL do logo da instituição', 'geral'),
('instituicao_nome', 'Instituto São João da Escócia (IESJE)', 'Nome da instituição', 'geral'),
('ano_letivo_atual', '2025', 'Ano letivo vigente', 'geral');

-- Faixas de CEP iniciais (migração do cep.ts)
INSERT INTO cep_ranges (cep_inicio, cep_fim, categoria, percentual_desconto) VALUES
('37700000', '37799999', 'alta', 0), -- Poços de Caldas - Alta renda (padrão)
('37712000', '37712999', 'baixa', 5), -- Bairros específicos - Baixa renda
('37713000', '37713999', 'baixa', 5), -- Bairros específicos - Baixa renda
('00000000', '37699999', 'fora', 10), -- Fora de Poços - Parte 1
('37800000', '99999999', 'fora', 10); -- Fora de Poços - Parte 2

-- Usuário admin inicial
INSERT INTO admin_users (email, nome, role) VALUES
('admin@iesje.edu.br', 'Administrador Sistema', 'super_admin');
```

---

## 🔧 ETAPA 2: Integração Frontend com Supabase (Semana 1 - Final)

### 2.1 Configuração do Cliente Supabase
**Tempo: 0.5 dia**

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types para TypeScript
export type Database = {
  public: {
    Tables: {
      tipos_desconto: {
        Row: {
          id: string
          codigo: string
          descricao: string
          percentual_fixo: number | null
          eh_variavel: boolean
          documentos_necessarios: string[]
          nivel_aprovacao_requerido: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['tipos_desconto']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['tipos_desconto']['Insert']>
      }
      cep_ranges: {
        Row: {
          id: string
          cep_inicio: string
          cep_fim: string
          categoria: 'fora' | 'baixa' | 'alta'
          percentual_desconto: number
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cep_ranges']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cep_ranges']['Insert']>
      }
      system_configs: {
        Row: {
          id: string
          chave: string
          valor: string
          descricao: string | null
          categoria: string
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: Omit<Database['public']['Tables']['system_configs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['system_configs']['Insert']>
      }
    }
  }
}
```

### 2.2 Hooks para Operações CRUD
**Tempo: 1 dia**

```typescript
// src/features/admin/hooks/useDiscountTypes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Database } from '@/lib/supabase'

type DiscountType = Database['public']['Tables']['tipos_desconto']['Row']
type DiscountTypeInsert = Database['public']['Tables']['tipos_desconto']['Insert']
type DiscountTypeUpdate = Database['public']['Tables']['tipos_desconto']['Update']

export const useDiscountTypes = () => {
  return useQuery({
    queryKey: ['discount-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select('*')
        .order('codigo')
      
      if (error) throw error
      return data as DiscountType[]
    }
  })
}

export const useCreateDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (discountType: DiscountTypeInsert) => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .insert(discountType)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
    }
  })
}

export const useUpdateDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & DiscountTypeUpdate) => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
    }
  })
}

export const useDeleteDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete - apenas desativar
      const { error } = await supabase
        .from('tipos_desconto')
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
    }
  })
}
```

---

## 🎨 ETAPA 3: Interface Administrativa (Semana 2)

### 3.1 Autenticação Administrativa
**Tempo: 1 dia**

```typescript
// src/features/admin/hooks/useAdminAuth.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const useAdminAuth = () => {
  return useQuery({
    queryKey: ['admin-session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) return null
      
      // Verificar se é usuário admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', session.user.email)
        .eq('ativo', true)
        .single()
      
      return adminUser ? { session, adminUser } : null
    }
  })
}

// src/components/AdminRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

interface AdminRouteProps {
  children: React.ReactNode
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const { data: auth, isLoading } = useAdminAuth()
  
  if (isLoading) return <div>Carregando...</div>
  
  if (!auth) {
    return <Navigate to="/admin/login" replace />
  }
  
  return <>{children}</>
}
```

### 3.2 Dashboard Administrativo
**Tempo: 1.5 dias**

```typescript
// src/pages/admin/AdminDashboard.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

const AdminDashboard = () => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const [discountTypes, cepRanges, configs] = await Promise.all([
        supabase.from('tipos_desconto').select('*', { count: 'exact' }),
        supabase.from('cep_ranges').select('*', { count: 'exact' }),
        supabase.from('system_configs').select('*', { count: 'exact' })
      ])
      
      return {
        totalDiscountTypes: discountTypes.count || 0,
        activeDiscountTypes: discountTypes.data?.filter(d => d.ativo).length || 0,
        totalCepRanges: cepRanges.count || 0,
        totalConfigs: configs.count || 0
      }
    }
  })

  if (isLoading) return <div>Carregando métricas...</div>

  return (
    <main className="container py-8 space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Painel Administrativo IESJE</h1>
        <p className="text-muted-foreground">Gestão de descontos e configurações</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tipos de Desconto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeDiscountTypes}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalDiscountTypes} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faixas de CEP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalCepRanges}</div>
            <p className="text-xs text-muted-foreground">configuradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalConfigs}</div>
            <p className="text-xs text-muted-foreground">parâmetros</p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export default AdminDashboard
```

### 3.3 Gestão de Tipos de Desconto
**Tempo: 2 dias**

```typescript
// src/pages/admin/DiscountManagement.tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDiscountTypes, useCreateDiscountType, useUpdateDiscountType, useDeleteDiscountType } from '@/features/admin/hooks/useDiscountTypes'
import { DiscountTypeForm } from '@/features/admin/components/DiscountTypeForm'

const DiscountManagement = () => {
  const [showForm, setShowForm] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  
  const { data: discountTypes, isLoading } = useDiscountTypes()
  const createMutation = useCreateDiscountType()
  const updateMutation = useUpdateDiscountType()
  const deleteMutation = useDeleteDiscountType()

  if (isLoading) return <div>Carregando...</div>

  return (
    <main className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Gestão de Descontos</h1>
        <Button onClick={() => setShowForm(true)}>
          Novo Tipo de Desconto
        </Button>
      </div>

      <div className="grid gap-4">
        {discountTypes?.map((discount) => (
          <Card key={discount.id}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">{discount.codigo}</CardTitle>
                <p className="text-sm text-muted-foreground">{discount.descricao}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={discount.ativo ? "default" : "secondary"}>
                  {discount.ativo ? "Ativo" : "Inativo"}
                </Badge>
                <Badge variant="outline">
                  {discount.percentual_fixo ? `${discount.percentual_fixo}%` : "Variável"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Aprovação:</span> {discount.nivel_aprovacao_requerido}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingDiscount(discount)}
                  >
                    Editar
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => deleteMutation.mutate(discount.id)}
                  >
                    Desativar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(showForm || editingDiscount) && (
        <DiscountTypeForm
          discount={editingDiscount}
          onClose={() => {
            setShowForm(false)
            setEditingDiscount(null)
          }}
          onSave={(data) => {
            if (editingDiscount) {
              updateMutation.mutate({ id: editingDiscount.id, ...data })
            } else {
              createMutation.mutate(data)
            }
          }}
        />
      )}
    </main>
  )
}

export default DiscountManagement
```

---

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"content": "Analisar estrutura atual do projeto para integra\u00e7\u00e3o Supabase", "status": "completed", "activeForm": "Analisando estrutura atual do projeto para integra\u00e7\u00e3o Supabase"}, {"content": "Definir schema do banco de dados Supabase para Fase 1", "status": "completed", "activeForm": "Definindo schema do banco de dados Supabase para Fase 1"}, {"content": "Criar plano de migra\u00e7\u00e3o de dados hardcoded para Fase 1", "status": "in_progress", "activeForm": "Criando plano de migra\u00e7\u00e3o de dados hardcoded para Fase 1"}, {"content": "Estabelecer cronograma detalhado da Fase 1", "status": "pending", "activeForm": "Estabelecendo cronograma detalhado da Fase 1"}]