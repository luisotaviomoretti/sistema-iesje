import React from 'react'
import { DollarSign, Book, Package, School, Info } from 'lucide-react'
import { Card, CardContent } from './Card'

interface PricingCardProps {
  valorComMaterial: number
  valorSemMaterial?: number
  valorMaterial?: number
  escola?: string
  serie?: string
  className?: string
  annualMode?: boolean
}

export function PricingCard({
  valorComMaterial,
  valorSemMaterial,
  valorMaterial,
  escola,
  serie,
  className = "",
  annualMode = false
}: PricingCardProps) {
  // Calcular valores se não fornecidos explicitamente
  const valorComMaterialFinal = valorComMaterial || 0
  const valorSemMaterialFinal = valorSemMaterial || valorComMaterialFinal
  const valorMaterialFinal = valorMaterial || Math.max(0, valorComMaterialFinal - valorSemMaterialFinal)

  // Se não temos breakdown, assumir que valorComMaterial é completo
  const hasBreakdown = valorSemMaterial !== undefined && valorMaterial !== undefined
  
  return (
    <Card className={`border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-lg hover:shadow-xl transition-all duration-300 ${className}`}>
      <CardContent className="p-6 space-y-5">
        {/* Header */}
        <div className="text-center pb-4 border-b border-purple-100">
          <h3 className="font-bold text-xl text-purple-900 mb-1">{serie || 'Série Selecionada'}</h3>
          {escola && (
            <div className="flex items-center justify-center gap-2 text-purple-600 mt-2">
              <School className="w-4 h-4" />
              <p className="text-sm font-medium">{escola}</p>
            </div>
          )}
        </div>

        {/* Valor Principal (Com Material) */}
        <div className="bg-gradient-to-r from-purple-100 to-purple-50 rounded-xl p-5 border border-purple-200 hover:from-purple-200 hover:to-purple-100 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-200 rounded-lg hover:bg-purple-300 transition-colors duration-200">
                <Package className="w-6 h-6 text-purple-700" />
              </div>
              <div>
                <span className="font-semibold text-purple-800 text-lg">
                  {annualMode ? 'Anuidade Completa' : 'Mensalidade Completa'}
                </span>
                <p className="text-xs text-purple-600 mt-1">com material didático</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-purple-900 mb-1">
                R$ {valorComMaterialFinal.toLocaleString('pt-BR', { 
                  minimumFractionDigits: 2 
                })}
              </p>
              <p className="text-xs text-purple-600 font-medium">{annualMode ? 'valor anual' : 'valor mensal'}</p>
            </div>
          </div>
        </div>

        {/* Breakdown dos Valores */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-purple-700 mb-3">
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">Composição do valor:</span>
          </div>

          {/* Mensalidade/Anuidade Base */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors duration-200 group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg group-hover:bg-gray-300 transition-colors duration-200">
                <DollarSign className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <span className="font-medium text-gray-800">{annualMode ? 'Anuidade Base' : 'Mensalidade Base'}</span>
                <p className="text-xs text-gray-500 mt-1">ensino + estrutura</p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900 group-hover:text-purple-900 transition-colors duration-200">
              R$ {valorSemMaterialFinal.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2 
              })}
            </span>
          </div>

          {/* Material Didático */}
          <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors duration-200 group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-200 rounded-lg group-hover:bg-gray-300 transition-colors duration-200">
                <Book className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <span className="font-medium text-gray-800">Material Didático</span>
                <p className="text-xs text-gray-500 mt-1">{annualMode ? 'valor anual • livros + apostilas' : 'livros + apostilas'}</p>
              </div>
            </div>
            <span className="text-lg font-bold text-gray-900 group-hover:text-purple-900 transition-colors duration-200">
              R$ {valorMaterialFinal.toLocaleString('pt-BR', { 
                minimumFractionDigits: 2 
              })}
            </span>
          </div>
        </div>

        {/* Indicador Visual */}
        <div className="mt-5 pt-4 border-t border-purple-100">
          <div className="flex items-center justify-center gap-2 text-xs text-purple-600">
            <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
            <span className="font-medium">Valores base antes dos descontos</span>
          </div>
        </div>

        {/* Info adicional se breakdown não disponível */}
        {!hasBreakdown && valorMaterialFinal === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-blue-700">
                <p className="text-xs font-medium mb-1">Informação do Sistema</p>
                <p className="text-xs">
                  Breakdown detalhado não disponível. Valor exibido é o total da mensalidade.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PricingCard