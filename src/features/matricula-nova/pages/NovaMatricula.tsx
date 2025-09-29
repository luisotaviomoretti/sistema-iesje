import React, { Suspense } from 'react'
import { useEnrollmentForm } from '../hooks/useEnrollmentForm'
import { ENROLLMENT_STEPS } from '../constants/steps'

// Componentes UI (serão implementados na próxima fase)
import { StepIndicator } from '../components/ui/StepIndicator'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'

// Lazy loading dos componentes de step (serão implementados na Fase 2)
const StudentFormStep = React.lazy(() => import('../components/steps/StudentFormStep'))
const GuardianFormStep = React.lazy(() => import('../components/steps/GuardianFormStep'))
const AddressFormStep = React.lazy(() => import('../components/steps/AddressFormStep'))
const AcademicFormStep = React.lazy(() => import('../components/steps/AcademicFormStep'))
const DiscountSelectionStep = React.lazy(() => import('../components/steps/DiscountSelectionStep'))
const SummaryStep = React.lazy(() => import('../components/steps/SummaryStep'))

/**
 * Página principal do sistema de Nova Matrícula V2
 * 
 * Esta é a página container que:
 * - Gerencia o estado global do formulário via useEnrollmentForm
 * - Renderiza o step atual
 * - Fornece navegação entre steps
 * - Exibe indicadores de progresso
 * - Trata erros e loading states
 */
export default function NovaMatricula() {
  const enrollment = useEnrollmentForm()

  // Renderizar step atual baseado no currentStep
  const renderCurrentStep = () => {
    const stepProps = { ...enrollment }

    switch (enrollment.currentStep) {
      case 0:
        return <StudentFormStep {...stepProps} />
      case 1:
        return <GuardianFormStep {...stepProps} />
      case 2:
        return <AddressFormStep {...stepProps} />
      case 3:
        return <AcademicFormStep {...stepProps} />
      case 4:
        return <DiscountSelectionStep {...stepProps} />
      case 5:
        return <SummaryStep {...stepProps} />
      default:
        return <StudentFormStep {...stepProps} />
    }
  }

  // Renderizar loading se dados ainda estão carregando
  if (enrollment.isLoadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Carregando dados do sistema...</p>
        </div>
      </div>
    )
  }

  // Renderizar erro se há problemas no carregamento de dados
  if (enrollment.hasDataErrors) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Erro no Sistema
          </h2>
          <p className="text-gray-600 mb-4">
            Não foi possível carregar os dados necessários:
          </p>
          <ul className="text-left text-red-600 mb-6">
            {enrollment.dataErrorMessages.map((message, index) => (
              <li key={index} className="mb-1">• {message}</li>
            ))}
          </ul>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  // Obter informações do step atual
  const currentStepInfo = ENROLLMENT_STEPS[enrollment.currentStep]
  const stepError = enrollment.getStepErrors(enrollment.currentStep)

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Nova Matrícula - IESJE
              </h1>
              <p className="text-gray-600 mt-2">
                Sistema simplificado de matrícula
              </p>
              
              {/* Progress Bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                  <span>Progresso: {enrollment.progress}%</span>
                  <span>
                    Step {enrollment.currentStep + 1} de {ENROLLMENT_STEPS.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${enrollment.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Step Indicator */}
          <StepIndicator 
            steps={ENROLLMENT_STEPS}
            currentStep={enrollment.currentStep}
            className="mb-8"
            onStepClick={enrollment.goToStep}
          />


          {/* Step Error */}
          {stepError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <div className="text-red-400">⚠️</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Erro no step atual
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    {stepError}
                  </p>
                </div>
                <div className="ml-auto pl-3">
                  <button
                    onClick={() => enrollment.clearStepErrors(enrollment.currentStep)}
                    className="text-red-400 hover:text-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Form Container */}
          <div className="bg-white rounded-lg shadow-lg p-6 min-h-[500px]">
            <Suspense fallback={<LoadingSpinner />}>
              {renderCurrentStep()}
            </Suspense>
          </div>

          {/* Navigation */}
          <div className="mt-8 flex justify-between items-center">
            <div>
              {enrollment.canGoPrev && (
                <button
                  onClick={enrollment.prevStep}
                  disabled={enrollment.isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Voltar
                </button>
              )}
            </div>

            <div className="flex space-x-3">
              {/* Reset Button (apenas em desenvolvimento) */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={enrollment.resetForm}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  🔄 Reset
                </button>
              )}

              {/* Next/Submit Button */}
              {!enrollment.isLastStep && (
                <button
                  onClick={enrollment.nextStep}
                  disabled={!enrollment.canGoNext || enrollment.isSubmitting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo →
                </button>
              )}
            </div>
          </div>

          {/* Pricing Summary (se disponível, oculto no último step) */}
          {enrollment.pricing && enrollment.currentStep !== 4 && !enrollment.isLastStep && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">
                💰 Resumo Financeiro
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Valor Base:</span>
                  <p className="font-semibold">
                    R$ {enrollment.pricing.baseValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">
                    Desconto Total ({enrollment.pricing.totalDiscountPercentage.toFixed(1)}%):
                  </span>
                  <p className="font-semibold text-green-600">
                    - R$ {enrollment.pricing.totalDiscountValue.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-blue-700">Valor Final:</span>
                  <p className="font-semibold text-lg">
                    R$ {enrollment.pricing.finalValue.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Approval Info */}
              {enrollment.approvalInfo && enrollment.approvalInfo.level !== 'automatic' && (
                <div className="mt-3 p-2 bg-yellow-100 border border-yellow-300 rounded">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ {enrollment.approvalInfo.description}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Debug Panel (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && enrollment._debug && (
          <div className="fixed bottom-4 right-4 max-w-md">
            <details className="bg-gray-900 text-white p-4 rounded text-xs">
              <summary className="cursor-pointer font-medium">Debug Info</summary>
              <pre className="mt-2 overflow-auto max-h-40">
                {JSON.stringify({
                  currentStep: enrollment.currentStep,
                  canGoNext: enrollment.canGoNext,
                  canSubmit: enrollment.canSubmit,
                  pricing: enrollment.pricing ? {
                    isValid: enrollment.pricing.isValid,
                    totalPercentage: enrollment.pricing.totalDiscountPercentage,
                    finalValue: enrollment.pricing.finalValue
                  } : null,
                  formErrors: enrollment.form.formState.errors,
                  watchedValues: {
                    selectedDiscounts: enrollment._debug.selectedDiscounts,
                    academicData: enrollment._debug.academicData
                  }
                }, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}
