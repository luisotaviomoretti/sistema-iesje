import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type TipoDesconto, type TipoDescontoInsert, type TipoDescontoUpdate } from '@/lib/supabase'

// Hook para listar todos os tipos de desconto
export const useDiscountTypes = (includeInactive = false) => {
  return useQuery({
    queryKey: ['discount-types', includeInactive],
    queryFn: async () => {
      let query = supabase
        .from('tipos_desconto')
        .select('*')
        .order('codigo')
      
      if (!includeInactive) {
        query = query.eq('ativo', true)
      }
      
      const { data, error } = await query
      
      if (error) {
        console.error('Erro ao buscar tipos de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Hook para obter um tipo de desconto específico
export const useDiscountType = (id: string | undefined) => {
  return useQuery({
    queryKey: ['discount-type', id],
    queryFn: async () => {
      if (!id) return null
      
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Erro ao buscar tipo de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto
    },
    enabled: !!id,
  })
}

// Hook para criar novo tipo de desconto
export const useCreateDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (discountType: TipoDescontoInsert) => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .insert(discountType)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar tipo de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto
    },
    onSuccess: () => {
      // Invalida todas as queries de tipos de desconto
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
      queryClient.invalidateQueries({ queryKey: ['discount-type'] })
    },
    onError: (error) => {
      console.error('Erro na criação:', error)
    },
  })
}

// Hook para atualizar tipo de desconto
export const useUpdateDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & TipoDescontoUpdate) => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar tipo de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto
    },
    onSuccess: (updatedDiscount) => {
      // Invalida as queries e atualiza o cache otimisticamente
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
      queryClient.setQueryData(['discount-type', updatedDiscount.id], updatedDiscount)
    },
    onError: (error) => {
      console.error('Erro na atualização:', error)
    },
  })
}

// Hook para desativar tipo de desconto (soft delete)
export const useDeleteDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .update({ 
          ativo: false, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao desativar tipo de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
    },
    onError: (error) => {
      console.error('Erro na desativação:', error)
    },
  })
}

// Hook para reativar tipo de desconto
export const useActivateDiscountType = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('tipos_desconto')
        .update({ 
          ativo: true, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao reativar tipo de desconto:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discount-types'] })
    },
    onError: (error) => {
      console.error('Erro na reativação:', error)
    },
  })
}

// Hook público para usar no sistema de matrícula (sem autenticação admin)
export const usePublicDiscountTypes = () => {
  return useQuery({
    queryKey: ['public-discount-types'],
    queryFn: async () => {
      try {
        // Fallback para query direta se RPC não existir
        const { data, error } = await supabase
          .from('tipos_desconto')
          .select('*')
          .eq('ativo', true)
          .order('codigo')
        
        if (error) {
          console.error('Erro ao buscar tipos de desconto públicos:', error)
          // Retornar array vazio em caso de erro ao invés de throw
          return [] as TipoDesconto[]
        }
        
        // Garantir que sempre retornamos um array
        return (data || []) as TipoDesconto[]
      } catch (err) {
        console.error('Erro inesperado em usePublicDiscountTypes:', err)
        // Sempre retornar array vazio em caso de erro
        return [] as TipoDesconto[]
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutos (cache mais longo para dados públicos)
    gcTime: 30 * 60 * 1000, // 30 minutos
    // Sempre retornar array vazio como placeholder inicial
    placeholderData: [] as TipoDesconto[]
  })
}

// Função utilitária para encontrar tipo de desconto por código
export const useDiscountTypeByCode = (codigo: string | undefined) => {
  return useQuery({
    queryKey: ['discount-type-by-code', codigo],
    queryFn: async () => {
      if (!codigo) return null
      
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select('*')
        .eq('codigo', codigo)
        .eq('ativo', true)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') { // Not found
          return null
        }
        console.error('Erro ao buscar tipo de desconto por código:', error)
        throw new Error(error.message)
      }
      
      return data as TipoDesconto
    },
    enabled: !!codigo,
  })
}