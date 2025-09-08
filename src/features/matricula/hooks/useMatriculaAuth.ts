import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MatriculaSession, MatriculaUser } from '@/features/matricula/types'

// Verifica a sessão de matrícula: usuário autenticado + registro ativo em matricula_users
export const useMatriculaAuth = () => {
  return useQuery({
    queryKey: ['matricula-session'],
    queryFn: async (): Promise<MatriculaSession | null> => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) return null

      const uid = session.user.id
      const email = session.user.email?.toLowerCase()

      // 1) Tenta vincular por auth_user_id (preferencial)
      let { data: mu, error: muErr } = await supabase
        .from('matricula_users')
        .select('*')
        .eq('auth_user_id', uid)
        .eq('ativo', true)
        .maybeSingle()

      if (muErr) return null

      // 2) Se não encontrou, tenta por e-mail
      if (!mu && email) {
        const { data: mu2, error: muErr2 } = await supabase
          .from('matricula_users')
          .select('*')
          .eq('email', email)
          .eq('ativo', true)
          .maybeSingle()
        if (muErr2) return null
        mu = mu2 as MatriculaUser | null
      }

      if (!mu) return null

      // Sessão válida de matrícula
      return {
        user: session.user,
        matriculaUser: mu as MatriculaUser,
        escola: (mu as MatriculaUser).escola,
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  })
}

export const useMatriculaLogin = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      console.log('[MatriculaLogin] Attempting login for:', email)
      
      // Autentica via Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.session) {
        console.error('[MatriculaLogin] Auth failed:', error)
        throw new Error('Credenciais inválidas')
      }

      console.log('[MatriculaLogin] Auth successful, user ID:', data.session.user.id)

      // Confere se possui registro ativo em matricula_users
      const uid = data.session.user.id
      const normalizedEmail = email.toLowerCase()

      // 1) Por auth_user_id
      let { data: mu, error: muErr } = await supabase
        .from('matricula_users')
        .select('*')
        .eq('auth_user_id', uid)
        .eq('ativo', true)
        .maybeSingle()

      console.log('[MatriculaLogin] Search by auth_user_id:', { found: !!mu, error: muErr })

      if (muErr) {
        console.error('[MatriculaLogin] Error searching matricula_users:', muErr)
        await supabase.auth.signOut()
        throw new Error('Usuário não autorizado')
      }

      // 2) Se não houver vínculo, tenta e-mail
      if (!mu) {
        console.log('[MatriculaLogin] No auth_user_id match, trying by email:', normalizedEmail)
        
        const { data: mu2, error: muErr2 } = await supabase
          .from('matricula_users')
          .select('*')
          .eq('email', normalizedEmail)
          .eq('ativo', true)
          .maybeSingle()

        console.log('[MatriculaLogin] Search by email:', { found: !!mu2, error: muErr2 })

        if (muErr2 || !mu2) {
          console.error('[MatriculaLogin] No matricula_user found for email:', normalizedEmail)
          await supabase.auth.signOut()
          throw new Error('Usuário não autorizado')
        }
        mu = mu2 as MatriculaUser
      }

      console.log('[MatriculaLogin] Login successful, matricula_user:', mu)

      // Atualiza last_login de forma independente (não bloqueia login)
      void supabase
        .from('matricula_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', (mu as MatriculaUser).id)

      return { session: data.session, matriculaUser: mu as MatriculaUser }
    },
    onSuccess: () => {
      // Revalida sessão de matrícula
      queryClient.invalidateQueries({ queryKey: ['matricula-session'] })
    },
  })
}

export const useMatriculaLogout = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

