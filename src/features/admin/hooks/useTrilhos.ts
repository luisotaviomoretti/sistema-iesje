import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  supabase, 
  type TrilhoDesconto, 
  type TrilhoDescontoInsert, 
  type TrilhoDescontoUpdate,
  type TrilhoComRegras,
  type RegraTrilho,
  type ConfigCap,
  type ConfigCapInsert,
  type ConfigCapUpdate,
  type CategoriaDesconto,
  type TrilhoNome,
  type TipoDesconto,
  type CalculoDesconto,
  type ValidacaoTrilho
} from '@/lib/supabase'

// ============================================================================
// HOOKS PARA TRILHOS DE DESCONTO
// ============================================================================

// Hook para listar todos os trilhos
export const useTrilhos = (includeInactive = false) => {
  return useQuery({
    queryKey: ['trilhos', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('trilhos_desconto')
        .select('*')
        .order('ordem_exibicao')
      
      if (!includeInactive) {
        query = query.eq('ativo', true)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Erro ao buscar trilhos:', error)
        throw new Error(error.message)
      }
      
      return data as TrilhoDesconto[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para obter um trilho específico com suas regras
export const useTrilho = (nome: TrilhoNome | undefined) => {
  return useQuery({
    queryKey: ['trilho', nome],
    queryFn: async () => {
      if (!nome) return null
      
      // Buscar o trilho
      const { data: trilho, error: trilhoError } = await supabase
        .from('trilhos_desconto')
        .select('*')
        .eq('nome', nome)
        .eq('ativo', true)
        .single()
      
      if (trilhoError) {
        console.error('Erro ao buscar trilho:', trilhoError)
        throw new Error(trilhoError.message)
      }
      
      // Buscar as regras do trilho
      const { data: regras, error: regrasError } = await supabase
        .from('regras_trilhos')
        .select('*')
        .eq('trilho_id', trilho.id)
        .order('prioridade')
      
      if (regrasError) {
        console.error('Erro ao buscar regras do trilho:', regrasError)
        throw new Error(regrasError.message)
      }
      
      return {
        ...trilho,
        regras: regras as RegraTrilho[]
      } as TrilhoComRegras
    },
    enabled: !!nome,
  })
}

// Hook para atualizar trilho
export const useUpdateTrilho = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TrilhoDescontoUpdate) => {
      console.log('🔄 Atualizando trilho:', { id, updates })
      console.log('📝 Dados sendo enviados:', {
        ...updates,
        updated_at: new Date().toISOString()
      })
      
      const updatePayload = {
        ...updates,
        updated_at: new Date().toISOString()
      }
      
      console.log('🔐 Verificando autenticação Supabase...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Usuário autenticado:', user?.email || 'Não autenticado')
      
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single()
      
      // Verificar se houve erro de RLS
      if (error?.code === '42501') {
        console.error('❌ Erro de permissão RLS! Usuário não tem permissão para atualizar.')
      }
      
      if (error) {
        console.error('❌ Erro ao atualizar trilho:', error)
        console.error('Detalhes do erro:', error.details, error.hint, error.message)
        throw new Error(error.message)
      }
      
      console.log('✅ Trilho atualizado com sucesso:', data)
      console.log('📊 CAP após atualização:', data?.cap_maximo)
      
      return data as TrilhoDesconto
    },
    onSuccess: (updatedTrilho) => {
      console.log('🔄 Invalidando cache após sucesso...')
      // Invalidar todas as queries relacionadas a trilhos
      queryClient.invalidateQueries({ queryKey: ['trilhos'] })
      queryClient.invalidateQueries({ queryKey: ['public-trilhos'] })
      queryClient.invalidateQueries({ queryKey: ['trilho', updatedTrilho.nome] })
      queryClient.invalidateQueries({ queryKey: ['tracks'] })
      
      // Forçar refetch imediato
      queryClient.refetchQueries({ queryKey: ['public-trilhos'] })
      console.log('✅ Cache invalidado e dados recarregados')
    },
    onError: (error) => {
      console.error('Erro na atualização do trilho:', error)
    },
  })
}

// ============================================================================
// HOOKS PARA CONFIGURAÇÃO DE CAPS
// ============================================================================

// Hook para obter configuração vigente de caps
export const useCurrentCapConfig = () => {
  return useQuery({
    queryKey: ['cap-config-current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_current_cap_config')
      
      if (error) {
        console.error('Erro ao buscar configuração de cap:', error)
        throw new Error(error.message)
      }
      
      return data as ConfigCap
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para listar todas as configurações de cap (histórico)
export const useCapConfigs = () => {
  return useQuery({
    queryKey: ['cap-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config_caps')
        .select('*')
        .order('vigencia_inicio', { ascending: false })
      
      if (error) {
        console.error('Erro ao buscar configurações de cap:', error)
        throw new Error(error.message)
      }
      
      return data as ConfigCap[]
    },
    staleTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para criar nova configuração de cap
export const useCreateCapConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (config: ConfigCapInsert) => {
      const { data, error } = await supabase
        .from('config_caps')
        .insert(config)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar configuração de cap:', error)
        throw new Error(error.message)
      }
      
      return data as ConfigCap
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cap-configs'] })
      queryClient.invalidateQueries({ queryKey: ['cap-config-current'] })
    },
    onError: (error) => {
      console.error('Erro na criação da configuração:', error)
    },
  })
}

// Hook para atualizar configuração de cap
export const useUpdateCapConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & ConfigCapUpdate) => {
      const { data, error } = await supabase
        .from('config_caps')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar configuração de cap:', error)
        throw new Error(error.message)
      }
      
      return data as ConfigCap
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cap-configs'] })
      queryClient.invalidateQueries({ queryKey: ['cap-config-current'] })
    },
    onError: (error) => {
      console.error('Erro na atualização da configuração:', error)
    },
  })
}

// ============================================================================
// HOOKS PARA VALIDAÇÃO E CÁLCULO DE TRILHOS
// ============================================================================

// Hook para validar compatibilidade de trilho
export const useValidateTrilho = () => {
  return useMutation({
    mutationFn: async ({ 
      trilho, 
      categorias 
    }: { 
      trilho: TrilhoNome
      categorias: CategoriaDesconto[] 
    }) => {
      const { data, error } = await supabase
        .rpc('validate_trilho_compatibility', {
          p_trilho_nome: trilho,
          p_categorias_desconto: categorias
        })
      
      if (error) {
        console.error('Erro ao validar trilho:', error)
        throw new Error(error.message)
      }
      
      return data as boolean
    },
  })
}

// Hook para calcular desconto com base no trilho
export const useCalcularDesconto = () => {
  return useMutation({
    mutationFn: async ({ 
      trilho, 
      descontos, 
      valorBase,
      temResponsavelSecundario = false
    }: { 
      trilho: TrilhoNome
      descontos: TipoDesconto[]
      valorBase: number
      temResponsavelSecundario?: boolean
    }): Promise<CalculoDesconto> => {
      // Buscar trilho e configurações
      const [trilhoData, capConfig] = await Promise.all([
        supabase
          .from('trilhos_desconto')
          .select('*')
          .eq('nome', trilho)
          .eq('ativo', true)
          .single(),
        supabase.rpc('get_current_cap_config')
      ])
      
      if (trilhoData.error) {
        throw new Error(trilhoData.error.message)
      }
      
      if (capConfig.error) {
        throw new Error(capConfig.error.message)
      }
      
      // Calcular cap disponível baseado no trilho e responsável secundário
      let capDisponivel = trilhoData.data.cap_maximo
      
      if (trilho === 'especial') {
        capDisponivel = capConfig.data.cap_especial_maximo
      } else if (trilho === 'combinado') {
        capDisponivel = temResponsavelSecundario 
          ? capConfig.data.cap_with_secondary 
          : capConfig.data.cap_without_secondary
      } else if (trilho === 'comercial') {
        capDisponivel = capConfig.data.cap_without_secondary
      }
      
      // Calcular total de desconto
      const valorTotalDesconto = descontos.reduce((total, desconto) => {
        return total + (desconto.percentual_fixo || 0)
      }, 0)
      
      // Validar se cap é respeitado
      const capRespeitado = capDisponivel ? valorTotalDesconto <= capDisponivel : true
      const capAplicado = capDisponivel ? Math.min(valorTotalDesconto, capDisponivel) : valorTotalDesconto
      
      // Calcular valor final
      const valorFinal = valorBase * (1 - capAplicado / 100)
      
      // Determinar se é válido
      const ehValido = capRespeitado && descontos.length > 0
      
      // Construir restrições
      const restricoes: string[] = []
      if (!capRespeitado) {
        restricoes.push(`Desconto total (${valorTotalDesconto}%) excede o cap do trilho (${capDisponivel}%)`)
      }
      
      return {
        trilho,
        descontos_aplicados: descontos,
        cap_calculado: capAplicado,
        cap_disponivel: capDisponivel || 100,
        valor_total_desconto: valorTotalDesconto,
        valor_final: valorFinal,
        eh_valido: ehValido,
        restricoes: restricoes.length > 0 ? restricoes : undefined
      }
    },
  })
}

// ============================================================================
// HOOKS PÚBLICOS (PARA USO NO SISTEMA DE MATRÍCULA)
// ============================================================================

// Hook público para usar trilhos no sistema de matrícula
export const usePublicTrilhos = () => {
  return useQuery({
    queryKey: ['public-trilhos'],
    queryFn: async () => {
      console.log(`🔍 Buscando trilhos do banco de dados... [${new Date().toLocaleTimeString()}]`)
      
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select('*')
        .eq('ativo', true)
        .order('ordem_exibicao')
      
      if (error) {
        console.error('Erro ao buscar trilhos públicos:', error)
        throw new Error(error.message)
      }
      
      console.log('📊 Trilhos retornados do banco (RAW):', JSON.stringify(data, null, 2))
      console.log('📊 CAPs dos trilhos:')
      data?.forEach(trilho => {
        console.log(`  - ${trilho.nome}: CAP = ${trilho.cap_maximo}% (tipo: ${typeof trilho.cap_maximo})`)
        console.log(`    Dados completos:`, {
          id: trilho.id,
          nome: trilho.nome,
          cap_maximo: trilho.cap_maximo,
          updated_at: trilho.updated_at
        })
      })
      
      return data as TrilhoDesconto[]
    },
    staleTime: 5 * 1000, // 5 segundos - atualização muito rápida para debug
    gcTime: 10 * 1000, // 10 segundos
    refetchOnMount: true, // Sempre buscar ao montar
    refetchOnWindowFocus: true // Buscar ao focar na janela
  })
}

// Hook público para trilho específico com regras
export const usePublicTrilho = (nome: TrilhoNome | undefined) => {
  return useQuery({
    queryKey: ['public-trilho', nome],
    queryFn: async () => {
      if (!nome) return null
      
      // Buscar trilho com regras em uma única query
      const { data, error } = await supabase
        .from('trilhos_desconto')
        .select(`
          *,
          regras_trilhos (*)
        `)
        .eq('nome', nome)
        .eq('ativo', true)
        .single()
      
      if (error) {
        console.error('Erro ao buscar trilho público:', error)
        throw new Error(error.message)
      }
      
      return {
        ...data,
        regras: data.regras_trilhos
      } as TrilhoComRegras
    },
    enabled: !!nome,
    staleTime: 10 * 60 * 1000, // 10 minutos
    gcTime: 30 * 60 * 1000, // 30 minutos
  })
}

// Hook para obter descontos compatíveis com um trilho
export const useDescontosCompativeis = (trilho: TrilhoNome | undefined) => {
  return useQuery({
    queryKey: ['descontos-compativeis', trilho],
    queryFn: async () => {
      if (!trilho) return []
      
      // Buscar as categorias permitidas pelo trilho
      const { data: trilhoData, error: trilhoError } = await supabase
        .from('trilhos_desconto')
        .select(`
          *,
          regras_trilhos (
            categoria_permitida
          )
        `)
        .eq('nome', trilho)
        .eq('ativo', true)
        .single()
      
      if (trilhoError) {
        throw new Error(trilhoError.message)
      }
      
      const categoriasPermitidas = trilhoData.regras_trilhos.map(
        (regra: any) => regra.categoria_permitida
      )
      
      // Buscar tipos de desconto compatíveis
      const { data: descontos, error: descontosError } = await supabase
        .from('tipos_desconto')
        .select('*')
        .in('categoria', categoriasPermitidas)
        .eq('ativo', true)
        .order('codigo')
      
      if (descontosError) {
        throw new Error(descontosError.message)
      }
      
      return descontos as TipoDesconto[]
    },
    enabled: !!trilho,
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}