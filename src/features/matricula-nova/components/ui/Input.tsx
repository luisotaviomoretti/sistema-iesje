import React from 'react'
import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  icon?: React.ReactNode
}

/**
 * Input customizado com suporte a:
 * - Estados de erro visual
 * - Ícone opcional à esquerda
 * - Estilos consistentes
 * - Acessibilidade completa
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, type, ...props }, ref) => {
    return (
      <div className="relative">
        {/* Ícone à esquerda */}
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        
        {/* Campo de input */}
        <input
          type={type}
          className={cn(
            // Base styles
            "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm",
            "placeholder:text-gray-400",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors",
            // Ícone padding
            icon && "pl-10",
            // Error state
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)

Input.displayName = "Input"