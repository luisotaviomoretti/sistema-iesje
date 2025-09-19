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
import { usePublicSystemConfig } from '@/features/admin/hooks/useSystemConfigs'

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
  // Campos anuais (opcionais durante a transição)
  valor_anual_com_material: z.number().min(0, 'Valor anual inválido').max(99999999.99, 'Valor muito alto').optional(),
  valor_anual_material: z.number().min(0, 'Valor anual inválido').max(99999999.99, 'Valor muito alto').optional(),
  valor_anual_sem_material: z.number().min(0, 'Valor anual inválido').max(99999999.99, 'Valor muito alto').optional(),
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
      valor_anual_com_material: undefined,
      valor_anual_material: undefined,
      valor_anual_sem_material: undefined,
      ordem: 1,
      escola: 'Sete de Setembro',
      ativo: true,
    },
  })

  // Flags públicas — Séries: Valores Anuais
  const { data: seriesAnnualEnabledPublic } = usePublicSystemConfig('series.annual_values.enabled')
  const { data: seriesAnnualModePublic } = usePublicSystemConfig('series.annual_values.input_mode')
  const [seriesAnnualEnabled, setSeriesAnnualEnabled] = useState(false)
  const [seriesAnnualMode, setSeriesAnnualMode] = useState<'annual' | 'monthly'>('monthly')

  useEffect(() => {
    if (seriesAnnualEnabledPublic != null) {
      const v = String(seriesAnnualEnabledPublic).trim().toLowerCase()
      setSeriesAnnualEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [seriesAnnualEnabledPublic])
  useEffect(() => {
    if (seriesAnnualModePublic != null) {
      const s = String(seriesAnnualModePublic).trim().toLowerCase()
      setSeriesAnnualMode(s === 'annual' ? 'annual' : 'monthly')
    }
  }, [seriesAnnualModePublic])

  // Utilitário de arredondamento half-up para 2 casas
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

  // Preencher form se estiver editando
  useEffect(() => {
    if (serie) {
      form.reset({
        nome: serie.nome,
        ano_serie: serie.ano_serie,
        valor_mensal_com_material: serie.valor_mensal_com_material,
        valor_material: serie.valor_material,
        valor_mensal_sem_material: serie.valor_mensal_sem_material,
        valor_anual_com_material: typeof serie.valor_anual_com_material === 'number' ? serie.valor_anual_com_material : round2(serie.valor_mensal_com_material * 12),
        valor_anual_material: typeof serie.valor_anual_material === 'number' ? serie.valor_anual_material : round2(serie.valor_material * 12),
        valor_anual_sem_material: typeof serie.valor_anual_sem_material === 'number' ? serie.valor_anual_sem_material : round2(serie.valor_mensal_sem_material * 12),
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
  const anualCom = form.watch('valor_anual_com_material')
  const anualMaterial = form.watch('valor_anual_material')
  const anualSem = form.watch('valor_anual_sem_material')

  // Auto-calcular valor sem material quando os outros valores mudarem
  useEffect(() => {
    if (valorComMaterial > 0 && valorMaterial > 0) {
      const calculatedValue = valorComMaterial - valorMaterial
      if (calculatedValue >= 0 && calculatedValue !== valorSemMaterial) {
        form.setValue('valor_mensal_sem_material', calculatedValue, { shouldValidate: true })
      }
    }
  }, [valorComMaterial, valorMaterial, form])

  // Auto-cálculo anual sem material quando os outros mudarem (modo anual)
  useEffect(() => {
    if (seriesAnnualEnabled && seriesAnnualMode === 'annual') {
      const ac = typeof anualCom === 'number' ? anualCom : 0
      const am = typeof anualMaterial === 'number' ? anualMaterial : 0
      const calc = ac - am
      if (calc >= 0 && calc !== anualSem) {
        form.setValue('valor_anual_sem_material', calc, { shouldValidate: true })
      }
    }
  }, [seriesAnnualEnabled, seriesAnnualMode, anualCom, anualMaterial, form])

  // Em modo anual, manter campos mensais derivados dos anuais (para validação e consistência visual)
  useEffect(() => {
    if (seriesAnnualEnabled && seriesAnnualMode === 'annual') {
      const ac = typeof anualCom === 'number' ? anualCom : 0
      const am = typeof anualMaterial === 'number' ? anualMaterial : 0
      const as = typeof anualSem === 'number' ? anualSem : Math.max(0, ac - am)
      const mensalCom = round2(ac / 12)
      const mensalMat = round2(am / 12)
      const mensalSem = round2(as / 12)
      form.setValue('valor_mensal_com_material', mensalCom, { shouldValidate: true })
      form.setValue('valor_material', mensalMat, { shouldValidate: true })
      form.setValue('valor_mensal_sem_material', mensalSem, { shouldValidate: true })
    }
  }, [seriesAnnualEnabled, seriesAnnualMode, anualCom, anualMaterial, anualSem, form])

  const onSubmit = async (data: SerieFormData) => {
    try {
      // Se flag ativa e modo anual: derivar mensais a partir dos anuais
      let payload: Partial<Serie> & { id?: string }
      if (seriesAnnualEnabled && seriesAnnualMode === 'annual') {
        const annualCom = Number(data.valor_anual_com_material ?? 0)
        const annualMat = Number(data.valor_anual_material ?? 0)
        const annualSem = Number(data.valor_anual_sem_material ?? Math.max(0, annualCom - annualMat))

        const mensalCom = round2(annualCom / 12)
        const mensalMat = round2(annualMat / 12)
        const mensalSem = round2(annualSem / 12)

        payload = {
          nome: data.nome,
          ano_serie: data.ano_serie,
          valor_mensal_com_material: mensalCom,
          valor_material: mensalMat,
          valor_mensal_sem_material: mensalSem,
          valor_anual_com_material: annualCom,
          valor_anual_material: annualMat,
          valor_anual_sem_material: annualSem,
          ordem: data.ordem,
          escola: data.escola,
          ativo: data.ativo,
        }
      } else {
        // Modo legado (monthly): manter comportamento atual e preencher anuais (x12) para consistência
        const annualCom = round2(data.valor_mensal_com_material * 12)
        const annualMat = round2(data.valor_material * 12)
        const annualSem = round2(data.valor_mensal_sem_material * 12)
        payload = {
          nome: data.nome,
          ano_serie: data.ano_serie,
          valor_mensal_com_material: data.valor_mensal_com_material,
          valor_material: data.valor_material,
          valor_mensal_sem_material: data.valor_mensal_sem_material,
          valor_anual_com_material: annualCom,
          valor_anual_material: annualMat,
          valor_anual_sem_material: annualSem,
          ordem: data.ordem,
          escola: data.escola,
          ativo: data.ativo,
        }
      }

      if (isEditing) {
        await updateMutation.mutateAsync({ id: serie!.id, ...payload })
        toast.success('Série atualizada com sucesso!')
      } else {
        await createMutation.mutateAsync(payload as any)
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

              {/* Valores Mensais e/ou Anuais (gated por flag) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calculator className="h-4 w-4" />
                    <span>
                      {seriesAnnualEnabled && seriesAnnualMode === 'annual' ? 'Valores Mensais (derivados)' : 'Valores Mensais'}
                    </span>
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
                              disabled={seriesAnnualEnabled && seriesAnnualMode === 'annual'}
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
                              disabled={seriesAnnualEnabled && seriesAnnualMode === 'annual'}
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
                              disabled={seriesAnnualEnabled && seriesAnnualMode === 'annual'}
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

              {seriesAnnualEnabled && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Calculator className="h-4 w-4" />
                      <span>{seriesAnnualMode === 'annual' ? 'Valores Anuais' : 'Valores Anuais (derivados)'}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="valor_anual_com_material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Anual c/ Material</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                                value={formatInputValue(field.value as any)}
                                onChange={(e) => field.onChange(parseInputValue(e.target.value))}
                                disabled={seriesAnnualMode !== 'annual'}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_anual_material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Anual do Material</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                                value={formatInputValue(field.value as any)}
                                onChange={(e) => field.onChange(parseInputValue(e.target.value))}
                                disabled={seriesAnnualMode !== 'annual'}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valor_anual_sem_material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor Anual s/ Material</FormLabel>
                          <FormControl>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground">R$</span>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                {...field}
                                value={formatInputValue(field.value as any)}
                                onChange={(e) => field.onChange(parseInputValue(e.target.value))}
                                disabled={seriesAnnualMode !== 'annual'}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            {seriesAnnualMode === 'annual' ? 'Calculado automaticamente: Com material - Material' : 'Derivado de Mensal x12'}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              )}
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