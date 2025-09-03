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
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calculator, DollarSign } from 'lucide-react'
import { 
  useCreateSerie, 
  useUpdateSerie,
  formatCurrency,
  calculateAnnualValue,
  ESCOLAS,
  getEscolaColor,
  type Serie
} from '@/features/admin/hooks/useSeries'
import { toast } from 'sonner'

const serieSchema = z.object({
  nome: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  ano_serie: z.string()
    .min(1, 'Ano/Série é obrigatório')
    .max(50, 'Ano/Série deve ter no máximo 50 caracteres'),
  valor_mensal_com_material: z.number()
    .min(0, 'Valor deve ser maior ou igual a 0')
    .max(999999.99, 'Valor muito alto'),
  valor_material: z.number()
    .min(0, 'Valor deve ser maior ou igual a 0')
    .max(999999.99, 'Valor muito alto'),
  valor_mensal_sem_material: z.number()
    .min(0, 'Valor deve ser maior ou igual a 0')
    .max(999999.99, 'Valor muito alto'),
  ordem: z.number()
    .min(1, 'Ordem deve ser maior que 0')
    .max(99, 'Ordem deve ser menor que 100'),
  escola: z.enum(['Sete de Setembro', 'Pelicano']),
  ativo: z.boolean().default(true),
}).refine((data) => {
  // Validar se valor mensal com material é maior que sem material
  return data.valor_mensal_com_material >= data.valor_mensal_sem_material
}, {
  message: "Valor com material deve ser maior ou igual ao valor sem material",
  path: ["valor_mensal_com_material"]
}).refine((data) => {
  // Validar se a diferença entre com e sem material é próxima ao valor do material
  const diferenca = data.valor_mensal_com_material - data.valor_mensal_sem_material
  const tolerancia = data.valor_material * 0.1 // 10% de tolerância
  return Math.abs(diferenca - data.valor_material) <= tolerancia
}, {
  message: "A diferença entre os valores mensais deve ser aproximadamente igual ao valor do material",
  path: ["valor_material"]
})

type SerieFormData = z.infer<typeof serieSchema>

interface SerieFormProps {
  serie?: Serie | null
  onClose: () => void
}

export const SerieForm = ({ serie, onClose }: SerieFormProps) => {
  const isEditing = !!serie

  const createMutation = useCreateSerie()
  const updateMutation = useUpdateSerie()

  const form = useForm<SerieFormData>({
    resolver: zodResolver(serieSchema),
    defaultValues: {
      nome: '',
      ano_serie: '',
      valor_mensal_com_material: 0,
      valor_material: 0,
      valor_mensal_sem_material: 0,
      ordem: 1,
      escola: 'Sete de Setembro',
      ativo: true,
    },
  })

  // Preencher form se estiver editando
  useEffect(() => {
    if (serie) {
      form.reset({
        nome: serie.nome,
        ano_serie: serie.ano_serie,
        valor_mensal_com_material: serie.valor_mensal_com_material,
        valor_material: serie.valor_material,
        valor_mensal_sem_material: serie.valor_mensal_sem_material,
        ordem: serie.ordem,
        escola: serie.escola,
        ativo: serie.ativo,
      })
    }
  }, [serie, form])

  // Watches para cálculo automático
  const valorComMaterial = form.watch('valor_mensal_com_material')
  const valorMaterial = form.watch('valor_material')
  const valorSemMaterial = form.watch('valor_mensal_sem_material')

  // Auto-calcular valor sem material quando os outros valores mudarem
  useEffect(() => {
    if (valorComMaterial > 0 && valorMaterial > 0) {
      const calculatedValue = valorComMaterial - valorMaterial
      if (calculatedValue >= 0 && calculatedValue !== valorSemMaterial) {
        form.setValue('valor_mensal_sem_material', calculatedValue, { shouldValidate: true })
      }
    }
  }, [valorComMaterial, valorMaterial, form])

  const onSubmit = async (data: SerieFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: serie!.id,
          ...data,
        })
        toast.success('Série atualizada com sucesso!')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Série criada com sucesso!')
      }
      onClose()
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar série' : 'Erro ao criar série')
      console.error('Erro no formulário:', error)
    }
  }

  const formatInputValue = (value: number): string => {
    return value ? value.toFixed(2) : ''
  }

  const parseInputValue = (value: string): number => {
    const parsed = parseFloat(value.replace(',', '.'))
    return isNaN(parsed) ? 0 : parsed
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Série' : 'Nova Série'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Altere as informações da série abaixo.'
              : 'Preencha as informações para criar uma nova série.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informações Básicas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4" />
                    <span>Informações Básicas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Série *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: 1º Ano Fundamental, 6ª Série" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Nome descritivo da série
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ano_serie"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ano/Série *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ex: 1º Ano, 6ª Série" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Código ou identificação oficial da série
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ordem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ordem *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="99"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value
                              field.onChange(value === '' ? 1 : parseInt(value))
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Ordem de exibição (1 = primeiro)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="escola"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Escola *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a escola" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormDescription>
                          Escola à qual esta série pertence
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
                            Série ativa no sistema
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
                </CardContent>
              </Card>

              {/* Valores Mensais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <span>Valores Mensais</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="valor_mensal_com_material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Mensal c/ Material *</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0,00"
                              {...field}
                              value={formatInputValue(field.value)}
                              onChange={(e) => {
                                field.onChange(parseInputValue(e.target.value))
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor_material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor do Material *</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0,00"
                              {...field}
                              value={formatInputValue(field.value)}
                              onChange={(e) => {
                                field.onChange(parseInputValue(e.target.value))
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Valor cobrado pelo material escolar
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="valor_mensal_sem_material"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Mensal s/ Material *</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <span className="text-muted-foreground">R$</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0,00"
                              {...field}
                              value={formatInputValue(field.value)}
                              onChange={(e) => {
                                field.onChange(parseInputValue(e.target.value))
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormDescription>
                          Calculado automaticamente: Com material - Material
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Resumo Anual */}
            {(valorComMaterial > 0 || valorSemMaterial > 0) && (
              <Card className="bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo Anual (x12 meses)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-100 rounded-lg">
                      <p className="text-sm font-medium text-green-700">Com Material</p>
                      <p className="text-2xl font-bold text-green-800">
                        {formatCurrency(calculateAnnualValue(valorComMaterial))}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-100 rounded-lg">
                      <p className="text-sm font-medium text-blue-700">Só Material</p>
                      <p className="text-2xl font-bold text-blue-800">
                        {formatCurrency(calculateAnnualValue(valorMaterial))}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-gray-100 rounded-lg">
                      <p className="text-sm font-medium text-gray-700">Sem Material</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {formatCurrency(calculateAnnualValue(valorSemMaterial))}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded text-center">
                    <p className="text-sm text-blue-700">
                      <strong>Economia anual sem material:</strong> {' '}
                      {formatCurrency(calculateAnnualValue(valorComMaterial) - calculateAnnualValue(valorSemMaterial))}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
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