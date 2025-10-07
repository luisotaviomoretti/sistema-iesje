import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"
import type { TimeRange, Escola, Origin } from "@/features/admin/hooks/useEnrollmentsTimeSeries"

export interface EnrollmentKpisByTrackFilters {
  timeRange: TimeRange
  escola?: Escola | "all"
  origin?: Origin | "all"
}

export interface EnrollmentKpisByTrackResult {
  count: number
  annualRevenue: number
  sumBaseValue: number
  sumTotalDiscountValue: number
  avgDiscountRatio: number
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

export function useEnrollmentKpisByTrack(filters: EnrollmentKpisByTrackFilters) {
  return useQuery<EnrollmentKpisByTrackResult>({
    queryKey: [
      "enrollmentsKpisByTrack",
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
          .select("created_at, student_escola, tag_matricula, status, track_name")
          .neq("status", "deleted")
          .in("track_name", ["regular", "combinado"])
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

      let query = supabase
        .from("enrollments")
        .select(
          "id, created_at, student_escola, tag_matricula, status, final_monthly_value, material_cost, total_discount_value, base_value, track_name"
        )
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .neq("status", "deleted")
        .in("track_name", ["regular", "combinado"])

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
        const fm = Number((row as any).final_monthly_value ?? 0)
        const mat = Number((row as any).material_cost ?? 0)
        const base = Number((row as any).base_value ?? 0)
        const disc = Number((row as any).total_discount_value ?? 0)

        const monthlyTotal = (isFinite(fm) ? fm : 0) + (isFinite(mat) ? mat : 0)
        // 12 * (final_monthly_value + material_cost)
        const annual = monthlyTotal >= 0 ? monthlyTotal * 12 : 0

        annualRevenue += annual
        sumBaseValue += isFinite(base) && base >= 0 ? base : 0
        sumTotalDiscountValue += isFinite(disc) && disc >= 0 ? disc : 0
      }

      const avgDiscountRatio = sumBaseValue > 0 ? sumTotalDiscountValue / sumBaseValue : 0

      return { count, annualRevenue, sumBaseValue, sumTotalDiscountValue, avgDiscountRatio }
    },
  })
}
