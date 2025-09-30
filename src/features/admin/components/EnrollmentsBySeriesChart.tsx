import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEnrollmentsBySeries, Escola } from "@/features/admin/hooks/useEnrollmentsBySeries"

const chartConfig = {
  count: {
    label: "Alunos",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

function formatEscolaLabel(e: Escola) {
  if (e === "pelicano") return "Pelicano"
  return "Sete de Setembro"
}

// Truncate series name if too long for axis labels
function truncateSeriesName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength - 3) + "..."
}

export function EnrollmentsBySeriesChart() {
  const [escola, setEscola] = React.useState<Escola>("pelicano")

  const { data: seriesData = [], isLoading } = useEnrollmentsBySeries({ escola })

  // Calculate total enrollments
  const totalEnrollments = React.useMemo(() => {
    return seriesData.reduce((sum, item) => sum + item.count, 0)
  }, [seriesData])

  // Prepare data for chart with truncated names for display
  const chartData = React.useMemo(() => {
    return seriesData.map(item => ({
      ...item,
      displayName: truncateSeriesName(item.series_name),
    }))
  }, [seriesData])

  return (
    <Card className="pt-0">
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b py-5 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-1">
          <CardTitle>Matrículas por Série</CardTitle>
          <CardDescription>
            {formatEscolaLabel(escola)} • {totalEnrollments} {totalEnrollments === 1 ? "aluno matriculado" : "alunos matriculados"}
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Select value={escola} onValueChange={(v) => setEscola(v as Escola)}>
            <SelectTrigger className="w-full rounded-lg sm:w-[180px]" aria-label="Escola">
              <SelectValue placeholder="Escola" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="pelicano" className="rounded-lg">Pelicano</SelectItem>
              <SelectItem value="sete_setembro" className="rounded-lg">Sete de Setembro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {seriesData.length === 0 && !isLoading ? (
          <div className="flex h-[350px] items-center justify-center text-muted-foreground">
            <p>Nenhuma série cadastrada para a escola selecionada.</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[350px] w-full"
          >
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, bottom: 60, left: 40 }}
            >
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="displayName"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                allowDecimals={false}
                width={40}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null

                  const data = payload[0].payload
                  const count = data.count
                  const annualRevenue = data.annual_revenue || 0
                  const avgDiscount = data.avg_discount_percentage || 0

                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <div className="font-semibold mb-2 text-sm">{data.series_name}</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Matrículas:</span>
                          <span className="font-medium">{count} {count === 1 ? 'aluno' : 'alunos'}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Receita anual:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                            }).format(annualRevenue)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Desconto médio:</span>
                          <span className="font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'percent',
                              minimumFractionDigits: 1,
                              maximumFractionDigits: 1,
                            }).format(avgDiscount / 100)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  offset={8}
                  fontSize={12}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
        {isLoading && (
          <div className="mt-2 text-center text-xs text-muted-foreground">Carregando...</div>
        )}
      </CardContent>
    </Card>
  )
}