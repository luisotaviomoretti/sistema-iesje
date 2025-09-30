import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/supabase"

export type Escola = "pelicano" | "sete_setembro"

export interface EnrollmentsBySeriesFilters {
  escola: Escola
}

export interface SeriesEnrollmentData {
  series_name: string
  series_id: string
  count: number
  ordem: number
  annual_revenue: number
  avg_discount_percentage: number
}

// Map escola values from database format to filter format
function mapEscolaFromDB(dbEscola: string): Escola | null {
  if (dbEscola === "Pelicano") return "pelicano"
  if (dbEscola === "Sete de Setembro") return "sete_setembro"
  return null
}

function mapEscolaToDB(escola: Escola): string {
  return escola === "pelicano" ? "Pelicano" : "Sete de Setembro"
}

export function useEnrollmentsBySeries(filters: EnrollmentsBySeriesFilters) {
  return useQuery<SeriesEnrollmentData[]>({
    queryKey: [
      "enrollmentsBySeries",
      filters.escola,
    ],
    staleTime: 1000 * 60 * 2, // 2 min
    queryFn: async () => {
      const escolaDB = mapEscolaToDB(filters.escola)

      // Step 1: Fetch ALL series for the selected escola (including those with 0 enrollments)
      const { data: allSeries, error: seriesError } = await supabase
        .from("series")
        .select("id, nome, ordem, escola")
        .eq("escola", escolaDB)
        .eq("ativo", true)
        .order("ordem", { ascending: true })

      if (seriesError) throw seriesError

      // Step 2: Fetch enrollments for the selected escola with financial data
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("enrollments")
        .select("series_name, series_id, student_escola, status, annual_total_value, base_value, total_discount_value")
        .eq("student_escola", filters.escola)
        .neq("status", "deleted")

      if (enrollmentsError) throw enrollmentsError

      // Step 3: Aggregate enrollments by series_id
      interface SeriesAggregation {
        count: number
        total_annual_revenue: number
        total_base_value: number
        total_discount_value: number
      }

      const enrollmentAggMap = new Map<string, SeriesAggregation>()
      ;(enrollments || []).forEach((row: any) => {
        const seriesId = row.series_id
        if (seriesId) {
          const current = enrollmentAggMap.get(seriesId) || {
            count: 0,
            total_annual_revenue: 0,
            total_base_value: 0,
            total_discount_value: 0,
          }

          current.count += 1
          current.total_annual_revenue += Number(row.annual_total_value) || 0
          current.total_base_value += Number(row.base_value) || 0
          current.total_discount_value += Number(row.total_discount_value) || 0

          enrollmentAggMap.set(seriesId, current)
        }
      })

      // Step 4: Build result array with ALL series (including 0 enrollments)
      const result: SeriesEnrollmentData[] = (allSeries || []).map((serie: any) => {
        const agg = enrollmentAggMap.get(serie.id) || {
          count: 0,
          total_annual_revenue: 0,
          total_base_value: 0,
          total_discount_value: 0,
        }

        // Calculate average discount percentage
        const avgDiscountPercentage = agg.total_base_value > 0
          ? (agg.total_discount_value / agg.total_base_value) * 100
          : 0

        return {
          series_name: serie.nome,
          series_id: serie.id,
          count: agg.count,
          ordem: serie.ordem,
          annual_revenue: agg.total_annual_revenue,
          avg_discount_percentage: avgDiscountPercentage,
        }
      })

      return result
    },
  })
}