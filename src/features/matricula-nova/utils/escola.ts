// Utilitários de mapeamento/validação para o campo Escola
// Mantém coerência entre os valores do banco (matricula_users.escola)
// e o enum usado no formulário (student.escola)

import type { EscolaType } from '../../types/forms'

// Valores canônicos
export const FORM_ESCOLAS = ['pelicano', 'sete_setembro'] as const
export type FormEscola = typeof FORM_ESCOLAS[number]

export const DB_ESCOLAS = ['Pelicano', 'Sete de Setembro'] as const
export type MatriculaDbEscola = typeof DB_ESCOLAS[number]

// Labels exibidos na UI (consistentes com StudentFormStep)
const UI_LABELS: Record<FormEscola, string> = {
  pelicano: 'Colégio Pelicano',
  sete_setembro: 'Instituto Sete de Setembro',
}

// Normalização robusta (case, espaçamento, acentuação, símbolos)
function normalize(input: string): string {
  return input
    .normalize('NFD') // separa acentos
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ') // mantém apenas alfa-num e espaços
    .trim()
}

// Tenta inferir FormEscola a partir de string arbitrária
export function getFormEscolaFromAny(input: unknown): FormEscola | null {
  if (typeof input !== 'string' || !input.trim()) return null
  const n = normalize(input)

  // Regras de identificação por palavras-chave
  if (n.includes('pelicano')) return 'pelicano'

  // "Sete de Setembro" e variações (incluindo referência a Instituto)
  if (n.includes('sete') && n.includes('setembro')) return 'sete_setembro'
  if (n.includes('instituto') && n.includes('setembro')) return 'sete_setembro'

  // Suporte a formatos enum-like
  if (n === 'sete setembro' || n === 'sete_setembro') return 'sete_setembro'

  return null
}

// Converte valor do banco (matricula_users.escola) -> valor do formulário
export function mapMatriculaUserEscolaToFormValue(
  escola: MatriculaDbEscola | string | null | undefined
): FormEscola | null {
  if (!escola) return null
  // Primeiro, cobrir explicitamente os canônicos
  if (escola === 'Pelicano') return 'pelicano'
  if (escola === 'Sete de Setembro') return 'sete_setembro'

  // Depois, tentar normalização para variações
  return getFormEscolaFromAny(escola)
}

// Converte valor do formulário -> valor do banco (matricula_users.escola)
export function mapFormValueToMatriculaUserEscola(value: FormEscola | string | null | undefined): MatriculaDbEscola | null {
  if (!value) return null
  const v = getFormEscolaFromAny(value)
  if (v === 'pelicano') return 'Pelicano'
  if (v === 'sete_setembro') return 'Sete de Setembro'
  return null
}

// Label amigável para UI a partir do valor do formulário
export function labelFromFormValue(value: FormEscola | string | null | undefined): string | null {
  const v = getFormEscolaFromAny(value)
  return v ? UI_LABELS[v] : null
}

// Label amigável a partir do valor do banco
export function labelFromDbValue(value: MatriculaDbEscola | string | null | undefined): string | null {
  const v = mapMatriculaUserEscolaToFormValue(value)
  return v ? UI_LABELS[v] : null
}

// Type guards
export function isFormEscola(input: unknown): input is FormEscola {
  return input === 'pelicano' || input === 'sete_setembro'
}

export function isMatriculaEscola(input: unknown): input is MatriculaDbEscola {
  return input === 'Pelicano' || input === 'Sete de Setembro'
}

// Lista de opções padrão para o Select (mantida aqui para reutilização futura)
export const ESCOLA_SELECT_OPTIONS = [
  { value: 'pelicano' as const, label: UI_LABELS.pelicano },
  { value: 'sete_setembro' as const, label: UI_LABELS.sete_setembro },
]

