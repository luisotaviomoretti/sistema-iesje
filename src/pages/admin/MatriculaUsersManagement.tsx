import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateMatriculaUser, useCreateMatriculaUserComplete, useMatriculaUsers, useToggleMatriculaUser, useUpdateMatriculaUser } from '@/features/admin/hooks/useMatriculaUsers'
import { ESCOLAS, getEscolaColor, type MatriculaUser } from '@/features/matricula/types'
import { useAdminPermissions } from '@/features/admin/hooks/useAdminAuth'
import { Loader2, MoreHorizontal, Search, ShieldCheck, UserPlus, UserX } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const MatriculaUsersManagement = () => {
  const { permissions } = useAdminPermissions()
  const [search, setSearch] = useState('')
  const [escolaFilter, setEscolaFilter] = useState<string>('todas')
  const [showInactive, setShowInactive] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editing, setEditing] = useState<MatriculaUser | null>(null)
  const [formNome, setFormNome] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formEscola, setFormEscola] = useState<string>(ESCOLAS[0])
  const [formAtivo, setFormAtivo] = useState(true)
  const [formAuthUserId, setFormAuthUserId] = useState('')
  const [formPassword, setFormPassword] = useState('')

  const { data: users, isLoading } = useMatriculaUsers(showInactive)
  const createMutation = useCreateMatriculaUser()
  const createCompleteMutation = useCreateMatriculaUserComplete()
  const updateMutation = useUpdateMatriculaUser()
  const toggleMutation = useToggleMatriculaUser()
  const queryClient = useQueryClient()

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (users || []).filter((u) => {
      const matchesSearch = !term || u.email.toLowerCase().includes(term) || u.nome.toLowerCase().includes(term)
      const matchesEscola = escolaFilter === 'todas' || u.escola === escolaFilter
      const matchesActive = showInactive ? true : u.ativo
      return matchesSearch && matchesEscola && matchesActive
    })
  }, [users, search, escolaFilter, showInactive])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    try {
      if (editing) {
        // Edição usa hook atual (sem senha)
        const payload = {
          nome: formNome,
          email: formEmail,
          escola: formEscola as any,
          ativo: formAtivo,
        }
        await updateMutation.mutateAsync({ id: editing.id, ...payload })
      } else {
        // Criação usa novo hook com Edge Function
        await createCompleteMutation.mutateAsync({
          nome: formNome,
          email: formEmail,
          escola: formEscola as any,
          ativo: formAtivo,
          password: formPassword,
        })
      }

      // Reset form após sucesso
      setOpenDialog(false)
      setEditing(null)
      setFormNome('')
      setFormEmail('')
      setFormEscola(ESCOLAS[0])
      setFormAtivo(true)
      setFormAuthUserId('')
      setFormPassword('')
      queryClient.invalidateQueries({ queryKey: ['matricula-users'] })
    } catch (error) {
      // Erro já tratado pelos hooks com toast
      console.error('Erro no formulário:', error)
    }
  }

  const openCreate = () => {
    setEditing(null)
    setFormNome('')
    setFormEmail('')
    setFormEscola(ESCOLAS[0])
    setFormAtivo(true)
    setFormAuthUserId('')
    setFormPassword('')
    setOpenDialog(true)
  }

  const openEdit = (user: MatriculaUser) => {
    setEditing(user)
    setFormNome(user.nome)
    setFormEmail(user.email)
    setFormEscola(user.escola)
    setFormAtivo(!!user.ativo)
    setFormAuthUserId(user.auth_user_id || '')
    setFormPassword('')
    setOpenDialog(true)
  }

  const toggleActive = async (user: MatriculaUser) => {
    await toggleMutation.mutateAsync({ id: user.id, ativo: !user.ativo })
  }

  if (!permissions.canManageDiscounts) {
    return (
      <div className="p-6">
        <Alert>
          <AlertDescription>Você não tem permissão para gerenciar usuários de matrícula.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuários do Sistema de Matrículas</h1>
          <p className="text-sm text-muted-foreground">Gerencie operadores por escola.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-2" /> Novo usuário
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2 max-w-md w-full">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou e-mail" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Escola:</span>
                <Select value={escolaFilter} onValueChange={setEscolaFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as escolas</SelectItem>
                    {ESCOLAS.map((e) => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input id="showInactive" type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                <label htmlFor="showInactive" className="text-sm">Incluir inativos</label>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} usuário(s) encontrado(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Último login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => (
                    <TableRow key={u.id} className={!u.ativo ? 'opacity-60' : ''}>
                      <TableCell>
                        <div className="font-medium">{u.nome}</div>
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge className={getEscolaColor(u.escola)}>{u.escola}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</span>
                      </TableCell>
                      <TableCell>
                        {u.ativo ? (
                          <span className="text-green-700 text-sm inline-flex items-center"><ShieldCheck className="h-4 w-4 mr-1" /> Ativo</span>
                        ) : (
                          <span className="text-gray-600 text-sm inline-flex items-center"><UserX className="h-4 w-4 mr-1" /> Inativo</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEdit(u)}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {u.ativo ? (
                              <DropdownMenuItem onClick={() => toggleActive(u)}>Desativar</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => toggleActive(u)}>Ativar</DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={openDialog} onOpenChange={(o) => { setOpenDialog(o); if (!o) setEditing(null) }}>
        <DialogTrigger asChild>
          <span></span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar usuário' : 'Novo usuário de matrícula'}</DialogTitle>
            <DialogDescription>
              {editing 
                ? 'Edite as informações do usuário. A senha não pode ser alterada aqui.'
                : 'Preencha os dados. O usuário será criado automaticamente no sistema de autenticação.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input value={formNome} onChange={(e) => setFormNome(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Escola</label>
              <Select value={formEscola} onValueChange={setFormEscola}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESCOLAS.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!editing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Senha *</label>
                <Input 
                  type="password" 
                  placeholder="Mínimo 8 caracteres"
                  value={formPassword} 
                  onChange={(e) => setFormPassword(e.target.value)} 
                  required={!editing}
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Esta será a senha inicial do usuário para fazer login no sistema
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <input id="ativo" type="checkbox" checked={formAtivo} onChange={(e) => setFormAtivo(e.target.checked)} />
              <label htmlFor="ativo" className="text-sm">Ativo</label>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setOpenDialog(false); setEditing(null) }}>Cancelar</Button>
              <Button 
                type="submit" 
                disabled={
                  createMutation.isPending || 
                  createCompleteMutation.isPending || 
                  updateMutation.isPending ||
                  (!editing && !formPassword) // Senha obrigatória para novos usuários
                }
              >
                {(createMutation.isPending || createCompleteMutation.isPending || updateMutation.isPending) && 
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                }
                {editing ? 'Salvar alterações' : 'Criar usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MatriculaUsersManagement

