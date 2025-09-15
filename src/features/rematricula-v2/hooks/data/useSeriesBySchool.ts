import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type EscolaDb = 'Sete de Setembro' | 'Pelicano'

export interface SerieOption {
  id: string
  nome: string
  ano_serie?: string | null
  ordem?: number | null
  escola: EscolaDb
  ativo: boolean
  valor_mensal_com_material?: number | null
  valor_material?: number | null
  valor_mensal_sem_material?: number | null
}

function mapEscolaLabel(escola?: 'pelicano' | 'sete_setembro' | string | null): EscolaDb | null {
  if (!escola) return null
  const key = String(escola).toLowerCase()
  if (key === 'pelicano') return 'Pelicano'
  if (key === 'sete_setembro' || key === 'sete de setembro' || key === 'sete-de-setembro') return 'Sete de Setembro'
  return null
}

export function useSeriesBySchool(studentEscola?: 'pelicano' | 'sete_setembro' | string | null) {
  const escolaDb = mapEscolaLabel(studentEscola)

  return useQuery({
    queryKey: ['rematricula-series-by-school', escolaDb],
    queryFn: async (): Promise<SerieOption[]> => {
      if (!escolaDb) return []
      const { data, error } = await supabase
        .from('series')
        .select('id, nome, ano_serie, ordem, escola, ativo, valor_mensal_com_material, valor_material, valor_mensal_sem_material')
        .eq('ativo', true)
        .eq('escola', escolaDb)
        .order('ordem', { ascending: true })
        .order('nome', { ascending: true })

      if (error) {
        console.error('[useSeriesBySchool] erro ao buscar séries:', error)
        throw new Error('Falha ao carregar séries')
      }
      return (data || []) as SerieOption[]
    },
    enabled: !!escolaDb,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function escolaDbLabelFromStudent(escola?: 'pelicano' | 'sete_setembro' | string | null): EscolaDb | null {
  return mapEscolaLabel(escola)
}
