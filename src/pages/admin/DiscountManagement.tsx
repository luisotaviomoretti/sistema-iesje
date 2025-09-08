import { useState, useEffect } from 'react'
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
  Power,
  PowerOff,
  FileText,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X
} from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  useDiscountTypes, 
  useDeleteDiscountType, 
  useActivateDiscountType 
} from '@/features/admin/hooks/useDiscountTypes'
import { useAdminPermissions } from '@/features/admin/hooks/useAdminAuth'
import { DiscountTypeForm } from '@/features/admin/components/DiscountTypeForm'
import { DocumentsManager } from '@/features/admin/components/DocumentsManager'

// Tipos para ordenação
type SortField = 'codigo' | 'descricao' | 'categoria' | 'percentual_fixo' | 'nivel_aprovacao_requerido' | 'ativo'
type SortDirection = 'asc' | 'desc'

const DiscountManagement = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [sortField, setSortField] = useState<SortField>('codigo')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showForm, setShowForm] = useState(false)
  const [editingDiscount, setEditingDiscount] = useState(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [discountToDelete, setDiscountToDelete] = useState(null)
  const [viewingDiscount, setViewingDiscount] = useState(null)
  const [managingDocuments, setManagingDocuments] = useState(null)

  const { permissions } = useAdminPermissions()
  const { data: discountTypes, isLoading } = useDiscountTypes(true) // incluir inativos
  const deleteMutation = useDeleteDiscountType()
  const activateMutation = useActivateDiscountType()

  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K para focar no campo de busca
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement
        searchInput?.focus()
      }
      // Escape para limpar filtros
      if (e.key === 'Escape') {
        setSearchTerm('')
        setSelectedCategory('todas')
      }
      // Ctrl+N para novo desconto
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && permissions.canManageDiscounts) {
        e.preventDefault()
        setShowForm(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [permissions.canManageDiscounts])

  // Função para lidar com ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Filtrar e ordenar tipos de desconto
  const filteredAndSortedDiscounts = discountTypes?.filter(discount => {
    const matchesSearch = discount.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         discount.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'todas' || discount.categoria === selectedCategory
    return matchesSearch && matchesCategory
  }).sort((a, b) => {
    let aValue: any = a[sortField]
    let bValue: any = b[sortField]
    
    // Tratamento especial para diferentes tipos de dados
    if (sortField === 'percentual_fixo') {
      aValue = a.eh_variavel ? -1 : (a.percentual_fixo || 0)
      bValue = b.eh_variavel ? -1 : (b.percentual_fixo || 0)
    } else if (sortField === 'ativo') {
      aValue = a.ativo ? 1 : 0
      bValue = b.ativo ? 1 : 0
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = bValue.toLowerCase()
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
    return 0
  }) || []

  const handleEdit = (discount) => {
    setEditingDiscount(discount)
    setShowForm(true)
  }

  const handleView = (discount) => {
    setViewingDiscount(discount)
  }

  const handleDelete = (discount) => {
    setDiscountToDelete(discount)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (discountToDelete) {
      await deleteMutation.mutateAsync(discountToDelete.id)
      setDeleteDialogOpen(false)
      setDiscountToDelete(null)
    }
  }

  const handleToggleActive = async (discount) => {
    if (discount.ativo) {
      await deleteMutation.mutateAsync(discount.id)
    } else {
      await activateMutation.mutateAsync(discount.id)
    }
  }

  const formatApprovalLevel = (level) => {
    switch (level) {
      case 'AUTOMATICA': return { text: 'Automática', color: 'bg-green-100 text-green-800' }
      case 'COORDENACAO': return { text: 'Coordenação', color: 'bg-yellow-100 text-yellow-800' }
      case 'DIRECAO': return { text: 'Direção', color: 'bg-red-100 text-red-800' }
      default: return { text: level, color: 'bg-gray-100 text-gray-800' }
    }
  }

  // Função para formatar categoria
  const formatCategory = (categoria) => {
    switch (categoria) {
      case 'especial': return { text: 'Especial', color: 'bg-purple-100 text-purple-800', icon: '⭐' }
      case 'regular': return { text: 'Regular', color: 'bg-blue-100 text-blue-800', icon: '📋' }
      case 'negociacao': return { text: 'Negociação', color: 'bg-orange-100 text-orange-800', icon: '🤝' }
      default: return { text: categoria, color: 'bg-gray-100 text-gray-800', icon: '❓' }
    }
  }

  // Componente para cabeçalho de coluna ordenável
  const SortableHeader = ({ field, children, className = '' }: { 
    field: SortField
    children: React.ReactNode
    className?: string 
  }) => {
    const isActive = sortField === field
    const Icon = !isActive ? ArrowUpDown : sortDirection === 'asc' ? ArrowUp : ArrowDown
    const sortText = !isActive ? 'Clique para ordenar' : 
      `Ordenado ${sortDirection === 'asc' ? 'crescente' : 'decrescente'}. Clique para ${sortDirection === 'asc' ? 'decrescente' : 'crescente'}`
    
    return (
      <TableHead 
        className={`cursor-pointer hover:bg-muted/50 transition-colors select-none ${className}`}
        onClick={() => handleSort(field)}
        title={sortText}
      >
        <div className="flex items-center space-x-1 group">
          <span>{children}</span>
          <Icon className={`h-4 w-4 transition-colors ${
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          }`} />
        </div>
      </TableHead>
    )
  }

  // Estatísticas por categoria
  const categoryStats = discountTypes?.reduce((acc, discount) => {
    const categoria = discount.categoria || 'indefinido'
    acc[categoria] = (acc[categoria] || 0) + 1
    return acc
  }, {}) || {}

  // Componente de loading para a tabela
  const TableSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-10 w-48 bg-muted rounded animate-pulse" />
      </div>
      
      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-4 w-4 bg-muted rounded animate-pulse" />
                <div className="ml-2 space-y-1">
                  <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  <div className="h-8 w-12 bg-muted rounded animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Table skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  if (isLoading) {
    return <TableSkeleton />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tipos de Desconto</h1>
          <p className="text-muted-foreground">
            Gerencie todos os tipos de desconto disponíveis no sistema
          </p>
        </div>
        {permissions.canManageDiscounts && (
          <div className="flex items-center space-x-2">
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tipo de Desconto
              <kbd className="ml-2 inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-70">
                Ctrl+N
              </kbd>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Total</p>
                <p className="text-2xl font-bold">{discountTypes?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <span className="text-lg">⭐</span>
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Especiais</p>
                <p className="text-2xl font-bold text-purple-600">
                  {categoryStats.especial || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <span className="text-lg">📋</span>
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Regulares</p>
                <p className="text-2xl font-bold text-blue-600">
                  {categoryStats.regular || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <span className="text-lg">🤝</span>
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Negociação</p>
                <p className="text-2xl font-bold text-orange-600">
                  {categoryStats.negociacao || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Power className="h-4 w-4 text-green-600" />
              <div className="ml-2">
                <p className="text-sm font-medium leading-none">Ativos</p>
                <p className="text-2xl font-bold text-green-600">
                  {discountTypes?.filter(d => d.ativo).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <div className="relative flex-1 max-w-sm">
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-8"
                />
                {searchTerm && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchTerm('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                <kbd className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  Ctrl+K
                </kbd>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">
                    <span>Todas as categorias</span>
                  </SelectItem>
                  <SelectItem value="especial">
                    <div className="flex items-center space-x-2">
                      <span>⭐</span>
                      <span>Especial</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="regular">
                    <div className="flex items-center space-x-2">
                      <span>📋</span>
                      <span>Regular</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="negociacao">
                    <div className="flex items-center space-x-2">
                      <span>🤝</span>
                      <span>Negociação</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>
                {filteredAndSortedDiscounts.length} tipo(s) de desconto encontrado(s)
              </CardTitle>
              {(searchTerm || selectedCategory !== 'todas') && (
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <span>Filtros aplicados:</span>
                  {searchTerm && (
                    <Badge variant="secondary" className="text-xs">
                      Busca: {searchTerm}
                    </Badge>
                  )}
                  {selectedCategory !== 'todas' && (
                    <Badge variant="secondary" className="text-xs">
                      Categoria: {selectedCategory}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>Ordenado por:</span>
                <Badge variant="outline" className="text-xs">
                  {sortField === 'codigo' ? 'Código' :
                   sortField === 'descricao' ? 'Descrição' :
                   sortField === 'categoria' ? 'Categoria' :
                   sortField === 'percentual_fixo' ? 'Percentual' :
                   sortField === 'nivel_aprovacao_requerido' ? 'Aprovação' :
                   sortField === 'ativo' ? 'Status' : sortField}
                  <span className="ml-1">
                    ({sortDirection === 'asc' ? '↑' : '↓'})
                  </span>
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader field="codigo">Código</SortableHeader>
                <SortableHeader field="descricao">Descrição</SortableHeader>
                <SortableHeader field="categoria">Categoria</SortableHeader>
                <SortableHeader field="percentual_fixo">Percentual</SortableHeader>
                <SortableHeader field="nivel_aprovacao_requerido">Aprovação</SortableHeader>
                <SortableHeader field="ativo">Status</SortableHeader>
                <TableHead>Documentos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedDiscounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <Search className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchTerm || selectedCategory !== 'todas' ? 
                          'Nenhum tipo de desconto encontrado para os filtros aplicados.' : 
                          'Nenhum tipo de desconto cadastrado.'
                        }
                      </p>
                      {(searchTerm || selectedCategory !== 'todas') && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSearchTerm('')
                            setSelectedCategory('todas')
                          }}
                        >
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedDiscounts.map((discount) => {
                const approval = formatApprovalLevel(discount.nivel_aprovacao_requerido)
                const category = formatCategory(discount.categoria)
                return (
                  <TableRow 
                    key={discount.id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer group"
                    onClick={() => handleView(discount)}
                  >
                    <TableCell className="font-mono font-medium">
                      {discount.codigo}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        <p className="font-medium truncate">{discount.descricao}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={category.color}>
                        <span className="mr-1">{category.icon}</span>
                        {category.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {discount.eh_variavel ? (
                        <Badge variant="outline">Variável</Badge>
                      ) : (
                        <span className="font-medium">{discount.percentual_fixo}%</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={approval.color}>
                        {approval.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={discount.ativo ? "default" : "secondary"}>
                        {discount.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setManagingDocuments(discount)
                        }}
                        className="text-sm"
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Documentos
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleView(discount)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          {permissions.canManageDiscounts && (
                            <>
                              <DropdownMenuItem onClick={() => handleEdit(discount)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleActive(discount)}
                              >
                                {discount.ativo ? (
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
                )
              }))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <DiscountTypeForm
          discount={editingDiscount}
          onClose={() => {
            setShowForm(false)
            setEditingDiscount(null)
          }}
        />
      )}

      {/* View Dialog */}
      {viewingDiscount && (
        <ViewDiscountDialog
          discount={viewingDiscount}
          onClose={() => setViewingDiscount(null)}
        />
      )}

      {/* Documents Manager */}
      {managingDocuments && (
        <DocumentsManager
          discountId={managingDocuments.id}
          discountCode={managingDocuments.codigo}
          discountName={managingDocuments.descricao}
          onClose={() => setManagingDocuments(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar Tipo de Desconto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desativar o tipo de desconto "{discountToDelete?.codigo}"?
              <br />
              <br />
              Ele não aparecerá mais no sistema de matrículas, mas os descontos já aplicados permanecerão.
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

// Component for viewing discount details
const ViewDiscountDialog = ({ discount, onClose }) => {
  const formatCategory = (categoria) => {
    switch (categoria) {
      case 'especial': return { text: 'Especial', color: 'bg-purple-100 text-purple-800', icon: '⭐' }
      case 'regular': return { text: 'Regular', color: 'bg-blue-100 text-blue-800', icon: '📋' }
      case 'negociacao': return { text: 'Negociação', color: 'bg-orange-100 text-orange-800', icon: '🤝' }
      default: return { text: categoria, color: 'bg-gray-100 text-gray-800', icon: '❓' }
    }
  }
  
  const category = formatCategory(discount.categoria)
  
  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Detalhes do Tipo de Desconto</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Código</label>
              <p className="font-mono text-lg">{discount.codigo}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <div>
                <Badge className={category.color}>
                  <span className="mr-1">{category.icon}</span>
                  {category.text}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <div>
                <Badge variant={discount.ativo ? "default" : "secondary"}>
                  {discount.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Descrição</label>
            <p>{discount.descricao}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <p>{discount.eh_variavel ? 'Percentual Variável' : 'Percentual Fixo'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Percentual</label>
              <p>{discount.eh_variavel ? 'Definido na aplicação' : `${discount.percentual_fixo}%`}</p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Nível de Aprovação</label>
            <p>{discount.nivel_aprovacao_requerido}</p>
          </div>

          <div>
            <label className="text-sm font-medium">Documentos Necessários</label>
            {discount.documentos_necessarios.length > 0 ? (
              <ul className="list-disc list-inside space-y-1 mt-2">
                {discount.documentos_necessarios.map((doc, index) => (
                  <li key={index} className="text-sm">{doc}</li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nenhum documento necessário</p>
            )}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Fechar</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DiscountManagement