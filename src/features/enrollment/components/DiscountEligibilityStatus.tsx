/**
 * Componente que exibe o status de elegibilidade baseado na categoria do CEP
 * 
 * Mostra informações visuais claras sobre:
 * - Qual categoria de CEP foi identificada
 * - Quais descontos estão disponíveis/bloqueados
 * - Explicação das regras aplicadas
 */

import React from 'react'
import { Info, MapPin, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

import type { 
  DiscountEligibilityStatusProps, 
  CepCategory
} from '../types/eligibility'

import { CATEGORY_CONFIG } from '../types/eligibility'

/**
 * Componente principal de status de elegibilidade
 */
export const DiscountEligibilityStatus: React.FC<DiscountEligibilityStatusProps> = ({
  cepCategory,
  cep,
  className = '',
  showDetails = true
}) => {
  // Se não há categoria, não renderizar
  if (!cepCategory) {
    return null
  }

  const config = CATEGORY_CONFIG[cepCategory]

  return (
    <div className={cn(
      'p-4 border rounded-lg transition-all duration-200',
      config.color,
      className
    )}>
      <div className="flex items-start space-x-3">
        {/* Ícone da categoria */}
        <div className="text-2xl flex-shrink-0 mt-0.5">
          {config.icon}
        </div>
        
        {/* Conteúdo principal */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-semibold text-sm">
              {config.title}
            </h3>
            <CepBadge cep={cep} />
          </div>
          
          {/* Descrição */}
          <p className="text-sm mb-3">
            {config.description}
          </p>
          
          {showDetails && (
            <div className="space-y-3">
              {/* Benefícios disponíveis */}
              {config.benefits.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Disponível
                    </span>
                  </div>
                  <ul className="text-xs space-y-1 ml-6">
                    {config.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="text-green-500">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Restrições */}
              {config.restrictions.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wider">
                      Restrições
                    </span>
                  </div>
                  <ul className="text-xs space-y-1 ml-6 opacity-75">
                    {config.restrictions.map((restriction, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <span className="text-amber-500">⚠</span>
                        <span>{restriction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Badge para exibir o CEP de forma compacta
 */
const CepBadge: React.FC<{ cep: string }> = ({ cep }) => {
  return (
    <div className="inline-flex items-center space-x-1 px-2 py-1 bg-white/50 rounded text-xs font-mono border">
      <MapPin className="w-3 h-3" />
      <span>{cep}</span>
    </div>
  )
}

/**
 * Versão compacta do componente (apenas o essencial)
 */
export const DiscountEligibilityStatusCompact: React.FC<DiscountEligibilityStatusProps> = ({
  cepCategory,
  cep,
  className = ''
}) => {
  if (!cepCategory) return null

  const config = CATEGORY_CONFIG[cepCategory]

  return (
    <div className={cn(
      'flex items-center space-x-3 p-3 border rounded-lg',
      config.color,
      className
    )}>
      <div className="text-lg">{config.icon}</div>
      <div className="flex-1">
        <div className="font-medium text-sm">{config.title}</div>
        <div className="text-xs opacity-75">{cep}</div>
      </div>
      <div className="text-xs font-medium">
        {cepCategory.toUpperCase()}
      </div>
    </div>
  )
}

/**
 * Badge de categoria CEP standalone
 */
export const CepCategoryBadge: React.FC<{
  category: CepCategory
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'filled'
  className?: string
}> = ({ 
  category, 
  size = 'md', 
  variant = 'default',
  className = '' 
}) => {
  const config = CATEGORY_CONFIG[category]
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm', 
    lg: 'px-4 py-2 text-base'
  }
  
  const variantClasses = {
    default: config.color,
    outline: `border-2 ${config.color.replace('bg-', 'border-').replace('text-', 'text-').replace('border-', 'border-')} bg-transparent`,
    filled: `${config.color} font-semibold`
  }
  
  return (
    <span className={cn(
      'inline-flex items-center space-x-1.5 rounded-full border',
      sizeClasses[size],
      variantClasses[variant],
      className
    )}>
      <span>{config.icon}</span>
      <span>{config.title}</span>
    </span>
  )
}

/**
 * Componente de loading para quando ainda está classificando o CEP
 */
export const DiscountEligibilityStatusSkeleton: React.FC<{ className?: string }> = ({ 
  className = '' 
}) => {
  return (
    <div className={cn(
      'p-4 border rounded-lg bg-gray-50 animate-pulse',
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
          <div className="space-y-1">
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook para usar dentro de componentes que precisam das configurações
 */
export const useDiscountEligibilityStatus = (cepCategory: CepCategory | null) => {
  if (!cepCategory) {
    return {
      config: null,
      hasCategory: false,
      isLoading: false
    }
  }

  return {
    config: CATEGORY_CONFIG[cepCategory],
    hasCategory: true,
    isLoading: false
  }
}