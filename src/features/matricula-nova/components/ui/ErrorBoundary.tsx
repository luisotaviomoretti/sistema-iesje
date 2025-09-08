import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryFallbackProps {
  error?: Error
  errorInfo?: React.ErrorInfo
  resetError: () => void
}

/**
 * Error Boundary para capturar e tratar erros React
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    this.setState({
      error,
      errorInfo
    })

    // Callback opcional para logging
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Em produção, poderia enviar erro para serviço de monitoramento
    if (process.env.NODE_ENV === 'production') {
      // Exemplo: Sentry.captureException(error, { contexts: { react: errorInfo } })
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || DefaultErrorFallback
      
      return (
        <Fallback 
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      )
    }

    return this.props.children
  }
}

/**
 * Componente fallback padrão para erros
 */
function DefaultErrorFallback({ error, errorInfo, resetError }: ErrorBoundaryFallbackProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="text-red-600 text-6xl mb-4">
          ⚠️
        </div>
        
        {/* Error Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Algo deu errado
        </h2>
        
        {/* Error Description */}
        <p className="text-gray-600 mb-6">
          Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
        </p>

        {/* Error Details (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="text-left bg-gray-100 p-4 rounded mb-6 text-sm">
            <summary className="cursor-pointer font-medium text-red-600 mb-2">
              Detalhes do erro (desenvolvimento)
            </summary>
            <div className="space-y-2">
              <div>
                <strong>Erro:</strong>
                <pre className="text-red-600 whitespace-pre-wrap">{error.message}</pre>
              </div>
              {error.stack && (
                <div>
                  <strong>Stack trace:</strong>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-40">
                    {error.stack}
                  </pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component stack:</strong>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-40">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            🔄 Tentar Novamente
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            🔄 Recarregar Página
          </button>
        </div>

        {/* Help Text */}
        <p className="text-xs text-gray-500 mt-4">
          Se o problema persistir, entre em contato com o suporte técnico.
        </p>
      </div>
    </div>
  )
}

/**
 * Error Boundary específico para formulários
 */
export function FormErrorBoundary({ children, onError }: { 
  children: React.ReactNode
  onError?: (error: Error) => void 
}) {
  return (
    <ErrorBoundary
      fallback={FormErrorFallback}
      onError={(error, errorInfo) => {
        if (onError) onError(error)
      }}
    >
      {children}
    </ErrorBoundary>
  )
}

function FormErrorFallback({ error, resetError }: ErrorBoundaryFallbackProps) {
  return (
    <div className="border border-red-200 rounded-lg p-6 bg-red-50">
      <div className="flex">
        <div className="text-red-400 text-2xl mr-3">⚠️</div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-red-800">
            Erro no Formulário
          </h3>
          <p className="text-red-700 mt-1">
            Houve um erro ao processar o formulário. Tente novamente ou recarregue a página.
          </p>
          
          {process.env.NODE_ENV === 'development' && error && (
            <details className="mt-3">
              <summary className="text-sm cursor-pointer text-red-600 font-medium">
                Ver detalhes técnicos
              </summary>
              <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-32 bg-white p-2 rounded border">
                {error.message}
              </pre>
            </details>
          )}
          
          <div className="mt-4">
            <button
              onClick={resetError}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook para capturar erros assíncronos que não são pegos pelo Error Boundary
 */
export function useErrorHandler() {
  return React.useCallback((error: Error) => {
    console.error('Async error caught:', error)
    
    // Em produção, enviar para serviço de monitoramento
    if (process.env.NODE_ENV === 'production') {
      // Exemplo: Sentry.captureException(error)
    }
    
    // Mostrar toast de erro
    // toast.error('Ocorreu um erro inesperado')
  }, [])
}

/**
 * Componente para testar Error Boundary (apenas desenvolvimento)
 */
export function ErrorTester() {
  const [shouldError, setShouldError] = React.useState(false)
  
  if (shouldError) {
    throw new Error('Teste de Error Boundary!')
  }
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <button
      onClick={() => setShouldError(true)}
      className="text-xs bg-red-600 text-white px-2 py-1 rounded"
    >
      🧪 Testar Error
    </button>
  )
}