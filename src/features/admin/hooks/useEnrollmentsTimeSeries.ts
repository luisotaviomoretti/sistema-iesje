import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

export type TimeRange = "7d" | "30d" | "90d"
export type Escola = "pelicano" | "sete_setembro"
export type Origin = "rematricula" | "novo_aluno"

export interface TimeSeriesFilters {
  timeRange: TimeRange
  escola?: Escola | "all"
  origin?: Origin | "all"
}

export interface EnrollmentSeriesPoint {
  date: string // YYYY-MM-DD
  rematricula: number
  novo_aluno: number
  total: number
}

function startEndFromRange(range: TimeRange): { startISO: string; endISO: string; days: number; startLocalDate: Date } {
  const endLocal = new Date()
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const startLocal = new Date(endLocal)
  startLocal.setDate(endLocal.getDate() - (days - 1))
  // Trunca para início/fim do dia em HORÁRIO LOCAL
  startLocal.setHours(0, 0, 0, 0)
  const endOfDayLocal = new Date(endLocal)
  endOfDayLocal.setHours(23, 59, 59, 999)
  // Converte para ISO (UTC) apenas para filtro no banco
  const startISO = startLocal.toISOString()
  const endISO = endOfDayLocal.toISOString()
  return { startISO, endISO, days, startLocalDate: startLocal }
}

function formatDateYMD(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function buildDateSkeleton(start: Date, days: number) {
  const arr: EnrollmentSeriesPoint[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    arr.push({ date: formatDateYMD(d), rematricula: 0, novo_aluno: 0, total: 0 })
  }
  return arr
}

export function useEnrollmentsTimeSeries(filters: TimeSeriesFilters) {
  const { startISO, endISO, days, startLocalDate } = startEndFromRange(filters.timeRange)

  return useQuery<EnrollmentSeriesPoint[]>({
    queryKey: [
      "enrollmentsTimeSeries",
      filters.timeRange,
      filters.escola || "all",
      filters.origin || "all",
    ],
    staleTime: 1000 * 60 * 5, // 5 min
    queryFn: async () => {
      // Build base query
      let query = supabase
        .from("enrollments")
        .select("id, created_at, student_escola, tag_matricula, status")
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .neq("status", "deleted")

      if (filters.escola && filters.escola !== "all") {
        query = query.eq("student_escola", filters.escola)
      }
      if (filters.origin && filters.origin !== "all") {
        query = query.eq("tag_matricula", filters.origin)
      }

      // We keep dataset bounded by date range to avoid large responses
      const { data, error } = await query.order("created_at", { ascending: true })
      if (error) throw error

      // Aggregate by date
      const skeleton = buildDateSkeleton(startLocalDate, days)
      const index = new Map<string, EnrollmentSeriesPoint>()
      skeleton.forEach(p => index.set(p.date, p))

      ;(data || []).forEach((row: any) => {
        const d = new Date(row.created_at)
        // Normalize to YYYY-MM-DD in local time
        const key = formatDateYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
        const point = index.get(key)
        if (!point) return
        if (row.tag_matricula === "rematricula") point.rematricula += 1
        else if (row.tag_matricula === "novo_aluno") point.novo_aluno += 1
        else {
          // Unknown/null origin — conte no total apenas (não empilha em séries)
        }
        point.total += 1
      })

      return skeleton
    },
  })
}
