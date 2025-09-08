import React from 'react'
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  title?: string
  description?: string
  dismissible?: boolean
  onDismiss?: () => void
  children?: React.ReactNode
}

/**
 * Alert component para feedbacks e notificações
 * 
 * Variantes:
 * - default: Neutro (cinza)
 * - success: Sucesso (verde)
 * - warning: Aviso (amarelo)  
 * - error: Erro (vermelho)
 * - info: Informação (azul)
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ 
    className, 
    variant = 'default', 
    title, 
    description, 
    dismissible = false,
    onDismiss,
    children, 
    ...props 
  }, ref) => {
    const variants = {
      default: {
        container: "border-gray-200 bg-gray-50",
        icon: "text-gray-500",
        title: "text-gray-900",
        description: "text-gray-700"
      },
      success: {
        container: "border-green-200 bg-green-50",
        icon: "text-green-500",
        title: "text-green-900", 
        description: "text-green-700"
      },
      warning: {
        container: "border-yellow-200 bg-yellow-50",
        icon: "text-yellow-600",
        title: "text-yellow-900",
        description: "text-yellow-700"
      },
      error: {
        container: "border-red-200 bg-red-50", 
        icon: "text-red-500",
        title: "text-red-900",
        description: "text-red-700"
      },
      info: {
        container: "border-blue-200 bg-blue-50",
        icon: "text-blue-500", 
        title: "text-blue-900",
        description: "text-blue-700"
      }
    }

    const icons = {
      default: AlertCircle,
      success: CheckCircle,
      warning: AlertTriangle,
      error: AlertCircle,
      info: Info
    }

    const Icon = icons[variant]
    const styles = variants[variant]

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg border p-4",
          styles.container,
          className
        )}
        role="alert"
        {...props}
      >
        <div className="flex">
          {/* Ícone */}
          <div className="flex-shrink-0">
            <Icon className={cn("w-5 h-5", styles.icon)} />
          </div>
          
          {/* Conteúdo */}
          <div className="ml-3 flex-1">
            {title && (
              <h3 className={cn("text-sm font-medium", styles.title)}>
                {title}
              </h3>
            )}
            
            {description && (
              <div className={cn(
                "text-sm",
                title ? "mt-2" : "",
                styles.description
              )}>
                {description}
              </div>
            )}
            
            {children && (
              <div className={cn(
                "text-sm",
                (title || description) ? "mt-2" : "",
                styles.description
              )}>
                {children}
              </div>
            )}
          </div>
          
          {/* Botão de dismiss */}
          {dismissible && onDismiss && (
            <div className="ml-auto flex-shrink-0">
              <button
                type="button"
                className={cn(
                  "inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2",
                  styles.icon,
                  "hover:bg-black/5 focus:ring-black/20"
                )}
                onClick={onDismiss}
                aria-label="Fechar alerta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }
)

Alert.displayName = "Alert"