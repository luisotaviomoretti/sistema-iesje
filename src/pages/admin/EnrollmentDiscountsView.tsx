import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { RefreshCw, Filter, Download } from 'lucide-react'

type Row = {
  discount_row_id: string
  enrollment_id: string
  student_cpf: string | null
  student_name: string | null
  series_id: string | null
  series_name: string | null
  track_id: string | null
  track_name: string | null
  discount_id: string | null
  discount_code: string | null
  discount_name: string | null
  discount_category: string | null
  percentage_applied: number | null
  value_applied: number | null
  discount_created_at: string
  enrollment_created_at: string
  status: string | null
  approval_level: string | null
  approval_status: string | null
  tag_matricula: 'novo_aluno' | 'Rematricula' | null
}

const BRL = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const EnrollmentDiscountsView: React.FC = () => {
  // Filtros
  const [search, setSearch] = useState('') // nome ou CPF
  const [discountCode, setDiscountCode] = useState<string>('')
  const [track, setTrack] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [origin, setOrigin] = useState<'ALL' | 'novo_aluno' | 'Rematricula' | 'NULL'>('ALL')

  // Dados
  const [rows, setRows] = useState<Row[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(count / pageSize))

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      let query = supabase
        .from('v_enrollment_discounts_student')
        .select('*', { count: 'exact' })

      // Filtros inteligentes
      if (search.trim()) {
        const term = search.trim()
        // Buscar por nome (ilike) ou CPF (ilike)
        query = query.or(`student_name.ilike.%${term}%,student_cpf.ilike.%${term}%`)
      }
      if (discountCode) {
        query = query.ilike('discount_code', `%${discountCode}%`)
      }
      if (track && track !== 'ALL') {
        query = query.ilike('track_name', `%${track}%`)
      }
      if (dateFrom) {
        query = query.gte('enrollment_created_at', `${dateFrom} 00:00:00`)
      }
      if (dateTo) {
        query = query.lte('enrollment_created_at', `${dateTo} 23:59:59`)
      }
      if (origin === 'novo_aluno' || origin === 'rematricula') {
        query = query.eq('tag_matricula', origin)
      } else if (origin === 'NULL') {
        // @ts-expect-error typing from supabase-js
        query = (query as any).is('tag_matricula', null)
      }

      // Ordenação e paginação
      query = query.order('enrollment_created_at', { ascending: false })
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query
      if (error) throw error
      setRows((data as Row[]) || [])
      setCount(count || 0)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize])

  const applyFilters = () => {
    setPage(1)
    fetchData()
  }

  const resetFilters = () => {
    setSearch('')
    setDiscountCode('')
    setTrack('ALL')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    fetchData()
  }

  const canPrev = page > 1
  const canNext = page < totalPages

  // Render
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" /> Relatório de Descontos (View)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Nome ou CPF</label>
              <Input placeholder="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cód. Desconto</label>
              <Input placeholder="Ex: IIR, PAV" value={discountCode} onChange={(e) => setDiscountCode(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Trilho</label>
              <Select value={track} onValueChange={setTrack}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="especial">especial</SelectItem>
                  <SelectItem value="combinado">combinado</SelectItem>
                  <SelectItem value="comercial">comercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Origem</label>
              <Select value={origin} onValueChange={(v) => setOrigin(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas</SelectItem>
                  <SelectItem value="novo_aluno">Novo aluno</SelectItem>
                  <SelectItem value="Rematricula">Rematricula</SelectItem>
                  <SelectItem value="NULL">Sem tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="md:col-span-1 flex items-end justify-end gap-2">
              <Button variant="outline" size="sm" onClick={resetFilters}>Limpar</Button>
              <Button variant="default" size="sm" onClick={applyFilters}>Aplicar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Descontos aplicados ({count})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Carregando...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum registro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Mat.</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Trilho</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>C??digo</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead className="text-right">% Aplicado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.discount_row_id}>
                      <TableCell>{new Date(r.enrollment_created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{r.student_name}</TableCell>
                      <TableCell>{r.student_cpf}</TableCell>
                      <TableCell className="capitalize">{r.track_name}</TableCell>
                      <TableCell>
                        {r.tag_matricula ? (
                          <span className="text-xs">{r.tag_matricula === 'rematricula' ? 'Rematricula' : 'Novo aluno'}</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{r.discount_code}</TableCell>
                      <TableCell>{r.discount_name}</TableCell>
                      <TableCell className="text-right">{Number(r.percentage_applied || 0)}%</TableCell>
                      <TableCell className="text-right">{BRL(Number(r.value_applied || 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">Página {page} de {totalPages} - Total: {count}</div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(Number(v)) }}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 por página</SelectItem>
                  <SelectItem value="20">20 por página</SelectItem>
                  <SelectItem value="50">50 por página</SelectItem>
                  <SelectItem value="100">100 por página</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={!canPrev} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
                <Button size="sm" variant="outline" disabled={!canNext} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EnrollmentDiscountsView

