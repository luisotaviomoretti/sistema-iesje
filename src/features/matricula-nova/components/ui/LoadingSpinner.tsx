import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
  color?: 'blue' | 'white' | 'gray'
  message?: string
}

/**
 * Componente de spinner de carregamento reutilizável
 */
export function LoadingSpinner({ 
  size = 'medium', 
  className,
  color = 'blue',
  message
}: LoadingSpinnerProps) {
  const sizeClasses = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8', 
    large: 'h-12 w-12'
  }

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600'
  }

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative">
        {/* Spinner SVG */}
        <svg 
          className={cn(
            "animate-spin",
            sizeClasses[size],
            colorClasses[color]
          )}
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        {/* Pulsing dot indicator */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center"
        )}>
          <div className={cn(
            "rounded-full animate-pulse",
            size === 'small' && "h-1 w-1",
            size === 'medium' && "h-2 w-2", 
            size === 'large' && "h-3 w-3",
            colorClasses[color]
          )} style={{ backgroundColor: 'currentColor', opacity: 0.6 }} />
        </div>
      </div>

      {/* Message */}
      {message && (
        <p className={cn(
          "text-center mt-2",
          size === 'small' && "text-xs",
          size === 'medium' && "text-sm",
          size === 'large' && "text-base",
          colorClasses[color]
        )}>
          {message}
        </p>
      )}
    </div>
  )
}

/**
 * Componente de loading para tela inteira
 */
export function FullScreenLoading({ message = "Carregando..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
      <LoadingSpinner size="large" message={message} />
    </div>
  )
}

/**
 * Componente de loading inline para botões
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <LoadingSpinner 
      size="small" 
      color="white" 
      className={cn("inline-flex", className)} 
    />
  )
}

/**
 * Componente de skeleton loading para cards
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="bg-gray-200 rounded-lg p-4 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
        <div className="h-3 bg-gray-300 rounded w-2/3"></div>
      </div>
    </div>
  )
}

/**
 * Componente de skeleton loading para listas
 */
export function SkeletonList({ items = 3, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="animate-pulse flex items-center space-x-4">
          <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Componente de loading para formulários
 */
export function FormSkeleton({ fields = 4, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded border"></div>
        </div>
      ))}
      
      <div className="animate-pulse flex justify-end space-x-4 mt-8">
        <div className="h-10 bg-gray-300 rounded w-20"></div>
        <div className="h-10 bg-blue-300 rounded w-24"></div>
      </div>
    </div>
  )
}

/**
 * Hook para managing loading states
 */
export function useLoadingState(initialState: boolean = false) {
  const [loading, setLoading] = React.useState(initialState)
  
  const withLoading = async <T,>(asyncFn: () => Promise<T>): Promise<T> => {
    setLoading(true)
    try {
      const result = await asyncFn()
      return result
    } finally {
      setLoading(false)
    }
  }
  
  return {
    loading,
    setLoading,
    withLoading
  }
}