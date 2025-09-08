/**
 * Componente que exibe informações sobre descontos não elegíveis
 * 
 * Fornece transparência ao usuário sobre:
 * - Quais descontos não estão disponíveis
 * - Por que cada desconto não está disponível
 * - Sugestões alternativas quando aplicável
 */

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, Info, AlertTriangle, Lightbulb, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { IneligibleDiscountsInfoProps } from '../types/eligibility'

/**
 * Componente principal para descontos inelegíveis
 */
export const IneligibleDiscountsInfo: React.FC<IneligibleDiscountsInfoProps> = ({
  ineligibleDiscounts,
  className = '',
  showByDefault = false
}) => {
  const [showDetails, setShowDetails] = useState(showByDefault)
  const [dismissed, setDismissed] = useState(false)

  // Se não há descontos inelegíveis, não renderizar
  if (ineligibleDiscounts.length === 0 || dismissed) {
    return null
  }

  const toggleDetails = () => setShowDetails(!showDetails)
  const dismissComponent = () => setDismissed(true)

  return (
    <div className={cn(
      'border border-amber-200 rounded-lg bg-amber-50',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-amber-700">
            <Info className="w-5 h-5" />
            <span className="font-medium text-sm">
              {ineligibleDiscounts.length} desconto(s) não disponível(eis) para seu CEP
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDetails}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
          >
            {showDetails ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Ocultar
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Ver detalhes
              </>
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissComponent}
            className="text-amber-600 hover:text-amber-700 hover:bg-amber-100 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Detalhes dos descontos inelegíveis */}
      {showDetails && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            {ineligibleDiscounts.map((ineligibleDiscount, index) => (
              <IneligibleDiscountCard
                key={ineligibleDiscount.discount.id || index}
                ineligibleDiscount={ineligibleDiscount}
              />
            ))}
          </div>
          
          {/* Footer com dica geral */}
          <div className="mt-4 pt-3 border-t border-amber-200">
            <div className="flex items-start space-x-2 text-sm text-amber-700">
              <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                <strong>Dica:</strong> As restrições são baseadas na localização do seu CEP. 
                Outros tipos de desconto podem estar disponíveis independente da localização.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Card individual para cada desconto inelegível
 */
const IneligibleDiscountCard: React.FC<{
  ineligibleDiscount: IneligibleDiscountsInfoProps['ineligibleDiscounts'][0]
}> = ({ ineligibleDiscount }) => {
  const { discount, reason, suggestion, ruleApplied } = ineligibleDiscount

  return (
    <div className="p-3 border border-amber-200 rounded-lg bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Nome e código do desconto */}
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-medium text-sm text-gray-900">
              {discount.nome}
            </h4>
            <DiscountCodeBadge code={discount.codigo} />
          </div>
          
          {/* Motivo da restrição */}
          {reason && (
            <div className="flex items-start space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-gray-700">{reason}</p>
            </div>
          )}
          
          {/* Sugestão alternativa */}
          {suggestion && (
            <div className="flex items-start space-x-2">
              <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-700">{suggestion}</p>
            </div>
          )}
        </div>
        
        {/* Valor do desconto */}
        <div className="ml-4 text-right">
          <div className="text-sm font-medium text-gray-500 line-through">
            {discount.percentual}%
          </div>
          <div className="text-xs text-gray-400 uppercase">
            {ruleApplied}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Badge para código do desconto
 */
const DiscountCodeBadge: React.FC<{ code: string }> = ({ code }) => {
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 text-gray-700 rounded border">
      {code}
    </span>
  )
}

/**
 * Versão compacta que mostra apenas um resumo
 */
export const IneligibleDiscountsInfoCompact: React.FC<{
  ineligibleCount: number
  className?: string
  onClick?: () => void
}> = ({ ineligibleCount, className = '', onClick }) => {
  if (ineligibleCount === 0) return null

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center space-x-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 hover:bg-amber-100 transition-colors',
        className
      )}
    >
      <Info className="w-4 h-4" />
      <span>{ineligibleCount} desconto(s) não disponível(eis)</span>
      <ChevronDown className="w-4 h-4" />
    </button>
  )
}

/**
 * Lista simples de descontos inelegíveis (sem interatividade)
 */
export const IneligibleDiscountsList: React.FC<{
  ineligibleDiscounts: IneligibleDiscountsInfoProps['ineligibleDiscounts']
  className?: string
}> = ({ ineligibleDiscounts, className = '' }) => {
  if (ineligibleDiscounts.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="font-medium text-sm text-gray-700 mb-3">
        Descontos não disponíveis para seu CEP:
      </h4>
      {ineligibleDiscounts.map((item, index) => (
        <div key={item.discount.id || index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
          <span className="text-gray-700">{item.discount.nome}</span>
          <span className="text-gray-500 text-xs">{item.discount.codigo}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Componente de estatísticas rápidas
 */
export const IneligibilityStats: React.FC<{
  totalDiscounts: number
  eligibleCount: number
  ineligibleCount: number
  className?: string
}> = ({ totalDiscounts, eligibleCount, ineligibleCount, className = '' }) => {
  const eligibilityRate = totalDiscounts > 0 ? Math.round((eligibleCount / totalDiscounts) * 100) : 0

  return (
    <div className={cn(
      'flex items-center justify-between p-3 bg-gray-50 border rounded-lg text-sm',
      className
    )}>
      <div className="flex items-center space-x-4">
        <div className="text-center">
          <div className="font-semibold text-green-600">{eligibleCount}</div>
          <div className="text-xs text-gray-500">Disponíveis</div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-amber-600">{ineligibleCount}</div>
          <div className="text-xs text-gray-500">Restritos</div>
        </div>
        
        <div className="text-center">
          <div className="font-semibold text-gray-700">{totalDiscounts}</div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="font-semibold text-blue-600">{eligibilityRate}%</div>
        <div className="text-xs text-gray-500">Elegibilidade</div>
      </div>
    </div>
  )
}

/**
 * Hook para controlar estado do componente
 */
export const useIneligibleDiscountsInfo = (initialShow = false) => {
  const [showDetails, setShowDetails] = useState(initialShow)
  const [dismissed, setDismissed] = useState(false)

  return {
    showDetails,
    dismissed,
    toggleDetails: () => setShowDetails(!showDetails),
    showDetailsExplicit: (show: boolean) => setShowDetails(show),
    dismiss: () => setDismissed(true),
    reset: () => {
      setShowDetails(initialShow)
      setDismissed(false)
    }
  }
}