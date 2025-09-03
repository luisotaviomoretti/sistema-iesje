import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye,
  MapPin,
  Users,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { 
  useCepRanges, 
  useDeleteCepRange 
} from '@/features/admin/hooks/useCepRanges'
import { useAdminPermissions } from '@/features/admin/hooks/useAdminAuth'
import { CepRangeForm } from '@/features/admin/components/CepRangeForm'

const CepManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingCepRange, setEditingCepRange] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cepRangeToDelete, setCepRangeToDelete] = useState(null)
  const [viewingCepRange, setViewingCepRange] = useState(null)

  const { permissions } = useAdminPermissions()
  const { data: cepRanges, isLoading } = useCepRanges(true) // incluir inativos
  const deleteMutation = useDeleteCepRange()

  // Filtrar faixas de CEP baseado na busca
  const filteredCepRanges = cepRanges?.filter(range =>
    range.cep_inicio.includes(searchTerm) ||
    range.cep_fim.includes(searchTerm.toLowerCase()) ||
    (range.categoria || range.classificacao)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    range.cidade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    range.observacoes?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const handleEdit = (cepRange) => {
    setEditingCepRange(cepRange)
    setShowForm(true)
  }

  const handleView = (cepRange) => {
    setViewingCepRange(cepRange)
  }

  const handleDelete = (cepRange) => {
    setCepRangeToDelete(cepRange)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (cepRangeToDelete) {
      await deleteMutation.mutateAsync(cepRangeToDelete.id)
      setDeleteDialogOpen(false)
      setCepRangeToDelete(null)
    }
  }

  const getClassificationBadge = (categoria) => {
    switch (categoria) {
      case 'fora':
        return { text: 'Fora de Poços de Caldas', color: 'bg-orange-100 text-orange-800' }
      case 'baixa':
        return { text: 'Menor Renda', color: 'bg-blue-100 text-blue-800' }
      case 'alta':
        return { text: 'Maior Renda', color: 'bg-green-100 text-green-800' }
      // Compatibilidade com sistema antigo
      case 'ALTO_RISCO':
        return { text: 'Alto Risco (Legacy)', color: 'bg-red-100 text-red-800' }
      case 'MEDIO_RISCO':
        return { text: 'Médio Risco (Legacy)', color: 'bg-yellow-100 text-yellow-800' }
      case 'BAIXO_RISCO':
        return { text: 'Baixo Risco (Legacy)', color: 'bg-green-100 text-green-800' }
      case 'ESPECIAL':
        return { text: 'Especial (Legacy)', color: 'bg-blue-100 text-blue-800' }
      default:
        return { text: categoria || 'Não definido', color: 'bg-gray-100 text-gray-800' }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Carregando configurações de CEP...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de CEPs</h1>
          <p className="text-muted-foreground">
            Gerencie as faixas de CEP e suas classificações por região e renda
          </p>
        </div>
        {permissions.canManageCeps && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Faixa de CEP
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total</p>
                <p className="text-2xl font-bold">{cepRanges?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Fora de Poços</p>
                <p className="text-2xl font-bold text-orange-600">
                  {cepRanges?.filter(c => c.categoria === 'fora' || c.classificacao === 'fora').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Menor Renda</p>
                <p className="text-2xl font-bold text-blue-600">
                  {cepRanges?.filter(c => c.categoria === 'baixa' || c.classificacao === 'baixa').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Shield className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Maior Renda</p>
                <p className="text-2xl font-bold text-green-600">
                  {cepRanges?.filter(c => c.categoria === 'alta' || c.classificacao === 'alta').length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por CEP, cidade, classificação ou observação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredCepRanges.length} faixa(s) de CEP encontrada(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faixa de CEP</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCepRanges.map((cepRange) => {
                const classification = getClassificationBadge(cepRange.categoria || cepRange.classificacao)
                return (
                  <TableRow key={cepRange.id}>
                    <TableCell className="font-mono font-medium">
                      {cepRange.cep_inicio} - {cepRange.cep_fim}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {cepRange.cidade || "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={classification.color}>
                        {classification.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cepRange.ativo ? "default" : "secondary"}>
                        {cepRange.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm truncate" title={cepRange.observacoes}>
                          {cepRange.observacoes || "-"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleView(cepRange)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          {permissions.canManageCeps && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(cepRange)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleDelete(cepRange)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredCepRanges.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma faixa de CEP encontrada para a busca.' : 'Nenhuma faixa de CEP cadastrada.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <CepRangeForm
          cepRange={editingCepRange}
          onClose={() => {
            setShowForm(false)
            setEditingCepRange(null)
          }}
        />
      )}

      {/* View Dialog */}
      {viewingCepRange && (
        <ViewCepRangeDialog
          cepRange={viewingCepRange}
          onClose={() => setViewingCepRange(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Faixa de CEP</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a faixa de CEP "{cepRangeToDelete?.cep_inicio} - {cepRangeToDelete?.cep_fim}"?
              <br />
              <br />
              Esta ação não pode ser desfeita e afetará a análise de descontos para estes CEPs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Component for viewing CEP range details
const ViewCepRangeDialog = ({ cepRange, onClose }) => {
  const getClassificationText = (categoria) => {
    switch (categoria) {
      case 'fora': return 'Fora de Poços de Caldas'
      case 'baixa': return 'Menor Renda'
      case 'alta': return 'Maior Renda'
      // Compatibilidade
      case 'ALTO_RISCO': return 'Alto Risco (Legacy)'
      case 'MEDIO_RISCO': return 'Médio Risco (Legacy)'
      case 'BAIXO_RISCO': return 'Baixo Risco (Legacy)'
      case 'ESPECIAL': return 'Especial (Legacy)'
      default: return categoria || 'Não definido'
    }
  }

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Detalhes da Faixa de CEP</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Faixa de CEP</label>
              <p className="font-mono text-lg">{cepRange.cep_inicio} - {cepRange.cep_fim}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <div>
                <Badge variant={cepRange.ativo ? "default" : "secondary"}>
                  {cepRange.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Cidade</label>
              <p>{cepRange.cidade || 'Não identificada'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Classificação</label>
              <p>{getClassificationText(cepRange.categoria || cepRange.classificacao)}</p>
            </div>
          </div>

          {cepRange.observacoes && (
            <div>
              <label className="text-sm font-medium">Observações</label>
              <p className="text-sm bg-muted p-3 rounded">{cepRange.observacoes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <label className="text-sm font-medium">Criado em</label>
              <p>{new Date(cepRange.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Atualizado em</label>
              <p>{new Date(cepRange.updated_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default CepManagement