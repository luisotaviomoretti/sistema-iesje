import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'

interface AdminRouteProps {
  children: React.ReactNode
  requiredRole?: 'super_admin' | 'coordenador' | 'operador'
  fallbackPath?: string
}

const AdminRoute = ({ 
  children, 
  requiredRole = 'operador',
  fallbackPath = '/admin/login' 
}: AdminRouteProps) => {
  const location = useLocation()
  const { data: session, isLoading } = useAdminAuth()

  // Mostrar loading enquanto verifica autenticação
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

  // Se não está autenticado, redirecionar para login
  if (!session) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }} 
        replace 
      />
    )
  }

  // Verificar se o usuário tem o nível mínimo necessário
  const hasRequiredRole = checkRolePermission(session.role, requiredRole)
  
  if (!hasRequiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão suficiente para acessar esta área.
          </p>
          <p className="text-sm text-muted-foreground">
            Nível necessário: <span className="font-medium">{formatRole(requiredRole)}</span>
            <br />
            Seu nível: <span className="font-medium">{formatRole(session.role)}</span>
          </p>
          <div className="pt-4">
            <button
              onClick={() => window.history.back()}
              className="text-primary hover:underline text-sm"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

// Função para verificar hierarquia de permissões
function checkRolePermission(
  userRole: 'super_admin' | 'coordenador' | 'operador',
  requiredRole: 'super_admin' | 'coordenador' | 'operador'
): boolean {
  const roleHierarchy = {
    'operador': 1,
    'coordenador': 2, 
    'super_admin': 3
  }
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

// Função utilitária para formatar nomes dos roles
function formatRole(role: string): string {
  switch (role) {
    case 'super_admin':
      return 'Super Administrador'
    case 'coordenador':
      return 'Coordenador'
    case 'operador':
      return 'Operador'
    default:
      return role
  }
}

export default AdminRoute