import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

/**
 * Informações do usuário atual para rastreamento de matrículas
 */
export interface CurrentUserInfo {
  id: string | null
  email: string | null
  name: string | null
  type: 'admin' | 'matricula' | 'anonymous'
}

/**
 * Hook para detectar o usuário atual (admin, matricula ou anônimo)
 * Usado para rastreamento invisível de quem realiza cada matrícula
 */
export const useCurrentUser = (): CurrentUserInfo => {
  // Tentar detectar usuário admin primeiro (tem prioridade)
  const { data: adminSession } = useAdminAuth()
  
  // Query para usuário de matrícula (apenas se não for admin)
  const { data: matriculaUser } = useQuery({
    queryKey: ['current-matricula-user'],
    queryFn: async () => {
      // Se já detectou admin, não precisa verificar matrícula
      if (adminSession) return null
      
      try {
        // Verificar sessão do Supabase Auth
        const { data: { session } } = await supabase.auth.getSession()
        
        // Se não há sessão, retornar null
        if (!session?.user) {
          console.log('[useCurrentUser] Nenhuma sessão ativa')
          return null
        }
        
        // Buscar usuário na tabela matricula_users
        const { data, error } = await supabase
          .from('matricula_users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .eq('ativo', true)
          .single()
        
        if (error) {
          // PGRST116 = not found (esperado quando não é usuário de matrícula)
          if (error.code !== 'PGRST116') {
            console.error('[useCurrentUser] Erro ao buscar matricula_user:', error)
          }
          return null
        }
        
        console.log('[useCurrentUser] Usuário de matrícula detectado:', data?.email)
        return data
      } catch (error) {
        console.error('[useCurrentUser] Erro inesperado:', error)
        return null
      }
    },
    enabled: !adminSession, // Só executa se não for admin
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Mantém no cache por 10 minutos
    retry: false, // Não tentar novamente em caso de erro
  })

  // Retornar informações do usuário atual com prioridade: Admin > Matrícula > Anônimo
  
  // 1. Se é admin, retornar dados do admin
  if (adminSession?.adminUser) {
    return {
      id: adminSession.adminUser.id,
      email: adminSession.adminUser.email,
      name: adminSession.adminUser.nome,
      type: 'admin'
    }
  }
  
  // 2. Se é usuário de matrícula, retornar dados dele
  if (matriculaUser) {
    return {
      id: matriculaUser.id,
      email: matriculaUser.email,
      name: matriculaUser.nome,
      type: 'matricula'
    }
  }
  
  // 3. Caso contrário, é anônimo
  return {
    id: null,
    email: null,
    name: null,
    type: 'anonymous'
  }
}

/**
 * Hook auxiliar para obter informações do usuário de forma assíncrona
 * Útil quando precisamos aguardar o carregamento das informações
 */
export const useCurrentUserAsync = () => {
  const adminAuth = useAdminAuth()
  
  const matriculaQuery = useQuery({
    queryKey: ['current-matricula-user-async'],
    queryFn: async () => {
      // Se admin está carregando, aguardar
      if (adminAuth.isLoading) return null
      
      // Se já detectou admin, não precisa verificar matrícula
      if (adminAuth.data) return null
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return null
        
        const { data } = await supabase
          .from('matricula_users')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .eq('ativo', true)
          .single()
        
        return data
      } catch (error) {
        return null
      }
    },
    enabled: !adminAuth.isLoading && !adminAuth.data,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })
  
  const isLoading = adminAuth.isLoading || matriculaQuery.isLoading
  
  // Determinar o usuário atual
  let userInfo: CurrentUserInfo
  
  if (adminAuth.data?.adminUser) {
    userInfo = {
      id: adminAuth.data.adminUser.id,
      email: adminAuth.data.adminUser.email,
      name: adminAuth.data.adminUser.nome,
      type: 'admin'
    }
  } else if (matriculaQuery.data) {
    userInfo = {
      id: matriculaQuery.data.id,
      email: matriculaQuery.data.email,
      name: matriculaQuery.data.nome,
      type: 'matricula'
    }
  } else {
    userInfo = {
      id: null,
      email: null,
      name: null,
      type: 'anonymous'
    }
  }
  
  return {
    userInfo,
    isLoading,
    isAdmin: adminAuth.data !== null,
    isMatricula: matriculaQuery.data !== null,
    isAnonymous: !adminAuth.data && !matriculaQuery.data
  }
}