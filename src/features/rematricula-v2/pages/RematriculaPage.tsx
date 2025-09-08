/**
 * Página principal de Rematrícula V2
 * Interface simplificada e otimizada
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { useRematriculaForm } from '../hooks/useRematriculaForm'
import { MESSAGES } from '../constants'

export default function RematriculaPage() {
  const navigate = useNavigate()
  const [cpf, setCpf] = useState('')
  const [birthDateHint, setBirthDateHint] = useState('')
  
  const {
    formState,
    validateCPF,
    loadPreviousData,
    isValidating,
    isLoadingData,
    reset
  } = useRematriculaForm()

  // Etapa 1: Validar CPF
  const handleValidateCPF = async () => {
    if (!cpf) return
    await validateCPF(cpf)
  }

  // Etapa 2: Carregar dados anteriores
  const handleLoadData = async () => {
    if (formState.studentType !== 'previous_year') return
    await loadPreviousData(cpf, birthDateHint)
  }

  // Renderiza conteúdo baseado no status
  const renderContent = () => {
    // Estado inicial - Validação de CPF
    if (formState.status === 'idle' || formState.status === 'validating') {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="cpf">CPF do Aluno</Label>
            <Input
              id="cpf"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              disabled={isValidating}
            />
          </div>

          <Button 
            onClick={handleValidateCPF}
            disabled={!cpf || isValidating}
            className="w-full"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                Verificar Elegibilidade
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )
    }

    // CPF validado - Aluno do ano corrente
    if (formState.studentType === 'current_year') {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {MESSAGES.validation.currentYear}
            <br />
            Este aluno já está matriculado no ano letivo atual.
          </AlertDescription>
        </Alert>
      )
    }

    // CPF não encontrado
    if (formState.studentType === 'not_found') {
      return (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {MESSAGES.validation.notFound}
            <br />
            <Button 
              variant="link" 
              className="p-0 h-auto"
              onClick={() => navigate('/nova-matricula')}
            >
              Clique aqui para realizar uma nova matrícula
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    // Aluno elegível - Solicitar data de nascimento
    if (formState.studentType === 'previous_year' && formState.status !== 'editing') {
      return (
        <div className="space-y-4">
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {MESSAGES.validation.previousYear}
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="birthDate">
              Para confirmar a identidade, informe o dia e mês de nascimento (DD/MM)
            </Label>
            <Input
              id="birthDate"
              type="text"
              placeholder="15/03"
              value={birthDateHint}
              onChange={(e) => setBirthDateHint(e.target.value)}
              disabled={isLoadingData}
            />
          </div>

          <Button 
            onClick={handleLoadData}
            disabled={!birthDateHint || isLoadingData}
            className="w-full"
          >
            {isLoadingData ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando dados...
              </>
            ) : (
              <>
                Carregar Dados do Ano Anterior
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )
    }

    // Dados carregados - Mostrar formulário
    if (formState.status === 'editing' && formState.data) {
      return (
        <div className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Dados carregados com sucesso! 
              <br />
              <strong>Aluno:</strong> {formState.data.student?.name}
            </AlertDescription>
          </Alert>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Próximos Passos:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Revisar e confirmar dados pessoais</li>
              <li>Atualizar informações dos responsáveis</li>
              <li>Verificar endereço</li>
              <li>Selecionar série e turno</li>
              <li>Aplicar descontos elegíveis</li>
              <li>Gerar proposta de matrícula</li>
            </ol>
          </div>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={reset}
            >
              Cancelar
            </Button>
            <Button 
              className="flex-1"
              onClick={() => {
                // TODO: Navegar para formulário completo
                alert('Formulário completo será implementado na próxima fase')
              }}
            >
              Continuar para Formulário
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )
    }

    // Estado de erro
    if (formState.status === 'error') {
      return (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {Object.values(formState.errors).join('. ')}
            <br />
            <Button 
              variant="link" 
              className="p-0 h-auto mt-2"
              onClick={reset}
            >
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )
    }

    return null
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Rematrícula - Sistema V2</CardTitle>
          <CardDescription>
            Sistema otimizado e independente para rematrícula de alunos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>

      {/* Debug Info (apenas em desenvolvimento) */}
      {import.meta.env.DEV && (
        <div className="mt-4 p-4 bg-gray-100 rounded text-xs">
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify({
            status: formState.status,
            studentType: formState.studentType,
            hasData: !!formState.data,
            errors: formState.errors
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}