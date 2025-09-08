import React from 'react'
import type { StepProps } from '../../types/forms'
import { FormSkeleton } from '../ui/LoadingSpinner'

/**
 * PLACEHOLDER: Step 0 - Busca de Aluno (Opcional)
 * 
 * Este componente será implementado na Fase 2
 * Por enquanto, apenas renderiza um placeholder
 */
export default function StudentSearchStep(props: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-900">
          Buscar Aluno Existente
        </h2>
        <p className="text-gray-600 mt-2">
          Verifique se o aluno já está cadastrado no sistema
        </p>
      </div>

      {/* Placeholder para busca */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-800 text-center">
          🚧 <strong>Em desenvolvimento</strong> - Busca de alunos será implementada na Fase 2
        </p>
        
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Buscar por CPF
            </label>
            <input 
              type="text"
              placeholder="000.000.000-00"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Buscar por Nome
            </label>
            <input 
              type="text"
              placeholder="Nome do aluno"
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled
            />
          </div>
          
          <button
            disabled
            className="w-full bg-gray-400 text-white px-4 py-2 rounded-md cursor-not-allowed"
          >
            Buscar Aluno
          </button>
        </div>
      </div>

      {/* Opção de pular */}
      <div className="text-center">
        <button
          onClick={props.nextStep}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          Pular busca e cadastrar novo aluno →
        </button>
      </div>

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded text-xs">
          <p><strong>Step:</strong> {props.currentStep} - Busca de Aluno (Opcional)</p>
          <p><strong>Can go next:</strong> {props.canGoNext.toString()}</p>
        </div>
      )}
    </div>
  )
}