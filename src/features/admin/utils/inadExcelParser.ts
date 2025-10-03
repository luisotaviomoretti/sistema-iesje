import * as XLSX from 'xlsx'

export type InadRow = {
  codigo_inadim?: string | null
  student_name: string
  guardian1_name?: string | null
  student_escola?: string | null
  meses_inadim?: number | null
}

function cleanText(text: any): string | null {
  if (text === undefined || text === null) return null
  const s = String(text).trim().replace(/\s+/g, ' ')
  return s.length ? s : null
}

function isControlLine(s: string): boolean {
  const t = s.toLowerCase()
  return (
    t.includes('total') || t.includes('ano:') || t.includes('curso:') || t.includes('turma:') ||
    t.includes('vlr') || t.includes('saldo') || t.includes('juros') || t.includes('itens') || t === 'nan'
  )
}

function extractStudentInfo(text: any): { code: string | null; name: string | null } {
  const s = cleanText(text)
  if (!s) return { code: null, name: null }
  const m = s.match(/^(\d+)\s+(.+)$/)
  if (m) return { code: m[1], name: cleanText(m[2]) }
  return { code: null, name: null }
}

function normalizeClassCode(val: any): string | null {
  const s = cleanText(val)
  if (!s) return null
  // detect pattern like 1°AEM, 2ºAEF, etc.
  if (/^\d+[°ºo]\s*[A-Z]+/.test(s)) {
    return s.replace(/[ºo]/g, '°')
  }
  return null
}

function pickGuardianName(nextRow: any[]): string | null {
  const c0 = nextRow?.[0]
  const c1 = nextRow?.[1]
  let candidate = cleanText(c0)
  if (!candidate) candidate = cleanText(c1)
  if (!candidate) return null
  // If starts with digits, likely not a guardian line
  if (/^\d+/.test(candidate)) return null
  // Split off after multiple spaces or long numbers (like codes)
  const parts = candidate.split(/\s{2,}|\d{4,}/)
  const first = cleanText(parts[0])
  if (!first || isControlLine(first)) return null
  return first
}

function incrementCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) || 0) + 1)
}

export async function parseInadExcel(files: File[], escola: 'pelicano' | 'sete_setembro') {
  const allRecords: InadRow[] = []

  for (const file of files) {
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array' })
    // Use first worksheet
    const wsName = wb.SheetNames[0]
    const ws = wb.Sheets[wsName]
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true }) as any[][]

    let currentClassCode: string | null = null

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] || []

      // scan for class code anywhere in the row
      for (let j = 0; j < row.length; j++) {
        const cls = normalizeClassCode(row[j])
        if (cls) { currentClassCode = cls; break }
      }

      const primeira = row[0]
      const { code, name } = extractStudentInfo(primeira)

      if (code && name && !isControlLine(name)) {
        // try to read guardian from next row
        let guardian: string | null = null
        if (i + 1 < rows.length) {
          guardian = pickGuardianName(rows[i + 1] || [])
        }
        allRecords.push({
          codigo_inadim: currentClassCode,
          student_name: name!,
          guardian1_name: guardian,
          student_escola: escola,
        })
      } else if (/^\d+$/.test(String(primeira ?? '').trim())) {
        // first col is digits; second may hold the name
        const segunda = cleanText(rows[i]?.[1])
        if (segunda && !isControlLine(segunda)) {
          let guardian: string | null = null
          if (i + 1 < rows.length) {
            guardian = pickGuardianName(rows[i + 1] || [])
          }
          allRecords.push({
            codigo_inadim: currentClassCode,
            student_name: segunda,
            guardian1_name: guardian,
            student_escola: escola,
          })
        }
      }
    }
  }

  // Compute meses_inadim per student in this school aggregate
  const counts = new Map<string, number>()
  for (const r of allRecords) {
    if (r.student_name) incrementCount(counts, r.student_name)
  }
  for (const r of allRecords) {
    r.meses_inadim = counts.get(r.student_name) || 1
  }

  // Deduplicate by student_name + school, keeping first seen
  const seen = new Set<string>()
  const finalRows: InadRow[] = []
  for (const r of allRecords) {
    const key = `${r.student_name}||${r.student_escola ?? ''}`
    if (!seen.has(key)) {
      seen.add(key)
      finalRows.push(r)
    }
  }

  // Sort by school, student
  finalRows.sort((a, b) => {
    const sa = (a.student_escola || '').localeCompare(b.student_escola || '')
    if (sa !== 0) return sa
    return (a.student_name || '').localeCompare(b.student_name || '')
  })

  const stats = {
    totalRaw: allRecords.length,
    uniqueStudents: finalRows.length,
    withGuardian: finalRows.filter(r => (r.guardian1_name ?? '').length > 0).length,
    school: escola,
  }

  return { rows: finalRows, stats }
}
