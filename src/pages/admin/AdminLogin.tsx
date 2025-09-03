import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield } from 'lucide-react'
import { useAdminAuth, useAdminLogin } from '@/features/admin/hooks/useAdminAuth'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  const { data: session, isLoading: isCheckingAuth } = useAdminAuth()
  const loginMutation = useAdminLogin()

  // Se já está autenticado, redirecionar para dashboard
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      return
    }

    try {
      await loginMutation.mutateAsync({ email, password })
      // O redirecionamento será feito automaticamente pelo useAdminAuth
    } catch (error) {
      // Erro já é tratado pelo mutation
      console.error('Erro no login:', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-6 p-4">
        {/* Logo e Título */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Instituto São João da Escócia (IESJE)
            </p>
          </div>
        </div>

        {/* Formulário de Login */}
        <Card>
          <CardHeader>
            <CardTitle>Acesso Administrativo</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@iesje.edu.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>

              {loginMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {loginMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full"
                disabled={loginMutation.isPending || !email || !password}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Informações de Acesso */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-sm space-y-2">
              <h3 className="font-medium">Níveis de Acesso:</h3>
              <div className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <span>• Super Admin:</span>
                  <span className="text-xs">Acesso total</span>
                </div>
                <div className="flex justify-between">
                  <span>• Coordenador:</span>
                  <span className="text-xs">Aprovar descontos</span>
                </div>
                <div className="flex justify-between">
                  <span>• Operador:</span>
                  <span className="text-xs">Consulta apenas</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usuários de Teste (apenas em desenvolvimento) */}
        {import.meta.env.DEV && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="text-xs space-y-2">
                <h4 className="font-medium">Usuários de Teste:</h4>
                <div className="space-y-1 text-muted-foreground">
                  <div>admin@iesje.edu.br (Super Admin)</div>
                  <div>coordenacao@iesje.edu.br (Coordenador)</div>
                  <div>secretaria@iesje.edu.br (Operador)</div>
                </div>
                <p className="text-xs text-amber-600">
                  * Apenas visível em desenvolvimento
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          Sistema de Gestão de Matrículas e Descontos
        </div>
      </div>
    </div>
  )
}

export default AdminLogin