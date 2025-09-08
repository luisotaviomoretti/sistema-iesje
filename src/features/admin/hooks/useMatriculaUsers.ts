import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { ESCOLAS, EscolaType, MatriculaUser } from '@/features/matricula/types'

// Listar usuários de matrícula
export const useMatriculaUsers = (includeInactive = true) => {
  return useQuery({
    queryKey: ['matricula-users', includeInactive],
    queryFn: async (): Promise<MatriculaUser[]> => {
      let query = supabase
        .from('matricula_users')
        .select('*')
        .order('created_at', { ascending: false })

      if (!includeInactive) {
        query = query.eq('ativo', true)
      }

      const { data, error } = await query
      if (error) {
        console.error('Erro ao buscar usuários de matrícula:', error)
        throw new Error(error.message)
      }

      return (data || []) as MatriculaUser[]
    },
    staleTime: 2 * 60 * 1000,
  })
}

// Criar usuário de matrícula
export const useCreateMatriculaUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      email: string
      nome: string
      escola: EscolaType
      ativo?: boolean
      auth_user_id?: string | null
    }) => {
      const { email, nome, escola } = payload
      if (!email || !nome || !escola) {
        throw new Error('Nome, e-mail e escola são obrigatórios')
      }

      const { data, error } = await supabase
        .from('matricula_users')
        .insert({
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          escola,
          ativo: payload.ativo ?? true,
          auth_user_id: payload.auth_user_id ?? null,
        })
        .select()
        .single()

      if (error) {
        console.error('Erro ao criar usuário de matrícula:', error)
        throw new Error(error.message)
      }

      return data as MatriculaUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matricula-users'] })
      toast.success('Usuário de matrícula criado com sucesso')
    },
    onError: (error) => {
      console.error('Erro ao criar usuário de matrícula:', error)
      toast.error('Erro ao criar usuário de matrícula')
    }
  })
}

// Criar usuário completo via Edge Function (Auth + MatriculaUser)
export const useCreateMatriculaUserComplete = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      email: string
      nome: string
      escola: EscolaType
      password: string
      ativo?: boolean
    }) => {
      const { email, nome, escola, password } = payload
      if (!email || !nome || !escola || !password) {
        throw new Error('Todos os campos são obrigatórios')
      }

      if (password.length < 8) {
        throw new Error('Senha deve ter pelo menos 8 caracteres')
      }

      // CRÍTICO: Usar apenas supabase.functions.invoke (nunca fetch direto)
      // Isso garante uso correto do relay e headers automáticos
      try {
        // Verificar sessão antes de chamar a função
        const { data: sessionData } = await supabase.auth.getSession()
        console.log('[Hook] Current session:', {
          hasSession: !!sessionData?.session,
          userEmail: sessionData?.session?.user?.email,
          role: sessionData?.session?.user?.role,
          accessToken: sessionData?.session?.access_token ? 'Present' : 'Missing'
        })
        
        if (!sessionData?.session) {
          throw new Error('Você precisa estar logado como administrador')
        }
        
        // Log do payload para debug
        const requestBody = {
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          escola,
          password,
          ativo: payload.ativo ?? true,
        }
        
        console.log('[Hook] Sending to Edge Function:', requestBody)
        
        const { data, error } = await supabase.functions.invoke('create_matricula_user', {
          body: requestBody
        })

        // Tratamento específico de erros CORS
        if (error) {
          console.error('[Hook] Edge Function error:', error)
          console.error('[Hook] Error details:', {
            message: error.message,
            status: error.status,
            code: error.code
          })
          
          // Verificar se é erro de status não-2xx
          if (error.message?.includes('Edge Function returned a non-2xx status code')) {
            // Tentar extrair o erro real da resposta
            console.log('[Hook] Non-2xx response, checking data:', data)
            if (data?.error) {
              throw new Error(data.error)
            }
            throw new Error('Edge Function retornou erro. Verifique o console para detalhes.')
          }
          
          if (error.message?.includes('CORS') || error.message?.includes('preflight')) {
            throw new Error('Erro de configuração CORS. Verifique se a Edge Function foi redeployada.')
          }
          
          if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
            throw new Error('Erro de autenticação. Faça login novamente.')
          }
          
          if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
            throw new Error('Sem permissão. Apenas coordenadores e super admins podem criar usuários.')
          }
          
          throw new Error(error.message || 'Erro ao comunicar com servidor')
        }

        // Log completo da resposta para debug
        console.log('[Hook] Edge Function response:', data)
        
        // Tratamento de erros retornados pela função
        if (data?.error) {
          console.error('[Hook] Function returned error:', data.error)
          
          // Mensagens mais amigáveis para erros comuns
          if (data.error.includes('já está em uso') || data.error.includes('already exists')) {
            throw new Error('Este e-mail já está cadastrado no sistema')
          }
          
          if (data.error.includes('Escola inválida')) {
            throw new Error('Escola selecionada é inválida')
          }
          
          if (data.error.includes('Unauthorized')) {
            throw new Error('Erro de autenticação. Faça login novamente.')
          }
          
          if (data.error.includes('Forbidden')) {
            throw new Error('Sem permissão. Apenas coordenadores e super admins podem criar usuários.')
          }
          
          throw new Error(data.error)
        }
        
        // Verificar se não há resposta válida
        if (!data) {
          throw new Error('Edge Function retornou resposta vazia')
        }

        console.log('[Hook] User created successfully:', { 
          matricula_user_id: data?.matricula_user?.id,
          auth_user_id: data?.user?.id 
        })

        return data
      } catch (err: any) {
        // Log detalhado para debugging
        console.error('[Hook] Complete error details:', {
          message: err.message,
          name: err.name,
          stack: err.stack,
          payload: { email, nome, escola, ativo: payload.ativo }
        })
        throw err
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['matricula-users'] })
      toast.success('Usuário criado com sucesso! Já pode fazer login.')
      console.log('[Hook] Success - user ready for login')
    },
    onError: (error) => {
      console.error('[Hook] Mutation failed:', error)
      toast.error(`Erro ao criar usuário: ${error.message}`)
    }
  })
}

// Atualizar usuário de matrícula
export const useUpdateMatriculaUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Pick<MatriculaUser, 'nome' | 'email' | 'escola' | 'ativo' | 'auth_user_id'>>) => {
      const payload: any = { ...updates }
      if (payload.email) payload.email = String(payload.email).trim().toLowerCase()
      if (payload.nome) payload.nome = String(payload.nome).trim()

      const { data, error } = await supabase
        .from('matricula_users')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar usuário de matrícula:', error)
        throw new Error(error.message)
      }

      return data as MatriculaUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matricula-users'] })
      toast.success('Usuário de matrícula atualizado')
    },
    onError: (error) => {
      console.error('Erro ao atualizar usuário de matrícula:', error)
      toast.error('Erro ao atualizar usuário de matrícula')
    }
  })
}

// Ativar/Desativar usuário de matrícula
export const useToggleMatriculaUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('matricula_users')
        .update({ ativo, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('Erro ao alterar status do usuário de matrícula:', error)
        throw new Error(error.message)
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['matricula-users'] })
      toast.success(vars.ativo ? 'Usuário ativado' : 'Usuário desativado')
    },
    onError: (error) => {
      console.error('Erro ao alterar status do usuário de matrícula:', error)
      toast.error('Erro ao alterar status')
    }
  })
}
