import { useState, useEffect } from 'react'
import { useCurrentUser } from '@/features/enrollment/hooks/useCurrentUser'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { 
  CheckCircle, 
  User, 
  Shield, 
  UserX, 
  RefreshCw,
  Info,
  Database,
  Clock
} from 'lucide-react'

interface EnrollmentWithUser {
  id: string
  student_name: string
  created_at: string
  created_by_user_id: string | null
  created_by_user_email: string | null
  created_by_user_name: string | null
  created_by_user_type: string
}

/**
 * Página de teste para verificar o rastreamento de usuário nas matrículas
 * Mostra as últimas matrículas e quem as criou
 */
export default function TestEnrollmentTracking() {
  const currentUser = useCurrentUser()
  const [enrollments, setEnrollments] = useState<EnrollmentWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [testMode, setTestMode] = useState(false)
  
  // Carregar matrículas recentes
  const loadEnrollments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          id,
          student_name,
          created_at,
          created_by_user_id,
          created_by_user_email,
          created_by_user_name,
          created_by_user_type
        `)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      setEnrollments(data || [])
    } catch (error: any) {
      toast.error('Erro ao carregar matrículas: ' + error.message)
    } finally {
      setLoading(false)
    }
  }
  
  // Criar matrícula de teste
  const createTestEnrollment = async () => {
    setTestMode(true)
    try {
      const testData = {
        // Dados mínimos obrigatórios
        student_name: `Teste ${currentUser.type} - ${new Date().toLocaleTimeString()}`,
        student_cpf: Math.random().toString().slice(2, 13),
        student_birth_date: '2010-01-01',
        series_id: 'test-series',
        series_name: 'Série Teste',
        track_id: 'test-track',
        track_name: 'Trilho Teste',
        guardian1_name: 'Responsável Teste',
        guardian1_cpf: Math.random().toString().slice(2, 13),
        guardian1_phone: '11999999999',
        guardian1_email: 'teste@example.com',
        guardian1_relationship: 'Pai',
        address_cep: '01310-100',
        address_street: 'Av. Paulista',
        address_number: '1000',
        address_district: 'Bela Vista',
        address_city: 'São Paulo',
        address_state: 'SP',
        base_value: 1000,
        final_monthly_value: 850,
        
        // Dados de rastreamento de usuário
        created_by_user_id: currentUser.id,
        created_by_user_email: currentUser.email,
        created_by_user_name: currentUser.name,
        created_by_user_type: currentUser.type
      }
      
      const { data, error } = await supabase
        .from('enrollments')
        .insert(testData)
        .select()
        .single()
      
      if (error) throw error
      
      toast.success('Matrícula de teste criada com sucesso!')
      await loadEnrollments() // Recarregar lista
      
    } catch (error: any) {
      toast.error('Erro ao criar matrícula de teste: ' + error.message)
    } finally {
      setTestMode(false)
    }
  }
  
  useEffect(() => {
    loadEnrollments()
  }, [])
  
  const getUserIcon = (type: string) => {
    switch (type) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'matricula': return <User className="w-4 h-4" />
      default: return <UserX className="w-4 h-4" />
    }
  }
  
  const getUserBadgeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'destructive'
      case 'matricula': return 'default'
      default: return 'secondary'
    }
  }
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Teste de Rastreamento em Matrículas</h1>
      
      {/* Status do Usuário Atual */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentUser.type === 'admin' && <Shield className="w-5 h-5" />}
            {currentUser.type === 'matricula' && <User className="w-5 h-5" />}
            {currentUser.type === 'anonymous' && <UserX className="w-5 h-5" />}
            Usuário Atual
          </CardTitle>
          <CardDescription>
            Informações que serão salvas nas próximas matrículas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Tipo:</span>
              <Badge variant={getUserBadgeColor(currentUser.type)}>
                {currentUser.type.toUpperCase()}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">ID:</span>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {currentUser.id || 'null'}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Email:</span>
              <span className="text-sm">{currentUser.email || 'null'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Nome:</span>
              <span className="text-sm">{currentUser.name || 'null'}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={createTestEnrollment}
              disabled={testMode}
              className="w-full"
            >
              {testMode ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Criando matrícula de teste...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Criar Matrícula de Teste
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Cria uma matrícula de teste com os dados do usuário atual
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de Matrículas Recentes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Matrículas Recentes com Rastreamento</CardTitle>
            <CardDescription>
              Últimas 10 matrículas mostrando quem as criou
            </CardDescription>
          </div>
          <Button 
            onClick={loadEnrollments}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando matrículas...
            </div>
          ) : enrollments.length === 0 ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Nenhuma matrícula encontrada. Crie uma matrícula de teste para ver o rastreamento em ação.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div 
                  key={enrollment.id} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{enrollment.student_name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {formatDate(enrollment.created_at)}
                        </span>
                      </div>
                    </div>
                    <Badge variant={getUserBadgeColor(enrollment.created_by_user_type)}>
                      {getUserIcon(enrollment.created_by_user_type)}
                      <span className="ml-1">{enrollment.created_by_user_type}</span>
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm bg-muted/50 rounded p-2">
                    <div>
                      <span className="text-muted-foreground">Criado por:</span>
                      <p className="font-mono text-xs mt-1">
                        {enrollment.created_by_user_name || 'Anônimo'}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-mono text-xs mt-1">
                        {enrollment.created_by_user_email || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {enrollment.created_by_user_id && (
                    <div className="text-xs text-muted-foreground">
                      ID: <code className="bg-muted px-1 rounded">
                        {enrollment.created_by_user_id}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Informações sobre o Sistema */}
      <Alert className="mt-6">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Sistema de Rastreamento Ativo!</strong>
          <br />
          Todas as matrículas criadas a partir de agora registram automaticamente:
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>ID do usuário que criou a matrícula</li>
            <li>Email do usuário</li>
            <li>Nome do usuário</li>
            <li>Tipo de usuário (admin, matricula ou anonymous)</li>
          </ul>
          <p className="mt-2">
            Este rastreamento é <strong>totalmente invisível</strong> para o usuário final durante o processo de matrícula.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  )
}