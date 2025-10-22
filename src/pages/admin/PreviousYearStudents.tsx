import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { RefreshCw, Search } from 'lucide-react'
import { usePreviousYearStudentsAdminList } from '@/features/admin/hooks/usePreviousYearStudents'

const PreviousYearStudentsAdmin: React.FC = () => {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [escola, setEscola] = useState<'pelicano' | 'sete_setembro' | undefined>(undefined)
  const [hasEnrollment, setHasEnrollment] = useState<'all' | 'yes' | 'no'>('all')
  const [nameQuery, setNameQuery] = useState('')

  const hasEnrollmentBool = useMemo(() => (
    hasEnrollment === 'all' ? null : (hasEnrollment === 'yes')
  ), [hasEnrollment])

  const { data, isLoading, isFetching, error, refetch } = usePreviousYearStudentsAdminList({
    page,
    pageSize,
    escola,
    hasEnrollment: hasEnrollmentBool,
    nameQuery,
  })

  const total = data?.count || 0
  const rows = data?.rows || []
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 1
  const canNext = page < totalPages

  const resetFilters = () => {
    setPage(1)
    setPageSize(20)
    setEscola(undefined)
    setHasEnrollment('all')
    setNameQuery('')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Base do Ano Anterior</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome do aluno"
                  className="pl-8"
                  value={nameQuery}
                  onChange={(e) => { setPage(1); setNameQuery(e.target.value) }}
                />
              </div>
            </div>
            <div>
              <Select value={escola || 'all'} onValueChange={(v) => { setPage(1); setEscola(v === 'all' ? undefined : (v as any)) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Escola" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Escolas</SelectItem>
                  <SelectItem value="sete_setembro">Sete de Setembro</SelectItem>
                  <SelectItem value="pelicano">Pelicano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={hasEnrollment} onValueChange={(v) => { setPage(1); setHasEnrollment(v as any) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Matrícula" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Somente matriculados</SelectItem>
                  <SelectItem value="no">Somente não matriculados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetFilters}>Limpar</Button>
              <Button variant="default" size="sm" onClick={() => refetch()} disabled={isFetching}>Aplicar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alunos ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Erro ao carregar dados. Verifique suas permissões.</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum registro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Trilho</TableHead>
                    <TableHead className="text-right">% Sugerido</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Status Matrícula</TableHead>
                    <TableHead className="text-right">% Praticado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.student_name}</TableCell>
                      <TableCell className="capitalize">{r.student_escola}</TableCell>
                      <TableCell>{r.series_name}</TableCell>
                      <TableCell className="capitalize">{r.track_name}</TableCell>
                      <TableCell className="text-right">{Number(r.total_discount_percentage || 0)}%</TableCell>
                      <TableCell>{r.discount_code || '-'}</TableCell>
                      <TableCell>{r.has_enrollment ? (r.enrollment_status || '—') : '—'}</TableCell>
                      <TableCell className="text-right">{r.has_enrollment ? `${Number(r.enrollment_discount_percentage || 0)}%` : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginação */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-muted-foreground">Página {page} de {totalPages} — Total: {total}</div>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPage(1); setPageSize(Number(v)) }}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
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

export default PreviousYearStudentsAdmin
