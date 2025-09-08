import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

function isValidUrl(u?: string): boolean {
  if (!u) return false
  try {
    const url = new URL(u as string)
    return /^https?:$/.test(url.protocol)
  } catch {
    return false
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

// Auto-correct common malformed values like 'https:xyz.supabase.co' → 'https://xyz.supabase.co'
if (typeof supabaseUrl === 'string') {
  if (/^https:[^/]/.test(supabaseUrl)) supabaseUrl = supabaseUrl.replace(/^https:/, 'https://')
  if (/^http:[^/]/.test(supabaseUrl)) supabaseUrl = supabaseUrl.replace(/^http:/, 'http://')
}

if (!isValidUrl(supabaseUrl)) {
  console.error('[Supabase] Invalid VITE_SUPABASE_URL:', supabaseUrl)
  throw new Error('Invalid VITE_SUPABASE_URL. Expected format: https://<project>.supabase.co')
}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey)

// Types para TypeScript baseados no schema do banco
// =====================================================
// TIPOS PARA SISTEMA DE ELEGIBILIDADE
// =====================================================

export type CepCategory = 'fora' | 'baixa' | 'alta'

export interface DiscountEligibility {
  codigo: string
  descricao: string
  percentual_fixo: number | null
  eh_variavel: boolean
  nivel_aprovacao_requerido: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
  categoria: 'especial' | 'regular' | 'negociacao'
  elegivel: boolean
  motivo_restricao: string | null
}

export interface EligibilityCheck {
  elegivel: boolean
  motivo_restricao: string | null
  sugestoes: string[]
}

export interface EligibilityStats {
  categoria_cep: CepCategory
  total_descontos: number
  elegiveis: number
  inelegiveis: number
  percentual_elegibilidade: number
}

export interface DiscountMatrixView {
  codigo: string
  descricao: string
  percentual_fixo: number | null
  tipo_categoria: string
  elegivel_alta_renda: boolean
  elegivel_baixa_renda: boolean
  elegivel_fora_pocos: boolean
  categorias_restritas: string | null
}

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
          categoria: 'especial' | 'regular' | 'negociacao'
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
          cidade: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cep_ranges']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cep_ranges']['Insert']>
      }
      cep_desconto_elegibilidade: {
        Row: {
          id: string
          categoria_cep: 'fora' | 'baixa' | 'alta'
          tipo_desconto_codigo: string
          elegivel: boolean
          motivo_restricao: string | null
          observacoes: string | null
          ativo: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cep_desconto_elegibilidade']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['cep_desconto_elegibilidade']['Insert']>
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
      admin_users: {
        Row: {
          id: string
          email: string
          nome: string
          role: 'super_admin' | 'coordenador' | 'operador'
          ativo: boolean
          created_at: string
          last_login: string | null
        }
        Insert: Omit<Database['public']['Tables']['admin_users']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          tabela: string
          registro_id: string
          acao: string
          dados_anteriores: any
          dados_novos: any
          usuario_id: string | null
          timestamp: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'timestamp'>
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
      trilhos_desconto: {
        Row: {
          id: string
          nome: 'especial' | 'combinado' | 'comercial'
          titulo: string
          descricao: string
          icone: string
          cor_primaria: string
          cap_maximo: number | null
          ativo: boolean
          ordem_exibicao: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['trilhos_desconto']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['trilhos_desconto']['Insert']>
      }
      regras_trilhos: {
        Row: {
          id: string
          trilho_id: string
          categoria_permitida: 'especial' | 'regular' | 'negociacao'
          pode_combinar_com: ('especial' | 'regular' | 'negociacao')[]
          prioridade: number
          restricao_especial: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['regras_trilhos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['regras_trilhos']['Insert']>
      }
      config_caps: {
        Row: {
          id: string
          cap_with_secondary: number
          cap_without_secondary: number
          cap_especial_maximo: number
          vigencia_inicio: string
          vigencia_fim: string | null
          observacoes: string | null
          updated_by: string | null
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['config_caps']['Row'], 'id' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['config_caps']['Insert']>
      }
      matriculas: {
        Row: {
          id: string
          aluno_nome: string
          aluno_cpf: string
          escola: 'pelicano' | 'sete_setembro'
          trilho_escolhido: 'especial' | 'combinado' | 'comercial' | null
          cap_aplicado: number | null
          trilho_metadata: Record<string, any>
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['matriculas']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['matriculas']['Insert']>
      }
    }
  }
}

// Helper types para facilitar o uso
export type TipoDesconto = Database['public']['Tables']['tipos_desconto']['Row']
export type TipoDescontoInsert = Database['public']['Tables']['tipos_desconto']['Insert']
export type TipoDescontoUpdate = Database['public']['Tables']['tipos_desconto']['Update']

export type CepRange = Database['public']['Tables']['cep_ranges']['Row']
export type CepRangeInsert = Database['public']['Tables']['cep_ranges']['Insert']
export type CepRangeUpdate = Database['public']['Tables']['cep_ranges']['Update']

// Tipos para sistema de elegibilidade
export type CepDescontoElegibilidade = Database['public']['Tables']['cep_desconto_elegibilidade']['Row']
export type CepDescontoElegibilidadeInsert = Database['public']['Tables']['cep_desconto_elegibilidade']['Insert']
export type CepDescontoElegibilidadeUpdate = Database['public']['Tables']['cep_desconto_elegibilidade']['Update']

export type SystemConfig = Database['public']['Tables']['system_configs']['Row']
export type SystemConfigInsert = Database['public']['Tables']['system_configs']['Insert']
export type SystemConfigUpdate = Database['public']['Tables']['system_configs']['Update']

export type AdminUser = Database['public']['Tables']['admin_users']['Row']
export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

// Types para o sistema de trilhos
export type TrilhoDesconto = Database['public']['Tables']['trilhos_desconto']['Row']
export type TrilhoDescontoInsert = Database['public']['Tables']['trilhos_desconto']['Insert']
export type TrilhoDescontoUpdate = Database['public']['Tables']['trilhos_desconto']['Update']

export type RegraTrilho = Database['public']['Tables']['regras_trilhos']['Row']
export type RegraTrilhoInsert = Database['public']['Tables']['regras_trilhos']['Insert']
export type RegraTrilhoUpdate = Database['public']['Tables']['regras_trilhos']['Update']

export type ConfigCap = Database['public']['Tables']['config_caps']['Row']
export type ConfigCapInsert = Database['public']['Tables']['config_caps']['Insert']
export type ConfigCapUpdate = Database['public']['Tables']['config_caps']['Update']

export type Matricula = Database['public']['Tables']['matriculas']['Row']
export type MatriculaInsert = Database['public']['Tables']['matriculas']['Insert']
export type MatriculaUpdate = Database['public']['Tables']['matriculas']['Update']

// Types para categorias de desconto
export type CategoriaDesconto = 'especial' | 'regular' | 'negociacao'
export type TrilhoNome = 'especial' | 'combinado' | 'comercial'

// Types compostos para facilitar o uso
export interface TrilhoComRegras extends TrilhoDesconto {
  regras: RegraTrilho[]
}

export interface CalculoDesconto {
  trilho: TrilhoNome
  descontos_aplicados: TipoDesconto[]
  cap_calculado: number
  cap_disponivel: number
  valor_total_desconto: number
  valor_final: number
  eh_valido: boolean
  restricoes?: string[]
}

export interface ValidacaoTrilho {
  trilho_compativel: boolean
  cap_respeitado: boolean
  documentacao_completa: boolean
  nivel_aprovacao: 'AUTOMATICA' | 'COORDENACAO' | 'DIRECAO'
  mensagens: string[]
}
