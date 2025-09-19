import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type SystemConfig, type SystemConfigInsert, type SystemConfigUpdate } from '@/lib/supabase'

// Hook para listar configurações do sistema
export const useSystemConfigs = (categoria?: string) => {
  return useQuery({
    queryKey: ['system-configs', categoria],
    queryFn: async () => {
      let query = supabase
        .from('system_configs')
        .select('*')
        .order('categoria')
        .order('chave')
      
      if (categoria) {
        query = query.eq('categoria', categoria)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Erro ao buscar configurações:', error)
        throw new Error(error.message)
      }
      
      return data as SystemConfig[]
    },
    staleTime: 2 * 60 * 1000, // 2 minutos (configurações mudam com pouca frequência)
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para obter uma configuração específica por chave
export const useSystemConfig = (chave: string | undefined) => {
  return useQuery({
    queryKey: ['system-config', chave],
    queryFn: async () => {
      if (!chave) return null
      
      const { data, error } = await supabase
        .from('system_configs')
        .select('*')
        .eq('chave', chave)
        .order('updated_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(1)
      
      if (error) {
        console.error('Erro ao buscar configuração:', error)
        throw new Error(error.message)
      }
      
      const rows = (data || []) as SystemConfig[]
      return rows.length > 0 ? rows[0] : null
    },
    enabled: !!chave,
  })
}

// Hook público para obter configurações não sensíveis (usado no sistema de matrícula)
export const usePublicSystemConfig = (chave: string | undefined) => {
  return useQuery({
    queryKey: ['public-system-config', chave],
    queryFn: async () => {
      if (!chave) return null
      
      const { data, error } = await supabase
        .rpc('get_system_config', { config_key: chave })
      
      if (error) {
        console.error('Erro ao buscar configuração pública:', error)
        return null // Não lança erro para configs públicas
      }
      
      return data as string | null
    },
    enabled: !!chave,
    staleTime: 15 * 60 * 1000, // 15 minutos (cache mais longo para configs públicas)
    gcTime: 60 * 60 * 1000, // 1 hora
  })
}

// Hook para criar nova configuração
export const useCreateSystemConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (config: SystemConfigInsert) => {
      const { data, error } = await supabase
        .from('system_configs')
        .insert(config)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar configuração:', error)
        throw new Error(error.message)
      }
      
      return data as SystemConfig
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      queryClient.invalidateQueries({ queryKey: ['system-config'] })
      queryClient.invalidateQueries({ queryKey: ['public-system-config'] })
    },
    onError: (error) => {
      console.error('Erro na criação de configuração:', error)
    },
  })
}

// Hook para atualizar configuração
export const useUpdateSystemConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updated_by, 
      ...updates 
    }: { 
      id: string 
      updated_by: string 
    } & SystemConfigUpdate) => {
      const { data, error } = await supabase
        .from('system_configs')
        .update({
          ...updates,
          updated_by,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar configuração:', error)
        throw new Error(error.message)
      }
      
      return data as SystemConfig
    },
    onSuccess: (updatedConfig) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      queryClient.setQueryData(['system-config', updatedConfig.chave], updatedConfig)
      queryClient.invalidateQueries({ queryKey: ['public-system-config'] })
    },
    onError: (error) => {
      console.error('Erro na atualização de configuração:', error)
    },
  })
}

// Hook para atualizar valor de configuração por chave (mais simples)
export const useUpdateConfigValue = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      chave, 
      valor, 
      updated_by 
    }: { 
      chave: string
      valor: string
      updated_by: string
    }) => {
      const { data, error } = await supabase
        .from('system_configs')
        .update({
          valor,
          updated_by,
          updated_at: new Date().toISOString()
        })
        .eq('chave', chave)
        .select()
      
      if (error) {
        console.error('Erro ao atualizar valor da configuração:', error)
        throw new Error(error.message)
      }
      
      const rows = (data || []) as SystemConfig[]
      // Retorna a primeira linha atualizada (evita 406 quando há linhas duplicadas para mesma chave)
      if (rows.length > 0) return rows[0]
      throw new Error('Nenhuma linha atualizada para a chave informada')
    },
    onSuccess: (updatedConfig) => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      queryClient.setQueryData(['system-config', updatedConfig.chave], updatedConfig)
      queryClient.invalidateQueries({ queryKey: ['public-system-config'] })
    },
    onError: (error) => {
      console.error('Erro na atualização de valor:', error)
    },
  })
}

// Hook para deletar configuração (cuidado!)
export const useDeleteSystemConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('system_configs')
        .delete()
        .eq('id', id)
      
      if (error) {
        console.error('Erro ao deletar configuração:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-configs'] })
      queryClient.invalidateQueries({ queryKey: ['system-config'] })
      queryClient.invalidateQueries({ queryKey: ['public-system-config'] })
    },
    onError: (error) => {
      console.error('Erro na exclusão de configuração:', error)
    },
  })
}

// Hook para configurações agrupadas por categoria
export const useSystemConfigsByCategory = () => {
  return useQuery({
    queryKey: ['system-configs-grouped'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_configs')
        .select('*')
        .order('categoria')
        .order('chave')
      
      if (error) {
        console.error('Erro ao buscar configurações agrupadas:', error)
        throw new Error(error.message)
      }
      
      // Agrupar por categoria
      const grouped = (data as SystemConfig[]).reduce((acc, config) => {
        const categoria = config.categoria || 'geral'
        if (!acc[categoria]) {
          acc[categoria] = []
        }
        acc[categoria].push(config)
        return acc
      }, {} as Record<string, SystemConfig[]>)
      
      return grouped
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Hooks específicos para configurações importantes

// Hook para limite máximo de desconto
export const useMaxDiscountLimit = () => {
  const { data } = usePublicSystemConfig('max_desconto_total')
  return parseInt(data || '60', 10)
}

// Hook para ano letivo atual
export const useCurrentSchoolYear = () => {
  const { data } = usePublicSystemConfig('ano_letivo_atual')
  return parseInt(data || new Date().getFullYear().toString(), 10)
}

// Hook para dados da instituição
export const useInstitutionData = () => {
  return useQuery({
    queryKey: ['institution-data'],
    queryFn: async () => {
      const keys = [
        'instituicao_nome',
        'instituicao_cnpj', 
        'instituicao_endereco',
        'logo_url'
      ]
      
      const configs = await Promise.all(
        keys.map(async (key) => {
          const { data } = await supabase.rpc('get_system_config', { config_key: key })
          return { key, value: data }
        })
      )
      
      return configs.reduce((acc, config) => {
        acc[config.key] = config.value
        return acc
      }, {} as Record<string, string | null>)
    },
    staleTime: 30 * 60 * 1000, // 30 minutos (dados da instituição mudam raramente)
  })
}

// Hook para valores de mensalidade
export const useMonthlyFeeValues = () => {
  return useQuery({
    queryKey: ['monthly-fee-values'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_configs')
        .select('chave, valor')
        .like('chave', 'mensalidade_%')
        .order('chave')
      
      if (error) {
        console.error('Erro ao buscar valores de mensalidade:', error)
        throw new Error(error.message)
      }
      
      // Converter para objeto mais fácil de usar
      const fees = data.reduce((acc, config) => {
        // Extrair série do nome da chave (ex: mensalidade_1_ano -> "1º ano")
        const serieKey = config.chave.replace('mensalidade_', '').replace('_', 'º ').replace('serie_em', 'ª série EM')
        acc[serieKey] = parseFloat(config.valor)
        return acc
      }, {} as Record<string, number>)
      
      return fees
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}