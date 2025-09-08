import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type AdminUser } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

// Tipos para autenticação
export interface AdminSession {
  user: User
  adminUser: AdminUser
  role: 'super_admin' | 'coordenador' | 'operador'
}

// Hook para verificar sessão administrativa
export const useAdminAuth = () => {
  return useQuery({
    queryKey: ['admin-session'],
    queryFn: async (): Promise<AdminSession | null> => {
      try {
        // Verificar sessão do Supabase Auth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Erro ao verificar sessão:', sessionError)
          return null
        }
        
        if (!session?.user) {
          return null
        }
        
        // Verificar se o usuário é um admin ativo
        const { data: adminUser, error: adminError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', session.user.email)
          .eq('ativo', true)
          .single()
        
        if (adminError) {
          if (adminError.code === 'PGRST116') { // Not found
            console.log('Usuário não é administrador:', session.user.email)
            return null
          }
          console.error('Erro ao buscar dados do admin:', adminError)
          return null
        }
        
        if (!adminUser) {
          return null
        }
        
        // Atualizar último login
        await supabase
          .from('admin_users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', adminUser.id)
        
        return {
          user: session.user,
          adminUser,
          role: adminUser.role as AdminSession['role']
        }
        
      } catch (error) {
        console.error('Erro na verificação de autenticação:', error)
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    retry: false, // Não retry automático para auth
  })
}

// Hook para login administrativo
export const useAdminLogin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('🔐 Tentativa de login para:', email)
      
      try {
        // Fazer login via Supabase Auth PRIMEIRO
        console.log('🔑 Fazendo login no Supabase Auth...')
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) {
          console.error('❌ Erro no Supabase Auth:', error)
          throw new Error(error.message)
        }
        
        if (!data.session) {
          throw new Error('Falha na autenticação')
        }
        
        console.log('✅ Login Auth bem-sucedido, verificando admin...')
        
        // DEPOIS verificar se é admin
        const { data: adminUser, error: adminCheckError } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', email)
          .eq('ativo', true)
          .single()
        
        console.log('📋 Verificação admin_users:', { adminUser, adminCheckError })
        
        if (!adminUser || adminCheckError) {
          console.error('❌ Usuário não é admin, fazendo logout...')
          await supabase.auth.signOut()
          throw new Error('Usuário não autorizado para acesso administrativo')
        }
        
        console.log('✅ Login completo bem-sucedido!')
        return {
          session: data.session,
          adminUser
        }
        
      } catch (err) {
        console.error('🚨 Erro no processo de login:', err)
        throw err
      }
    },
    onSuccess: () => {
      // Revalidar a sessão administrativa
      queryClient.invalidateQueries({ queryKey: ['admin-session'] })
    },
    onError: (error) => {
      console.error('Erro no login administrativo:', error)
    },
  })
}

// Hook para logout administrativo
export const useAdminLogout = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Erro no logout:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      // Limpar todas as queries do cache
      queryClient.clear()
    },
    onError: (error) => {
      console.error('Erro no logout administrativo:', error)
    },
  })
}

// Hook para verificar permissões específicas
export const useAdminPermissions = () => {
  const { data: session } = useAdminAuth()
  
  const permissions = {
    // Super Admin pode tudo
    isSuperAdmin: session?.role === 'super_admin',
    
    // Coordenador pode aprovar e gerenciar dados
    canApprove: session?.role === 'coordenador' || session?.role === 'super_admin',
    
    // Todos os admins podem consultar
    canView: !!session,
    
    // Apenas Super Admin pode gerenciar usuários
    canManageUsers: session?.role === 'super_admin',
    
    // Apenas Super Admin pode alterar configurações sensíveis
    canManageSystemConfigs: session?.role === 'super_admin',
    
    // Coordenador e Super Admin podem gerenciar descontos
    canManageDiscounts: session?.role === 'coordenador' || session?.role === 'super_admin',
    
    // Coordenador e Super Admin podem gerenciar CEPs
    canManageCeps: session?.role === 'coordenador' || session?.role === 'super_admin',
    
    // Todos podem ver relatórios básicos
    canViewReports: !!session,
    
    // Apenas Super Admin pode ver logs de auditoria completos
    canViewAuditLogs: session?.role === 'super_admin',
    
    // Coordenador e Super Admin podem exportar dados
    canExportData: session?.role === 'coordenador' || session?.role === 'super_admin',
  }
  
  return {
    session,
    permissions,
    isLoading: false, // useQuery já gerencia o loading
  }
}

// Hook para listar usuários administrativos (apenas para Super Admin)
export const useAdminUsers = () => {
  const { permissions } = useAdminPermissions()
  
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Erro ao buscar usuários admin:', error)
        throw new Error(error.message)
      }
      
      return data as AdminUser[]
    },
    enabled: permissions.canManageUsers,
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// Hook para criar usuário administrativo
export const useCreateAdminUser = () => {
  const queryClient = useQueryClient()
  const { permissions } = useAdminPermissions()
  
  return useMutation({
    mutationFn: async (userData: { 
      email: string
      nome: string
      role: 'super_admin' | 'coordenador' | 'operador'
    }) => {
      if (!permissions.canManageUsers) {
        throw new Error('Sem permissão para gerenciar usuários')
      }
      
      const { data, error } = await supabase
        .from('admin_users')
        .insert(userData)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao criar usuário admin:', error)
        throw new Error(error.message)
      }
      
      return data as AdminUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      console.error('Erro na criação de usuário admin:', error)
    },
  })
}

// Hook para atualizar usuário administrativo
export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient()
  const { permissions } = useAdminPermissions()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...updates 
    }: { 
      id: string 
    } & Partial<Pick<AdminUser, 'nome' | 'role' | 'ativo'>>) => {
      if (!permissions.canManageUsers) {
        throw new Error('Sem permissão para gerenciar usuários')
      }
      
      const { data, error } = await supabase
        .from('admin_users')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('Erro ao atualizar usuário admin:', error)
        throw new Error(error.message)
      }
      
      return data as AdminUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error) => {
      console.error('Erro na atualização de usuário admin:', error)
    },
  })
}

// Hook para verificar se precisa fazer setup inicial
export const useAdminSetup = () => {
  return useQuery({
    queryKey: ['admin-setup-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('ativo', true)
        .limit(1)
      
      if (error) {
        console.error('Erro ao verificar setup:', error)
        return { hasAdminUsers: false }
      }
      
      return { 
        hasAdminUsers: data.length > 0,
        needsSetup: data.length === 0
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

// Função utilitária para formatar nome do role
export const formatRole = (role: string): string => {
  switch (role) {
    case 'super_admin':
      return 'Super Administrador'
    case 'coordenador':
      return 'Coordenador'
    case 'operador':
      return 'Operador'
    default:
      return role
  }
}

// Função utilitária para obter cor do badge do role
export const getRoleColor = (role: string): 'default' | 'secondary' | 'destructive' => {
  switch (role) {
    case 'super_admin':
      return 'destructive'
    case 'coordenador':
      return 'default'
    case 'operador':
      return 'secondary'
    default:
      return 'secondary'
  }
}