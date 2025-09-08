import React, { useState } from 'react'
import { Users, UserPlus, UserMinus } from 'lucide-react'

// Components
import { Card, CardHeader, CardTitle } from '../ui/Card'
import { Button } from '../ui/Button'
import { StepNavigation } from '../ui/StepNavigation'
import { TOTAL_STEPS } from '../../constants/steps'
import { GuardianForm } from '../forms/GuardianForm'
import { Alert } from '../ui/Alert'

// Types
import type { StepProps } from '../../types/forms'

/**
 * Step 2 - Formulário de Responsáveis
 * 
 * Características:
 * - Responsável 1 obrigatório
 * - Responsável 2 opcional (pode ser adicionado/removido)
 * - Validação independente para cada responsável
 * - Diferentes opções de parentesco
 */
export default function GuardianFormStep(props: StepProps) {
  const { 
    form, 
    nextStep, 
    prevStep, 
    canGoNext, 
    canGoPrev, 
    currentStep 
  } = props

  const [showSecondGuardian, setShowSecondGuardian] = useState(false)

  // Verificar se já existe dados do segundo responsável
  const guardian2Data = form.watch('guardians.guardian2')
  const hasGuardian2Data = guardian2Data && (
    guardian2Data.name || 
    guardian2Data.cpf || 
    guardian2Data.phone || 
    guardian2Data.email
  )

  // Auto-mostrar segundo responsável se já tem dados
  React.useEffect(() => {
    if (hasGuardian2Data && !showSecondGuardian) {
      setShowSecondGuardian(true)
    }
  }, [hasGuardian2Data, showSecondGuardian])

  // Função para limpar dados do segundo responsável
  const clearSecondGuardian = () => {
    form.setValue('guardians.guardian2.name', '')
    form.setValue('guardians.guardian2.cpf', '')
    form.setValue('guardians.guardian2.phone', '')
    form.setValue('guardians.guardian2.email', '')
    form.setValue('guardians.guardian2.relationship', '')
    setShowSecondGuardian(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Responsáveis pelo Aluno
        </h2>
        <p className="text-gray-600 mt-2">
          Pelo menos um responsável é obrigatório
        </p>
      </div>

      {/* Informação importante */}
      <Alert
        variant="info"
        title="Importante"
        description="Os dados de telefone e email serão usados para comunicação oficial da escola. Certifique-se de que estão corretos e atualizados."
      />

      {/* Responsável 1 (Obrigatório) */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Responsável Principal
            </span>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-medium">
              Obrigatório
            </span>
          </CardTitle>
        </CardHeader>
        <div className="px-6 pb-6">
          <GuardianForm
            form={form}
            guardianIndex={1}
            required={true}
          />
        </div>
      </Card>

      {/* Segundo Responsável (Opcional) */}
      {showSecondGuardian ? (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <UserPlus className="w-5 h-5 mr-2 text-blue-600" />
                Segundo Responsável
              </span>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                  Opcional
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSecondGuardian}
                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  Remover
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <div className="px-6 pb-6">
            <GuardianForm
              form={form}
              guardianIndex={2}
              required={false}
            />
          </div>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-blue-300 bg-blue-50">
          <div className="p-6 text-center">
            <UserPlus className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-blue-900 mb-2">
              Adicionar Segundo Responsável
            </h3>
            <p className="text-blue-700 mb-4">
              Opcional - Caso o aluno tenha dois responsáveis legais
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSecondGuardian(true)}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Segundo Responsável
            </Button>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <StepNavigation
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        canSubmit={false}
        isSubmitting={false}
        onPrev={prevStep}
        onNext={nextStep}
        onSubmit={() => {}}
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
      />

      {/* Debug Info (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <details>
            <summary>Debug Info - Responsáveis</summary>
            <pre className="mt-2 text-xs">
              {JSON.stringify({
                step: currentStep,
                canGoNext,
                canGoPrev,
                showSecondGuardian,
                guardian1: form.watch('guardians.guardian1'),
                guardian2: form.watch('guardians.guardian2'),
                errors: form.formState.errors.guardians
              }, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
