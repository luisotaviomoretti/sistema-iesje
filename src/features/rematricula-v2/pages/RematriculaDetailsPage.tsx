import { useEffect, useMemo, useState } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCPF, cleanCPF } from '../utils/formValidators'
import { RematriculaDetailsService } from '../services/rematriculaDetailsService'
import type { RematriculaReadModel } from '../types/details'
import StudentHeader from '../components/details/StudentHeader'
import AcademicSection from '../components/details/AcademicSection'
import GuardiansSection from '../components/details/GuardiansSection'
import AddressSection from '../components/details/AddressSection'
import FinancialSection from '../components/details/FinancialSection'
import NextYearSelection from '../components/sections/NextYearSelection'
import DiscountSelectionCard from '../components/sections/DiscountSelectionCard'
import FinancialBreakdownCard from '../components/sections/FinancialBreakdownCard'
import StickyStudentHeader from '../components/layout/StickyStudentHeader'
import RematriculaFinalizeModal from '../components/RematriculaFinalizeModal'
import { RematriculaSubmissionService } from '../services/rematriculaSubmissionService'
import EditAlunoModal from '../components/modals/EditAlunoModal'
import EditResponsaveisModal from '../components/modals/EditResponsaveisModal'
import EditEnderecoModal from '../components/modals/EditEnderecoModal'
import { useMergedEnrollmentData } from '../hooks/useMergedEnrollmentData'
import { getRematriculaEditConfig } from '@/lib/config/config.service'
import { Badge } from '@/components/ui/badge'
import { useCurrentUser } from '@/features/enrollment/hooks/useCurrentUser'
import { useMatriculaAuth } from '@/features/matricula/hooks/useMatriculaAuth'
import { mapMatriculaUserEscolaToFormValue, labelFromDbValue, labelFromFormValue } from '@/features/matricula-nova/utils/escola'
import { getFormEscolaFromAny } from '@/features/matricula-nova/utils/escola'
import { toast } from 'sonner'
import { validateFinalizeInput } from '../services/rematriculaValidation'
import { getSuggestedDiscountCap, applySuggestedDiscountCap, invalidateSuggestedDiscountCapCache, getMacomConfig, getRematriculaPaymentNotesConfig } from '@/lib/config/config.service'
import type { MacomDiscountConfig } from '@/lib/config/config.service'
import { isMacomTrack } from '../utils/track'
import { getRematriculaProposalGenerator } from '../services/pdf/rematriculaProposalGenerator'
import { uploadEnrollmentPdf } from '@/features/matricula-nova/services/pdf/pdfStorage'
import { RematriculaPDFService } from '../services/rematriculaPDFService'
import ManualDiscountModal from '../components/modals/ManualDiscountModal'
import { useCheckInadimplencia } from '../hooks/useInadimplencia'

export default function RematriculaDetailsPage() {
  const { cpf = '', student_name_slug = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation() as any
  const token = useMemo(() => {
    try {
      const sp = new URLSearchParams(location?.search || '')
      const t = sp.get('t') || ''
      return t
    } catch {
      return ''
    }
  }, [location?.search])

  const cpfDigits = useMemo(() => cleanCPF(cpf), [cpf])
  
  // Estados para armazenar seleções
  const [selectedSeries, setSelectedSeries] = useState<any>(null)
  const [selectedDiscounts, setSelectedDiscounts] = useState<any[]>([])
  // F4: seleção manual (MACOM)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualSelection, setManualSelection] = useState<{ trilho: 'especial' | 'negociacao' | 'combinado'; tipoDescontoId: string; percentual: number } | null>(null)
  const optimistic = (location?.state?.studentData || null) as
    | {
        name?: string
        cpf?: string
        escola?: string
        previousSeries?: string
      }
    | null

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['rematricula-details', token ? { token } : { cpf: cpfDigits }],
    queryFn: async (): Promise<RematriculaReadModel | null> => {
      if (token) {
        return RematriculaDetailsService.getBySelectionToken(token)
      }
      if (!cpfDigits || cpfDigits.length !== 11) return null
      return RematriculaDetailsService.getByCPF(cpfDigits)
    },
    enabled: token ? true : Boolean(cpfDigits && cpfDigits.length === 11),
    staleTime: 5 * 60 * 1000,
  })

  // CAP do Desconto Sugerido (aplica somente ao sugerido do ano anterior)
  const baseSuggestedPercent = useMemo(() => Number(data?.financial?.total_discount_percentage || 0), [data?.financial?.total_discount_percentage])
  const [cappedSuggested, setCappedSuggested] = useState<number | null>(null)
  // MACOM config (F2 gating do sugerido)
  const [macomCfg, setMacomCfg] = useState<MacomDiscountConfig | null>(null)

  // Buscar config com cache e calcular suggested cap de forma segura
  useEffect(() => {
    // Inicialmente usar o valor base para evitar flicker
    setCappedSuggested(baseSuggestedPercent)
    // Bypass do CAP para Trilho Especial (fonte previous_year_students)
    const isSpecialTrack = (
      (data?.meta?.source === 'previous_year') &&
      String(data?.academic?.track_name || '').trim().toLowerCase() === 'especial'
    )
    if (isSpecialTrack) {
      // Preserva integralmente o desconto sugerido do ano anterior (sem CAP)
      setCappedSuggested(baseSuggestedPercent)
      return
    }

    // Buscar config de forma assíncrona
    ;(async () => {
      try {
        const cfg = await getSuggestedDiscountCap()
        const res = applySuggestedDiscountCap(baseSuggestedPercent, cfg)
        setCappedSuggested(res.finalPercent)
        // meta opcional para F6 (aviso visual) será implementada depois
      } catch {
        // Falha na config: manter valor base
        setCappedSuggested(baseSuggestedPercent)
        // meta opcional para F6 (aviso visual) será implementada depois
      }
    })()
  }, [baseSuggestedPercent, data?.academic?.track_name, data?.meta?.source])

  // Carregar config MACOM com cache seguro (uma vez)
  useEffect(() => {
    ;(async () => {
      try {
        const cfg = await getMacomConfig()
        setMacomCfg(cfg)
      } catch {
        // manter null (defaults tratarão como desabilitado)
      }
    })()
  }, [])

  // macomActive/effectiveSuggested serão definidos após merged

  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [selectedShift, setSelectedShift] = useState<'morning' | 'afternoon' | 'night' | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentNotes, setPaymentNotes] = useState<string>('')
  const currentUser = useCurrentUser()
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const { data: matriculaSession } = useMatriculaAuth()

  // Feature flags (F0) — edição de aluno
  const { data: editCfg } = useQuery({
    queryKey: ['rematricula-edit-config'],
    queryFn: async () => getRematriculaEditConfig(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })

  // F3 — Flag de Observações de Pagamento
  const { data: paymentNotesCfg } = useQuery({
    queryKey: ['rematricula-payment-notes-config'],
    queryFn: async () => getRematriculaPaymentNotesConfig(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
  })

  // Draft key e merge (F1) — apenas usado no Card Aluno neste passo (F2)
  const draftKey = useMemo(() => {
    if (data?.student?.id) return `sid:${data.student.id}`
    if (token) return `token:${token}`
    if (cpfDigits) return `cpf:${cpfDigits}`
    return ''
  }, [data?.student?.id, token, cpfDigits])

  const { merged, draft, setStudent, clearStudent, setGuardians, clearGuardians, setAddress, clearAddress, clearAll } = useMergedEnrollmentData({
    readModel: data || null,
    draftKey: draftKey || null,
  })

  // F5: Checagem de inadimplência (client-side, não disruptiva; enforcement controlado por flags no servidor)
  const studentNameForCheck = useMemo(() => {
    try { return (merged?.student?.name || data?.student?.name || '').trim() } catch { return '' }
  }, [merged?.student?.name, data?.student?.name])
  const { data: inadCheck } = useCheckInadimplencia({
    studentName: studentNameForCheck,
    enabled: Boolean(studentNameForCheck),
  })
  const isInadimplente = Boolean(inadCheck?.is_inadimplente)

  const [editStudentOpen, setEditStudentOpen] = useState(false)
  const [editGuardiansOpen, setEditGuardiansOpen] = useState(false)
  const [editAddressOpen, setEditAddressOpen] = useState(false)

  const hasDraftChanges = useMemo(() => {
    const s = !!(draft?.student && Object.keys(draft.student).length > 0)
    const g = !!(draft?.guardians && ((draft.guardians.guardian1 && Object.keys(draft.guardians.guardian1).length > 0) || (typeof draft.guardians.guardian2 !== 'undefined')))
    const a = !!(draft?.address && Object.keys(draft.address).length > 0)
    return s || g || a
  }, [draft])

  // Detectar se o aluno é MACOM (fonte previous_year + trilho "maçom")
  const macomActive = useMemo(() => {
    try { return Boolean(isMacomTrack((merged || data) as any) && macomCfg?.enabled) } catch { return false }
  }, [merged, data, macomCfg?.enabled])

  // Sugerido efetivo (nulo quando MACOM + hideSuggested)
  const effectiveSuggested = useMemo(() => {
    if (macomActive && macomCfg?.hideSuggested) return null
    return cappedSuggested
  }, [macomActive, macomCfg?.hideSuggested, cappedSuggested])

  // Revalidação reativa: ao abrir o modal de finalização ou quando dados mudam
  useEffect(() => {
    try {
      const v = validateFinalizeInput({
        readModel: (merged || data || null) as any,
        series: selectedSeries,
        shift: selectedShift,
        discounts: selectedDiscounts as any,
      })
      setValidationErrors(v.errors)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalizeOpen, merged, selectedSeries, selectedShift, selectedDiscounts])

  const renderHeader = () => (
    <StudentHeader
      name={data?.student?.name || optimistic?.name}
      cpf={(data?.student?.cpf || optimistic?.cpf || cpfDigits) as string}
      escola={(data?.student?.escola || (optimistic?.escola as any)) as string}
      status={data?.meta?.source as any}
      originEscolaLabel={(() => {
        const raw = data?.student?.escola || (optimistic?.escola as any) || null
        const form = raw ? getFormEscolaFromAny(raw) : null
        return (form ? labelFromFormValue(form) : (raw ? labelFromDbValue(raw) : null)) || undefined
      })()}
      destinationEscolaLabel={(labelFromDbValue(matriculaSession?.escola) || undefined)}
    />
  )

  const renderSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      </div>
    </div>
  )

  const renderDetails = (model: RematriculaReadModel) => (
    <div className="space-y-4">
      {isInadimplente && (
        <Alert variant="destructive">
          <AlertDescription>
            Consta inadimplência associada a este aluno. A finalização da rematrícula está temporariamente bloqueada.
            Procure a Tesouraria para regularizar a situação.
          </AlertDescription>
        </Alert>
      )}
      {/* Aluno (cabeçalho já mostra principais dados) */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              Aluno
              {draft?.student && Object.keys(draft.student).length > 0 && (
                <Badge variant="secondary">Alterado</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Identificação e informações básicas
              {model?.meta?.source === 'previous_year' && String(model?.academic?.track_name || '').trim().toLowerCase() === 'especial' && (
                <span className="ml-2 text-blue-600">
                  Este aluno pertence ao Trilho Especial. Conforme política vigente, o CAP do Desconto Sugerido não se aplica; o percentual sugerido do ano anterior será preservado integralmente.
                </span>
              )}
            </CardDescription>
          </div>
          {Boolean(editCfg?.enabled && editCfg?.studentEnabled) && (
            <div className="flex items-center gap-2">
              {draft?.student && Object.keys(draft.student).length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => clearStudent()}>Restaurar</Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setEditStudentOpen(true)}>Editar</Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div><span className="font-medium">Nome:</span> {(merged?.student?.name || model.student.name)}</div>
          <div><span className="font-medium">CPF:</span> {formatCPF((merged?.student?.cpf || model.student.cpf) as any)}</div>
          {(merged?.student?.birth_date || model.student.birth_date) && (
            <div><span className="font-medium">Nascimento:</span> {(merged?.student?.birth_date || model.student.birth_date)}</div>
          )}
          {(merged?.student?.gender || model.student.gender) && (
            <div><span className="font-medium">Gênero:</span> {(merged?.student?.gender || model.student.gender)}</div>
          )}
          {(() => {
            const destino = labelFromDbValue(matriculaSession?.escola) || null
            const escolaRaw = (merged?.student?.escola ?? model.student.escola) as any
            const origem = escolaRaw
              ? (labelFromFormValue(getFormEscolaFromAny(escolaRaw))
                  || labelFromDbValue(escolaRaw)
                  || (escolaRaw as any))
              : null
            if (destino) {
              return (
                <div className="col-span-1 md:col-span-2">
                  <span className="font-medium">Escola de destino:</span> {destino}
                  {origem && origem !== destino && (
                    <span> • <span className="font-medium">Origem:</span> {origem}</span>
                  )}
                </div>
              )
            }
            if (origem) {
              return <div><span className="font-medium">Escola:</span> {origem}</div>
            }
            return null
          })()}
        </CardContent>
      </Card>

      {Boolean(editCfg?.enabled && editCfg?.studentEnabled) && (
        <EditAlunoModal
          open={editStudentOpen}
          onOpenChange={setEditStudentOpen}
          initial={{
            name: (merged?.student?.name || model.student.name),
            cpf: (merged?.student?.cpf || model.student.cpf),
            birth_date: (merged?.student?.birth_date || model.student.birth_date),
            gender: (merged?.student?.gender || model.student.gender),
          } as any}
          onSave={(partial) => {
            try { setStudent(partial) } catch {}
          }}
        />
      )}

      {/* F4: Modal seleção manual de desconto (MACOM) */}
      <ManualDiscountModal
        open={Boolean(macomActive && manualModalOpen)}
        onOpenChange={(v) => setManualModalOpen(v)}
        categories={(macomCfg?.categories && macomCfg.categories.length > 0) ? macomCfg.categories : ['especial', 'negociacao']}
        onSelect={(d) => {
          // Converte para shape esperado pelo DiscountSelectionCard
          const item = { trilho: (d.trilho as any), tipoDescontoId: d.id, percentual: Number(d.percentual || 0) }
          setManualSelection(item as any)
          // DiscountSelectionCard emitirá onChangeAll com a lista [item];
          // mesmo assim, garantimos que selectedDiscounts reflita imediatamente
          try { setSelectedDiscounts([item]) } catch {}
        }}
      />

      <AcademicSection academic={model.academic} />
      <GuardiansSection 
        guardians={(merged?.guardians || model.guardians) as any}
        canEdit={Boolean(editCfg?.enabled && editCfg?.guardiansEnabled)}
        onEdit={() => setEditGuardiansOpen(true)}
        onRestore={clearGuardians}
        showAlterado={Boolean(draft?.guardians && ((draft.guardians.guardian1 && Object.keys(draft.guardians.guardian1).length > 0) || (typeof draft.guardians.guardian2 !== 'undefined')))}
      />

      {Boolean(editCfg?.enabled && editCfg?.guardiansEnabled) && (
        <EditResponsaveisModal
          open={editGuardiansOpen}
          onOpenChange={setEditGuardiansOpen}
          initial={{
            guardian1: ((merged?.guardians?.guardian1 || model.guardians.guardian1) as any),
            guardian2: ((merged?.guardians?.guardian2 || model.guardians.guardian2) as any),
          }}
          onSave={(partial) => {
            try { setGuardians(partial as any) } catch {}
          }}
        />
      )}
      <AddressSection 
        address={(merged?.address || model.address) as any}
        canEdit={Boolean(editCfg?.enabled && editCfg?.addressEnabled)}
        onEdit={() => setEditAddressOpen(true)}
        onRestore={clearAddress}
        showAlterado={Boolean(draft?.address && Object.keys(draft.address).length > 0)}
      />

      {Boolean(editCfg?.enabled && editCfg?.addressEnabled) && (
        <EditEnderecoModal
          open={editAddressOpen}
          onOpenChange={setEditAddressOpen}
          initial={(merged?.address || model.address) as any}
          onSave={(partial) => {
            try { setAddress(partial as any) } catch {}
          }}
        />
      )}
      <FinancialSection financial={model.financial} />

      {/* Seleção de Série e Turno para o próximo ano (independente do fluxo de nova matrícula) */}
      <NextYearSelection 
        studentEscola={(mapMatriculaUserEscolaToFormValue(matriculaSession?.escola) || getFormEscolaFromAny(model.student.escola as any)) as any}
        previousSeriesName={model.academic.series_name}
        previousShift={model.academic.shift as any}
        onChange={(sel) => {
          if (import.meta.env.DEV) {
            console.log('[RematriculaDetails] seleção próxima série/turno:', sel)
          }
          // NextYearSelection agora retorna { seriesId, shift, series }
          setSelectedSeries(sel?.series || null)
          setSelectedShift(sel?.shift || null)
          // Atualiza validações quando a seleção mudar
          try {
            const v = validateFinalizeInput({
              readModel: (merged || data || null) as any,
              series: sel?.series || null,
              shift: sel?.shift || null,
              discounts: selectedDiscounts as any,
            })
            setValidationErrors(v.errors)
          } catch {}
        }}
      />

      {/* Descontos: sugerido do ano anterior + edição via trilho/tipo */}
      <DiscountSelectionCard 
        suggestedPercentage={effectiveSuggested as any}
        capInfo={{ capped: (cappedSuggested ?? 0) < (baseSuggestedPercent ?? 0), capPercent: 0, previousPercent: baseSuggestedPercent }}
        suggestedCode={model.financial.suggested_discount_code as any}
        suggestedDescription={model.financial.suggested_discount_description as any}
        manualOnly={macomActive}
        manualSelection={manualSelection as any}
        onRequestManualSelection={() => setManualModalOpen(true)}
        onChangeAll={(items) => {
          if (import.meta.env.DEV) {
            console.log('[RematriculaDetails] descontos selecionados:', items)
          }
          setSelectedDiscounts(items || [])
          try {
            const v = validateFinalizeInput({
              readModel: (merged || data || null) as any,
              series: selectedSeries,
              shift: selectedShift,
              discounts: (items || []) as any,
            })
            setValidationErrors(v.errors)
          } catch {}
        }}
      />
      
      {/* Breakdown Financeiro - Cálculo detalhado dos valores */}
      <FinancialBreakdownCard 
        series={selectedSeries}
        discounts={selectedDiscounts}
        suggestedPercentage={selectedDiscounts.length === 0 ? (effectiveSuggested as any) : null}
        capInfo={{ capped: (cappedSuggested ?? 0) < (baseSuggestedPercent ?? 0), previousPercent: baseSuggestedPercent }}
        previousYearData={{
          valor_mensalidade: (model.financial.final_monthly_value as any),
          desconto_percentual: model.financial.total_discount_percentage
        }}
      />

      {/* Ações */}
      <div className="flex gap-3">
        <Button onClick={() => setFinalizeOpen(true)} disabled={isInadimplente} title={isInadimplente ? 'Bloqueado por inadimplência' : undefined}>
          Finalizar Rematrícula
        </Button>
        <Button
          variant="outline"
          disabled={!(Boolean(model.financial.pdf_url) || Boolean(selectedSeries))}
          onClick={async () => {
            try {
              if (model.financial.pdf_url) {
                window.open(model.financial.pdf_url, '_blank')
                return
              }
              if (!selectedSeries) {
                toast.error('Selecione a série/turno para gerar a proposta em PDF')
                return
              }
              const generator = getRematriculaProposalGenerator()
              const proposalData = {
                readModel: (merged || model) as any,
                series: selectedSeries,
                discounts: selectedDiscounts as any,
                suggestedPercentageOverride: (cappedSuggested ?? null) as any,
                paymentNotes: Boolean(paymentNotesCfg?.enabled) ? (paymentNotes || undefined) : undefined,
              }
              await generator.generateAndDownload(proposalData)
            } catch (err) {
              console.error('[Rematricula] Falha ao gerar PDF on-demand:', err)
              toast.error('Falha ao gerar PDF. Tente novamente.')
            }
          }}
        >
          Baixar Proposta
        </Button>
        {Boolean(editCfg?.enabled && hasDraftChanges) && (
          <Button variant="ghost" onClick={() => clearAll()}>Restaurar tudo</Button>
        )}
        <Button variant="ghost" onClick={() => navigate('/rematricula')}>Voltar</Button>
      </div>

      {/* Modal de Finalização (Fase 1: apenas UX/resumo) */}
      <RematriculaFinalizeModal
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        readModel={(merged || model) as any}
        selection={{
          series: selectedSeries,
          discounts: selectedDiscounts,
        }}
        suggestedPercentageOverride={((macomActive && macomCfg?.hideSuggested) ? 0 : (effectiveSuggested as any))}
        capInfo={{ capped: (cappedSuggested ?? 0) < (baseSuggestedPercent ?? 0), previousPercent: baseSuggestedPercent }}
        isSubmitting={submitting}
        errors={validationErrors}
        originEscolaLabel={(() => {
          const raw = model.student.escola || (optimistic?.escola as any) || null
          const form = raw ? getFormEscolaFromAny(raw) : null
          return (form ? labelFromFormValue(form) : (raw ? labelFromDbValue(raw) : null)) || undefined
        })()}
        destinationEscolaLabel={labelFromDbValue(matriculaSession?.escola) || undefined}
        paymentNotesEnabled={Boolean(paymentNotesCfg?.enabled)}
        paymentNotes={paymentNotes}
        onChangePaymentNotes={setPaymentNotes}
        onConfirm={async () => {
          if (!model) return
          if (!selectedSeries) {
            toast.error('Selecione a série e o turno antes de finalizar')
            return
          }
          // Validação final
          const v = validateFinalizeInput({
            readModel: (merged || model) as any,
            series: selectedSeries,
            shift: selectedShift,
            discounts: selectedDiscounts as any,
          })
          setValidationErrors(v.errors)
          if (!v.ok) {
            toast.error('Corrija os erros antes de enviar')
            return
          }
          try {
            setSubmitting(true)
            const destinationSchoolForm = mapMatriculaUserEscolaToFormValue(matriculaSession?.escola) || undefined
            // Recalcular o sugerido capado imediatamente antes de enviar (100% seguro)
            let overrideToSend: number | undefined = undefined
            if (macomActive && macomCfg?.hideSuggested) {
              // F5: MACOM não deve ter fallback para sugerido
              overrideToSend = 0
            } else if (!selectedDiscounts || selectedDiscounts.length === 0) {
              try {
                const isSpecialTrack = (
                  (model?.meta?.source === 'previous_year') &&
                  String(model?.academic?.track_name || '').trim().toLowerCase() === 'especial'
                )
                if (isSpecialTrack) {
                  // Trilho Especial: sem CAP — preserva valor integral do ano anterior
                  overrideToSend = baseSuggestedPercent
                } else {
                  invalidateSuggestedDiscountCapCache()
                  const freshCfg = await getSuggestedDiscountCap()
                  overrideToSend = applySuggestedDiscountCap(baseSuggestedPercent, freshCfg).finalPercent
                }
              } catch {
                overrideToSend = (cappedSuggested ?? undefined) as any
              }
            }
            const enrollmentId = await RematriculaSubmissionService.finalizeRematricula({
              readModel: (merged || model) as any,
              series: selectedSeries,
              discounts: selectedDiscounts as any,
              shift: selectedShift,
              currentUser,
              destinationSchoolFormValue: destinationSchoolForm,
              suggestedPercentageOverride: overrideToSend,
              paymentNotesEnabled: Boolean(paymentNotesCfg?.enabled),
              paymentNotes,
            })
            // Gerar PDF, subir no Storage e salvar URL durável; fazer download local
            try {
              const generator = getRematriculaProposalGenerator()
              const proposalData = {
                readModel: (merged || model) as any,
                series: selectedSeries,
                discounts: selectedDiscounts as any,
                suggestedPercentageOverride: overrideToSend ?? (cappedSuggested ?? null),
                paymentNotes: Boolean(paymentNotesCfg?.enabled) ? (paymentNotes || undefined) : undefined,
              }
              const blob = await generator.generateProposal(proposalData)
              try {
                const storageUrl = await uploadEnrollmentPdf(enrollmentId, blob)
                if (storageUrl) {
                  await RematriculaPDFService.updatePdfInfo(enrollmentId, storageUrl)
                }
              } catch (err) {
                console.warn('[Rematricula] Falha ao subir/atualizar URL do PDF:', err)
              }
              // Download local (não bloqueante)
              try {
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                const studentName = (merged?.student?.name || model?.student?.name || 'aluno')
                link.download = `proposta-rematricula-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`
                document.body.appendChild(link)
                link.click()
                setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url) }, 100)
              } catch {}
            } catch (pdfErr) {
              console.warn('[Rematricula] Geração de PDF falhou (processo seguirá):', pdfErr)
            }
            toast.success(`Rematrícula enviada! Protocolo: ${enrollmentId}`)
            setFinalizeOpen(false)
            // Redireciona para Home após envio com sucesso
            toast.info('Redirecionando para a Home...')
            navigate('/')
          } catch (err: any) {
            console.error('[Rematricula] Falha na submissão:', err)
            toast.error(err?.message || 'Falha ao enviar rematrícula')
          } finally {
            setSubmitting(false)
          }
        }}
      />
    </div>
  )

  return (
    <>
      {/* Sticky Header - appears on scroll */}
      {data && (
        <StickyStudentHeader
          name={data.student?.name}
          cpf={data.student?.cpf}
          escola={data.student?.escola}
          status={data.meta?.source as any}
          scrollThreshold={300}
        />
      )}
      
      <div className="container mx-auto px-4 py-6 max-w-5xl space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Detalhes da Rematrícula</h1>
          <p className="text-muted-foreground">Informações consolidadas do aluno para conferência e início do processo.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{renderHeader()}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && renderSkeleton()}
            {!isLoading && isError && (
              <Alert variant="destructive">
                <AlertDescription>
                  Ocorreu um erro ao carregar os dados. Tente novamente.
                  <div className="mt-2">
                    <Button size="sm" onClick={() => refetch()}>Tentar novamente</Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {!isLoading && !isError && !data && (
              <Alert>
                <AlertDescription>
                  {token
                    ? 'Token inválido ou expirado, ou você não possui permissão para visualizar os dados.'
                    : 'Não encontramos dados para este CPF ou você não possui permissão para visualizar as matrículas.'}
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" onClick={() => refetch()}>Recarregar</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate('/rematricula')}>Voltar</Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {!isLoading && !isError && data && renderDetails(data)}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
