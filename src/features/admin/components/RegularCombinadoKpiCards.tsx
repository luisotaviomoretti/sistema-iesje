import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, TrendingUp, DollarSign } from "lucide-react"
import { useEnrollmentKpisByTrack } from "@/features/admin/hooks/useEnrollmentKpisByTrack"
import type { TimeRange, Escola, Origin } from "@/features/admin/hooks/useEnrollmentsTimeSeries"

interface RegularCombinadoKpiCardsProps {
  timeRange: TimeRange
  escola: Escola | "all"
  origin: Origin | "all"
}

export function RegularCombinadoKpiCards({ timeRange, escola, origin }: RegularCombinadoKpiCardsProps) {
  const { data: kpis, isLoading } = useEnrollmentKpisByTrack({ timeRange, escola, origin })

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-purple-900">
            Matrículas (Regular + Combinado)
          </CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-700">
            {isLoading ? '-' : (kpis?.count ?? 0)}
          </div>
          <p className="text-xs text-purple-600/70">
            Apenas alunos Regular e Combinado
          </p>
        </CardContent>
      </Card>

      <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-emerald-900">
            Receita anual (Regular + Combinado)
          </CardTitle>
          <DollarSign className="h-4 w-4 text-emerald-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-700">
            {isLoading
              ? '-'
              : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(kpis?.annualRevenue ?? 0)}
          </div>
          <p className="text-xs text-emerald-600/70">
            12 × (mensalidade + material)
          </p>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-amber-900">
            Desconto médio (Regular + Combinado)
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-amber-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-700">
            {isLoading
              ? '-'
              : new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 }).format(kpis?.avgDiscountRatio ?? 0)}
          </div>
          <p className="text-xs text-amber-600/70">
            {isLoading ? '' : `Σ descontos / Σ base (${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(kpis?.sumTotalDiscountValue ?? 0)} / ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(kpis?.sumBaseValue ?? 0)})`}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
