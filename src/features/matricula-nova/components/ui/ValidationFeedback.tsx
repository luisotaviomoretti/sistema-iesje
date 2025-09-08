import React from 'react'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ValidationFeedbackProps {
  isValid?: boolean
  isInvalid?: boolean
  message?: string
  showSuccess?: boolean
  type?: 'error' | 'success' | 'info'
  className?: string
}

/**
 * Componente para feedback visual de validação
 * 
 * Estados:
 * - isValid: Campo válido (verde)
 * - isInvalid: Campo inválido (vermelho)  
 * - info: Informação neutra (azul)
 * 
 * Características:
 * - Ícones visuais apropriados
 * - Cores consistentes
 * - Acessibilidade (ARIA)
 * - Animações suaves
 */
export function ValidationFeedback({ 
  isValid = false,
  isInvalid = false, 
  message,
  showSuccess = true,
  type,
  className
}: ValidationFeedbackProps) {
  // Determinar tipo automaticamente se não fornecido
  const feedbackType = type || (isValid ? 'success' : isInvalid ? 'error' : 'info')
  
  // Não mostrar nada se não há estado definido
  if (!isValid && !isInvalid && !type && !message) {
    return null
  }

  // Não mostrar sucesso se showSuccess for false
  if (isValid && !showSuccess && !message) {
    return null
  }

  const styles = {
    success: {
      container: "text-green-600",
      icon: CheckCircle,
      defaultMessage: "Campo válido"
    },
    error: {
      container: "text-red-600", 
      icon: AlertCircle,
      defaultMessage: "Campo inválido"
    },
    info: {
      container: "text-blue-600",
      icon: Info,
      defaultMessage: "Informação"
    }
  }

  const { container, icon: Icon, defaultMessage } = styles[feedbackType]
  const displayMessage = message || (isValid ? defaultMessage : '')

  // Não renderizar se não tem mensagem para mostrar
  if (!displayMessage) {
    return null
  }

  return (
    <div 
      className={cn(
        "flex items-center text-sm mt-1 transition-all duration-200 ease-in-out",
        container,
        className
      )}
      role={feedbackType === 'error' ? 'alert' : 'status'}
      aria-live={feedbackType === 'error' ? 'assertive' : 'polite'}
    >
      <Icon className="w-4 h-4 mr-1 flex-shrink-0" />
      <span>{displayMessage}</span>
    </div>
  )
}

/**
 * Hook para gerenciar estado de validação
 */
export function useValidationFeedback(
  value: any,
  validator?: (value: any) => { valid: boolean; message: string }
) {
  const [feedback, setFeedback] = React.useState<{
    isValid: boolean
    isInvalid: boolean
    message: string
  }>({
    isValid: false,
    isInvalid: false,
    message: ''
  })

  React.useEffect(() => {
    if (!validator || !value) {
      setFeedback({ isValid: false, isInvalid: false, message: '' })
      return
    }

    const result = validator(value)
    setFeedback({
      isValid: result.valid,
      isInvalid: !result.valid,
      message: result.message
    })
  }, [value, validator])

  return feedback
}