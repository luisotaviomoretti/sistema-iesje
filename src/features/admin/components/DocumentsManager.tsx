import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { 
  FileText,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  GripVertical,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileUp,
  Image,
  File
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// Types
interface DiscountDocument {
  id: string
  discount_id: string
  document_name: string
  document_description: string
  is_required: boolean
  accepted_formats: string[]
  max_size_mb: number
  display_order: number
  is_active: boolean
  show_in_enrollment: boolean
  created_at?: string
  updated_at?: string
}

interface DocumentForm {
  document_name: string
  document_description: string
  is_required: boolean
  accepted_formats: string[]
  max_size_mb: number
  is_active: boolean
  show_in_enrollment: boolean
}

// Sortable Row Component
const SortableRow = ({ document, onEdit, onDelete }: { 
  document: DiscountDocument
  onEdit: (doc: DiscountDocument) => void
  onDelete: (doc: DiscountDocument) => void 
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: document.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getFormatIcon = (formats: string[]) => {
    if (formats.includes('PDF')) return <File className="w-4 h-4 text-red-500" />
    if (formats.some(f => ['JPG', 'PNG', 'JPEG'].includes(f))) return <Image className="w-4 h-4 text-blue-500" />
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted' : ''}>
      <TableCell className="w-10">
        <button
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {getFormatIcon(document.accepted_formats)}
          <div>
            <p className="font-medium">{document.document_name}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {document.document_description}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {document.accepted_formats.map(format => (
            <Badge key={format} variant="secondary" className="text-xs">
              {format}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-center">
        {document.max_size_mb}MB
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          {document.is_required ? (
            <Badge className="bg-red-100 text-red-800">Obrigatório</Badge>
          ) : (
            <Badge variant="outline">Opcional</Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          {document.is_active ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-gray-400" />
          )}
          {document.show_in_enrollment ? (
            <Eye className="w-4 h-4 text-blue-600" />
          ) : (
            <EyeOff className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(document)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(document)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

// Main Component
export const DocumentsManager = ({ 
  discountId, 
  discountCode,
  discountName,
  onClose 
}: { 
  discountId: string
  discountCode: string
  discountName: string
  onClose: () => void 
}) => {
  const queryClient = useQueryClient()
  const [documents, setDocuments] = useState<DiscountDocument[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingDocument, setEditingDocument] = useState<DiscountDocument | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<DiscountDocument | null>(null)
  
  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Fetch documents
  const { data, isLoading, error } = useQuery({
    queryKey: ['discount-documents-admin', discountId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discount_documents')
        .select('*')
        .eq('discount_id', discountId)
        .order('display_order')

      if (error) throw error
      return data as DiscountDocument[]
    }
  })

  useEffect(() => {
    if (data) {
      setDocuments(data)
    }
  }, [data])

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (formData: DocumentForm & { id?: string }) => {
      if (formData.id) {
        // Update
        const { error } = await supabase
          .from('discount_documents')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', formData.id)
        
        if (error) throw error
        return { type: 'update' }
      } else {
        // Create
        const maxOrder = documents.length > 0 
          ? Math.max(...documents.map(d => d.display_order)) 
          : 0
          
        const { error } = await supabase
          .from('discount_documents')
          .insert({
            discount_id: discountId,
            ...formData,
            display_order: maxOrder + 1
          })
        
        if (error) throw error
        return { type: 'create' }
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['discount-documents-admin', discountId])
      queryClient.invalidateQueries(['discount-documents']) // Invalidate frontend cache too
      toast.success(result.type === 'create' ? 'Documento adicionado!' : 'Documento atualizado!')
      setShowForm(false)
      setEditingDocument(null)
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar documento: ' + error.message)
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('discount_documents')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-documents-admin', discountId])
      queryClient.invalidateQueries(['discount-documents'])
      toast.success('Documento removido!')
      setDeleteConfirm(null)
    },
    onError: (error: any) => {
      toast.error('Erro ao remover documento: ' + error.message)
    }
  })

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (orderedDocs: DiscountDocument[]) => {
      const updates = orderedDocs.map((doc, index) => ({
        id: doc.id,
        display_order: index + 1
      }))

      const { error } = await supabase
        .rpc('batch_update_document_order', {
          updates: updates
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['discount-documents-admin', discountId])
      queryClient.invalidateQueries(['discount-documents'])
      toast.success('Ordem atualizada!')
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar ordem: ' + error.message)
    }
  })

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = documents.findIndex(doc => doc.id === active.id)
      const newIndex = documents.findIndex(doc => doc.id === over?.id)
      
      const newOrder = arrayMove(documents, oldIndex, newIndex)
      setDocuments(newOrder)
      updateOrderMutation.mutate(newOrder)
    }
  }

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (error) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao carregar documentos: {error.message}
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Gerenciar Documentos</DialogTitle>
            <DialogDescription>
              Configuração de documentos para o desconto <strong>{discountCode}</strong> - {discountName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{documents.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Obrigatórios</p>
                      <p className="text-2xl font-bold text-red-600">
                        {documents.filter(d => d.is_required).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ativos</p>
                      <p className="text-2xl font-bold text-green-600">
                        {documents.filter(d => d.is_active).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Visíveis</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {documents.filter(d => d.show_in_enrollment).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Arraste os itens para reorganizar a ordem de exibição
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Documento
              </Button>
            </div>

            {/* Documents Table */}
            {documents.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-3">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Nenhum documento configurado para este desconto
                    </p>
                    <Button onClick={() => setShowForm(true)} variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Primeiro Documento
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Formatos</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={documents.map(d => d.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {documents.map(document => (
                          <SortableRow
                            key={document.id}
                            document={document}
                            onEdit={(doc) => {
                              setEditingDocument(doc)
                              setShowForm(true)
                            }}
                            onDelete={(doc) => setDeleteConfirm(doc)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Form Dialog */}
      {showForm && (
        <DocumentFormDialog
          document={editingDocument}
          onSave={(data) => {
            saveMutation.mutate({
              ...data,
              id: editingDocument?.id
            })
          }}
          onClose={() => {
            setShowForm(false)
            setEditingDocument(null)
          }}
          isLoading={saveMutation.isPending}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o documento "{deleteConfirm?.document_name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Document Form Dialog Component
const DocumentFormDialog = ({ 
  document, 
  onSave, 
  onClose, 
  isLoading 
}: {
  document: DiscountDocument | null
  onSave: (data: DocumentForm) => void
  onClose: () => void
  isLoading: boolean
}) => {
  const [formData, setFormData] = useState<DocumentForm>({
    document_name: document?.document_name || '',
    document_description: document?.document_description || '',
    is_required: document?.is_required || true,
    accepted_formats: document?.accepted_formats || ['PDF', 'JPG', 'PNG'],
    max_size_mb: document?.max_size_mb || 5,
    is_active: document?.is_active ?? true,
    show_in_enrollment: document?.show_in_enrollment ?? true
  })

  const availableFormats = ['PDF', 'JPG', 'JPEG', 'PNG', 'DOC', 'DOCX', 'XLS', 'XLSX']

  const toggleFormat = (format: string) => {
    setFormData(prev => ({
      ...prev,
      accepted_formats: prev.accepted_formats.includes(format)
        ? prev.accepted_formats.filter(f => f !== format)
        : [...prev.accepted_formats, format]
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.document_name.trim()) {
      toast.error('Nome do documento é obrigatório')
      return
    }
    
    if (formData.accepted_formats.length === 0) {
      toast.error('Selecione pelo menos um formato aceito')
      return
    }
    
    onSave(formData)
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {document ? 'Editar Documento' : 'Novo Documento'}
          </DialogTitle>
          <DialogDescription>
            Configure os detalhes do documento necessário
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Documento *</Label>
            <Input
              id="name"
              value={formData.document_name}
              onChange={(e) => setFormData({ ...formData, document_name: e.target.value })}
              placeholder="Ex: Comprovante de Matrícula do Irmão"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.document_description}
              onChange={(e) => setFormData({ ...formData, document_description: e.target.value })}
              placeholder="Descreva o documento e quando ele é necessário..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="size">Tamanho Máximo (MB)</Label>
              <Input
                id="size"
                type="number"
                min="1"
                max="50"
                value={formData.max_size_mb}
                onChange={(e) => setFormData({ ...formData, max_size_mb: parseInt(e.target.value) || 5 })}
              />
            </div>

            <div className="space-y-2">
              <Label>Formatos Aceitos</Label>
              <div className="flex flex-wrap gap-2">
                {availableFormats.map(format => (
                  <Badge
                    key={format}
                    variant={formData.accepted_formats.includes(format) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleFormat(format)}
                  >
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="required">Documento Obrigatório</Label>
                <p className="text-xs text-muted-foreground">
                  Torna este documento obrigatório para o desconto
                </p>
              </div>
              <Switch
                id="required"
                checked={formData.is_required}
                onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="active">Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Documento está ativo no sistema
                </p>
              </div>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enrollment">Visível na Matrícula</Label>
                <p className="text-xs text-muted-foreground">
                  Exibir este documento no fluxo de matrícula
                </p>
              </div>
              <Switch
                id="enrollment"
                checked={formData.show_in_enrollment}
                onCheckedChange={(checked) => setFormData({ ...formData, show_in_enrollment: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentsManager