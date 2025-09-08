/**
 * Página de Teste de Sincronização de Descontos
 * Permite testar e validar a sincronização entre descontos selecionados
 * e o Resumo de Valores
 */

import { useState } from 'react'
import { ArrowLeft, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { DiscountSyncTest } from '../features/matricula-nova/tests/testDiscountSync'

export function TestDiscountSync() {
  const navigate = useNavigate()
  const [testResults, setTestResults] = useState<any>(null)
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Teste de Sincronização de Descontos
            </h1>
            <p className="text-gray-600">
              Valida que os descontos selecionados são corretamente aplicados no Resumo de Valores,
              incluindo múltiplos descontos com soma e percentuais customizados.
            </p>
            
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-semibold">Ambiente de Teste</p>
                  <p>Esta página executa testes automatizados no sistema de descontos.</p>
                  <p>Os testes não afetam dados reais.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Test Component */}
        <DiscountSyncTest />
        
        {/* Manual Test Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📋 Instruções para Teste Manual
          </h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-400 pl-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Teste 1: Desconto Único
              </h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Acesse a página de Nova Matrícula</li>
                <li>Preencha os dados até chegar na tela de Descontos</li>
                <li>Selecione um desconto (ex: IIR - 10%)</li>
                <li>Verifique se o Resumo de Valores mostra 10% de desconto</li>
                <li>Verifique se o valor final está correto</li>
              </ol>
            </div>
            
            <div className="border-l-4 border-green-400 pl-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Teste 2: Múltiplos Descontos
              </h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Selecione múltiplos descontos (ex: IIR 10% + PAV 15%)</li>
                <li>Verifique se o Resumo mostra 25% total</li>
                <li>Adicione mais descontos até passar de 60%</li>
                <li>Verifique se o limite de 60% é respeitado</li>
              </ol>
            </div>
            
            <div className="border-l-4 border-purple-400 pl-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Teste 3: Percentuais Customizados
              </h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Selecione um desconto customizável (CEP ou Adimplência)</li>
                <li>Ajuste o percentual usando o slider</li>
                <li>Verifique se o Resumo atualiza em tempo real</li>
                <li>Teste diferentes valores (5%, 10%, 15%, etc)</li>
              </ol>
            </div>
            
            <div className="border-l-4 border-orange-400 pl-4">
              <h3 className="font-semibold text-gray-800 mb-2">
                Teste 4: Persistência
              </h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>Configure alguns descontos</li>
                <li>Navegue para o próximo step</li>
                <li>Volte para a tela de descontos</li>
                <li>Verifique se os descontos continuam selecionados</li>
                <li>Verifique se o Resumo mantém os valores</li>
              </ol>
            </div>
          </div>
        </div>
        
        {/* Expected Results */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            ✅ Resultados Esperados
          </h2>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">Comportamentos Corretos</span>
              </div>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Descontos aparecem instantaneamente no Resumo</li>
                <li>• Múltiplos descontos somam corretamente</li>
                <li>• Limite de 60% é respeitado</li>
                <li>• Valores persistem entre navegações</li>
                <li>• Percentuais customizados funcionam</li>
              </ul>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span className="font-semibold text-red-800">Problemas Conhecidos (Corrigidos)</span>
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• ❌ Descontos não apareciam no Resumo</li>
                <li>• ❌ Apenas IDs eram salvos, não percentuais</li>
                <li>• ❌ Sincronização não funcionava</li>
                <li>• ❌ Valores se perdiam ao navegar</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Technical Details */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-3">
            🔧 Detalhes Técnicos da Correção
          </h2>
          
          <div className="font-mono text-xs bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
            <pre>{`// ANTES (Problema):
selectedDiscounts: string[] // Apenas IDs

// DEPOIS (Correção):
selectedDiscounts: Array<{
  id: string
  percentual: number
}> // IDs + Percentuais

// Sincronização no DiscountSelectionStep:
const formData = newSelections.map(s => ({
  id: s.discountId,
  percentual: s.percentualAplicado || 0
}))
form.setValue('selectedDiscounts', formData)

// Processamento no useEnrollmentForm:
const selectedDiscountObjects = selectedDiscounts.map(selection => {
  const discountId = typeof selection === 'object' ? selection.id : selection
  const customPercentual = typeof selection === 'object' ? selection.percentual : null
  
  return {
    ...discount,
    percentual: customPercentual !== null ? customPercentual : discount.percentual
  }
})`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TestDiscountSync