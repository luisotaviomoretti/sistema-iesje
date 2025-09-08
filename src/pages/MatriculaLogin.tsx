import { useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, LogIn } from 'lucide-react'
import { useMatriculaAuth, useMatriculaLogin } from '@/features/matricula/hooks/useMatriculaAuth'

const MatriculaLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const location = useLocation()

  const { data: session, isLoading } = useMatriculaAuth()
  const loginMutation = useMatriculaLogin()

  const from = (location.state as any)?.from || '/nova-matricula'

  console.log('[MatriculaLogin Page] Session state:', { session, isLoading, from })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (session) {
    console.log('[MatriculaLogin Page] Session detected, redirecting to:', from)
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    console.log('[MatriculaLogin Page] Submitting login for:', email)
    try {
      const result = await loginMutation.mutateAsync({ email, password })
      console.log('[MatriculaLogin Page] Login successful, result:', result)
      // redirecionamento via condicional acima
    } catch (err) {
      console.error('[MatriculaLogin Page] Login failed:', err)
      // erro já tratado via estado
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-md space-y-6 p-4">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <LogIn className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Sistema de Matrículas</h1>
            <p className="text-sm text-muted-foreground">Acesso exclusivo para operadores</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>Informe seu e-mail e senha</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@iesje.edu.br"
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
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loginMutation.isPending}
                />
              </div>

              {loginMutation.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    E-mail ou senha inválidos, ou usuário sem permissão.
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

              <div className="text-center text-xs text-muted-foreground">
                É administrador? <Link to="/admin/login" className="text-primary hover:underline">Ir para Painel Administrativo</Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          Instituto São João da Escócia (IESJE)
        </div>
      </div>
    </div>
  )
}

export default MatriculaLogin

