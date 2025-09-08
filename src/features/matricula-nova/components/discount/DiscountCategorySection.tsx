import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Star, 
  FileText, 
  Handshake, 
  AlertTriangle,
  Info,
  CheckCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import DiscountCard from './DiscountCard'
import type { 
  DiscountForEnrollment, 
  DiscountSelection
} from '../../types/discounts'
import { CategoriasDesconto } from '../../types/discounts'

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface DiscountCategorySectionProps {
  categoria: CategoriasDesconto
  descontos: DiscountForEnrollment[]
  descontosSelecionados: DiscountSelection[]
  onDescontoToggle: (desconto: DiscountForEnrollment) => void
  onPercentualChange: (descontoId: string, percentual: number) => void
  maxCap: number
  currentCap: number
  trilhoAtivo?: string
  disabled?: boolean
  errors?: Record<string, string>
  ineligibleDiscountIds?: string[]
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function DiscountCategorySection({
  categoria,
  descontos,
  descontosSelecionados,
  onDescontoToggle,
  onPercentualChange,
  maxCap,
  currentCap,
  trilhoAtivo,
  disabled = false,
  errors = {},
  ineligibleDiscountIds = []
}: DiscountCategorySectionProps) {

  // ========================================================================
  // FUNÇÕES AUXILIARES
  // ========================================================================

  const getCategoryInfo = (cat: CategoriasDesconto) => {
    switch (cat) {
      case CategoriasDesconto.ESPECIAL:
        return {
          icon: Star,
          title: 'Descontos Especiais',
          description: 'Bolsas de estudo, funcionários e professores sindicalizados',
          color: 'purple',
          bgColor: 'bg-purple-50 border-purple-200',
          badgeColor: 'bg-purple-100 text-purple-800',
          iconColor: 'text-purple-600'
        }
      case CategoriasDesconto.REGULAR:
        return {
          icon: FileText,
          title: 'Descontos Regulares', 
          description: 'Irmãos, outras cidades e pagamento à vista',
          color: 'blue',
          bgColor: 'bg-blue-50 border-blue-200',
          badgeColor: 'bg-blue-100 text-blue-800',
          iconColor: 'text-blue-600'
        }
      case CategoriasDesconto.NEGOCIACAO:
        return {
          icon: Handshake,
          title: 'Descontos Comerciais',
          description: 'CEP, adimplência e negociações especiais',
          color: 'green',
          bgColor: 'bg-green-50 border-green-200',
          badgeColor: 'bg-green-100 text-green-800',
          iconColor: 'text-green-600'
        }
      default:
        return {
          icon: FileText,
          title: 'Outros Descontos',
          description: 'Descontos diversos',
          color: 'gray',
          bgColor: 'bg-gray-50 border-gray-200',
          badgeColor: 'bg-gray-100 text-gray-800',
          iconColor: 'text-gray-600'
        }
    }
  }

  const getTrilhoCompatibility = (trilho: string | undefined, cat: CategoriasDesconto) => {
    if (!trilho) return { compatible: true, reason: '' }
    
    const trilhoRules = {
      'especial': [CategoriasDesconto.ESPECIAL],
      'combinado': [CategoriasDesconto.REGULAR, CategoriasDesconto.NEGOCIACAO],
      'comercial': [CategoriasDesconto.NEGOCIACAO]
    }

    const allowedCategories = trilhoRules[trilho as keyof typeof trilhoRules] || []
    const compatible = allowedCategories.includes(cat)
    
    const reason = compatible ? '' : 
      trilho === 'especial' ? 'Trilho especial aceita apenas descontos especiais' :
      trilho === 'combinado' ? 'Trilho combinado aceita apenas descontos regulares e comerciais' :
      trilho === 'comercial' ? 'Trilho comercial aceita apenas descontos de negociação' :
      'Categoria não compatível com o trilho selecionado'

    return { compatible, reason }
  }

  // ========================================================================
  // CÁLCULOS E ESTADOS
  // ========================================================================

  const categoryInfo = getCategoryInfo(categoria)
  const IconComponent = categoryInfo.icon
  const compatibility = getTrilhoCompatibility(trilhoAtivo, categoria)
  const isCompatible = compatibility.compatible

  // Filtrar descontos desta categoria (incluindo inativos para visibilidade)
  const descontosFiltrados = descontos.filter(d => 
    d.categoria === categoria
  )

  // Calcular estatísticas da categoria
  const descontosSelecionadosNaCategoria = descontosSelecionados.filter(ds =>
    descontosFiltrados.some(d => d.id === ds.discountId)
  )
  
  const percentualUsadoNaCategoria = descontosSelecionadosNaCategoria.reduce(
    (sum, ds) => sum + (ds.percentualAplicado || 0), 0
  )
  
  const capRestante = Math.max(0, maxCap - currentCap)
  const hasDescontosDisponiveis = descontosFiltrados.length > 0

  // ========================================================================
  // RENDERIZAÇÃO CONDICIONAL
  // ========================================================================

  if (!hasDescontosDisponiveis) {
    return null // Não renderizar se não há descontos nesta categoria
  }

  if (!isCompatible) {
    return (
      <Card className={cn("border border-dashed", categoryInfo.bgColor, "opacity-60")}>
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <IconComponent className={cn("w-6 h-6", categoryInfo.iconColor)} />
            <div>
              <h3 className="font-semibold text-gray-700">{categoryInfo.title}</h3>
              <p className="text-sm text-gray-600">{categoryInfo.description}</p>
            </div>
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Não compatível com trilho atual:</strong> {compatibility.reason}
            </AlertDescription>
          </Alert>
        </div>
      </Card>
    )
  }

  // ========================================================================
  // RENDERIZAÇÃO PRINCIPAL
  // ========================================================================

  return (
    <Card className={cn("border-2 transition-all", categoryInfo.bgColor)}>
      <div className="p-4">
        
        {/* Header da Seção */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <IconComponent className={cn("w-6 h-6", categoryInfo.iconColor)} />
            <div>
              <h3 className="font-semibold text-gray-900">{categoryInfo.title}</h3>
              <p className="text-sm text-gray-600">{categoryInfo.description}</p>
            </div>
          </div>

          <div className="text-right">
            <Badge 
              variant="outline" 
              className={cn("mb-1", categoryInfo.badgeColor)}
            >
              {descontosFiltrados.filter(d => d.ativo).length} disponível(is)
              {descontosFiltrados.filter(d => !d.ativo).length > 0 && 
                ` (+${descontosFiltrados.filter(d => !d.ativo).length} inativo(s))`
              }
            </Badge>
            {descontosSelecionadosNaCategoria.length > 0 && (
              <div className="text-sm text-gray-700">
                <strong>{descontosSelecionadosNaCategoria.length}</strong> selecionado(s)
              </div>
            )}
          </div>
        </div>

        {/* Progress do CAP da Categoria */}
        {percentualUsadoNaCategoria > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Uso desta categoria:</span>
              <span className="font-medium text-gray-900">
                {percentualUsadoNaCategoria.toFixed(1)}% / {maxCap}%
              </span>
            </div>
            <Progress 
              value={(percentualUsadoNaCategoria / maxCap) * 100} 
              className="h-2"
            />
          </div>
        )}

        {/* Lista de Descontos */}
        <div className="space-y-3">
          {descontosFiltrados.map(desconto => {
            const selecao = descontosSelecionados.find(ds => ds.discountId === desconto.id)
            const isSelected = !!selecao
            const percentualAtual = selecao?.percentualAplicado || 0
            
            // IMPORTANTE: Descontos ESPECIAIS nunca são inelegíveis por CEP
            const isDescontoEspecial = categoria === CategoriasDesconto.ESPECIAL
            const isIneligible = isDescontoEspecial ? false : ineligibleDiscountIds.includes(desconto.id)
            
            // Calcular percentual máximo permitido para este desconto
            const maxPercentualPermitido = Math.min(
              desconto.percentual_fixo || 100,
              capRestante + percentualAtual
            )

            return (
              <DiscountCard
                key={desconto.id}
                desconto={desconto}
                isSelected={isSelected}
                percentualAtual={percentualAtual}
                maxPercentual={maxPercentualPermitido}
                onToggle={() => onDescontoToggle(desconto)}
                onPercentualChange={(valor) => onPercentualChange(desconto.id, valor)}
                error={errors[desconto.id]}
                disabled={disabled || (capRestante <= 0 && !isSelected) || (isIneligible && !isDescontoEspecial) || !desconto.ativo}
                showDetails={isSelected}
                isIneligible={isIneligible && !isDescontoEspecial}
                isInactive={!desconto.ativo}
              />
            )
          })}
        </div>

        {/* Informações Adicionais */}
        <div className="mt-4 space-y-2">
          
          {/* CAP restante baixo */}
          {capRestante < 10 && capRestante > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Atenção:</strong> Restam apenas {capRestante.toFixed(1)}% do limite de desconto
              </AlertDescription>
            </Alert>
          )}

          {/* CAP esgotado */}
          {capRestante <= 0 && descontosSelecionadosNaCategoria.length === 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Limite atingido:</strong> O CAP máximo de {maxCap}% foi alcançado. 
                Remova outros descontos para selecionar desta categoria.
              </AlertDescription>
            </Alert>
          )}

          {/* Sucesso na categoria */}
          {descontosSelecionadosNaCategoria.length > 0 && (
            <div className="flex items-center space-x-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">
                {descontosSelecionadosNaCategoria.length} desconto(s) selecionado(s) desta categoria
              </span>
            </div>
          )}

          {/* Info sobre trilho */}
          {trilhoAtivo && (
            <div className="text-xs text-gray-500 flex items-center space-x-1">
              <Info className="w-3 h-3" />
              <span>
                Compatível com trilho <strong>{trilhoAtivo}</strong>
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default DiscountCategorySection