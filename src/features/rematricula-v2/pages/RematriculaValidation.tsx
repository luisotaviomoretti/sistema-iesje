/**
 * Página de validação de CPF para rematrícula
 * Primeira etapa do fluxo de rematrícula
 */

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowRight, AlertCircle, CheckCircle, School, XCircle, Info } from 'lucide-react'
import { cleanCPF, formatCPF } from '../utils/formValidators'
import { StudentValidationService, type ValidationResult } from '../services/studentValidationService'
import { StudentConfirmationModal } from '@/features/enrollment/components/StudentConfirmationModal'
import { useStudentConfirmation } from '@/features/enrollment/hooks/useStudentConfirmation'
import { useQueryClient } from '@tanstack/react-query'
import { prefetchDiscountTypes, prefetchSeries, prefetchTracks } from '@/features/enrollment/prefetch/prefetchers'
import { useMatriculaAuth } from '@/features/matricula/hooks/useMatriculaAuth'
import type { EscolaType } from '@/features/admin/hooks/useSeries'

export function RematriculaValidation() {
  const navigate = useNavigate()
  const confirmation = useStudentConfirmation()
  const [cpf, setCpf] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    status: 'idle',
    hasData: false,
    errors: []
  })

  // Prefetch inteligente (run-once com debounce quando CPF válido)
  const queryClient = useQueryClient()
  const prefetchTriggeredRef = useRef(false)
  const prefetchDebounceRef = useRef<number | null>(null)

  // Escola do operador (se disponível) para prefetch direcionado de séries
  const matriculaSession = useMatriculaAuth()
  const lockedDbEscola = matriculaSession?.data?.matriculaUser?.escola as EscolaType | undefined
  const escolaPrefetch: EscolaType | undefined =
    lockedDbEscola === 'Pelicano' || lockedDbEscola === 'Sete de Setembro'
      ? lockedDbEscola
      : undefined

  // Debug info display
  const [showDebug] = useState(true)

  const handleCPFChange = (value: string) => {
    const cleaned = cleanCPF(value)
    if (cleaned.length <= 11) {
      setCpf(cleaned)
      // Reset validation when CPF changes
      if (validationResult.status !== 'idle') {
        setValidationResult({
          status: 'idle',
          hasData: false,
          errors: []
        })
      }
    }
  }

  // Disparar prefetch quando CPF atinge 11 dígitos (uma única vez por sessão/página)
  useEffect(() => {
    if (cpf.length === 11 && !prefetchTriggeredRef.current) {
      if (prefetchDebounceRef.current) {
        window.clearTimeout(prefetchDebounceRef.current)
      }
      prefetchDebounceRef.current = window.setTimeout(async () => {
        try {
          prefetchTriggeredRef.current = true
          await prefetchDiscountTypes(queryClient)
          await prefetchSeries(queryClient, escolaPrefetch)
          await prefetchTracks(queryClient)
        } catch {
          // silencioso: prefetch não deve quebrar fluxo
        }
      }, 400)
    }
    return () => {
      if (prefetchDebounceRef.current) {
        window.clearTimeout(prefetchDebounceRef.current)
        prefetchDebounceRef.current = null
      }
    }
  }, [cpf, queryClient, escolaPrefetch])

  const handleValidate = async () => {
    // Nesta página não aplicamos validação de dígito verificador.
    // Apenas garantimos 11 dígitos para seguir com a consulta.
    if (cpf.length !== 11) {
      setValidationResult({ status: 'error', hasData: false, errors: ['Informe 11 dígitos numéricos.'] })
      return
    }

    setIsValidating(true)
    setValidationResult({
      status: 'loading',
      hasData: false,
      errors: []
    })

    try {
      // Usar serviço local em vez da Edge Function
      console.log('[RematriculaValidation] Iniciando validação local do CPF:', cpf)
      
      const result = await StudentValidationService.validateStudentType(cpf)
      
      console.log('[RematriculaValidation] Resultado da validação:', result)
      
      setValidationResult(result)

      // Handle navigation based on student type
      if (result.studentType === 'already_enrolled') {
        // Already enrolled - show error
        // Navigation blocked
        console.log('[RematriculaValidation] Aluno já matriculado, bloqueando navegação')
      } else if (result.studentType === 'previous_year') {
        // Previous year student - show confirmation modal
        console.log('[RematriculaValidation] Aluno do ano anterior, abrindo modal de confirmação')
        
        // Buscar dados do aluno para o modal
        const studentData = await confirmation.fetchStudentData(cpf)
        
        if (studentData) {
          console.log('[RematriculaValidation] Dados carregados, abrindo modal:', studentData)
          setShowConfirmationModal(true)
        } else {
          // Fallback direto se não conseguir carregar dados
          console.log('[RematriculaValidation] Falha ao carregar dados, usando redirecionamento direto')
          setTimeout(() => {
            navigate(`/rematricula/detalhe/${cpf}`, {
              state: { studentData: result.studentData }
            })
          }, 1500)
        }
      } else if (result.studentType === 'new') {
        // New student - go to new enrollment
        console.log('[RematriculaValidation] Novo aluno, redirecionando para nova matrícula')
        setTimeout(() => {
          navigate('/nova-matricula', {
            state: { cpf }
          })
        }, 1500)
      }
    } catch (error) {
      console.error('Erro na validação:', error)
      setValidationResult({
        status: 'error',
        hasData: false,
        message: 'Erro ao validar CPF',
        errors: [error.message || 'Erro desconhecido']
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleConfirmStudent = () => {
    console.log('[RematriculaValidation] Confirmando identidade do aluno')
    setShowConfirmationModal(false)
    navigate(`/rematricula/detalhe/${cpf}`, {
      state: { studentData: validationResult.studentData }
    })
  }

  const handleCancelConfirmation = () => {
    console.log('[RematriculaValidation] Cancelando modal')
    setShowConfirmationModal(false)
    confirmation.reset()
  }

  const getStatusColor = () => {
    if (validationResult.studentType === 'already_enrolled') return 'destructive'
    if (validationResult.studentType === 'previous_year') return 'success'
    if (validationResult.studentType === 'new') return 'secondary'
    return 'default'
  }

  const getStatusIcon = () => {
    if (validationResult.studentType === 'already_enrolled') return XCircle
    if (validationResult.studentType === 'previous_year') return CheckCircle
    if (validationResult.studentType === 'new') return Info
    return AlertCircle
  }

  const StatusIcon = getStatusIcon()

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <img
            src="/lovable-uploads/814e5eba-7015-4421-bfe7-7094b96ef294.png"
            alt="Logo Instituto São João da Escócia (IESJE)"
            className="mx-auto h-16 w-16 sm:h-20 sm:w-20 object-contain"
            loading="lazy"
            width={80}
            height={80}
          />
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-primary">
              Sistema de Matrículas IESJE
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Rematrícula e novas matrículas com gestão inteligente de descontos
            </p>
          </div>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader>
            <CardTitle>Verificação de Elegibilidade</CardTitle>
            <CardDescription>
              Digite o CPF do aluno para verificar a situação e iniciar o processo adequado
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* CPF Input */}
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF do Aluno</Label>
              <div className="flex gap-2">
                <Input
                  id="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formatCPF(cpf)}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && cpf.length === 11) {
                      handleValidate()
                    }
                  }}
                  className="text-lg font-mono"
                  disabled={isValidating}
                />
                <Button
                  onClick={handleValidate}
                  disabled={cpf.length !== 11 || isValidating}
                  size="lg"
                  className="min-w-[140px]"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando
                    </>
                  ) : (
                    <>
                      Verificar Elegibilidade
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Digite apenas os números do CPF
              </p>
            </div>

            {/* Navigation Buttons - Nova Matrícula e Matrículas Recentes */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/nova-matricula')}
                className="flex items-center justify-center gap-2"
              >
                <School className="h-4 w-4" />
                Nova Matrícula
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/matriculas-recentes')}
                className="flex items-center justify-center gap-2"
              >
                <Info className="h-4 w-4" />
                Matrículas Recentes
              </Button>
            </div>

            {/* Validation Result */}
            {validationResult.status !== 'idle' && (
              <Alert 
                variant={getStatusColor() as any}
                className="animate-in fade-in-50 duration-500"
              >
                <StatusIcon className="h-4 w-4" />
                <AlertTitle className="flex items-center justify-between">
                  {validationResult.message || 'Processando...'}
                  {validationResult.studentType && (
                    <Badge variant={getStatusColor() as any}>
                      {validationResult.studentType === 'already_enrolled' && 'Já Matriculado'}
                      {validationResult.studentType === 'previous_year' && 'Aluno Veterano'}
                      {validationResult.studentType === 'new' && 'Novo Aluno'}
                    </Badge>
                  )}
                </AlertTitle>
                <AlertDescription className="mt-2">
                  {/* Already Enrolled */}
                  {validationResult.studentType === 'already_enrolled' && validationResult.enrollmentInfo && (
                    <div className="space-y-2 mt-2">
                      <p className="font-medium text-destructive">
                        ⚠️ Este aluno já possui matrícula ativa no sistema!
                      </p>
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                        <div className="space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">Nome:</span> {validationResult.enrollmentInfo.name}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Status da Matrícula:</span>{' '}
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {validationResult.enrollmentInfo.status === 'active' ? 'Ativa' : validationResult.enrollmentInfo.status}
                            </span>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Ano Letivo:</span> {validationResult.enrollmentInfo.year >= 2026 ? '2026' : validationResult.enrollmentInfo.year}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">ID da Matrícula:</span> {validationResult.enrollmentInfo.id}
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mt-3">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          O que você pode fazer:
                        </p>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>• Acessar <a href="/matriculas-recentes" className="underline font-medium">Matrículas Recentes</a> para consultar detalhes</li>
                          <li>• Verificar o status do pagamento no portal do aluno</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Previous Year Student */}
                  {validationResult.studentType === 'previous_year' && validationResult.studentData && (
                    <div className="space-y-2 mt-2">
                      <p className="text-green-600 dark:text-green-400">
                        Aluno encontrado! Redirecionando para o formulário de rematrícula...
                      </p>
                      <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 space-y-1">
                        <p className="text-sm">
                          <span className="font-medium">Nome:</span> {validationResult.studentData.name}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Escola:</span> {validationResult.studentData.escola}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Série Anterior:</span> {validationResult.studentData.previousSeries}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* New Student */}
                  {validationResult.studentType === 'new' && (
                    <div className="space-y-2 mt-2">
                      <p>
                        CPF não encontrado no sistema. Redirecionando para nova matrícula...
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Você será direcionado para o formulário completo de matrícula.
                      </p>
                    </div>
                  )}

                  {/* Errors */}
                  {validationResult.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {validationResult.errors.map((error, index) => (
                        <p key={index} className="text-sm text-destructive">
                          • {error}
                        </p>
                      ))}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Flow Explanation */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-3">
              <h3 className="font-medium text-sm">Como funciona:</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <span className="font-medium">Aluno do ano anterior:</span> Formulário simplificado de rematrícula com dados pré-preenchidos
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-blue-500" />
                  <div>
                    <span className="font-medium">Novo aluno:</span> Formulário completo de nova matrícula
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 mt-0.5 text-red-500" />
                  <div>
                    <span className="font-medium">Já matriculado:</span> Consulte a matrícula existente
                  </div>
                </div>
              </div>
            </div>

            {/* Debug Info */}
            {showDebug && validationResult.status !== 'idle' && (
              <div className="rounded-lg bg-slate-900 text-slate-100 p-4 font-mono text-xs space-y-1">
                <p className="text-slate-400">Debug Info:</p>
                <pre className="overflow-auto">
{JSON.stringify({
  status: validationResult.status,
  studentType: validationResult.studentType,
  hasData: validationResult.hasData,
  errors: validationResult.errors
}, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
      
      {/* Modal de Confirmação de Identidade do Aluno */}
      <StudentConfirmationModal
        isOpen={showConfirmationModal}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmStudent}
        data={confirmation.data}
        isLoading={confirmation.state === 'loading'}
        error={confirmation.error}
      />
    </div>
  )
}

export default RematriculaValidation
