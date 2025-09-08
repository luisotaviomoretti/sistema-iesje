export const ENROLLMENT_STEPS = [
  {
    id: 0,
    title: 'Dados do Aluno',
    description: 'Informações básicas do estudante',
    required: true,
    icon: '👤'
  },
  {
    id: 1,
    title: 'Responsáveis',
    description: 'Dados dos responsáveis',
    required: true,
    icon: '👨‍👩‍👧‍👦'
  },
  {
    id: 2,
    title: 'Endereço',
    description: 'Endereço residencial',
    required: true,
    icon: '🏠'
  },
  {
    id: 3,
    title: 'Acadêmico',
    description: 'Série e turno',
    required: true,
    icon: '📚'
  },
  {
    id: 4,
    title: 'Descontos',
    description: 'Seleção de descontos',
    required: false,
    icon: '💰'
  },
  {
    id: 5,
    title: 'Resumo',
    description: 'Confirmação final',
    required: true,
    icon: '✅'
  }
] as const

export const TOTAL_STEPS = ENROLLMENT_STEPS.length
export const FIRST_STEP = 0
export const LAST_STEP = ENROLLMENT_STEPS.length - 1

// Helpers para navegação
export const getStepInfo = (stepId: number) => {
  return ENROLLMENT_STEPS.find(step => step.id === stepId)
}

export const getNextStep = (currentStep: number) => {
  return currentStep < LAST_STEP ? currentStep + 1 : currentStep
}

export const getPrevStep = (currentStep: number) => {
  return currentStep > FIRST_STEP ? currentStep - 1 : currentStep
}

export const isValidStep = (step: number) => {
  return step >= FIRST_STEP && step <= LAST_STEP
}

// Tipos derivados
export type StepId = typeof ENROLLMENT_STEPS[number]['id']
export type StepInfo = typeof ENROLLMENT_STEPS[number]
