import React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
  id: string
  description?: string
}

/**
 * Wrapper padrão para campos de formulário
 * 
 * Características:
 * - Label padronizada
 * - Indicação de campo obrigatório
 * - Exibição de erro com ícone
 * - Descrição opcional
 * - Espaçamento consistente
 */
export function FormField({ 
  label, 
  error, 
  required, 
  children, 
  className = "",
  id,
  description 
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <label 
        htmlFor={id}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="Campo obrigatório">
            *
          </span>
        )}
      </label>
      
      {/* Descrição opcional */}
      {description && (
        <p className="text-xs text-gray-500 -mt-1">
          {description}
        </p>
      )}
      
      {/* Campo de input */}
      {children}
      
      {/* Mensagem de erro */}
      {error && (
        <p 
          className="text-sm text-red-600 flex items-center"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}