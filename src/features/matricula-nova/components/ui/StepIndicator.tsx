import React from 'react'
import { cn } from '@/lib/utils'

interface Step {
  id: number
  title: string
  description: string
  optional?: boolean
  icon?: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
  className?: string
  onStepClick?: (stepId: number) => void
}

/**
 * Componente de indicador de progresso dos steps
 * 
 * Mostra visualmente:
 * - Steps completados (verde)
 * - Step atual (azul)
 * - Steps futuros (cinza)
 * - Steps opcionais
 */
export function StepIndicator({ 
  steps, 
  currentStep, 
  className,
  onStepClick 
}: StepIndicatorProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Desktop version */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep
            const isCurrent = step.id === currentStep
            const isFuture = step.id > currentStep
            const isClickable = onStepClick && step.id <= currentStep

            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => isClickable && onStepClick(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200",
                      isCompleted && "border-green-600 bg-green-600 text-white hover:bg-green-700",
                      isCurrent && "border-blue-600 bg-blue-600 text-white",
                      isFuture && "border-gray-300 bg-white text-gray-500",
                      isClickable && "cursor-pointer hover:scale-105",
                      !isClickable && "cursor-not-allowed"
                    )}
                  >
                    {isCompleted ? (
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span>{step.id + 1}</span>
                    )}
                    
                    {/* Optional indicator */}
                    {step.optional && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 border border-white">
                        <span className="sr-only">Opcional</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Step title and description */}
                  <div className="mt-2 text-center">
                    <p className={cn(
                      "text-sm font-medium",
                      isCompleted && "text-green-600",
                      isCurrent && "text-blue-600", 
                      isFuture && "text-gray-500"
                    )}>
                      {step.title}
                      {step.optional && (
                        <span className="ml-1 text-xs text-yellow-600">(opcional)</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 max-w-24">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-4">
                    <div className={cn(
                      "h-0.5 w-full transition-colors duration-200",
                      step.id < currentStep ? "bg-green-600" : "bg-gray-300"
                    )} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Mobile version */}
      <div className="md:hidden">
        <div className="flex items-center space-x-4 overflow-x-auto pb-2">
          {steps.map((step, index) => {
            const isCompleted = step.id < currentStep
            const isCurrent = step.id === currentStep
            const isFuture = step.id > currentStep
            const isClickable = onStepClick && step.id <= currentStep

            return (
              <div key={step.id} className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => isClickable && onStepClick(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-200",
                    isCompleted && "border-green-600 bg-green-600 text-white",
                    isCurrent && "border-blue-600 bg-blue-600 text-white",
                    isFuture && "border-gray-300 bg-white text-gray-500",
                    isClickable && "cursor-pointer",
                    !isClickable && "cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span>{step.id + 1}</span>
                  )}
                  
                  {step.optional && (
                    <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-yellow-400" />
                  )}
                </button>

                <div className="text-left">
                  <p className={cn(
                    "text-xs font-medium",
                    isCompleted && "text-green-600",
                    isCurrent && "text-blue-600", 
                    isFuture && "text-gray-500"
                  )}>
                    {step.title}
                  </p>
                </div>

                {/* Connector */}
                {index < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-4",
                    step.id < currentStep ? "bg-green-600" : "bg-gray-300"
                  )} />
                )}
              </div>
            )
          })}
        </div>
      </div>


      {/* Progress summary */}
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">
            {currentStep + 1}
          </span>
          {' '}de{' '}
          <span className="font-medium text-gray-900">
            {steps.length}
          </span>
          {' '}etapas
        </div>
        
        {/* Completion percentage */}
        <div className="mt-1">
          <div className="text-xs text-gray-500">
            {Math.round(((currentStep) / (steps.length - 1)) * 100)}% concluído
          </div>
        </div>
      </div>
    </div>
  )
}