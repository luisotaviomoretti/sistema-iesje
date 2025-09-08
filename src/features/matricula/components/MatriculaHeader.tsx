import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMatriculaAuth, useMatriculaLogout } from '@/features/matricula/hooks/useMatriculaAuth'
import { getEscolaColor } from '@/features/matricula/types'
import { LogOut, User, School, Home, ClipboardList, FileText } from 'lucide-react'
import { toast } from 'sonner'

const MatriculaHeader = () => {
  const navigate = useNavigate()
  const { data: session } = useMatriculaAuth()
  const logoutMutation = useMatriculaLogout()
  const [loggingOut, setLoggingOut] = useState(false)

  if (!session) {
    return null
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logoutMutation.mutateAsync()
      toast.success('Logout realizado com sucesso')
      navigate('/matricula/login')
    } catch (error) {
      toast.error('Erro ao fazer logout')
      console.error('Logout error:', error)
    } finally {
      setLoggingOut(false)
    }
  }

  const navigateTo = (path: string) => {
    navigate(path)
  }

  return (
    <header className="bg-white border-b shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo e Título */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <School className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Sistema de Matrículas</h1>
            </div>
            <Badge className={getEscolaColor(session.matriculaUser.escola)}>
              {session.matriculaUser.escola}
            </Badge>
          </div>

          {/* Menu de Navegação */}
          <nav className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Início
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('/nova-matricula')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Nova Matrícula
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateTo('/matriculas-recentes')}
              className="flex items-center gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              Matrículas Recentes
            </Button>
          </nav>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">{session.matriculaUser.nome}</span>
                <span className="sm:hidden">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{session.matriculaUser.nome}</span>
                  <span className="text-xs text-muted-foreground">{session.matriculaUser.email}</span>
                  <Badge className={`mt-2 ${getEscolaColor(session.matriculaUser.escola)}`}>
                    {session.matriculaUser.escola}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Menu Mobile */}
              <div className="md:hidden">
                <DropdownMenuItem onClick={() => navigateTo('/')}>
                  <Home className="h-4 w-4 mr-2" />
                  Início
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('/nova-matricula')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Nova Matrícula
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateTo('/matriculas-recentes')}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Matrículas Recentes
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              
              <DropdownMenuItem 
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {loggingOut ? 'Saindo...' : 'Sair'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

export default MatriculaHeader