import { useCurrentUser, useCurrentUserAsync } from '@/features/enrollment/hooks/useCurrentUser'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAdminLogin, useAdminLogout } from '@/features/admin/hooks/useAdminAuth'
import { useState } from 'react'
import { toast } from 'sonner'
import { User, Shield, UserX, Loader2 } from 'lucide-react'

/**
 * Página de teste para o sistema de detecção de usuário
 * Permite testar os 3 tipos de usuário: admin, matricula e anonymous
 */
export default function TestUserDetection() {
  const currentUser = useCurrentUser()
  const { userInfo, isLoading, isAdmin, isMatricula, isAnonymous } = useCurrentUserAsync()
  const loginMutation = useAdminLogin()
  const logoutMutation = useAdminLogout()
  
  const [testEmail, setTestEmail] = useState('')
  const [testPassword, setTestPassword] = useState('')
  
  const handleTestLogin = async () => {
    if (!testEmail || !testPassword) {
      toast.error('Preencha email e senha para teste')
      return
    }
    
    try {
      await loginMutation.mutateAsync({ email: testEmail, password: testPassword })
      toast.success('Login realizado com sucesso!')
    } catch (error: any) {
      toast.error(`Erro no login: ${error.message}`)
    }
  }
  
  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
      toast.success('Logout realizado com sucesso!')
    } catch (error: any) {
      toast.error(`Erro no logout: ${error.message}`)
    }
  }
  
  const getUserIcon = () => {
    if (currentUser.type === 'admin') return <Shield className="w-5 h-5" />
    if (currentUser.type === 'matricula') return <User className="w-5 h-5" />
    return <UserX className="w-5 h-5" />
  }
  
  const getUserBadgeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'destructive'
      case 'matricula': return 'default'
      default: return 'secondary'
    }
  }
  
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Teste de Detecção de Usuário</h1>
      
      {/* Status Atual - Hook Síncrono */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getUserIcon()}
            Status do Usuário Atual (Hook Síncrono)
          </CardTitle>
          <CardDescription>
            Informações detectadas pelo hook useCurrentUser()
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Tipo:</span>
              <Badge variant={getUserBadgeColor(currentUser.type)}>
                {currentUser.type.toUpperCase()}
              </Badge>
            </div>
            
            {currentUser.id && (
              <div className="flex items-center justify-between">
                <span className="font-medium">ID:</span>
                <code className="text-sm bg-muted px-2 py-1 rounded">
                  {currentUser.id}
                </code>
              </div>
            )}
            
            {currentUser.email && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Email:</span>
                <span className="text-sm">{currentUser.email}</span>
              </div>
            )}
            
            {currentUser.name && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Nome:</span>
                <span className="text-sm">{currentUser.name}</span>
              </div>
            )}
            
            {currentUser.type === 'anonymous' && (
              <div className="text-sm text-muted-foreground italic">
                Nenhum usuário logado - matrícula será registrada como anônima
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Status Atual - Hook Assíncrono */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
            Status do Usuário (Hook Assíncrono)
          </CardTitle>
          <CardDescription>
            Informações detectadas pelo hook useCurrentUserAsync()
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Carregando informações do usuário...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Badge variant={isAdmin ? 'destructive' : 'outline'}>
                  Admin: {isAdmin ? 'Sim' : 'Não'}
                </Badge>
                <Badge variant={isMatricula ? 'default' : 'outline'}>
                  Matrícula: {isMatricula ? 'Sim' : 'Não'}
                </Badge>
                <Badge variant={isAnonymous ? 'secondary' : 'outline'}>
                  Anônimo: {isAnonymous ? 'Sim' : 'Não'}
                </Badge>
              </div>
              
              <div className="pt-2 border-t">
                <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                  {JSON.stringify(userInfo, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Simulação de Login/Logout */}
      <Card>
        <CardHeader>
          <CardTitle>Simulação de Login/Logout</CardTitle>
          <CardDescription>
            Teste o sistema com diferentes tipos de usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentUser.type === 'anonymous' ? (
            <div className="space-y-4">
              <div className="grid gap-4">
                <input
                  type="email"
                  placeholder="Email do usuário admin ou matrícula"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="px-3 py-2 border rounded"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={testPassword}
                  onChange={(e) => setTestPassword(e.target.value)}
                  className="px-3 py-2 border rounded"
                />
              </div>
              
              <Button 
                onClick={handleTestLogin}
                disabled={loginMutation.isPending}
                className="w-full"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fazendo login...
                  </>
                ) : (
                  'Fazer Login'
                )}
              </Button>
              
              <div className="text-sm text-muted-foreground">
                <p>Exemplos de usuários para teste:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Admin: Use credenciais de admin_users</li>
                  <li>Matrícula: Use credenciais de matricula_users</li>
                  <li>Anônimo: Não faça login</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded">
                <p className="text-sm">
                  Você está logado como <strong>{currentUser.type}</strong>
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentUser.email}
                </p>
              </div>
              
              <Button 
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                variant="outline"
                className="w-full"
              >
                {logoutMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Fazendo logout...
                  </>
                ) : (
                  'Fazer Logout'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Informações sobre o rastreamento */}
      <Card className="mt-6 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-900">Como Funciona o Rastreamento</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            Quando uma matrícula for criada, as seguintes informações serão salvas automaticamente:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>created_by_user_id:</strong> {currentUser.id || 'null'}</li>
            <li><strong>created_by_user_email:</strong> {currentUser.email || 'null'}</li>
            <li><strong>created_by_user_name:</strong> {currentUser.name || 'null'}</li>
            <li><strong>created_by_user_type:</strong> {currentUser.type}</li>
          </ul>
          <p className="pt-2 text-xs text-blue-600">
            Nota: Este rastreamento é invisível para o usuário final durante o processo de matrícula.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}