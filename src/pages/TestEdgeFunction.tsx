import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'

const TestEdgeFunction = () => {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testFunction = async () => {
    setLoading(true)
    setResult(null)
    
    try {
      // Verificar sessão
      const { data: sessionData } = await supabase.auth.getSession()
      console.log('Session:', sessionData?.session)
      
      if (!sessionData?.session) {
        setResult({ error: 'Não está logado' })
        return
      }

      // Verificar se é admin
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', sessionData.session.user.email)
        .single()
      
      console.log('Admin user:', adminUser)
      
      // Chamar Edge Function
      console.log('Calling Edge Function...')
      const { data, error } = await supabase.functions.invoke('create_matricula_user', {
        body: {
          email: `test${Date.now()}@iesje.edu.br`,
          nome: 'Teste Edge Function',
          escola: 'Pelicano',
          password: 'senha123456',
          ativo: true
        }
      })

      console.log('Edge Function response:', { data, error })
      
      if (error) {
        setResult({ error: error.message })
      } else {
        setResult(data)
      }
    } catch (err: any) {
      console.error('Test error:', err)
      setResult({ error: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Teste Edge Function</h1>
      
      <Button onClick={testFunction} disabled={loading}>
        {loading ? 'Testando...' : 'Testar Criação de Usuário'}
      </Button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default TestEdgeFunction