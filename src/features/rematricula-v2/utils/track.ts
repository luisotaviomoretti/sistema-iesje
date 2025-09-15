import type { RematriculaReadModel } from '../types/details'

/**
 * Normaliza uma string para busca sem acentos e case-insensitive.
 * - Remove diacríticos (acentos)
 * - Converte para minúsculas
 * - Normaliza espaços
 */
export function normalizeNoDiacritics(input?: string | null): string {
  const s = String(input ?? '')
  try {
    return s
      .normalize('NFD')
      // remove diacríticos
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  } catch {
    // Fallback seguro caso normalize não esteja disponível
    return s.toLowerCase().replace(/\s+/g, ' ').trim()
  }
}

/**
 * Detecta se o aluno pertence ao trilho "maçom" com base no Read Model da Rematrícula.
 * Regras:
 *  - Apenas quando a fonte principal é previous_year (para não afetar fluxos de matrícula anterior já gravados)
 *  - Compara o track_name normalizado (sem acento, minúsculo) contendo "macom"
 */
export function isMacomTrack(readModel: RematriculaReadModel | null | undefined): boolean {
  if (!readModel || !readModel.meta || readModel.meta.source !== 'previous_year') return false
  const raw = readModel.academic?.track_name || ''
  const norm = normalizeNoDiacritics(raw)
  return norm.includes('macom')
}
