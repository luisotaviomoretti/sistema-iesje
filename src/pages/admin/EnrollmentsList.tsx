import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { RefreshCw, Plus, Download, Trash2, RotateCcw, Search, User, Shield, UserX } from 'lucide-react'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAdminEnrollments } from '@/features/matricula-nova/hooks/admin/useAdminEnrollments'
import { useRestoreEnrollment, useSoftDeleteEnrollment } from '@/features/matricula-nova/hooks/admin/useAdminEnrollmentMutations'
import type { AdminEnrollmentFilters } from '@/features/matricula-nova/hooks/admin/useAdminEnrollments'
import type { EnrollmentRecord } from '@/types/database'
import { toast } from 'sonner'

const BRL = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Helper para renderizar badge de usuário
const getUserBadge = (enrollment: EnrollmentRecord) => {
  const userType = enrollment.created_by_user_type || 'anonymous'
  const userName = enrollment.created_by_user_name || 'Anônimo'
  
  const getIcon = () => {
    switch (userType) {
      case 'admin': return <Shield className="w-3 h-3" />
      case 'matricula': return <User className="w-3 h-3" />
      default: return <UserX className="w-3 h-3" />
    }
  }
  
  const getVariant = () => {
    switch (userType) {
      case 'admin': return 'destructive' as const
      case 'matricula': return 'default' as const
      default: return 'secondary' as const
    }
  }
  
  return (
    <div className="flex flex-col gap-1">
      <Badge variant={getVariant()} className="text-xs flex items-center gap-1 w-fit">
        {getIcon()}
        <span>{userType}</span>
      </Badge>
      <span className="text-xs text-muted-foreground truncate max-w-[120px]" title={userName}>
        {userName}
      </span>
    </div>
  )
}

const EnrollmentsList: React.FC = () => {
  // State de filtros e paginação
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<AdminEnrollmentFilters['status']>(undefined)
  const [escola, setEscola] = useState<AdminEnrollmentFilters['escola']>(undefined)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined)
  const [dateTo, setDateTo] = useState<string | undefined>(undefined)

  const { data, isLoading, isFetching, error, refetch } = useAdminEnrollments({
    page,
    pageSize,
    includeDeleted,
    status,
    escola,
    dateFrom,
    dateTo,
    search,
    orderBy: 'created_at',
    orderDir: 'desc',
  })

  const softDelete = useSoftDeleteEnrollment()
  const restore = useRestoreEnrollment()

  const total = data?.count || 0
  const rows = data?.data || []
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const onDownload = (e: EnrollmentRecord) => {
    if (!e.pdf_url) {
      toast.warning('PDF não disponível para esta matrícula')
      return
    }
    const link = document.createElement('a')
    link.href = e.pdf_url
    link.download = `proposta-${(e.student_name || 'aluno').replace(/\s+/g, '-')}.pdf`
    link.click()
  }

  const onSoftDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta matrícula?')) return
    try {
      await softDelete.mutateAsync(id)
      toast.success('Matrícula excluída com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir matrícula')
    }
  }

  const onRestore = async (id: string) => {
    try {
      await restore.mutateAsync({ id, status: 'draft' })
      toast.success('Matrícula restaurada com sucesso')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao restaurar matrícula')
    }
  }

  const canPrev = page > 1
  const canNext = page < totalPages

  const resetFilters = () => {
    setPage(1)
    setSearch('')
    setStatus(undefined)
    setEscola(undefined)
    setIncludeDeleted(false)
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Matrículas</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button asChild size="sm" variant="default">
            <Link to="/nova-matricula">
              <Plus className="w-4 h-4 mr-2" /> Nova Matrícula
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por aluno ou CPF"
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setPage(1); setSearch(e.target.value) }}
                />
              </div>
            </div>
            <div>
              <Select value={status?.[0] || 'all'} onValueChange={(v) => {
                setPage(1)
                setStatus(v === 'all' ? undefined : [v as any])
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="submitted">Enviado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="deleted">Excluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={escola || 'all'} onValueChange={(v) => {
                setPage(1)
                setEscola(v === 'all' ? undefined : (v as any))
              }}>
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
            <div className="flex items-center gap-2">
              <Switch checked={includeDeleted} onCheckedChange={(v) => { setPage(1); setIncludeDeleted(v) }} />
              <span className="text-sm text-muted-foreground">Incluir excluídos</span>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">De</label>
              <Input type="date" value={dateFrom || ''} onChange={(e) => { setPage(1); setDateFrom(e.target.value || undefined) }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Até</label>
              <Input type="date" value={dateTo || ''} onChange={(e) => { setPage(1); setDateTo(e.target.value || undefined) }} />
            </div>

            <div className="md:col-span-1 flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetFilters}>Limpar</Button>
              <Button variant="default" size="sm" onClick={() => refetch()} disabled={isFetching}>Aplicar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Matrículas ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : error ? (
            <div className="text-sm text-red-600">Erro ao carregar matrículas. Verifique suas permissões.</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhum registro encontrado.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Criado por</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">% Desc.</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{e.student_name}</TableCell>
                      <TableCell>{e.student_cpf}</TableCell>
                      <TableCell>{getUserBadge(e)}</TableCell>
                      <TableCell className="capitalize">{e.student_escola}</TableCell>
                      <TableCell>{e.series_name}</TableCell>
                      <TableCell>{e.status}</TableCell>
                      <TableCell className="text-right">{BRL(Number(e.base_value))}</TableCell>
                      <TableCell className="text-right">{Number(e.total_discount_percentage || 0)}%</TableCell>
                      <TableCell className="text-right">{BRL(Number(e.final_monthly_value))}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/admin/matriculas/${e.id}`}>Ver/Editar</Link>
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => onDownload(e)} disabled={!e.pdf_url}>
                          <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                        {e.status !== 'deleted' ? (
                          <Button size="sm" variant="destructive" onClick={() => onSoftDelete(e.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => onRestore(e.id)}>
                            <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                          </Button>
                        )}
                      </TableCell>
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

export default EnrollmentsList
