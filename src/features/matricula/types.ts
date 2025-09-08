export type EscolaType = 'Sete de Setembro' | 'Pelicano'

export const ESCOLAS: EscolaType[] = ['Sete de Setembro', 'Pelicano']

export interface MatriculaUser {
  id: string
  auth_user_id: string | null
  email: string
  nome: string
  escola: EscolaType
  ativo: boolean
  created_at: string
  updated_at: string
  last_login: string | null
}

export interface MatriculaSession {
  user: import('@supabase/supabase-js').User
  matriculaUser: MatriculaUser
  escola: EscolaType
}

export const getEscolaColor = (escola: string): string => {
  switch (escola) {
    case 'Sete de Setembro':
      return 'bg-blue-100 text-blue-800'
    case 'Pelicano':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

