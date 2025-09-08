import { Outlet, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Home,
  Settings,
  Users,
  FileText,
  MapPin,
  GraduationCap,
  LogOut,
  Menu,
  Shield,
  Route,
  ClipboardList
} from 'lucide-react'
import { useAdminAuth, useAdminLogout, formatRole, getRoleColor } from '@/features/admin/hooks/useAdminAuth'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const AdminLayout = () => {
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const { data: session } = useAdminAuth()
  const logoutMutation = useAdminLogout()

  if (!session) {
    return null
  }

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch (error) {
      console.error('Erro no logout:', error)
    }
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: Home,
      exact: true
    },
    {
      name: 'Matrículas',
      href: '/admin/matriculas',
      icon: ClipboardList,
      requiredRole: 'operador' as const
    },
    {
      name: 'Tipos de Desconto',
      href: '/admin/descontos',
      icon: FileText,
      requiredRole: 'coordenador' as const
    },
    {
      name: 'Trilhos de Desconto',
      href: '/admin/trilhos',
      icon: Route,
      requiredRole: 'operador' as const
    },
    {
      name: 'Configurar CEPs',
      href: '/admin/ceps',
      icon: MapPin,
      requiredRole: 'coordenador' as const
    },
    {
      name: 'Configurar Séries',
      href: '/admin/series',
      icon: GraduationCap,
      requiredRole: 'coordenador' as const
    },
    {
      name: 'Usuários',
      href: '/admin/usuarios',
      icon: Users,
      requiredRole: 'super_admin' as const
    },
    {
      name: 'Configurações',
      href: '/admin/configuracoes',
      icon: Settings,
      requiredRole: 'super_admin' as const
    }
  ]

  // Filtrar navegação baseada nas permissões do usuário
  const allowedNavigation = navigation.filter(item => {
    if (!item.requiredRole) return true
    return checkRolePermission(session.role, item.requiredRole)
  })

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return location.pathname === href
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          {/* Menu Mobile */}
          <Button
            variant="ghost"
            size="sm"
            className="mr-2 lg:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Admin IESJE</h1>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {session.adminUser.nome.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium">{session.adminUser.nome}</p>
                  <p className="w-[200px] truncate text-sm text-muted-foreground">
                    {session.adminUser.email}
                  </p>
                  <Badge variant={getRoleColor(session.role)} className="w-fit text-xs">
                    {formatRole(session.role)}
                  </Badge>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-background transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <div className="flex h-full flex-col pt-14">
            <nav className="flex-1 space-y-1 p-4">
              {allowedNavigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive(item.href, item.exact)
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            {/* Footer da Sidebar */}
            <div className="border-t p-4">
              <div className="text-xs text-muted-foreground">
                <div className="font-medium">IESJE Admin v1.0</div>
                <div>Sistema de Gestão</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay para mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

// Função para verificar hierarquia de permissões (reutilizada do AdminRoute)
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

export default AdminLayout
