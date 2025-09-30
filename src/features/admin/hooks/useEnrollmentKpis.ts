import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { TimeRange, Escola, Origin } from "@/features/admin/hooks/useEnrollmentsTimeSeries"

export interface EnrollmentKpisFilters {
  timeRange: TimeRange
  escola?: Escola | "all"
  origin?: Origin | "all"
}

export interface EnrollmentKpisResult {
  count: number
  annualRevenue: number // soma de annual_total_value
  sumBaseValue: number
  sumTotalDiscountValue: number
  avgDiscountRatio: number // sum(total_discount_value) / sum(base_value) - 0..1
}

function startEndFromRange(range: TimeRange): { startISO: string; endISO: string } {
  const endLocal = new Date()
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90
  const startLocal = new Date(endLocal)
  startLocal.setDate(endLocal.getDate() - (days - 1))
  startLocal.setHours(0, 0, 0, 0)
  const endOfDayLocal = new Date(endLocal)
  endOfDayLocal.setHours(23, 59, 59, 999)
  const startISO = startLocal.toISOString()
  const endISO = endOfDayLocal.toISOString()
  return { startISO, endISO }
}

export function useEnrollmentKpis(filters: EnrollmentKpisFilters) {
  const { startISO, endISO } = startEndFromRange(filters.timeRange)

  return useQuery<EnrollmentKpisResult>({
    queryKey: [
      "enrollmentsKpis",
      filters.timeRange,
      filters.escola || "all",
      filters.origin || "all",
    ],
    staleTime: 1000 * 60 * 5, // 5 min
    queryFn: async () => {
      let query = supabase
        .from("enrollments")
        .select(
          // incluir colunas necessárias; evitamos erro se uma coluna específica não existir usando fallback abaixo
          "id, created_at, student_escola, tag_matricula, status, annual_total_value, total_discount_value, base_value"
        )
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .neq("status", "deleted")

      if (filters.escola && filters.escola !== "all") {
        query = query.eq("student_escola", filters.escola)
      }
      if (filters.origin && filters.origin !== "all") {
        query = query.eq("tag_matricula", filters.origin)
      }

      const { data, error } = await query.order("created_at", { ascending: true })
      if (error) throw error

      let count = 0
      let annualRevenue = 0
      let sumBaseValue = 0
      let sumTotalDiscountValue = 0

      for (const row of data || []) {
        count += 1
        const annual = Number((row as any).annual_total_value ?? 0)
        const base = Number((row as any).base_value ?? 0)
        const disc = Number((row as any).total_discount_value ?? 0)

        // segurança contra NaN e negativos
        annualRevenue += isFinite(annual) && annual >= 0 ? annual : 0
        sumBaseValue += isFinite(base) && base >= 0 ? base : 0
        sumTotalDiscountValue += isFinite(disc) && disc >= 0 ? disc : 0
      }

      const avgDiscountRatio = sumBaseValue > 0 ? sumTotalDiscountValue / sumBaseValue : 0

      return { count, annualRevenue, sumBaseValue, sumTotalDiscountValue, avgDiscountRatio }
    },
  })
}
