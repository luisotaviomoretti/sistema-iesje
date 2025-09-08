import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useMatriculaAuth } from '@/features/matricula/hooks/useMatriculaAuth'
import MatriculaLayout from './MatriculaLayout'

interface MatriculaRouteProps {
  children: React.ReactNode
  fallbackPath?: string
}

const MatriculaRoute = ({ children, fallbackPath = '/matricula/login' }: MatriculaRouteProps) => {
  const location = useLocation()
  const { data: session, isLoading } = useMatriculaAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <Navigate 
        to={fallbackPath}
        state={{ from: location.pathname }}
        replace
      />
    )
  }

  // Retorna o children envolto no layout com header
  return (
    <MatriculaLayout>
      {children}
    </MatriculaLayout>
  )
}

export default MatriculaRoute

