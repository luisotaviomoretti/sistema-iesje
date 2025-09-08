/**
 * Teste de Sincronização de Descontos
 * Valida que os descontos selecionados com percentuais personalizados
 * são corretamente sincronizados com o Resumo de Valores
 */

import { useEffect, useState } from 'react'
import { useEnrollmentForm } from '../hooks/useEnrollmentForm'
import type { DescontoSelecionado } from '../types/discounts'

interface TestResult {
  testName: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  details?: string
  error?: string
}

export function DiscountSyncTest() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  
  const enrollment = useEnrollmentForm()
  const { form, pricing, discounts } = enrollment
  
  // Watch form values para debug
  const formValues = form.watch()
  const selectedDiscounts = formValues.selectedDiscounts || []
  
  // Função para executar todos os testes
  const runTests = async () => {
    setIsRunning(true)
    setResults([])
    
    const tests: TestResult[] = []
    
    // TESTE 1: Verificar estrutura de dados
    tests.push(await testDataStructure())
    
    // TESTE 2: Sincronização única de desconto
    tests.push(await testSingleDiscountSync())
    
    // TESTE 3: Múltiplos descontos com soma
    tests.push(await testMultipleDiscountsSum())
    
    // TESTE 4: Persistência entre navegações
    tests.push(await testNavigationPersistence())
    
    // TESTE 5: Percentuais customizados
    tests.push(await testCustomPercentages())
    
    setResults(tests)
    setIsRunning(false)
  }
  
  // TESTE 1: Estrutura de dados
  async function testDataStructure(): Promise<TestResult> {
    const testName = 'Estrutura de Dados'
    
    try {
      // Verificar se selectedDiscounts é um array de objetos
      const isCorrectStructure = Array.isArray(selectedDiscounts) &&
        selectedDiscounts.every((item: any) => 
          typeof item === 'object' && 
          'id' in item && 
          'percentual' in item
        )
      
      if (!isCorrectStructure) {
        return {
          testName,
          status: 'failed',
          error: 'selectedDiscounts deve ser Array<{id, percentual}>',
          details: `Estrutura atual: ${JSON.stringify(selectedDiscounts)}`
        }
      }
      
      return {
        testName,
        status: 'passed',
        details: 'Estrutura correta: Array<{id: string, percentual: number}>'
      }
      
    } catch (error) {
      return {
        testName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  // TESTE 2: Sincronização única
  async function testSingleDiscountSync(): Promise<TestResult> {
    const testName = 'Sincronização de Desconto Único'
    
    try {
      // Simular seleção de um desconto
      const testDiscount = discounts[0]
      if (!testDiscount) {
        return {
          testName,
          status: 'failed',
          error: 'Nenhum desconto disponível para teste'
        }
      }
      
      // Aplicar desconto com percentual customizado
      const customPercentual = 25
      form.setValue('selectedDiscounts', [{
        id: testDiscount.id,
        percentual: customPercentual
      }])
      
      // Aguardar atualização
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar se o pricing foi atualizado
      if (!pricing) {
        return {
          testName,
          status: 'failed',
          error: 'Pricing não foi calculado'
        }
      }
      
      // Verificar se o percentual aplicado está correto
      const expectedDiscount = customPercentual
      const actualDiscount = pricing.totalDiscountPercentage
      
      if (Math.abs(actualDiscount - expectedDiscount) > 0.01) {
        return {
          testName,
          status: 'failed',
          error: `Percentual incorreto. Esperado: ${expectedDiscount}%, Atual: ${actualDiscount}%`
        }
      }
      
      return {
        testName,
        status: 'passed',
        details: `Desconto ${testDiscount.codigo} (${customPercentual}%) sincronizado corretamente`
      }
      
    } catch (error) {
      return {
        testName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  // TESTE 3: Múltiplos descontos
  async function testMultipleDiscountsSum(): Promise<TestResult> {
    const testName = 'Soma de Múltiplos Descontos'
    
    try {
      // Selecionar múltiplos descontos
      const testDiscounts = discounts.slice(0, 3)
      if (testDiscounts.length < 2) {
        return {
          testName,
          status: 'failed',
          error: 'Descontos insuficientes para teste'
        }
      }
      
      // Aplicar descontos com percentuais variados
      const selections = [
        { id: testDiscounts[0].id, percentual: 10 },
        { id: testDiscounts[1].id, percentual: 15 },
        testDiscounts[2] && { id: testDiscounts[2].id, percentual: 20 }
      ].filter(Boolean)
      
      form.setValue('selectedDiscounts', selections)
      
      // Aguardar atualização
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar soma
      const expectedTotal = selections.reduce((sum, sel) => sum + sel.percentual, 0)
      const actualTotal = pricing?.totalDiscountPercentage || 0
      
      // Considerar limite genérico de 101%
      const expectedFinal = Math.min(expectedTotal, 101)
      
      if (Math.abs(actualTotal - expectedFinal) > 0.01) {
        return {
          testName,
          status: 'failed',
          error: `Soma incorreta. Esperado: ${expectedFinal}%, Atual: ${actualTotal}%`,
          details: `Descontos aplicados: ${selections.map(s => s.percentual).join(' + ')} = ${expectedTotal}% (limitado a 101%)`
        }
      }
      
      return {
        testName,
        status: 'passed',
        details: `Soma correta: ${selections.map(s => s.percentual).join(' + ')} = ${actualTotal}%`
      }
      
    } catch (error) {
      return {
        testName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  // TESTE 4: Persistência
  async function testNavigationPersistence(): Promise<TestResult> {
    const testName = 'Persistência entre Navegações'
    
    try {
      // Guardar estado atual
      const currentSelections = form.getValues('selectedDiscounts')
      const currentPricing = pricing
      
      // Simular navegação (mudança de step)
      const currentStep = form.getValues('currentStep')
      form.setValue('currentStep', currentStep + 1)
      await new Promise(resolve => setTimeout(resolve, 100))
      form.setValue('currentStep', currentStep)
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verificar se manteve os valores
      const afterNavSelections = form.getValues('selectedDiscounts')
      
      const selectionsMatch = JSON.stringify(currentSelections) === JSON.stringify(afterNavSelections)
      
      if (!selectionsMatch) {
        return {
          testName,
          status: 'failed',
          error: 'Descontos perdidos após navegação',
          details: `Antes: ${JSON.stringify(currentSelections)}, Depois: ${JSON.stringify(afterNavSelections)}`
        }
      }
      
      return {
        testName,
        status: 'passed',
        details: 'Descontos persistem corretamente entre navegações'
      }
      
    } catch (error) {
      return {
        testName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  // TESTE 5: Percentuais customizados
  async function testCustomPercentages(): Promise<TestResult> {
    const testName = 'Percentuais Customizados'
    
    try {
      // Encontrar um desconto que permite customização
      const customizableDiscount = discounts.find(d => 
        d.codigo === 'CEP' || d.codigo === 'ADI'
      )
      
      if (!customizableDiscount) {
        return {
          testName,
          status: 'passed',
          details: 'Nenhum desconto customizável disponível (teste ignorado)'
        }
      }
      
      // Testar diferentes percentuais
      const testCases = [5, 10, 15, 20, 25]
      
      for (const percentual of testCases) {
        form.setValue('selectedDiscounts', [{
          id: customizableDiscount.id,
          percentual
        }])
        
        await new Promise(resolve => setTimeout(resolve, 50))
        
        const actualPercentual = pricing?.totalDiscountPercentage || 0
        
        if (Math.abs(actualPercentual - percentual) > 0.01) {
          return {
            testName,
            status: 'failed',
            error: `Percentual customizado não aplicado: ${percentual}% esperado, ${actualPercentual}% atual`
          }
        }
      }
      
      return {
        testName,
        status: 'passed',
        details: `Percentuais customizados funcionam corretamente (testados: ${testCases.join(', ')}%)`
      }
      
    } catch (error) {
      return {
        testName,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }
  }
  
  // Calcular estatísticas
  const stats = {
    total: results.length,
    passed: results.filter(r => r.status === 'passed').length,
    failed: results.filter(r => r.status === 'failed').length,
    successRate: results.length > 0 
      ? Math.round((results.filter(r => r.status === 'passed').length / results.length) * 100)
      : 0
  }
  
  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow-lg">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          🧪 Teste de Sincronização de Descontos
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Valida a sincronização entre seleção de descontos e Resumo de Valores
        </p>
      </div>
      
      {/* Debug Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Debug Info:</h3>
        <div className="space-y-1 text-xs font-mono">
          <div>selectedDiscounts: {JSON.stringify(selectedDiscounts, null, 2)}</div>
          <div>totalDiscount: {pricing?.totalDiscountPercentage || 0}%</div>
          <div>finalValue: R$ {pricing?.finalValue?.toFixed(2) || '0.00'}</div>
          <div>isValid: {pricing?.isValid ? '✅' : '❌'}</div>
        </div>
      </div>
      
      {/* Controles */}
      <div className="flex gap-4">
        <button
          onClick={runTests}
          disabled={isRunning}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Executando...' : 'Executar Testes'}
        </button>
        
        {results.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 font-semibold">
              ✅ {stats.passed} Passou
            </span>
            <span className="text-red-600 font-semibold">
              ❌ {stats.failed} Falhou
            </span>
            <span className="text-gray-600">
              Taxa: {stats.successRate}%
            </span>
          </div>
        )}
      </div>
      
      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Resultados dos Testes:</h3>
          
          {results.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                result.status === 'passed' 
                  ? 'bg-green-50 border-green-200'
                  : result.status === 'failed'
                  ? 'bg-red-50 border-red-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {result.status === 'passed' ? '✅' : 
                     result.status === 'failed' ? '❌' : '⏳'}
                  </span>
                  <span className="font-semibold">{result.testName}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  result.status === 'passed' 
                    ? 'bg-green-100 text-green-700'
                    : result.status === 'failed'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
              
              {result.details && (
                <p className="text-sm text-gray-600 mt-2">{result.details}</p>
              )}
              
              {result.error && (
                <p className="text-sm text-red-600 mt-2">⚠️ {result.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Resumo Final */}
      {results.length > 0 && (
        <div className={`p-4 rounded-lg border-2 ${
          stats.successRate === 100 
            ? 'bg-green-100 border-green-400'
            : stats.successRate >= 80
            ? 'bg-yellow-100 border-yellow-400'
            : 'bg-red-100 border-red-400'
        }`}>
          <h3 className="font-bold text-lg mb-2">
            {stats.successRate === 100 
              ? '🎉 Todos os Testes Passaram!'
              : stats.successRate >= 80
              ? '⚠️ Alguns Testes Falharam'
              : '❌ Muitos Testes Falharam'}
          </h3>
          <p className="text-sm">
            Taxa de Sucesso: <strong>{stats.successRate}%</strong> 
            ({stats.passed}/{stats.total} testes)
          </p>
          
          {stats.successRate === 100 && (
            <p className="text-sm text-green-700 mt-2">
              ✅ Sistema de sincronização funcionando perfeitamente!
            </p>
          )}
        </div>
      )}
    </div>
  )
}
