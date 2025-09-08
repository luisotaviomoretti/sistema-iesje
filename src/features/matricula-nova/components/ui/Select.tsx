import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
  error?: boolean
  icon?: React.ReactNode
  placeholder?: string
}

/**
 * Select customizado com suporte a:
 * - Opções tipadas
 * - Estados de erro visual
 * - Ícone opcional à esquerda
 * - Placeholder
 * - Descrições nas opções
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, icon, placeholder, options, ...props }, ref) => {
    return (
      <div className="relative">
        {/* Ícone à esquerda */}
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            {icon}
          </div>
        )}
        
        {/* Campo de select */}
        <select
          className={cn(
            // Base styles
            "flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-colors appearance-none cursor-pointer",
            // Ícone padding
            icon && "pl-10",
            // Error state
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          ref={ref}
          {...props}
        >
          {/* Placeholder */}
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          
          {/* Opções */}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
              {option.description && ` - ${option.description}`}
            </option>
          ))}
        </select>
        
        {/* Ícone dropdown à direita */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    )
  }
)

Select.displayName = "Select"