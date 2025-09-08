import React from 'react'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

interface StepNavigationProps {
  canGoPrev: boolean
  canGoNext: boolean
  canSubmit: boolean
  isSubmitting: boolean
  onPrev: () => void
  onNext: () => void
  onSubmit: () => void
  currentStep: number
  totalSteps: number
  className?: string
  prevLabel?: string
  nextLabel?: string
  submitLabel?: string
}

/**
 * Componente de navegação entre steps
 * 
 * Características:
 * - Botões de navegação (Voltar/Próximo/Finalizar)
 * - Estados visuais apropriados
 * - Indicador de progresso
 * - Labels customizáveis
 * - Loading state para submissão
 */
export function StepNavigation({
  canGoPrev,
  canGoNext,
  canSubmit,
  isSubmitting,
  onPrev,
  onNext,
  onSubmit,
  currentStep,
  totalSteps,
  className,
  prevLabel = "Voltar",
  nextLabel = "Próximo",
  submitLabel = "Finalizar Matrícula"
}: StepNavigationProps) {
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  return (
    <div className={cn(
      "flex justify-between items-center pt-6 border-t border-gray-200",
      className
    )}>
      {/* Botão Voltar */}
      <div>
        {!isFirstStep ? (
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={!canGoPrev || isSubmitting}
            className="flex items-center"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {prevLabel}
          </Button>
        ) : (
          <div /> /* Espaço para manter o layout */
        )}
      </div>

      {/* Indicador de progresso */}
      <div className="flex flex-col items-center space-y-1">
        <div className="text-sm text-gray-500 font-medium">
          Passo {currentStep + 1} de {totalSteps}
        </div>
        <div className="flex items-center space-x-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index < currentStep 
                  ? "bg-green-500" // Completado
                  : index === currentStep 
                  ? "bg-blue-500" // Atual
                  : "bg-gray-300" // Futuro
              )}
            />
          ))}
        </div>
      </div>

      {/* Botão Próximo/Finalizar */}
      <div>
        {isLastStep ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || isSubmitting}
            loading={isSubmitting}
            className="flex items-center"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                {submitLabel}
                <Check className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isSubmitting}
            className="flex items-center"
          >
            {nextLabel}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Versão simplificada para casos básicos
 */
export function SimpleStepNavigation({
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
  isLastStep = false,
  className
}: {
  onPrev?: () => void
  onNext?: () => void
  canGoPrev?: boolean
  canGoNext?: boolean
  isLastStep?: boolean
  className?: string
}) {
  return (
    <div className={cn(
      "flex justify-between items-center pt-6",
      className
    )}>
      {onPrev ? (
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          disabled={!canGoPrev}
          className="flex items-center"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Voltar
        </Button>
      ) : (
        <div />
      )}

      {onNext && (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="flex items-center"
        >
          {isLastStep ? 'Finalizar' : 'Próximo'}
          {isLastStep ? (
            <Check className="w-4 h-4 ml-1" />
          ) : (
            <ChevronRight className="w-4 h-4 ml-1" />
          )}
        </Button>
      )}
    </div>
  )
}