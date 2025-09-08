/**
 * Suite de Testes para Sistema de Elegibilidade por CEP
 * 
 * Componente para testar e validar os diferentes casos de uso
 * do sistema de elegibilidade em desenvolvimento.
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

import { useEligibleDiscounts } from '../hooks/useEligibleDiscounts'
import { DiscountEligibilityStatus } from './DiscountEligibilityStatus'
import { IneligibleDiscountsInfo } from './IneligibleDiscountsInfo'
import type { DatabaseDiscount } from '../../matricula-nova/types/api'

// Casos de teste predefinidos
const TEST_CASES = [
  {
    id: 'alta',
    name: 'CEP Maior Renda (Poços)',
    cep: '37701-000',
    expectedCategory: 'alta',
    expectedRules: {
      RES: false,
      CEP: false,
      others: true
    },
    description: 'Deve bloquear RES e CEP automático'
  },
  {
    id: 'baixa', 
    name: 'CEP Menor Renda (Poços)',
    cep: '37702-000',
    expectedCategory: 'baixa',
    expectedRules: {
      RES: false,
      CEP: true,
      others: true
    },
    description: 'Deve bloquear RES mas permitir CEP automático'
  },
  {
    id: 'fora',
    name: 'CEP Fora de Poços',
    cep: '11000-000',
    expectedCategory: 'fora',
    expectedRules: {
      RES: true,
      CEP: false,
      others: true
    },
    description: 'Deve permitir RES mas bloquear CEP automático'
  }
]

// Mock de descontos para teste
const MOCK_DISCOUNTS: DatabaseDiscount[] = [
  {
    id: '1',
    codigo: 'RES',
    nome: 'Alunos de Outras Cidades',
    percentual: 20,
    is_active: true,
    requires_document: true,
    description: 'Desconto para alunos de outras cidades',
    max_cumulative_percentage: 20
  },
  {
    id: '2',
    codigo: 'CEP',
    nome: 'Desconto CEP Automático',
    percentual: 10,
    is_active: true,
    requires_document: false,
    description: 'Desconto automático baseado no CEP',
    max_cumulative_percentage: 10
  },
  {
    id: '3',
    codigo: 'IIR',
    nome: 'Alunos Irmãos Carnal',
    percentual: 10,
    is_active: true,
    requires_document: true,
    description: 'Desconto para irmãos',
    max_cumulative_percentage: 10
  },
  {
    id: '4',
    codigo: 'PASS',
    nome: 'Filhos de Prof. do IESJE Sindicalizados',
    percentual: 100,
    is_active: true,
    requires_document: true,
    description: 'Desconto para filhos de professores IESJE',
    max_cumulative_percentage: 100
  },
  {
    id: '5',
    codigo: 'PBS',
    nome: 'Filhos Prof. Sind. de Outras Instituições',
    percentual: 40,
    is_active: true,
    requires_document: true,
    description: 'Desconto para filhos de professores de outras instituições',
    max_cumulative_percentage: 40
  }
]

interface EligibilityTestSuiteProps {
  onlyInDevelopment?: boolean
}

export const EligibilityTestSuite: React.FC<EligibilityTestSuiteProps> = ({
  onlyInDevelopment = true
}) => {
  const [currentCep, setCurrentCep] = useState('')
  const [testResults, setTestResults] = useState<Record<string, any>>({})
  const [isRunningTests, setIsRunningTests] = useState(false)

  // Só mostrar em desenvolvimento se especificado
  if (onlyInDevelopment && process.env.NODE_ENV !== 'development') {
    return null
  }

  // Hook para testar CEP atual
  const {
    eligibleDiscounts,
    ineligibleDiscounts,
    cepCategory,
    isLoading,
    error,
    stats
  } = useEligibleDiscounts(currentCep, MOCK_DISCOUNTS, {
    enableDebugLogs: true
  })

  // Executar teste de um caso específico
  const runSingleTest = async (testCase: typeof TEST_CASES[0]) => {
    setCurrentCep(testCase.cep)
    
    // Aguardar um pouco para o hook processar
    setTimeout(() => {
      const result = validateTestCase(testCase, {
        eligibleDiscounts,
        ineligibleDiscounts, 
        cepCategory,
        isLoading,
        error
      })
      
      setTestResults(prev => ({
        ...prev,
        [testCase.id]: result
      }))
    }, 1000)
  }

  // Executar todos os testes
  const runAllTests = async () => {
    setIsRunningTests(true)
    setTestResults({})
    
    for (const testCase of TEST_CASES) {
      await runSingleTest(testCase)
      await new Promise(resolve => setTimeout(resolve, 1500)) // Aguardar entre testes
    }
    
    setIsRunningTests(false)
  }

  // Validar resultado de um teste
  const validateTestCase = (testCase: typeof TEST_CASES[0], result: any) => {
    const errors = []
    const warnings = []
    
    // Validar categoria
    if (result.cepCategory !== testCase.expectedCategory) {
      errors.push(`Categoria esperada: ${testCase.expectedCategory}, obtida: ${result.cepCategory}`)
    }
    
    // Validar regras RES
    const hasRES = result.eligibleDiscounts.some((d: any) => d.codigo === 'RES')
    if (hasRES !== testCase.expectedRules.RES) {
      errors.push(`RES deveria ser ${testCase.expectedRules.RES ? 'permitido' : 'bloqueado'}`)
    }
    
    // Validar regras CEP
    const hasCEP = result.eligibleDiscounts.some((d: any) => d.codigo === 'CEP')
    if (hasCEP !== testCase.expectedRules.CEP) {
      errors.push(`CEP automático deveria ser ${testCase.expectedRules.CEP ? 'permitido' : 'bloqueado'}`)
    }
    
    // Validar outros descontos
    const hasOthers = result.eligibleDiscounts.some((d: any) => !['RES', 'CEP'].includes(d.codigo))
    if (!hasOthers && testCase.expectedRules.others) {
      warnings.push('Outros descontos deveriam estar disponíveis')
    }
    
    return {
      passed: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toLocaleTimeString()
    }
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 border rounded-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          🧪 Suite de Testes - Sistema de Elegibilidade
        </h2>
        <Badge variant="outline">
          {process.env.NODE_ENV === 'development' ? 'DESENVOLVIMENTO' : 'PRODUÇÃO'}
        </Badge>
      </div>
      
      {/* Teste Manual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔬 Teste Manual</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={currentCep}
              onChange={(e) => setCurrentCep(e.target.value)}
              placeholder="Digite um CEP para testar (ex: 37701-000)"
              className="flex-1"
            />
            <Button 
              onClick={() => setCurrentCep('')}
              variant="outline"
            >
              Limpar
            </Button>
          </div>
          
          {currentCep && (
            <div className="space-y-4">
              <DiscountEligibilityStatus 
                cepCategory={cepCategory}
                cep={currentCep}
                showDetails={true}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Descontos Elegíveis ({eligibleDiscounts.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {eligibleDiscounts.map(discount => (
                        <div key={discount.id} className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm">{discount.codigo} - {discount.nome}</span>
                        </div>
                      ))}
                      {eligibleDiscounts.length === 0 && (
                        <span className="text-gray-500 text-sm">Nenhum desconto elegível</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Descontos Inelegíveis ({ineligibleDiscounts.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ineligibleDiscounts.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <span className="text-sm">{item.discount.codigo} - {item.reason}</span>
                        </div>
                      ))}
                      {ineligibleDiscounts.length === 0 && (
                        <span className="text-gray-500 text-sm">Nenhum desconto inelegível</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <IneligibleDiscountsInfo 
                ineligibleDiscounts={ineligibleDiscounts}
                showByDefault={true}
              />
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Testes Automatizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🤖 Testes Automatizados</span>
            <Button 
              onClick={runAllTests}
              disabled={isRunningTests}
              className="flex items-center space-x-2"
            >
              {isRunningTests ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Executando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Executar Todos</span>
                </>
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {TEST_CASES.map(testCase => (
              <div key={testCase.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{testCase.name}</h3>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{testCase.cep}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => runSingleTest(testCase)}
                    >
                      Testar
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-3">{testCase.description}</p>
                
                {testResults[testCase.id] && (
                  <div className="bg-gray-50 rounded p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      {testResults[testCase.id].passed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <span className="font-medium">
                        {testResults[testCase.id].passed ? 'PASSOU' : 'FALHOU'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {testResults[testCase.id].timestamp}
                      </span>
                    </div>
                    
                    {testResults[testCase.id].errors.length > 0 && (
                      <div className="space-y-1">
                        {testResults[testCase.id].errors.map((error: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">{error}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {testResults[testCase.id].warnings.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {testResults[testCase.id].warnings.map((warning: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 text-amber-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-sm">{warning}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EligibilityTestSuite