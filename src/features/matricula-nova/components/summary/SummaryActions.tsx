import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Send, 
  CheckCircle,
  FileText,
  Eye,
  Mail,
  Save,
  AlertTriangle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface SummaryActionsProps {
  onGeneratePdf: () => Promise<void>
  onSubmit: () => Promise<void>
  onSaveDraft?: () => Promise<void>
  onSendEmail?: () => Promise<void>
  canSubmit: boolean
  hasValidationErrors: boolean
  isGeneratingPdf?: boolean
  isSubmitting?: boolean
  isSavingDraft?: boolean
  isSendingEmail?: boolean
  className?: string
  pdfGenerated?: boolean
  submissionStatus?: 'idle' | 'success' | 'error'
  errorMessage?: string
}

export function SummaryActions({
  onGeneratePdf,
  onSubmit,
  onSaveDraft,
  onSendEmail,
  canSubmit,
  hasValidationErrors,
  isGeneratingPdf = false,
  isSubmitting = false,
  isSavingDraft = false,
  isSendingEmail = false,
  className,
  pdfGenerated = false,
  submissionStatus = 'idle',
  errorMessage
}: SummaryActionsProps) {
  
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [pdfGeneratedLocal, setPdfGeneratedLocal] = useState(pdfGenerated)

  const handleGeneratePdf = async () => {
    await onGeneratePdf()
    setPdfGeneratedLocal(true)
  }

  const handleSubmit = () => {
    if (hasValidationErrors) {
      return
    }
    setShowConfirmation(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmation(false)
    await onSubmit()
  }

  const isAnyActionInProgress = isGeneratingPdf || isSubmitting || isSavingDraft || isSendingEmail

  return (
    <div className={cn("space-y-4", className)}>
      {/* Status Messages */}
      {hasValidationErrors && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Correções necessárias</p>
              <p className="text-xs mt-1">
                Revise os campos destacados antes de finalizar a matrícula.
              </p>
            </div>
          </div>
        </div>
      )}

      {submissionStatus === 'success' && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
            <div className="text-sm text-green-800">
              <p className="font-medium">Matrícula enviada com sucesso!</p>
              <p className="text-xs mt-1">
                Você receberá um email de confirmação em breve.
              </p>
            </div>
          </div>
        </div>
      )}

      {submissionStatus === 'error' && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-medium">Erro ao enviar matrícula</p>
              <p className="text-xs mt-1">
                {errorMessage || 'Ocorreu um erro. Tente novamente.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Primary Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Generate PDF Button */}
        <Button
          onClick={handleGeneratePdf}
          disabled={isAnyActionInProgress || hasValidationErrors}
          variant={pdfGeneratedLocal ? "outline" : "default"}
          size="lg"
          className={cn(
            "w-full font-medium",
            pdfGeneratedLocal && "border-green-500 text-green-700 hover:bg-green-50"
          )}
        >
          {isGeneratingPdf ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
              Gerando PDF...
            </>
          ) : pdfGeneratedLocal ? (
            <>
              <Eye className="w-4 h-4 mr-2" />
              📄 Visualizar Proposta PDF
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              📄 Gerar Proposta PDF
            </>
          )}
        </Button>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isAnyActionInProgress || hasValidationErrors}
          variant="default"
          size="lg"
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
              Finalizando Matrícula...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              ✅ Finalizar Matrícula
            </>
          )}
        </Button>
      </div>

      {/* Secondary Actions - Only Email Button (temporarily hidden) */}
      {false && onSendEmail && pdfGeneratedLocal && (
        <div className="flex">
          <Button
            onClick={onSendEmail}
            disabled={isAnyActionInProgress || !pdfGeneratedLocal}
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
          >
            {isSendingEmail ? (
              <>
                <div className="w-3 h-3 mr-2 animate-spin border-2 border-gray-600 border-t-transparent rounded-full" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-3 h-3 mr-2" />
                Enviar por Email
              </>
            )}
          </Button>
        </div>
      )}

      {/* Info Messages */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800 space-y-1">
            <p>
              <strong>Importante:</strong> A proposta PDF contém todos os dados da matrícula.
            </p>
            <p>
              Após finalizar, você não poderá editar as informações. 
              Certifique-se de que todos os dados estão corretos.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Confirmar Finalização da Matrícula
            </h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600">
                Você está prestes a finalizar a matrícula. Esta ação:
              </p>
              
              <ul className="text-sm text-gray-700 space-y-1 ml-4">
                <li>• Enviará os dados para processamento</li>
                <li>• Gerará o protocolo de matrícula</li>
                <li>• Enviará email de confirmação</li>
                <li>• <strong>Não poderá ser desfeita</strong></li>
              </ul>

              {!pdfGeneratedLocal && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Você ainda não gerou o PDF da proposta. Recomendamos gerar antes de finalizar.
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <Button
                onClick={() => setShowConfirmation(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmSubmit}
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Indicators */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className={cn(
              "w-2 h-2 rounded-full mr-1",
              pdfGeneratedLocal ? "bg-green-500" : "bg-gray-300"
            )} />
            <span>PDF Gerado</span>
          </div>
          
          <div className="flex items-center">
            <div className={cn(
              "w-2 h-2 rounded-full mr-1",
              submissionStatus === 'success' ? "bg-green-500" : "bg-gray-300"
            )} />
            <span>Matrícula Enviada</span>
          </div>
        </div>

        <span className="text-gray-600">
          {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
        </span>
      </div>
    </div>
  )
}

export default SummaryActions