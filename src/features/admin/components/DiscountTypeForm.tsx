import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { 
  useCreateDiscountType, 
  useUpdateDiscountType 
} from '@/features/admin/hooks/useDiscountTypes'
import { toast } from 'sonner'

const discountSchema = z.object({
  codigo: z.string()
    .min(2, 'Código deve ter pelo menos 2 caracteres')
    .max(20, 'Código deve ter no máximo 20 caracteres')
    .regex(/^[A-Z0-9_]+$/, 'Código deve conter apenas letras maiúsculas, números e underscore'),
  descricao: z.string()
    .min(5, 'Descrição deve ter pelo menos 5 caracteres')
    .max(200, 'Descrição deve ter no máximo 200 caracteres'),
  categoria: z.enum(['especial', 'regular', 'negociacao']),
  eh_variavel: z.boolean(),
  percentual_fixo: z.number()
    .min(0, 'Percentual deve ser maior ou igual a 0')
    .max(100, 'Percentual deve ser menor ou igual a 100')
    .optional()
    .nullable(),
  nivel_aprovacao_requerido: z.enum(['AUTOMATICA', 'COORDENACAO', 'DIRECAO']),
  documentos_necessarios: z.array(z.string().min(1, 'Documento não pode estar vazio')),
  ativo: z.boolean().default(true),
}).refine((data) => {
  // Se não é variável, percentual_fixo é obrigatório
  if (!data.eh_variavel && (!data.percentual_fixo || data.percentual_fixo <= 0)) {
    return false
  }
  // Se é variável, percentual_fixo deve ser null
  if (data.eh_variavel && data.percentual_fixo !== null) {
    return false
  }
  return true
}, {
  message: "Para desconto fixo, o percentual é obrigatório. Para desconto variável, o percentual deve estar vazio.",
  path: ["percentual_fixo"]
})

type DiscountFormData = z.infer<typeof discountSchema>

interface DiscountTypeFormProps {
  discount?: any
  onClose: () => void
}

export const DiscountTypeForm = ({ discount, onClose }: DiscountTypeFormProps) => {
  const [newDocument, setNewDocument] = useState('')
  const isEditing = !!discount

  const createMutation = useCreateDiscountType()
  const updateMutation = useUpdateDiscountType()

  const form = useForm<DiscountFormData>({
    resolver: zodResolver(discountSchema),
    defaultValues: {
      codigo: '',
      descricao: '',
      categoria: 'regular',
      eh_variavel: false,
      percentual_fixo: null,
      nivel_aprovacao_requerido: 'AUTOMATICA',
      documentos_necessarios: [],
      ativo: true,
    },
  })

  // Preencher form se estiver editando
  useEffect(() => {
    if (discount) {
      form.reset({
        codigo: discount.codigo,
        descricao: discount.descricao,
        categoria: discount.categoria || 'regular',
        eh_variavel: discount.eh_variavel,
        percentual_fixo: discount.percentual_fixo,
        nivel_aprovacao_requerido: discount.nivel_aprovacao_requerido,
        documentos_necessarios: discount.documentos_necessarios || [],
        ativo: discount.ativo,
      })
    }
  }, [discount, form])

  // Resetar percentual quando mudar tipo
  const isVariable = form.watch('eh_variavel')
  useEffect(() => {
    if (isVariable) {
      form.setValue('percentual_fixo', null)
    } else {
      if (form.getValues('percentual_fixo') === null) {
        form.setValue('percentual_fixo', 10) // valor padrão
      }
    }
  }, [isVariable, form])

  const onSubmit = async (data: DiscountFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: discount.id,
          ...data,
        })
        toast.success('Tipo de desconto atualizado com sucesso!')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Tipo de desconto criado com sucesso!')
      }
      onClose()
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar tipo de desconto' : 'Erro ao criar tipo de desconto')
      console.error('Erro no formulário:', error)
    }
  }

  const addDocument = () => {
    if (newDocument.trim()) {
      const currentDocs = form.getValues('documentos_necessarios')
      form.setValue('documentos_necessarios', [...currentDocs, newDocument.trim()])
      setNewDocument('')
    }
  }

  const removeDocument = (index: number) => {
    const currentDocs = form.getValues('documentos_necessarios')
    form.setValue('documentos_necessarios', currentDocs.filter((_, i) => i !== index))
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Tipo de Desconto' : 'Novo Tipo de Desconto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Altere as informações do tipo de desconto abaixo.'
              : 'Preencha as informações para criar um novo tipo de desconto.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Código e Status */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="codigo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Ex: IIR, RES, PASS" 
                        {...field} 
                        className="font-mono"
                        disabled={isEditing} // Não permitir alterar código em edição
                      />
                    </FormControl>
                    <FormDescription>
                      {isEditing ? 'Código não pode ser alterado' : 'Apenas letras maiúsculas, números e _'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Status</FormLabel>
                      <FormDescription>
                        Desconto ativo no sistema
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Descrição */}
            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Alunos Irmãos Carnal - 10%" 
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Descrição clara do tipo de desconto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoria */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="regular">
                        <div className="flex items-center space-x-2">
                          <span>📋</span>
                          <div>
                            <span className="font-medium">Regular</span>
                            <p className="text-xs text-muted-foreground">Irmãos, pagamento à vista, outras cidades</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="especial">
                        <div className="flex items-center space-x-2">
                          <span>⭐</span>
                          <div>
                            <span className="font-medium">Especial</span>
                            <p className="text-xs text-muted-foreground">Bolsas filantropia, filhos de funcionários</p>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="negociacao">
                        <div className="flex items-center space-x-2">
                          <span>🤝</span>
                          <div>
                            <span className="font-medium">Negociação</span>
                            <p className="text-xs text-muted-foreground">Comerciais, CEP, adimplência</p>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Categoria que define o tipo de desconto para organização
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo de Desconto */}
            <FormField
              control={form.control}
              name="eh_variavel"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Tipo de Desconto</FormLabel>
                    <FormDescription>
                      {field.value ? 'Percentual definido na aplicação' : 'Percentual fixo predefinido'}
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Percentual (apenas se não for variável) */}
            {!isVariable && (
              <FormField
                control={form.control}
                name="percentual_fixo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Percentual de Desconto *</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="10"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            field.onChange(value === '' ? null : parseFloat(value))
                          }}
                        />
                        <span className="text-muted-foreground">%</span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Percentual de desconto de 0 a 100%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Nível de Aprovação */}
            <FormField
              control={form.control}
              name="nivel_aprovacao_requerido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Aprovação *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível de aprovação" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="AUTOMATICA">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-green-100 text-green-800">Automática</Badge>
                          <span>≤ 20%</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="COORDENACAO">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-yellow-100 text-yellow-800">Coordenação</Badge>
                          <span>21-50%</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="DIRECAO">
                        <div className="flex items-center space-x-2">
                          <Badge className="bg-red-100 text-red-800">Direção</Badge>
                          <span>&gt; 50% ou especiais</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Define quem pode aprovar este tipo de desconto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Documentos Necessários */}
            <FormField
              control={form.control}
              name="documentos_necessarios"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Documentos Necessários</FormLabel>
                  <div className="space-y-3">
                    {/* Lista de documentos */}
                    {field.value.length > 0 && (
                      <div className="space-y-2">
                        {field.value.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between bg-muted p-2 rounded">
                            <span className="text-sm">{doc}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDocument(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Adicionar novo documento */}
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Ex: Comprovante de renda familiar"
                        value={newDocument}
                        onChange={(e) => setNewDocument(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            addDocument()
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addDocument}
                        disabled={!newDocument.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <FormDescription>
                    Documentos obrigatórios para aplicar este desconto
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={form.handleSubmit(onSubmit)} 
            disabled={isPending}
          >
            {isPending 
              ? (isEditing ? 'Atualizando...' : 'Criando...') 
              : (isEditing ? 'Atualizar' : 'Criar')
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}