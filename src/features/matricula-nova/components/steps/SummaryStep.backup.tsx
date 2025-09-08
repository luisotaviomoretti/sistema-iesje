import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  FileText, 
  Download,
  Eye,
  AlertTriangle,
  Info,
  ChevronRight,
  Edit2,
  Loader2
} from 'lucide-react'
import type { StepProps } from '../../types/forms'

// Import all summary components
import { StudentSummarySection } from '../summary/StudentSummarySection'
import { GuardiansSummarySection } from '../summary/GuardiansSummarySection'
import { AddressSummarySection } from '../summary/AddressSummarySection'
import { AcademicSummarySection } from '../summary/AcademicSummarySection'
import { DiscountsSummarySection } from '../summary/DiscountsSummarySection'
import { FinancialBreakdownCard } from '../summary/FinancialBreakdownCard'
import { DocumentChecklistCard } from '../summary/DocumentChecklistCard'
// Lazy load SummaryActions for performance
const SummaryActions = React.lazy(() => import('../summary/SummaryActions'))

// Import PDF generator
import { generateProposalPDF, generateProposalPreview, type ProposalData } from '../../services/pdf/proposalGenerator'
import { debounce } from '../../utils/pdfHelpers'

// Import document helpers
import { getRequiredDocuments } from '../../constants/documents'
import type { DocumentRequirement } from '../../constants/documents'

import { toast } from 'sonner'

export default function SummaryStep(props: StepProps) {
  // State management
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfGenerated, setPdfGenerated] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  // Load saved checklist from sessionStorage
  const [documentChecklist, setDocumentChecklist] = useState<Record<string, boolean>>(() => {
    const saved = sessionStorage.getItem('enrollment-document-checklist')
    return saved ? JSON.parse(saved) : {}
  })  
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  // Get form data using watch with memoization
  const formData = useMemo(() => props.form.watch(), [props.form])
  const studentData = formData.student
  const guardiansData = formData.guardians
  const addressData = formData.address
  const academicData = formData.academic
  const selectedDiscounts = formData.selectedDiscounts || []

  // Get series and track info
  const selectedSeries = useMemo(() => {
    if (!academicData?.seriesId || !props.series) return null
    return props.series.find(s => s.id === academicData.seriesId)
  }, [academicData?.seriesId, props.series])

  const selectedTrack = useMemo(() => {
    if (!academicData?.trackId || !props.tracks) return null
    return props.tracks.find(t => t.id === academicData.trackId)
  }, [academicData?.trackId, props.tracks])

  // Get discounts info with deep memoization
  const discountsInfo = useMemo(() => {
    if (!selectedDiscounts.length || !props.discounts) return []
    const result = selectedDiscounts.map(selected => {
      const discount = props.discounts.find(d => d.id === selected.id)
      return discount ? {
        ...discount,
        percentualAplicado: selected.percentual
      } : null
    }).filter(Boolean)
    
    // Cache result for performance
    return result
  }, [selectedDiscounts, props.discounts])

  // Get required documents based on selected discounts
  const requiredDocuments = useMemo(() => {
    const discountCodes = discountsInfo.map(d => d?.codigo).filter(Boolean) as string[]
    return getRequiredDocuments(discountCodes)
  }, [discountsInfo])

  // Calculate CAP data for discounts section
  const capData = useMemo(() => {
    if (!selectedTrack || !selectedDiscounts.length) return null
    
    const capMaximo = selectedTrack.cap_maximo || 101
    const capUtilizado = selectedDiscounts.reduce((sum, d) => sum + d.percentual, 0)
    const capDisponivel = Math.max(0, capMaximo - capUtilizado)
    const excedeuCap = capUtilizado > capMaximo

    return {
      capMaximo,
      capUtilizado,
      capDisponivel,
      excedeuCap,
      trilho: selectedTrack.nome || 'N/A'
    }
  }, [selectedTrack, selectedDiscounts])

  // Check if there's a special CEP discount
  const hasSpecialCepDiscount = useMemo(() => {
    // Check if CEP is in special zone (simplified logic)
    const cep = addressData?.cep?.replace(/\D/g, '')
    if (!cep) return false
    
    // Example: CEPs starting with 580 are special
    return cep.startsWith('580')
  }, [addressData?.cep])

  // Validation checks
  const validationErrors = useMemo(() => {
    const errors: string[] = []
    
    // Check required fields
    if (!studentData?.name) errors.push('Nome do aluno é obrigatório')
    if (!studentData?.cpf) errors.push('CPF do aluno é obrigatório')
    if (!guardiansData?.guardian1?.name) errors.push('Responsável principal é obrigatório')
    if (!addressData?.cep) errors.push('Endereço é obrigatório')
    if (!academicData?.seriesId) errors.push('Série deve ser selecionada')
    if (!academicData?.trackId) errors.push('Trilho deve ser selecionado')
    
    // Check CAP
    if (capData?.excedeuCap) {
      errors.push(`CAP excedido: ${capData.capUtilizado}% > ${capData.capMaximo}%`)
    }
    
    return errors
  }, [studentData, guardiansData, addressData, academicData, capData])

  const hasValidationErrors = validationErrors.length > 0
  const canSubmit = !hasValidationErrors && !props.isSubmitting && props.pricing?.isValid

  // Navigation handlers
  const handleEditStep = useCallback((stepNumber: number) => {
    if (props.goToStep) {
      props.goToStep(stepNumber)
    }
  }, [props])

  // Document checklist handlers with persistence
  const handleDocumentCheck = useCallback((documentId: string, checked: boolean) => {
    setDocumentChecklist(prev => {
      const updated = {
        ...prev,
        [documentId]: checked
      }
      // Save to sessionStorage
      sessionStorage.setItem('enrollment-document-checklist', JSON.stringify(updated))
      return updated
    })
  }, [])

  // PDF Generation with debounce
  const generatePdfInternal = useCallback(async () => {
    try {
      setIsGeneratingPdf(true)
      
      // Prepare proposal data
      const proposalData: ProposalData = {
        formData,
        pricing: props.pricing,
        seriesInfo: selectedSeries,
        trackInfo: selectedTrack,
        discountsInfo: discountsInfo as any,
        approvalInfo: props.approvalInfo
      }
      
      // Generate PDF
      await generateProposalPDF(proposalData)
      
      // Also generate preview URL
      const url = await generateProposalPreview(proposalData)
      setPreviewUrl(url)
      setPdfGenerated(true)
      
      toast.success('Proposta PDF gerada com sucesso!')
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }, [formData, props.pricing, props.approvalInfo, selectedSeries, selectedTrack, discountsInfo])

  // Debounced PDF generation to prevent multiple simultaneous calls
  const handleGeneratePdf = useMemo(
    () => debounce(generatePdfInternal, 1000),
    [generatePdfInternal]
  )

  // Preview PDF
  const handlePreviewPdf = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank')
    }
  }, [previewUrl])

  // Submit enrollment
  const handleSubmit = useCallback(async () => {
    try {
      setSubmissionStatus('idle')
      setErrorMessage(undefined)
      
      // Call parent submit
      if (props.submitForm) {
        await props.submitForm()
        setSubmissionStatus('success')
        toast.success('Matrícula enviada com sucesso!')
      }
    } catch (error) {
      setSubmissionStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao enviar matrícula')
      toast.error('Erro ao enviar matrícula')
    }
  }, [props])


  // Send email (placeholder) 
  const handleSendEmail = useCallback(async () => {
    toast.info('Funcionalidade de email será implementada em breve')
  }, [])

  // Document counts
  const requiredDocsCount = requiredDocuments.filter(d => d.required).length
  const checkedDocsCount = requiredDocuments.filter(d => d.required && documentChecklist[d.id]).length
  const allRequiredDocsChecked = checkedDocsCount === requiredDocsCount

  // Render loading state
  if (props.isLoadingData) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Minimal Validation Alert */}
      {hasValidationErrors && (
        <div className="border-l-4 border-gray-400 bg-gray-50 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-700">
                Existem informações pendentes que precisam ser corrigidas.
              </p>
              <ul className="mt-2 text-sm text-gray-600 list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Single Column Layout */}
      <div className="space-y-4">
        {/* 1. Dados do Aluno */}
        <StudentSummarySection
          studentData={studentData}
          onEdit={() => handleEditStep(1)}
          isEditable={true}
        />
        
        {/* 2. Dados dos Responsáveis */}
        <GuardiansSummarySection
          guardiansData={guardiansData}
          onEdit={() => handleEditStep(2)}
          isEditable={true}
        />
        
        {/* 3. Endereço Residencial */}
        <AddressSummarySection
          addressData={addressData}
          onEdit={() => handleEditStep(3)}
          isEditable={true}
          hasSpecialCepDiscount={hasSpecialCepDiscount}
        />
        
        {/* 4. Informações Acadêmicas */}
        <AcademicSummarySection
          academicData={academicData}
          seriesData={props.series}
          tracksData={props.tracks}
          onEdit={() => handleEditStep(4)}
          isEditable={true}
        />
        
        {/* 5. Relação de Descontos Aplicados */}
        <DiscountsSummarySection
          selectedDiscounts={selectedDiscounts}
          discountsData={props.discounts}
          capData={capData}
          approvalInfo={props.approvalInfo}
          onEdit={() => handleEditStep(5)}
          isEditable={true}
        />
        
        {/* 6. Resumo Financeiro */}
        <FinancialBreakdownCard
          pricing={props.pricing}
          seriesData={selectedSeries ? {
            valor_material: selectedSeries.valor_material,
            valor_mensal_sem_material: selectedSeries.valor_mensal_sem_material, 
            valor_mensal_com_material: selectedSeries.valor_mensal_com_material || selectedSeries.value
          } : null}
          isLoading={false}
          showPdfButton={false}
          readOnlyMode={true}
        />
        
        {/* 7. Checklist de Documentos Necessários */}
        <DocumentChecklistCard
          documents={requiredDocuments}
          selectedDiscounts={discountsInfo as any}
          onDocumentCheck={() => {}}
          showUploadButtons={false}
          readOnlyMode={true}
        />
      </div>

      <div className="h-px bg-gray-200 my-8" />

      {/* Summary Actions with Suspense for lazy loading */}
      <React.Suspense fallback={
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      }>
        <SummaryActions
          onGeneratePdf={handleGeneratePdf}
          onSubmit={handleSubmit}
          onSendEmail={pdfGenerated ? handleSendEmail : undefined}
          canSubmit={canSubmit && allRequiredDocsChecked}
          hasValidationErrors={hasValidationErrors}
          isGeneratingPdf={isGeneratingPdf}
          isSubmitting={props.isSubmitting}
          pdfGenerated={pdfGenerated}
          submissionStatus={submissionStatus}
          errorMessage={errorMessage}
        />
      </React.Suspense>

      {/* Minimal Info Section */}
      <div className="bg-gray-50 rounded-lg p-6 mt-8">
        <div className="flex items-start space-x-3">
          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-600">
            <p className="mb-2">Próximos passos:</p>
            <ul className="space-y-1 text-xs text-gray-500">
              <li>• Gere e imprima a proposta em PDF</li>
              <li>• Entregue os documentos na secretaria em até 5 dias úteis</li>
              <li>• Aguarde a confirmação da matrícula</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
