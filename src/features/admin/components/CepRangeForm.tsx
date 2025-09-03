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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  useCreateCepRange, 
  useUpdateCepRange 
} from '@/features/admin/hooks/useCepRanges'
import { toast } from 'sonner'
import { fetchAddress, isPocosDeCaldas, autoClassifyByCidade } from '@/features/enrollment/utils/cep'

const cepRangeSchema = z.object({
  cep_inicio: z.string()
    .min(8, 'CEP deve ter 8 dígitos')
    .max(8, 'CEP deve ter 8 dígitos')
    .regex(/^[0-9]+$/, 'CEP deve conter apenas números'),
  cep_fim: z.string()
    .min(8, 'CEP deve ter 8 dígitos')
    .max(8, 'CEP deve ter 8 dígitos')
    .regex(/^[0-9]+$/, 'CEP deve conter apenas números'),
  categoria: z.enum(['fora', 'baixa', 'alta']),
  cidade: z.string().optional(),
  observacoes: z.string().optional(),
  ativo: z.boolean().default(true),
}).refine((data) => {
  // Validar se CEP início é menor que CEP fim
  const inicio = parseInt(data.cep_inicio)
  const fim = parseInt(data.cep_fim)
  return inicio <= fim
}, {
  message: "CEP inicial deve ser menor ou igual ao CEP final",
  path: ["cep_fim"]
})

type CepRangeFormData = z.infer<typeof cepRangeSchema>

interface CepRangeFormProps {
  cepRange?: any
  onClose: () => void
}

export const CepRangeForm = ({ cepRange, onClose }: CepRangeFormProps) => {
  const [cepInicioFormatted, setCepInicioFormatted] = useState('')
  const [cepFimFormatted, setCepFimFormatted] = useState('')
  const [cityInfo, setCityInfo] = useState<string>('')
  const [isValidatingCep, setIsValidatingCep] = useState(false)
  const [classificacaoDisabled, setClassificacaoDisabled] = useState(false)
  const isEditing = !!cepRange

  const createMutation = useCreateCepRange()
  const updateMutation = useUpdateCepRange()

  const form = useForm<CepRangeFormData>({
    resolver: zodResolver(cepRangeSchema),
    defaultValues: {
      cep_inicio: '',
      cep_fim: '',
      categoria: 'alta',
      cidade: '',
      observacoes: '',
      ativo: true,
    },
  })

  // Preencher form se estiver editando
  useEffect(() => {
    if (cepRange) {
      form.reset({
        cep_inicio: cepRange.cep_inicio,
        cep_fim: cepRange.cep_fim,
        categoria: cepRange.categoria || cepRange.classificacao, // compatibilidade
        cidade: cepRange.cidade || '',
        observacoes: cepRange.observacoes || '',
        ativo: cepRange.ativo,
      })
      setCepInicioFormatted(formatCep(cepRange.cep_inicio))
      setCepFimFormatted(formatCep(cepRange.cep_fim))
      setCityInfo(cepRange.cidade || '')
      
      // Se cidade não for Poços, desabilitar classificação
      if (cepRange.cidade && !isPocosDeCaldas(cepRange.cidade)) {
        setClassificacaoDisabled(true)
        form.setValue('categoria', 'fora')
      }
    }
  }, [cepRange, form])

  const formatCep = (cep: string): string => {
    const numbers = cep.replace(/\D/g, '')
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2')
  }

  const unformatCep = (cep: string): string => {
    return cep.replace(/\D/g, '')
  }

  const handleCepInicioChange = async (value: string) => {
    const unformatted = unformatCep(value)
    setCepInicioFormatted(formatCep(unformatted))
    form.setValue('cep_inicio', unformatted)
    
    // 🎯 FASE 3: Validação automática de cidade
    if (unformatted.length === 8) {
      await validateCepCity(unformatted)
    }
  }

  const handleCepFimChange = (value: string) => {
    const unformatted = unformatCep(value)
    setCepFimFormatted(formatCep(unformatted))
    form.setValue('cep_fim', unformatted)
  }

  // 🚀 NOVA FUNÇÃO: Validar cidade via ViaCEP
  const validateCepCity = async (cep: string) => {
    if (cep.length !== 8) return
    
    setIsValidatingCep(true)
    try {
      const addressInfo = await fetchAddress(cep)
      
      if (addressInfo && addressInfo.cidade) {
        const cidade = addressInfo.cidade
        setCityInfo(cidade)
        form.setValue('cidade', cidade)
        
        // 🎯 NOVA REGRA: Ajustar classificação baseado na cidade
        if (!isPocosDeCaldas(cidade)) {
          // CEP fora de Poços de Caldas
          setClassificacaoDisabled(true)
          form.setValue('categoria', 'fora')
          toast.success(`CEP fora de Poços de Caldas (${cidade}). Classificação "Fora" aplicada automaticamente.`)
        } else {
          // CEP de Poços de Caldas
          setClassificacaoDisabled(false)
          // Se categoria atual é "fora", resetar para permitir seleção de renda
          const categoriaAtual = form.getValues('categoria')
          if (categoriaAtual === 'fora') {
            form.setValue('categoria', 'alta') // Default para maior renda
          }
          toast.success(`CEP de Poços de Caldas confirmado. Selecione entre Menor Renda ou Maior Renda.`)
        }
      } else {
        setCityInfo('')
        setClassificacaoDisabled(false)
        toast.error('Não foi possível identificar a cidade deste CEP.')
      }
    } catch (error) {
      setCityInfo('')
      setClassificacaoDisabled(false)
      toast.error('Erro ao validar CEP. Verifique a conexão.')
    } finally {
      setIsValidatingCep(false)
    }
  }

  const onSubmit = async (data: CepRangeFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: cepRange.id,
          ...data,
        })
        toast.success('Faixa de CEP atualizada com sucesso!')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Faixa de CEP criada com sucesso!')
      }
      onClose()
    } catch (error) {
      toast.error(isEditing ? 'Erro ao atualizar faixa de CEP' : 'Erro ao criar faixa de CEP')
      console.error('Erro no formulário:', error)
    }
  }

  const getClassificationInfo = (categoria: string) => {
    switch (categoria) {
      case 'fora':
        return { 
          text: 'Fora de Poços de Caldas', 
          color: 'bg-orange-100 text-orange-800',
          description: 'CEPs de outras cidades que não Poços de Caldas'
        }
      case 'baixa':
        return { 
          text: 'Menor Renda', 
          color: 'bg-blue-100 text-blue-800',
          description: 'CEPs de Poços de Caldas - Bairros de menor renda'
        }
      case 'alta':
        return { 
          text: 'Maior Renda', 
          color: 'bg-green-100 text-green-800',
          description: 'CEPs de Poços de Caldas - Bairros de maior renda'
        }
      default:
        return { 
          text: categoria, 
          color: 'bg-gray-100 text-gray-800',
          description: 'Classificação não definida'
        }
    }
  }

  const selectedCategoria = form.watch('categoria')
  const categoriaInfo = getClassificationInfo(selectedCategoria)
  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Faixa de CEP' : 'Nova Faixa de CEP'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Altere as informações da faixa de CEP abaixo.'
              : 'Preencha as informações para criar uma nova faixa de CEP.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Faixa de CEP */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cep_inicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP Inicial *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="00000-000" 
                        value={cepInicioFormatted}
                        onChange={(e) => handleCepInicioChange(e.target.value)}
                        className="font-mono"
                        maxLength={9}
                      />
                    </FormControl>
                    <FormDescription>
                      Primeiro CEP da faixa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cep_fim"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP Final *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="99999-999" 
                        value={cepFimFormatted}
                        onChange={(e) => handleCepFimChange(e.target.value)}
                        className="font-mono"
                        maxLength={9}
                      />
                    </FormControl>
                    <FormDescription>
                      Último CEP da faixa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Cidade (novo campo) */}
            {cityInfo && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-blue-800">Cidade identificada:</span>
                  <span className="text-blue-700">{cityInfo}</span>
                  {isValidatingCep && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>
            )}

            {/* Classificação */}
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => {
                // 🎯 NOVA LÓGICA: Determinar opções disponíveis baseado na cidade
                const isPocos = cityInfo && isPocosDeCaldas(cityInfo)
                const isForaDePocos = cityInfo && !isPocosDeCaldas(cityInfo)
                const semCidadeIdentificada = !cityInfo

                return (
                  <FormItem>
                    <FormLabel>Classificação *</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={classificacaoDisabled}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a classificação" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {/* OPÇÃO FORA: Só aparece se for fora de Poços OU sem cidade identificada */}
                        {(isForaDePocos || semCidadeIdentificada) && (
                          <SelectItem value="fora">
                            <div className="flex items-center space-x-2">
                              <Badge className="bg-orange-100 text-orange-800">Fora de Poços de Caldas</Badge>
                              {isForaDePocos && <span className="text-xs text-gray-500">(Auto)</span>}
                            </div>
                          </SelectItem>
                        )}
                        
                        {/* OPÇÕES RENDA: Só aparecem se for Poços de Caldas OU sem cidade identificada */}
                        {(isPocos || semCidadeIdentificada) && (
                          <>
                            <SelectItem value="baixa" disabled={isForaDePocos}>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-blue-100 text-blue-800">Menor Renda</Badge>
                                {isPocos && <span className="text-xs text-gray-500">(Poços)</span>}
                              </div>
                            </SelectItem>
                            <SelectItem value="alta" disabled={isForaDePocos}>
                              <div className="flex items-center space-x-2">
                                <Badge className="bg-green-100 text-green-800">Maior Renda</Badge>
                                {isPocos && <span className="text-xs text-gray-500">(Poços)</span>}
                              </div>
                            </SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={categoriaInfo.color}>
                            {categoriaInfo.text}
                          </Badge>
                          <span className="text-xs">{categoriaInfo.description}</span>
                        </div>
                        
                        {/* Feedback contextualizado */}
                        {isForaDePocos && (
                          <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                            🌍 CEP fora de Poços de Caldas detectado. Apenas classificação "Fora" disponível.
                          </div>
                        )}
                        
                        {isPocos && (
                          <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                            🏠 CEP de Poços de Caldas detectado. Selecione entre Menor Renda ou Maior Renda.
                          </div>
                        )}
                        
                        {semCidadeIdentificada && (
                          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            ℹ️ Digite um CEP válido para ver opções específicas da cidade.
                          </div>
                        )}
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />

            {/* REMOVIDO: Percentual de Desconto - agora é controlado via trilhos */}

            {/* Status */}
            <FormField
              control={form.control}
              name="ativo"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Status</FormLabel>
                    <FormDescription>
                      Faixa de CEP ativa no sistema
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

            {/* Observações */}
            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Informações adicionais sobre esta faixa de CEP..." 
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Observações internas sobre a classificação desta faixa
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