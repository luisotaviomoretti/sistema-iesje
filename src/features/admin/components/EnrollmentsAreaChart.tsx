import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

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
  ChartLegend,
  ChartLegendContent,
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
import { useEnrollmentsTimeSeries, TimeRange, Escola, Origin } from "@/features/admin/hooks/useEnrollmentsTimeSeries"

const chartConfig = {
  rematricula: {
    label: "Rematrícula",
    color: "var(--chart-1)",
  },
  novo_aluno: {
    label: "Aluno novo",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function formatRangeLabel(r: TimeRange) {
  switch (r) {
    case "7d": return "Últimos 7 dias"
    case "30d": return "Últimos 30 dias"
    default: return "Últimos 90 dias"
  }
}

function formatEscolaLabel(e: Escola | "all") {
  if (e === "all") return "Todas as escolas"
  if (e === "pelicano") return "Pelicano"
  return "Sete de Setembro"
}

function formatOriginLabel(o: Origin | "all") {
  if (o === "all") return "Todas as origens"
  return o === "rematricula" ? "Rematrícula" : "Aluno novo"
}

export function EnrollmentsAreaChart() {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("90d")
  const [escola, setEscola] = React.useState<Escola | "all">("all")
  const [origin, setOrigin] = React.useState<Origin | "all">("all")

  const { data: series = [], isLoading } = useEnrollmentsTimeSeries({ timeRange, escola, origin })

  const showRematricula = origin === "all" || origin === "rematricula"
  const showNovoAluno = origin === "all" || origin === "novo_aluno"

  return (
    <Card className="pt-0">
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b py-5 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-1">
          <CardTitle>Matrículas por dia</CardTitle>
          <CardDescription>
            {formatRangeLabel(timeRange)} • {formatEscolaLabel(escola)} • {formatOriginLabel(origin)}
          </CardDescription>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <SelectTrigger className="w-full rounded-lg sm:w-[160px]" aria-label="Período">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">90 dias</SelectItem>
              <SelectItem value="30d" className="rounded-lg">30 dias</SelectItem>
              <SelectItem value="7d" className="rounded-lg">7 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={escola} onValueChange={(v) => setEscola(v as Escola | "all") }>
            <SelectTrigger className="w-full rounded-lg sm:w-[160px]" aria-label="Escola">
              <SelectValue placeholder="Escola" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg">Todas</SelectItem>
              <SelectItem value="pelicano" className="rounded-lg">Pelicano</SelectItem>
              <SelectItem value="sete_setembro" className="rounded-lg">Sete de Setembro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={origin} onValueChange={(v) => setOrigin(v as Origin | "all") }>
            <SelectTrigger className="w-full rounded-lg sm:w-[180px]" aria-label="Origem">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="rounded-lg">Todas as origens</SelectItem>
              <SelectItem value="rematricula" className="rounded-lg">Rematrícula</SelectItem>
              <SelectItem value="novo_aluno" className="rounded-lg">Aluno novo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
        >
          <AreaChart data={series}>
            <defs>
              <linearGradient id="fillRematricula" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-rematricula)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-rematricula)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillNovoAluno" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-novo_aluno)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-novo_aluno)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value: string) => {
                const d = new Date(value + "T00:00:00")
                return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
              }}
            />
            <YAxis allowDecimals={false} width={30} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const d = new Date(value + "T00:00:00")
                    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                  }}
                  indicator="dot"
                />
              }
            />
            {showRematricula && (
              <Area
                dataKey="rematricula"
                name="Rematrícula"
                type="natural"
                fill="url(#fillRematricula)"
                stroke="var(--color-rematricula)"
                stackId={showNovoAluno ? "a" : undefined}
              />
            )}
            {showNovoAluno && (
              <Area
                dataKey="novo_aluno"
                name="Aluno novo"
                type="natural"
                fill="url(#fillNovoAluno)"
                stroke="var(--color-novo_aluno)"
                stackId={showRematricula ? "a" : undefined}
              />
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
        {isLoading && (
          <div className="mt-2 text-center text-xs text-muted-foreground">Carregando...</div>
        )}
      </CardContent>
    </Card>
  )
}
