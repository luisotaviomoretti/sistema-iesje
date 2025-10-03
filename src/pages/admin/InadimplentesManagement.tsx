import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdminPermissions } from '@/features/admin/hooks/useAdminAuth'
import {
  useInadimplentes,
  useInadimplentesStats,
  useUpsertInadimplente,
  useSoftDeleteInadimplente,
  useRestoreInadimplente,
  useCsvIngestion,
  useReplaceInadimplentesBySchool,
  type Inadimplente,
} from '@/features/admin/hooks/useInadimplentes'
import { parseInadExcel, type InadRow } from '@/features/admin/utils/inadExcelParser'
import { MoreHorizontal, Plus, RotateCcw, Trash2, Undo2, Search } from 'lucide-react'

function formatDate(d?: string | null) {
  if (!d) return '-'
  try { return new Date(d).toLocaleString('pt-BR') } catch { return d }
}

// Parser CSV simples (delimitador , ou ;) e cabeçalho na primeira linha
function parseCSV(text: string): Record<string, string>[] {
  if (!text) return []
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // remove BOM
  const delim = (text.match(/;/g)?.length || 0) > (text.match(/,/g)?.length || 0) ? ';' : ','
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length === 0) return []
  const header = lines[0].split(delim).map(h => h.trim())
  const rows: Record<string,string>[] = []
  for (let i=1;i<lines.length;i++) {
    const cols = lines[i].split(delim)
    const obj: Record<string,string> = {}
    header.forEach((h, idx) => obj[h] = (cols[idx] ?? '').trim())
    if (Object.values(obj).some(v => v !== '')) rows.push(obj)
  }
  return rows
}

const InadimplentesManagement = () => {
  const { permissions } = useAdminPermissions()

  // Filtros
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'active'|'inactive'|'all'>('active')
  const [school, setSchool] = useState('')

  const { data: items = [], isLoading } = useInadimplentes({
    isActive: status === 'all' ? 'all' : status === 'active',
    school: school || undefined,
    search,
  })
  const { data: stats = [] } = useInadimplentesStats()

  const schools = useMemo(() => {
    const s = new Set<string>()
    items.forEach(i => { if (i.student_escola) s.add(i.student_escola) })
    return Array.from(s).sort()
  }, [items])

  // Mutations
  const upsert = useUpsertInadimplente()
  const softDelete = useSoftDeleteInadimplente()
  const restore = useRestoreInadimplente()
  const ingest = useCsvIngestion()
  const replaceBySchool = useReplaceInadimplentesBySchool()

  // Excel (Pelicano / Sete Setembro)
  const [pelicanoFiles, setPelicanoFiles] = useState<File[]>([])
  const [seteFiles, setSeteFiles] = useState<File[]>([])
  const [pelPreview, setPelPreview] = useState<{ rows: InadRow[]; stats: any } | null>(null)
  const [setePreview, setSetePreview] = useState<{ rows: InadRow[]; stats: any } | null>(null)

  const onExcelPelicano = async (files: FileList | null) => {
    try {
      const f = Array.from(files ?? []).filter((x) => x.name.toLowerCase().endsWith('.xlsx') || x.name.toLowerCase().endsWith('.xls'))
      if (f.length === 0) { toast.error('Selecione arquivo .xlsx/.xls'); return }
      setPelicanoFiles(f)
      const res = await parseInadExcel(f, 'pelicano')
      setPelPreview(res)
      toast.success(`Pelicano: ${res.stats.uniqueStudents} alunos (raw: ${res.stats.totalRaw})`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao ler Excel Pelicano')
    }
  }

  const onExcelSete = async (files: FileList | null) => {
    try {
      const f = Array.from(files ?? []).filter((x) => x.name.toLowerCase().endsWith('.xlsx') || x.name.toLowerCase().endsWith('.xls'))
      if (f.length === 0) { toast.error('Selecione arquivo .xlsx/.xls'); return }
      setSeteFiles(f)
      const res = await parseInadExcel(f, 'sete_setembro')
      setSetePreview(res)
      toast.success(`Sete Setembro: ${res.stats.uniqueStudents} alunos (raw: ${res.stats.totalRaw})`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao ler Excel Sete Setembro')
    }
  }

  const publishSchool = async (school: 'pelicano' | 'sete_setembro') => {
    const prev = school === 'pelicano' ? pelPreview : setePreview
    if (!prev || prev.rows.length === 0) { toast.error('Nada para publicar. Gere a prévia do Excel antes.'); return }
    try {
      const data = await replaceBySchool.mutateAsync({ escola: school, rows: prev.rows })
      const r = Array.isArray(data) ? data[0] : data
      toast.success(`${school}: substituição concluída. Desativados: ${r?.deactivated_count ?? 0} / Inseridos: ${r?.inserted_count ?? 0}`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao substituir inadimplentes')
    }
  }

  // Dialog Novo/Editar
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<Inadimplente | null>(null)
  const [form, setForm] = useState({
    codigo_inadim: '', student_name: '', guardian1_name: '', student_escola: '', meses_inadim: '' as string | number
  })
  const resetForm = () => { setEditing(null); setForm({ codigo_inadim: '', student_name: '', guardian1_name: '', student_escola: '', meses_inadim: '' }) }
  const submitForm = async () => {
    if (!form.student_name.trim()) { toast.error('Nome do aluno é obrigatório.'); return }
    const meses = form.meses_inadim === '' ? null : Number(form.meses_inadim)
    try {
      await upsert.mutateAsync({
        codigo_inadim: form.codigo_inadim || null,
        student_name: form.student_name,
        guardian1_name: form.guardian1_name || null,
        student_escola: form.student_escola || null,
        meses_inadim: Number.isFinite(meses) ? meses : null,
        source: 'admin-ui'
      })
      toast.success(editing ? 'Atualizado.' : 'Criado.')
      setOpenForm(false)
      resetForm()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar')
    }
  }

  // Soft delete
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [target, setTarget] = useState<Inadimplente | null>(null)
  const [reason, setReason] = useState('Resolvido com Tesouraria')
  const confirmDelete = async () => {
    if (!target) return
    try {
      await softDelete.mutateAsync({ id: target.id, reason })
      toast.success('Registro desativado')
      setConfirmOpen(false)
      setTarget(null)
      setReason('Resolvido com Tesouraria')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao desativar')
    }
  }

  // CSV
  const fileRef = useRef<HTMLInputElement | null>(null)
  const onCsv = async (f: File) => {
    try {
      const text = await f.text()
      const rows = parseCSV(text)
      if (!rows.length) { toast.error('CSV vazio ou inválido.'); return }
      if (!Object.keys(rows[0]).includes('student_name')) { toast.error('CSV precisa da coluna student_name'); return }
      const res = await ingest.mutateAsync({ rows })
      const r = Array.isArray(res) ? res[0] : res
      toast.success(`Ingestão: +${r?.inserted_count ?? 0} / ~${r?.updated_count ?? 0} atualizações / ${r?.error_count ?? 0} erros`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar CSV')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão Inadimplentes</h1>
          <p className="text-muted-foreground">Gerencie a lista usada para bloquear a Rematrícula (soft delete e substituição via Excel).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RotateCcw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
          {permissions.canApprove && (
            <>
              <Button onClick={() => { resetForm(); setOpenForm(true) }}>
                <Plus className="mr-2 h-4 w-4" /> Novo
              </Button>
              <Button asChild variant="outline">
                <Link to="/admin/inad-override-enrollments">Matrículas c/ Exceção (1 mês)</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Excel Upload (Pelicano / Sete Setembro) — agora abaixo do header para melhor layout */}
      {permissions.canApprove && (
        <Card>
          <CardHeader>
            <CardTitle>Substituir por Escola (Excel)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pelicano */}
              <div className="space-y-3">
                <Label>Pelicano — Arquivos (.xlsx/.xls)</Label>
                <Input className="w-full" type="file" accept=".xlsx,.xls" multiple onChange={(e)=> onExcelPelicano(e.target.files)} />
                {pelPreview && (
                  <div className="text-sm text-muted-foreground">
                    <div>Alunos únicos: <strong>{pelPreview.stats.uniqueStudents}</strong> (raw: {pelPreview.stats.totalRaw})</div>
                    <div>Com responsável: <strong>{pelPreview.stats.withGuardian}</strong></div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button className="w-full md:w-auto" variant="outline" onClick={() => { setPelicanoFiles([]); setPelPreview(null) }}>Limpar</Button>
                  <Button className="w-full md:w-auto" onClick={() => publishSchool('pelicano')} disabled={replaceBySchool.isPending || !pelPreview}>
                    {replaceBySchool.isPending ? 'Publicando...' : 'Publicar Pelicano'}
                  </Button>
                </div>
              </div>
              {/* Sete Setembro */}
              <div className="space-y-3">
                <Label>Sete Setembro — Arquivos (.xlsx/.xls)</Label>
                <Input className="w-full" type="file" accept=".xlsx,.xls" multiple onChange={(e)=> onExcelSete(e.target.files)} />
                {setePreview && (
                  <div className="text-sm text-muted-foreground">
                    <div>Alunos únicos: <strong>{setePreview.stats.uniqueStudents}</strong> (raw: {setePreview.stats.totalRaw})</div>
                    <div>Com responsável: <strong>{setePreview.stats.withGuardian}</strong></div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button className="w-full md:w-auto" variant="outline" onClick={() => { setSeteFiles([]); setSetePreview(null) }}>Limpar</Button>
                  <Button className="w-full md:w-auto" onClick={() => publishSchool('sete_setembro')} disabled={replaceBySchool.isPending || !setePreview}>
                    {replaceBySchool.isPending ? 'Publicando...' : 'Publicar Sete Setembro'}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">A publicação substitui os registros <em>ativos</em> da escola selecionada por uma nova lista processada a partir do Excel. Operação auditada e transacional.</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {stats.map(s => (
            <Card key={s.school}>
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Escola</p>
                  <p className="text-lg font-semibold">{s.school || '—'}</p>
                </div>
                <div className="text-2xl font-bold">{s.total_active}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome do aluno..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Label>Status</Label>
              <select className="border rounded px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Escola</Label>
              <select className="border rounded px-2 py-1" value={school} onChange={(e) => setSchool(e.target.value)}>
                <option value="">Todas</option>
                {schools.map(sc => <option key={sc} value={sc}>{sc}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>{items.length} registro(s)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Meses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Atualizado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.student_name}</TableCell>
                    <TableCell>{i.guardian1_name || '—'}</TableCell>
                    <TableCell>{i.student_escola || '—'}</TableCell>
                    <TableCell>{i.meses_inadim ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={i.is_active ? 'default' : 'secondary'}>
                        {i.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(i.updated_at)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          {permissions.canApprove && (
                            <>
                              <DropdownMenuItem onClick={() => { setEditing(i); setForm({
                                codigo_inadim: i.codigo_inadim || '',
                                student_name: i.student_name,
                                guardian1_name: i.guardian1_name || '',
                                student_escola: i.student_escola || '',
                                meses_inadim: i.meses_inadim ?? ''
                              }); setOpenForm(true) }}>Editar</DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {i.is_active ? (
                            <DropdownMenuItem onClick={() => { setTarget(i); setConfirmOpen(true) }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Desativar
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={async () => { try { await restore.mutateAsync(i.id); toast.success('Restaurado.')} catch(e:any){ toast.error(e?.message || 'Erro ao restaurar') } }}>
                              <Undo2 className="mr-2 h-4 w-4" /> Restaurar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!isLoading && items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">Nenhum registro encontrado.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Novo/Editar */}
      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Inadimplente' : 'Novo Inadimplente'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Aluno (obrigatório)</Label>
              <Input value={form.student_name} onChange={(e)=>setForm(f=>({...f, student_name:e.target.value}))} />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input value={form.guardian1_name} onChange={(e)=>setForm(f=>({...f, guardian1_name:e.target.value}))} />
            </div>
            <div>
              <Label>Escola</Label>
              <Input value={form.student_escola} onChange={(e)=>setForm(f=>({...f, student_escola:e.target.value}))} />
            </div>
            <div>
              <Label>Meses Inadimplência</Label>
              <Input type="number" value={form.meses_inadim} onChange={(e)=>setForm(f=>({...f, meses_inadim:e.target.value}))} />
            </div>
            <div>
              <Label>Código Inadim</Label>
              <Input value={form.codigo_inadim} onChange={(e)=>setForm(f=>({...f, codigo_inadim:e.target.value}))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=>setOpenForm(false)}>Cancelar</Button>
            <Button onClick={submitForm} disabled={upsert.isPending}>{upsert.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Soft Delete */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p>Confirma desativar o aluno <strong>{target?.student_name}</strong>?</p>
            <div>
              <Label>Motivo</Label>
              <Input value={reason} onChange={(e)=>setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={()=>setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={softDelete.isPending}>
              {softDelete.isPending ? 'Desativando...' : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default InadimplentesManagement
