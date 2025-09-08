export interface SeriesLike {
  id: string
  nome: string
  nivel?: string
}

function extractFirstNumber(text: string): number | null {
  const m = (text || '').match(/(\d{1,2})/)
  if (!m) return null
  return parseInt(m[1], 10)
}

export function getNextSeriesRecommendation(previousSeriesName: string, allSeries: SeriesLike[]) {
  if (!previousSeriesName || !allSeries?.length) {
    return { recommendedId: null as string | null, recommendedName: null as string | null, reason: 'Dados insuficientes', confidence: 0 }
  }

  // Try number-based progression (e.g., "5º ano" -> 6)
  const n = extractFirstNumber(previousSeriesName)
  if (n !== null) {
    const target = n + 1
    // pick series whose name contains that number
    const numericMatch = allSeries.find(s => new RegExp(`(^|[^0-9])${target}([^0-9]|$)`).test(s.nome))
    if (numericMatch) {
      return { recommendedId: numericMatch.id, recommendedName: numericMatch.nome, reason: 'Progressão numérica', confidence: 0.9 }
    }
  }

  // Try by ordered index if previous exact name exists in list
  const idx = allSeries.findIndex(s => s.nome.toLowerCase().trim() === previousSeriesName.toLowerCase().trim())
  if (idx >= 0 && idx + 1 < allSeries.length) {
    const next = allSeries[idx + 1]
    return { recommendedId: next.id, recommendedName: next.nome, reason: 'Próxima na ordem', confidence: 0.6 }
  }

  // Try level grouping: pick another series with same nivel and higher numeric if possible
  if (n !== null) {
    const candidates = allSeries.filter(s => (s.nivel || '').toLowerCase() === (allSeries[idx]?.nivel || '').toLowerCase())
    const byNum = candidates.find(s => {
      const sn = extractFirstNumber(s.nome)
      return sn !== null && sn > n
    })
    if (byNum) {
      return { recommendedId: byNum.id, recommendedName: byNum.nome, reason: 'Mesmo nível, número maior', confidence: 0.5 }
    }
  }

  // Fallback: keep same series
  const same = allSeries.find(s => s.nome.toLowerCase().trim() === previousSeriesName.toLowerCase().trim())
  if (same) {
    return { recommendedId: same.id, recommendedName: same.nome, reason: 'Manter série anterior (fallback)', confidence: 0.2 }
  }

  // No match
  return { recommendedId: null as string | null, recommendedName: null as string | null, reason: 'Nenhuma correspondência', confidence: 0 }
}

