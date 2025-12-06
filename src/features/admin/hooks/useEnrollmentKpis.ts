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
  const days =
    range === "7d" ? 7 :
    range === "14d" ? 14 :
    range === "21d" ? 21 :
    range === "30d" ? 30 : 90
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
  return useQuery<EnrollmentKpisResult>({
    queryKey: [
      "enrollmentsKpis",
      filters.timeRange,
      filters.escola || "all",
      filters.origin || "all",
    ],
    staleTime: 1000 * 60 * 5, // 5 min
    queryFn: async () => {
      // Resolve range boundaries
      let startISO: string
      let endISO: string

      if (filters.timeRange !== "from_start") {
        const r = startEndFromRange(filters.timeRange)
        startISO = r.startISO
        endISO = r.endISO
      } else {
        // Earliest created_at considering current filters (excluding deleted)
        let qMin = supabase
          .from("enrollments")
          .select("created_at, student_escola, tag_matricula, status")
          .neq("status", "deleted")
          .order("created_at", { ascending: true })
          .limit(1)

        if (filters.escola && filters.escola !== "all") {
          qMin = qMin.eq("student_escola", filters.escola)
        }
        if (filters.origin && filters.origin !== "all") {
          qMin = qMin.eq("tag_matricula", filters.origin)
        }

        const { data: minRows, error: minErr } = await qMin
        if (minErr) throw minErr

        const endLocal = new Date()
        const endOfDayLocal = new Date(endLocal)
        endOfDayLocal.setHours(23, 59, 59, 999)
        endISO = endOfDayLocal.toISOString()

        if (!minRows || minRows.length === 0) {
          // No data: bound to today only
          const startLocal = new Date(endLocal)
          startLocal.setHours(0, 0, 0, 0)
          startISO = startLocal.toISOString()
        } else {
          const firstCreatedAt = new Date((minRows[0] as any).created_at)
          const startLocal = new Date(firstCreatedAt)
          startLocal.setHours(0, 0, 0, 0)
          startISO = startLocal.toISOString()
        }
      }

      // Primeiro, obter a contagem total usando count
      let countQuery = supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .neq("status", "deleted")

      if (filters.escola && filters.escola !== "all") {
        countQuery = countQuery.eq("student_escola", filters.escola)
      }
      if (filters.origin && filters.origin !== "all") {
        countQuery = countQuery.eq("tag_matricula", filters.origin)
      }

      const { count: totalCount, error: countError } = await countQuery
      if (countError) throw countError

      // Se não há registros, retornar valores zerados
      if (!totalCount || totalCount === 0) {
        return { 
          count: 0, 
          annualRevenue: 0, 
          sumBaseValue: 0, 
          sumTotalDiscountValue: 0, 
          avgDiscountRatio: 0 
        }
      }

      // Buscar todos os registros com paginação
      const pageSize = 1000
      let allData: any[] = []
      let offset = 0

      while (offset < totalCount) {
        let query = supabase
          .from("enrollments")
          .select(
            "id, created_at, student_escola, tag_matricula, status, final_monthly_value, material_cost, total_discount_value, base_value"
          )
          .gte("created_at", startISO)
          .lte("created_at", endISO)
          .neq("status", "deleted")
          .range(offset, offset + pageSize - 1)
          .order("created_at", { ascending: true })

        if (filters.escola && filters.escola !== "all") {
          query = query.eq("student_escola", filters.escola)
        }
        if (filters.origin && filters.origin !== "all") {
          query = query.eq("tag_matricula", filters.origin)
        }

        const { data, error } = await query
        if (error) throw error
        
        if (!data || data.length === 0) break
        allData = [...allData, ...data]
        offset += pageSize
      }

      // Calcular métricas com todos os dados
      let annualRevenue = 0
      let sumBaseValue = 0
      let sumTotalDiscountValue = 0

      for (const row of allData) {
        const fm = Number(row.final_monthly_value ?? 0)
        const mat = Number(row.material_cost ?? 0)
        const base = Number(row.base_value ?? 0)
        const disc = Number(row.total_discount_value ?? 0)

        const monthlyTotal = (isFinite(fm) ? fm : 0) + (isFinite(mat) ? mat : 0)
        // 12 * (final_monthly_value + material_cost)
        const annual = monthlyTotal >= 0 ? monthlyTotal * 12 : 0

        annualRevenue += annual
        sumBaseValue += isFinite(base) && base >= 0 ? base : 0
        sumTotalDiscountValue += isFinite(disc) && disc >= 0 ? disc : 0
      }

      const avgDiscountRatio = sumBaseValue > 0 ? sumTotalDiscountValue / sumBaseValue : 0

      return { 
        count: totalCount, 
        annualRevenue, 
        sumBaseValue, 
        sumTotalDiscountValue, 
        avgDiscountRatio 
      }
    },
  })
}
