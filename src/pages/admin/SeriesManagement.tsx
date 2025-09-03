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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  GraduationCap,
  DollarSign,
  BookOpen,
  Power,
  PowerOff
} from 'lucide-react'
import { 
  useSeries, 
  useDeleteSerie,
  useActivateSerie,
  formatCurrency,
  calculateAnnualValue,
  getEscolaColor,
  ESCOLAS,
  type Serie
} from '@/features/admin/hooks/useSeries'
import { useAdminPermissions } from '@/features/admin/hooks/useAdminAuth'
import { SerieForm } from '@/features/admin/components/SerieForm'

const SeriesManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEscola, setSelectedEscola] = useState<string>('todas')
  const [showForm, setShowForm] = useState(false)
  const [editingSerie, setEditingSerie] = useState<Serie | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [serieToDelete, setSerieToDelete] = useState<Serie | null>(null)
  const [viewingSerie, setViewingSerie] = useState<Serie | null>(null)

  const { permissions } = useAdminPermissions()
  const { data: series, isLoading } = useSeries(true) // incluir inativos
  const deleteMutation = useDeleteSerie()
  const activateMutation = useActivateSerie()

  // Filtrar séries baseado na busca e escola
  const filteredSeries = series?.filter(serie => {
    const matchesSearch = serie.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      serie.ano_serie.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesEscola = selectedEscola === 'todas' || serie.escola === selectedEscola
    
    return matchesSearch && matchesEscola
  }) || []

  const handleEdit = (serie: Serie) => {
    setEditingSerie(serie)
    setShowForm(true)
  }

  const handleView = (serie: Serie) => {
    setViewingSerie(serie)
  }

  const handleDelete = (serie: Serie) => {
    setSerieToDelete(serie)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (serieToDelete) {
      await deleteMutation.mutateAsync(serieToDelete.id)
      setDeleteDialogOpen(false)
      setSerieToDelete(null)
    }
  }

  const handleToggleActive = async (serie: Serie) => {
    if (serie.ativo) {
      await deleteMutation.mutateAsync(serie.id)
    } else {
      await activateMutation.mutateAsync(serie.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Carregando séries...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurar Séries</h1>
          <p className="text-muted-foreground">
            Gerencie as séries/anos escolares e seus valores mensais e anuais
          </p>
        </div>
        {permissions.canManageCeps && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Série
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total</p>
                <p className="text-2xl font-bold">{series?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Power className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Ativas</p>
                <p className="text-2xl font-bold text-green-600">
                  {series?.filter(s => s.ativo).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <PowerOff className="h-4 w-4 text-gray-500" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Inativas</p>
                <p className="text-2xl font-bold text-gray-500">
                  {series?.filter(s => !s.ativo).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Valor Médio</p>
                <p className="text-2xl font-bold text-blue-600">
                  {series && series.length > 0 
                    ? formatCurrency(
                        series
                          .filter(s => s.ativo)
                          .reduce((sum, s) => sum + s.valor_mensal_com_material, 0) / 
                        series.filter(s => s.ativo).length
                      ).replace('R$', '').trim()
                    : '0'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da série ou ano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium">Escola:</label>
              <Select value={selectedEscola} onValueChange={setSelectedEscola}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">
                    <span>Todas as escolas</span>
                  </SelectItem>
                  {ESCOLAS.map((escola) => (
                    <SelectItem key={escola} value={escola}>
                      <div className="flex items-center space-x-2">
                        <Badge className={getEscolaColor(escola)}>
                          {escola}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filteredSeries.length} série(s) encontrada(s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Série/Ano</TableHead>
                  <TableHead>Escola</TableHead>
                  <TableHead>Mensal c/ Material</TableHead>
                  <TableHead>Valor Material</TableHead>
                  <TableHead>Mensal s/ Material</TableHead>
                  <TableHead>Anual c/ Material</TableHead>
                  <TableHead>Anual s/ Material</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSeries.map((serie) => (
                  <TableRow key={serie.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{serie.nome}</p>
                        <p className="text-sm text-muted-foreground">{serie.ano_serie}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEscolaColor(serie.escola)}>
                        {serie.escola}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-green-600">
                        {formatCurrency(serie.valor_mensal_com_material)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-blue-600">
                        {formatCurrency(serie.valor_material)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(serie.valor_mensal_sem_material)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-green-700">
                        {formatCurrency(calculateAnnualValue(serie.valor_mensal_com_material))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold">
                        {formatCurrency(calculateAnnualValue(serie.valor_mensal_sem_material))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={serie.ativo ? "default" : "secondary"}>
                        {serie.ativo ? "Ativa" : "Inativa"}
                      </Badge>
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
                          <DropdownMenuItem onClick={() => handleView(serie)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          {permissions.canManageCeps && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(serie)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(serie)}
                              >
                                {serie.ativo ? (
                                  <>
                                    <PowerOff className="mr-2 h-4 w-4" />
                                    Desativar
                                  </>
                                ) : (
                                  <>
                                    <Power className="mr-2 h-4 w-4" />
                                    Ativar
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSeries.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma série encontrada para a busca.' : 'Nenhuma série cadastrada.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <SerieForm
          serie={editingSerie}
          onClose={() => {
            setShowForm(false)
            setEditingSerie(null)
          }}
        />
      )}

      {/* View Dialog */}
      {viewingSerie && (
        <ViewSerieDialog
          serie={viewingSerie}
          onClose={() => setViewingSerie(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Série</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar a série "{serieToDelete?.nome}"?
              <br />
              <br />
              Ela não aparecerá mais no sistema de matrículas, mas as matrículas já realizadas permanecerão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Desativando...' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Component for viewing serie details
const ViewSerieDialog = ({ serie, onClose }: { serie: Serie; onClose: () => void }) => {
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Detalhes da Série</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Nome da Série</label>
              <p className="text-lg font-semibold">{serie.nome}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Ano/Série</label>
              <p className="text-lg">{serie.ano_serie}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <div>
                <Badge variant={serie.ativo ? "default" : "secondary"}>
                  {serie.ativo ? "Ativa" : "Inativa"}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Ordem</label>
              <p>{serie.ordem}°</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Valores Mensais</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded">
                <label className="text-xs font-medium text-green-700">Com Material</label>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(serie.valor_mensal_com_material)}
                </p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <label className="text-xs font-medium text-blue-700">Material</label>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(serie.valor_material)}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded">
                <label className="text-xs font-medium text-gray-700">Sem Material</label>
                <p className="text-lg font-bold text-gray-700">
                  {formatCurrency(serie.valor_mensal_sem_material)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Valores Anuais (x12)</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-100 rounded">
                <label className="text-sm font-medium text-green-800">Com Material</label>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(calculateAnnualValue(serie.valor_mensal_com_material))}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-100 rounded">
                <label className="text-sm font-medium text-gray-800">Sem Material</label>
                <p className="text-xl font-bold text-gray-800">
                  {formatCurrency(calculateAnnualValue(serie.valor_mensal_sem_material))}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground border-t pt-4">
            <div>
              <label className="text-sm font-medium">Criado em</label>
              <p>{new Date(serie.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Atualizado em</label>
              <p>{new Date(serie.updated_at).toLocaleDateString('pt-BR')}</p>
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

export default SeriesManagement