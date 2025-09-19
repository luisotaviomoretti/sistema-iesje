import React, { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'
import { 
  useSystemConfig,
  usePublicSystemConfig,
  useUpdateConfigValue,
  useCreateSystemConfig,
} from '@/features/admin/hooks/useSystemConfigs'

import { 
  invalidateSuggestedDiscountCapCache,
  primeSuggestedDiscountCapCache,
  invalidateCashDiscountConfigCache,
  invalidateRematriculaHomeConfigCache,
  primeRematriculaHomeConfigCache,
  invalidateRematriculaEditConfigCache,
  primeRematriculaEditConfigCache,
  invalidateMacomConfigCache,
  primeMacomConfigCache,
  invalidateRematriculaPaymentNotesConfigCache,
  primeRematriculaPaymentNotesConfigCache,
  invalidateNovomatriculaPaymentNotesConfigCache,
  primeNovomatriculaPaymentNotesConfigCache,
  invalidateSeriesAnnualValuesConfigCache,
  primeSeriesAnnualValuesConfigCache,
} from '@/lib/config/config.service'

const KEY_ENABLED = 'rematricula.suggested_discount_cap.enabled'
const KEY_PERCENT = 'rematricula.suggested_discount_cap.percent'
// Chaves PAV (Rematrícula)
const PAV_KEY_ENABLED = 'rematricula.pav.enabled'
const PAV_KEY_PERCENT = 'rematricula.pav.percent'
const PAV_KEY_CODE = 'rematricula.pav.code'
const PAV_KEY_NAME = 'rematricula.pav.name'

// Chaves Rematrícula — Home & Busca Avançada
const HOME_KEY_ACTIONS = 'rematricula.home.actions.enabled'
const HOME_KEY_ADVANCED = 'rematricula.home.advanced_search.enabled'
const HOME_KEY_MIN_CHARS = 'rematricula.home.advanced_search.min_chars'
const HOME_KEY_PAGE_SIZE = 'rematricula.home.advanced_search.page_size'
const HOME_KEY_DEBOUNCE_MS = 'rematricula.home.advanced_search.debounce_ms'
const HOME_KEY_SCOPE_DEFAULT = 'rematricula.home.advanced_search.search_scope_default'
const HOME_KEY_ACADEMIC_YEAR = 'rematricula.academic_year'

// Chaves Rematrícula — Edição dos Cards
const EDIT_KEY_ENABLED = 'rematricula.edit.enabled'
const EDIT_KEY_STUDENT = 'rematricula.edit.student.enabled'
const EDIT_KEY_GUARDIANS = 'rematricula.edit.guardians.enabled'
const EDIT_KEY_ADDRESS = 'rematricula.edit.address.enabled'
const EDIT_KEY_TELEMETRY = 'rematricula.edit.telemetry.enabled'

// Chaves Rematrícula — MACOM
const MACOM_KEY_ENABLED = 'rematricula.macom.enabled'
const MACOM_KEY_CATEGORIES = 'rematricula.macom.discount.categories'
const MACOM_KEY_ONE_ONLY = 'rematricula.macom.one_discount_only'
const MACOM_KEY_HIDE_SUGGESTED = 'rematricula.macom.hide_suggested'

// Chaves Rematrícula — Inadimplência (gating no FE + reforço server-side)
const INAD_KEY_ENABLED = 'rematricula.inadimplencia.enabled'
const INAD_KEY_REQ_GUARDIAN = 'rematricula.inadimplencia.match.require_guardian'
const INAD_KEY_REQ_SCHOOL = 'rematricula.inadimplencia.match.require_same_school'

// Chave Rematrícula — Observações da Forma de Pagamento (flag FE)
const PAY_NOTES_KEY_ENABLED = 'rematricula.payment_notes.enabled'

// Chave Aluno Novo — Observações da Forma de Pagamento (flag FE)
const NOVO_PAY_NOTES_KEY_ENABLED = 'novomatricula.payment_notes.enabled'

// Chaves Séries — Valores Anuais
const SERIES_KEY_ENABLED = 'series.annual_values.enabled'
const SERIES_KEY_INPUT_MODE = 'series.annual_values.input_mode'

export default function SystemConfigurations() {
  const queryClient = useQueryClient()
  const { data: adminSession } = useAdminAuth()
  const adminEmail = adminSession?.user?.email || 'admin@unknown'

  // Load current values
  // Preferir leitura via RPC pública (evita 406 quando não há linha)
  const { data: enabledPublic, isLoading: loadingEnabled } = usePublicSystemConfig(KEY_ENABLED)
  const { data: percentPublic, isLoading: loadingPercent } = usePublicSystemConfig(KEY_PERCENT)

  // PAV — leitura pública (evita 406 quando não há linha)
  const { data: pavEnabledPublic, isLoading: loadingPavEnabled } = usePublicSystemConfig(PAV_KEY_ENABLED)
  const { data: pavPercentPublic, isLoading: loadingPavPercent } = usePublicSystemConfig(PAV_KEY_PERCENT)
  const { data: pavCodePublic, isLoading: loadingPavCode } = usePublicSystemConfig(PAV_KEY_CODE)
  const { data: pavNamePublic, isLoading: loadingPavName } = usePublicSystemConfig(PAV_KEY_NAME)

  // Rematrícula — Home & Busca — leitura pública
  const { data: homeActionsPublic, isLoading: loadingHomeActions } = usePublicSystemConfig(HOME_KEY_ACTIONS)
  const { data: homeAdvancedPublic, isLoading: loadingHomeAdvanced } = usePublicSystemConfig(HOME_KEY_ADVANCED)
  const { data: homeMinCharsPublic, isLoading: loadingHomeMinChars } = usePublicSystemConfig(HOME_KEY_MIN_CHARS)
  const { data: homePageSizePublic, isLoading: loadingHomePageSize } = usePublicSystemConfig(HOME_KEY_PAGE_SIZE)
  const { data: homeDebounceMsPublic, isLoading: loadingHomeDebounce } = usePublicSystemConfig(HOME_KEY_DEBOUNCE_MS)
  const { data: homeScopeDefaultPublic, isLoading: loadingHomeScope } = usePublicSystemConfig(HOME_KEY_SCOPE_DEFAULT)
  const { data: homeAcademicYearPublic, isLoading: loadingHomeYear } = usePublicSystemConfig(HOME_KEY_ACADEMIC_YEAR)

  const [enabled, setEnabled] = useState<boolean>(false)
  const [percent, setPercent] = useState<string>('20')

  // PAV — estados locais
  const [pavEnabled, setPavEnabled] = useState<boolean>(false)
  const [pavPercent, setPavPercent] = useState<string>('0')
  const [pavCode, setPavCode] = useState<string>('PAV')
  const [pavName, setPavName] = useState<string>('Pagamento à Vista')

  // Rematrícula — Home & Busca — estados locais
  const [homeActionsEnabled, setHomeActionsEnabled] = useState<boolean>(false)
  const [homeAdvancedEnabled, setHomeAdvancedEnabled] = useState<boolean>(false)
  const [homeMinChars, setHomeMinChars] = useState<string>('3')
  const [homePageSize, setHomePageSize] = useState<string>('20')
  const [homeDebounceMs, setHomeDebounceMs] = useState<string>('350')
  const [homeScopeDefault, setHomeScopeDefault] = useState<'student' | 'guardian'>('student')
  const [homeAcademicYear, setHomeAcademicYear] = useState<string>(String(new Date().getFullYear()))

  // Séries — Valores Anuais — estados locais
  const [seriesAnnualEnabled, setSeriesAnnualEnabled] = useState<boolean>(false)
  const [seriesAnnualMode, setSeriesAnnualMode] = useState<'annual' | 'monthly'>('monthly')

  // Rematrícula — Edição dos Cards (defaults ON por padrão)
  const { data: editEnabledPublic, isLoading: loadingEditEnabled } = usePublicSystemConfig(EDIT_KEY_ENABLED)
  const { data: editStudentPublic, isLoading: loadingEditStudent } = usePublicSystemConfig(EDIT_KEY_STUDENT)
  const { data: editGuardiansPublic, isLoading: loadingEditGuardians } = usePublicSystemConfig(EDIT_KEY_GUARDIANS)
  const { data: editAddressPublic, isLoading: loadingEditAddress } = usePublicSystemConfig(EDIT_KEY_ADDRESS)
  const { data: editTelemetryPublic, isLoading: loadingEditTelemetry } = usePublicSystemConfig(EDIT_KEY_TELEMETRY)

  // Rematrícula — MACOM (leitura pública)
  const { data: macomEnabledPublic, isLoading: loadingMacomEnabled } = usePublicSystemConfig(MACOM_KEY_ENABLED)
  const { data: macomCategoriesPublic, isLoading: loadingMacomCategories } = usePublicSystemConfig(MACOM_KEY_CATEGORIES)
  const { data: macomOneOnlyPublic, isLoading: loadingMacomOneOnly } = usePublicSystemConfig(MACOM_KEY_ONE_ONLY)
  const { data: macomHideSuggestedPublic, isLoading: loadingMacomHideSuggested } = usePublicSystemConfig(MACOM_KEY_HIDE_SUGGESTED)

  // Rematrícula — Inadimplência (leitura pública)
  const { data: inadEnabledPublic, isLoading: loadingInadEnabled } = usePublicSystemConfig(INAD_KEY_ENABLED)
  const { data: inadReqGuardianPublic, isLoading: loadingInadReqG } = usePublicSystemConfig(INAD_KEY_REQ_GUARDIAN)
  const { data: inadReqSchoolPublic, isLoading: loadingInadReqS } = usePublicSystemConfig(INAD_KEY_REQ_SCHOOL)

  // Rematrícula — Observações da Forma de Pagamento (leitura pública)
  const { data: payNotesEnabledPublic, isLoading: loadingPayNotesEnabled } = usePublicSystemConfig(PAY_NOTES_KEY_ENABLED)

  // Aluno Novo — Observações da Forma de Pagamento (leitura pública)
  const { data: novoPayNotesEnabledPublic, isLoading: loadingNovoPayNotesEnabled } = usePublicSystemConfig(NOVO_PAY_NOTES_KEY_ENABLED)

  // Séries — Valores Anuais — leitura pública
  const { data: seriesAnnualEnabledPublic, isLoading: loadingSeriesAnnualEnabled } = usePublicSystemConfig(SERIES_KEY_ENABLED)
  const { data: seriesAnnualModePublic, isLoading: loadingSeriesAnnualMode } = usePublicSystemConfig(SERIES_KEY_INPUT_MODE)

  const [editEnabled, setEditEnabled] = useState<boolean>(true)
  const [editStudentEnabled, setEditStudentEnabled] = useState<boolean>(true)
  const [editGuardiansEnabled, setEditGuardiansEnabled] = useState<boolean>(true)
  const [editAddressEnabled, setEditAddressEnabled] = useState<boolean>(true)
  const [editTelemetryEnabled, setEditTelemetryEnabled] = useState<boolean>(true)

  // Rematrícula — MACOM — estados locais
  const [macomEnabled, setMacomEnabled] = useState<boolean>(false)
  const [macomCategories, setMacomCategories] = useState<string>('especial,negociacao')
  const [macomOneOnly, setMacomOneOnly] = useState<boolean>(true)
  const [macomHideSuggested, setMacomHideSuggested] = useState<boolean>(true)

  // Rematrícula — Inadimplência — estados locais
  const [inadEnabled, setInadEnabled] = useState<boolean>(false)
  const [inadReqGuardian, setInadReqGuardian] = useState<boolean>(false)
  const [inadReqSchool, setInadReqSchool] = useState<boolean>(false)
  const [payNotesEnabled, setPayNotesEnabled] = useState<boolean>(false)
  const [novoPayNotesEnabled, setNovoPayNotesEnabled] = useState<boolean>(false)

  useEffect(() => {
    if (enabledPublic != null) {
      const v = String(enabledPublic).trim().toLowerCase()
      setEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [enabledPublic])

  // Salvar Aluno Novo — Observações da Forma de Pagamento (flag)
  const handleSaveNovoPaymentNotes = async () => {
    try {
      // Helper: criação idempotente com fallback de categorias
      const createWithAdminFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['admin', 'sistema', 'matriculas', 'config', 'geral']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      const enabledVal = novoPayNotesEnabled ? 'true' : 'false'
      const existsEnabled = novoPayNotesEnabledPublic != null

      if (existsEnabled) {
        await updateConfigValue({ chave: NOVO_PAY_NOTES_KEY_ENABLED, valor: enabledVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: NOVO_PAY_NOTES_KEY_ENABLED, valor: enabledVal, descricao: 'Habilita o campo de Observações sobre a Forma de Pagamento na Nova Matrícula (UI/PDF). Dark Launch: sem efeito até ligado.' })
      }

      // Cache local — refletir imediatamente
      invalidateNovomatriculaPaymentNotesConfigCache()
      primeNovomatriculaPaymentNotesConfigCache({ enabled: novoPayNotesEnabled })

      toast.success('Flag de Observações de Pagamento (Aluno Novo) salva com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar Observações de Pagamento (Aluno Novo):', err)
      toast.error(err?.message || 'Erro ao salvar flag de Observações de Pagamento (Aluno Novo)')
    }
  }

  // Salvar Rematrícula — Observações da Forma de Pagamento (flag)
  const handleSavePaymentNotes = async () => {
    try {
      // Helper: criação idempotente com fallback de categorias
      const createWithAdminFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['admin', 'sistema', 'matriculas', 'config', 'geral']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      const enabledVal = payNotesEnabled ? 'true' : 'false'
      const existsEnabled = payNotesEnabledPublic != null

      if (existsEnabled) {
        await updateConfigValue({ chave: PAY_NOTES_KEY_ENABLED, valor: enabledVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: PAY_NOTES_KEY_ENABLED, valor: enabledVal, descricao: 'Habilita o campo de Observações sobre a Forma de Pagamento na Rematrícula (UI/PDF). Dark Launch: sem efeito até ligado.' })
      }

      // Cache local — refletir imediatamente
      invalidateRematriculaPaymentNotesConfigCache()
      primeRematriculaPaymentNotesConfigCache({ enabled: payNotesEnabled })

      toast.success('Flag de Observações de Pagamento (Rematrícula) salva com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar Observações de Pagamento (Rematrícula):', err)
      toast.error(err?.message || 'Erro ao salvar flag de Observações de Pagamento (Rematrícula)')
    }
  }

  // Salvar Rematrícula — Inadimplência (enabled + regras de match)
  const handleSaveInadimplencia = async () => {
    try {
      // Helper: criação com fallback priorizando categoria 'financeiro'
      const createWithFinanceFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const candidates = ['financeiro', 'geral']
        let lastErr: any = null
        for (const cat of candidates) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      const enabledVal = inadEnabled ? 'true' : 'false'
      const reqGuardianVal = inadReqGuardian ? 'true' : 'false'
      const reqSchoolVal = inadReqSchool ? 'true' : 'false'

      const existsEnabled = inadEnabledPublic != null
      const existsReqGuardian = inadReqGuardianPublic != null
      const existsReqSchool = inadReqSchoolPublic != null

      if (existsEnabled) await updateConfigValue({ chave: INAD_KEY_ENABLED, valor: enabledVal, updated_by: adminEmail })
      else await createWithFinanceFallback({ chave: INAD_KEY_ENABLED, valor: enabledVal, descricao: 'Ativa bloqueio de Rematrícula por inadimplência (FE e reforço no servidor).'} )

      if (existsReqGuardian) await updateConfigValue({ chave: INAD_KEY_REQ_GUARDIAN, valor: reqGuardianVal, updated_by: adminEmail })
      else await createWithFinanceFallback({ chave: INAD_KEY_REQ_GUARDIAN, valor: reqGuardianVal, descricao: 'Exige correspondência também pelo nome do responsável (além do aluno).'} )

      if (existsReqSchool) await updateConfigValue({ chave: INAD_KEY_REQ_SCHOOL, valor: reqSchoolVal, updated_by: adminEmail })
      else await createWithFinanceFallback({ chave: INAD_KEY_REQ_SCHOOL, valor: reqSchoolVal, descricao: 'Exige que a escola informada corresponda à do registro de inadimplência.'} )

      // Sem cache FE dedicado — a RPC lê direto do servidor a cada chamada
      toast.success('Configurações de Inadimplência salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar Inadimplência:', err)
      toast.error(err?.message || 'Erro ao salvar configurações de Inadimplência')
    }
  }

  // Salvar configurações Rematrícula — MACOM
  const handleSaveMacom = async () => {
    try {
      // Helper: criação idempotente com fallback de categorias (espelha padrões do arquivo)
      const createWithAdminFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['admin', 'sistema', 'matriculas', 'config', 'geral']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      const enabledVal = macomEnabled ? 'true' : 'false'
      const categoriesVal = (macomCategories || 'especial,negociacao').toString()
      const oneOnlyVal = macomOneOnly ? 'true' : 'false'
      const hideSuggestedVal = macomHideSuggested ? 'true' : 'false'

      const existsEnabled = macomEnabledPublic != null
      const existsCategories = macomCategoriesPublic != null
      const existsOneOnly = macomOneOnlyPublic != null
      const existsHide = macomHideSuggestedPublic != null

      if (existsEnabled) await updateConfigValue({ chave: MACOM_KEY_ENABLED, valor: enabledVal, updated_by: adminEmail })
      else await createWithAdminFallback({ chave: MACOM_KEY_ENABLED, valor: enabledVal, descricao: 'Habilita o fluxo MACOM (sem sugerido + seleção manual).' })

      if (existsCategories) await updateConfigValue({ chave: MACOM_KEY_CATEGORIES, valor: categoriesVal, updated_by: adminEmail })
      else await createWithAdminFallback({ chave: MACOM_KEY_CATEGORIES, valor: categoriesVal, descricao: 'Categorias de descontos elegíveis para MACOM.' })

      if (existsOneOnly) await updateConfigValue({ chave: MACOM_KEY_ONE_ONLY, valor: oneOnlyVal, updated_by: adminEmail })
      else await createWithAdminFallback({ chave: MACOM_KEY_ONE_ONLY, valor: oneOnlyVal, descricao: 'Força a seleção de no máximo 1 desconto.' })

      if (existsHide) await updateConfigValue({ chave: MACOM_KEY_HIDE_SUGGESTED, valor: hideSuggestedVal, updated_by: adminEmail })
      else await createWithAdminFallback({ chave: MACOM_KEY_HIDE_SUGGESTED, valor: hideSuggestedVal, descricao: 'Oculta o Desconto Sugerido para MACOM.' })

      // Cache local — refletir imediatamente
      invalidateMacomConfigCache()
      primeMacomConfigCache({
        enabled: macomEnabled,
        categories: (categoriesVal || '').split(',').map(s => s.trim()).filter(Boolean),
        oneDiscountOnly: macomOneOnly,
        hideSuggested: macomHideSuggested,
      })

      toast.success('Configurações MACOM salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar MACOM:', err)
      toast.error(err?.message || 'Erro ao salvar configurações MACOM')
    }
  }

  // Salvar Rematrícula — Edição dos Cards
  async function handleSaveRematriculaEdit() {
    try {
      // Helper local: criação com fallback de categorias (idempotente)
      const createWithAdminFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['admin', 'sistema', 'matriculas', 'config', 'geral']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      const enabledVal = editEnabled ? 'true' : 'false'
      const studentVal = editStudentEnabled ? 'true' : 'false'
      const guardiansVal = editGuardiansEnabled ? 'true' : 'false'
      const addressVal = editAddressEnabled ? 'true' : 'false'
      const telemetryVal = editTelemetryEnabled ? 'true' : 'false'

      const existsEnabled = editEnabledPublic != null
      const existsStudent = editStudentPublic != null
      const existsGuardians = editGuardiansPublic != null
      const existsAddress = editAddressPublic != null
      const existsTelemetry = editTelemetryPublic != null

      if (existsEnabled) {
        await updateConfigValue({ chave: EDIT_KEY_ENABLED, valor: enabledVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: EDIT_KEY_ENABLED, valor: enabledVal, descricao: 'Habilita edição faseada nos cards da Rematrícula.' })
      }
      if (existsStudent) {
        await updateConfigValue({ chave: EDIT_KEY_STUDENT, valor: studentVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: EDIT_KEY_STUDENT, valor: studentVal, descricao: 'Habilita edição do card Aluno.' })
      }
      if (existsGuardians) {
        await updateConfigValue({ chave: EDIT_KEY_GUARDIANS, valor: guardiansVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: EDIT_KEY_GUARDIANS, valor: guardiansVal, descricao: 'Habilita edição do card Responsáveis.' })
      }
      if (existsAddress) {
        await updateConfigValue({ chave: EDIT_KEY_ADDRESS, valor: addressVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: EDIT_KEY_ADDRESS, valor: addressVal, descricao: 'Habilita edição do card Endereço.' })
      }
      if (existsTelemetry) {
        await updateConfigValue({ chave: EDIT_KEY_TELEMETRY, valor: telemetryVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: EDIT_KEY_TELEMETRY, valor: telemetryVal, descricao: 'Habilita telemetria/auditoria leve para o fluxo de edição.' })
      }

      // Cache local — refletir imediatamente
      invalidateRematriculaEditConfigCache()
      primeRematriculaEditConfigCache({
        enabled: editEnabled,
        studentEnabled: editStudentEnabled,
        guardiansEnabled: editGuardiansEnabled,
        addressEnabled: editAddressEnabled,
        telemetryEnabled: editTelemetryEnabled,
      })

      toast.success('Flags de edição da Rematrícula salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar Rematrícula — Edição:', err)
      toast.error(err?.message || 'Erro ao salvar flags de edição da Rematrícula')
    }
  }

  // Rematrícula — Edição dos Cards (hidratação sem alterar defaults ON quando não houver valor)
  useEffect(() => {
    if (editEnabledPublic != null) {
      const v = String(editEnabledPublic).trim().toLowerCase()
      setEditEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [editEnabledPublic])
  useEffect(() => {
    if (editStudentPublic != null) {
      const v = String(editStudentPublic).trim().toLowerCase()
      setEditStudentEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [editStudentPublic])
  useEffect(() => {
    if (editGuardiansPublic != null) {
      const v = String(editGuardiansPublic).trim().toLowerCase()
      setEditGuardiansEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [editGuardiansPublic])
  useEffect(() => {
    if (editAddressPublic != null) {
      const v = String(editAddressPublic).trim().toLowerCase()
      setEditAddressEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [editAddressPublic])
  useEffect(() => {
    if (editTelemetryPublic != null) {
      const v = String(editTelemetryPublic).trim().toLowerCase()
      setEditTelemetryEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [editTelemetryPublic])

  // Rematrícula — MACOM (hidratação)
  useEffect(() => {
    if (macomEnabledPublic != null) {
      const v = String(macomEnabledPublic).trim().toLowerCase()
      setMacomEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [macomEnabledPublic])
  useEffect(() => {
    if (macomCategoriesPublic != null) setMacomCategories(String(macomCategoriesPublic) || 'especial,negociacao')
  }, [macomCategoriesPublic])
  useEffect(() => {
    if (macomOneOnlyPublic != null) {
      const v = String(macomOneOnlyPublic).trim().toLowerCase()
      setMacomOneOnly(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [macomOneOnlyPublic])
  useEffect(() => {
    if (macomHideSuggestedPublic != null) {
      const v = String(macomHideSuggestedPublic).trim().toLowerCase()
      setMacomHideSuggested(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [macomHideSuggestedPublic])

  // Rematrícula — Inadimplência (hidratação)
  useEffect(() => {
    if (inadEnabledPublic != null) {
      const v = String(inadEnabledPublic).trim().toLowerCase()
      setInadEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [inadEnabledPublic])
  useEffect(() => {
    if (inadReqGuardianPublic != null) {
      const v = String(inadReqGuardianPublic).trim().toLowerCase()
      setInadReqGuardian(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [inadReqGuardianPublic])
  useEffect(() => {
    if (inadReqSchoolPublic != null) {
      const v = String(inadReqSchoolPublic).trim().toLowerCase()
      setInadReqSchool(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [inadReqSchoolPublic])

  // Rematrícula — Observações da Forma de Pagamento (hidratação)
  useEffect(() => {
    if (payNotesEnabledPublic != null) {
      const v = String(payNotesEnabledPublic).trim().toLowerCase()
      setPayNotesEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [payNotesEnabledPublic])

  // Aluno Novo — Observações da Forma de Pagamento (hidratação)
  useEffect(() => {
    if (novoPayNotesEnabledPublic != null) {
      const v = String(novoPayNotesEnabledPublic).trim().toLowerCase()
      setNovoPayNotesEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [novoPayNotesEnabledPublic])

  // Séries — Valores Anuais (hidratação)
  useEffect(() => {
    if (seriesAnnualEnabledPublic != null) {
      const v = String(seriesAnnualEnabledPublic).trim().toLowerCase()
      setSeriesAnnualEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [seriesAnnualEnabledPublic])
  useEffect(() => {
    if (seriesAnnualModePublic != null) {
      const s = String(seriesAnnualModePublic).trim().toLowerCase()
      setSeriesAnnualMode(s === 'annual' ? 'annual' : 'monthly')
    }
  }, [seriesAnnualModePublic])

  // Salvar Séries — Valores Anuais (enabled + input_mode)
  const handleSaveSeriesAnnual = async () => {
    try {
      // Helper: criação idempotente com fallback de categorias
      const createWithAdminFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['admin', 'sistema', 'matriculas', 'config', 'geral']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      const enabledVal = seriesAnnualEnabled ? 'true' : 'false'
      const modeVal = seriesAnnualMode === 'annual' ? 'annual' : 'monthly'

      const existsEnabled = seriesAnnualEnabledPublic != null
      const existsMode = seriesAnnualModePublic != null

      if (existsEnabled) {
        await updateConfigValue({ chave: SERIES_KEY_ENABLED, valor: enabledVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: SERIES_KEY_ENABLED, valor: enabledVal, descricao: 'Ativa a leitura/exibição de valores anuais das séries. Dark Launch seguro.' })
      }

      if (existsMode) {
        await updateConfigValue({ chave: SERIES_KEY_INPUT_MODE, valor: modeVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: SERIES_KEY_INPUT_MODE, valor: modeVal, descricao: 'Modo de entrada preferido para /admin/series: annual|monthly.' })
      }

      // Cache local — refletir imediatamente
      invalidateSeriesAnnualValuesConfigCache()
      primeSeriesAnnualValuesConfigCache({ enabled: seriesAnnualEnabled, inputMode: seriesAnnualMode })

      // Invalida queries públicas para refletir rapidamente em outras rotas abertas
      queryClient.invalidateQueries({ queryKey: ['public-system-config'] })

      toast.success('Configurações de Valores Anuais (Séries) salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar Séries — Valores Anuais:', err)
      toast.error(err?.message || 'Erro ao salvar configurações de Valores Anuais (Séries)')
    }
  }

  // Salvar configurações Rematrícula — Home & Busca
  const handleSaveHome = async () => {
    try {
      if (homeAdvancedEnabled) {
        if (homeMinCharsInvalid) {
          toast.error('Mínimo de caracteres inválido (2–10).')
          return
        }
        if (homePageSizeInvalid) {
          toast.error('Page size inválido (10–50).')
          return
        }
        if (homeDebounceInvalid) {
          toast.error('Debounce inválido (200–800 ms).')
          return
        }
      }
      if (homeYearInvalid) {
        toast.error(`Ano letivo inválido (>= ${currentYear}).`)
        return
      }

      // Helper: criação idempotente com fallback de categorias
      const createWithAdminFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['admin', 'sistema', 'matriculas', 'config', 'geral']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({ chave: params.chave, valor: params.valor, categoria: cat, descricao: params.descricao, updated_by: adminEmail })
            return
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      // Coerções
      const actionsVal = homeActionsEnabled ? 'true' : 'false'
      const advancedVal = homeAdvancedEnabled ? 'true' : 'false'
      const minCharsVal = String(Number.isFinite(parsedHomeMinChars) ? parsedHomeMinChars : 3)
      const pageSizeVal = String(Number.isFinite(parsedHomePageSize) ? parsedHomePageSize : 20)
      const debounceVal = String(Number.isFinite(parsedHomeDebounceMs) ? parsedHomeDebounceMs : 350)
      const scopeVal = homeScopeDefault === 'guardian' ? 'guardian' : 'student'
      const yearVal = String(Number.isFinite(parsedHomeAcademicYear) ? parsedHomeAcademicYear : currentYear)

      // Existência
      const existsActions = homeActionsPublic != null
      const existsAdvanced = homeAdvancedPublic != null
      const existsMinChars = homeMinCharsPublic != null
      const existsPageSize = homePageSizePublic != null
      const existsDebounce = homeDebounceMsPublic != null
      const existsScope = homeScopeDefaultPublic != null
      const existsYear = homeAcademicYearPublic != null

      // Upsert idempotente
      if (existsActions) {
        await updateConfigValue({ chave: HOME_KEY_ACTIONS, valor: actionsVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_ACTIONS, valor: actionsVal, descricao: 'Habilita os 3 botões na Home (Rematrícula).'} )
      }
      if (existsAdvanced) {
        await updateConfigValue({ chave: HOME_KEY_ADVANCED, valor: advancedVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_ADVANCED, valor: advancedVal, descricao: 'Habilita a página de busca avançada de Rematrícula.'} )
      }
      if (existsMinChars) {
        await updateConfigValue({ chave: HOME_KEY_MIN_CHARS, valor: minCharsVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_MIN_CHARS, valor: minCharsVal, descricao: 'Mínimo de caracteres para iniciar a busca avançada.'} )
      }
      if (existsPageSize) {
        await updateConfigValue({ chave: HOME_KEY_PAGE_SIZE, valor: pageSizeVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_PAGE_SIZE, valor: pageSizeVal, descricao: 'Tamanho de página (paginação server-side) da tabela de busca.'} )
      }
      if (existsDebounce) {
        await updateConfigValue({ chave: HOME_KEY_DEBOUNCE_MS, valor: debounceVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_DEBOUNCE_MS, valor: debounceVal, descricao: 'Debounce da busca (ms).'} )
      }
      if (existsScope) {
        await updateConfigValue({ chave: HOME_KEY_SCOPE_DEFAULT, valor: scopeVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_SCOPE_DEFAULT, valor: scopeVal, descricao: 'Escopo padrão da busca (student/guardian).'} )
      }
      if (existsYear) {
        await updateConfigValue({ chave: HOME_KEY_ACADEMIC_YEAR, valor: yearVal, updated_by: adminEmail })
      } else {
        await createWithAdminFallback({ chave: HOME_KEY_ACADEMIC_YEAR, valor: yearVal, descricao: 'Ano letivo corrente utilizado para validações de rematrícula.'} )
      }

      // Cache local
      invalidateRematriculaHomeConfigCache()
      primeRematriculaHomeConfigCache({
        actionsEnabled: actionsVal === 'true',
        advancedSearchEnabled: advancedVal === 'true',
        minChars: Number(minCharsVal),
        pageSize: Number(pageSizeVal),
        debounceMs: Number(debounceVal),
        searchScopeDefault: scopeVal as 'student' | 'guardian',
        academicYear: Number(yearVal),
      })

      toast.success('Configurações de Rematrícula (Home & Busca) salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar Rematrícula Home & Busca:', err)
      toast.error(err?.message || 'Erro ao salvar configurações de Rematrícula (Home & Busca)')
    }
  }

  useEffect(() => {
    if (percentPublic != null) {
      setPercent(String(percentPublic))
    }
  }, [percentPublic])

  // PAV — efeitos de hidratação
  useEffect(() => {
    if (pavEnabledPublic != null) {
      const v = String(pavEnabledPublic).trim().toLowerCase()
      setPavEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [pavEnabledPublic])

  useEffect(() => {
    if (pavPercentPublic != null) setPavPercent(String(pavPercentPublic))
  }, [pavPercentPublic])

  useEffect(() => {
    if (pavCodePublic != null) setPavCode(String(pavCodePublic) || 'PAV')
  }, [pavCodePublic])

  useEffect(() => {
    if (pavNamePublic != null) setPavName(String(pavNamePublic) || 'Pagamento à Vista')
  }, [pavNamePublic])

  // Rematrícula — Home & Busca — efeitos de hidratação
  useEffect(() => {
    if (homeActionsPublic != null) {
      const v = String(homeActionsPublic).trim().toLowerCase()
      setHomeActionsEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [homeActionsPublic])

  useEffect(() => {
    if (homeAdvancedPublic != null) {
      const v = String(homeAdvancedPublic).trim().toLowerCase()
      setHomeAdvancedEnabled(v === 'true' || v === '1' || v === 'yes' || v === 'on')
    }
  }, [homeAdvancedPublic])

  useEffect(() => {
    if (homeMinCharsPublic != null) setHomeMinChars(String(homeMinCharsPublic) || '3')
  }, [homeMinCharsPublic])

  useEffect(() => {
    if (homePageSizePublic != null) setHomePageSize(String(homePageSizePublic) || '20')
  }, [homePageSizePublic])

  useEffect(() => {
    if (homeDebounceMsPublic != null) setHomeDebounceMs(String(homeDebounceMsPublic) || '350')
  }, [homeDebounceMsPublic])

  useEffect(() => {
    if (homeScopeDefaultPublic != null) {
      const v = String(homeScopeDefaultPublic).trim().toLowerCase()
      setHomeScopeDefault(v === 'guardian' ? 'guardian' : 'student')
    }
  }, [homeScopeDefaultPublic])

  useEffect(() => {
    if (homeAcademicYearPublic != null) setHomeAcademicYear(String(homeAcademicYearPublic))
  }, [homeAcademicYearPublic])

  const { mutateAsync: updateConfigValue, isPending: saving } = useUpdateConfigValue()
  const { mutateAsync: createConfig, isPending: creating } = useCreateSystemConfig()

  const isLoading = loadingEnabled || loadingPercent
    || loadingPavEnabled || loadingPavPercent || loadingPavCode || loadingPavName
    || loadingHomeActions || loadingHomeAdvanced || loadingHomeMinChars || loadingHomePageSize || loadingHomeDebounce || loadingHomeScope || loadingHomeYear
    || loadingEditEnabled || loadingEditStudent || loadingEditGuardians || loadingEditAddress || loadingEditTelemetry
    || loadingMacomEnabled || loadingMacomCategories || loadingMacomOneOnly || loadingMacomHideSuggested
    || loadingInadEnabled || loadingInadReqG || loadingInadReqS
    || loadingPayNotesEnabled || loadingNovoPayNotesEnabled
    || loadingSeriesAnnualEnabled || loadingSeriesAnnualMode
  const isSaving = saving || creating

  const parsedPercent = useMemo(() => {
    const n = Number(percent)
    if (!isFinite(n)) return NaN
    return Math.max(0, Math.min(100, n))
  }, [percent])

  const percentInvalid = enabled && (!isFinite(parsedPercent) || parsedPercent < 0 || parsedPercent > 100)

  const parsedPavPercent = useMemo(() => {
    const n = Number(pavPercent)
    if (!isFinite(n)) return NaN
    return Math.max(0, Math.min(100, n))
  }, [pavPercent])
  const pavPercentInvalid = pavEnabled && (!isFinite(parsedPavPercent) || parsedPavPercent < 0 || parsedPavPercent > 100)
  const pavCodeInvalid = pavEnabled && (!pavCode || String(pavCode).trim().length === 0)
  const pavNameInvalid = pavEnabled && (!pavName || String(pavName).trim().length === 0)

  // Rematrícula — Home & Busca — validações derivadas
  const parsedHomeMinChars = useMemo(() => {
    const n = Number(homeMinChars)
    if (!isFinite(n)) return NaN
    return Math.max(2, Math.min(10, n))
  }, [homeMinChars])
  const homeMinCharsInvalid = homeAdvancedEnabled && (!isFinite(parsedHomeMinChars) || parsedHomeMinChars < 2 || parsedHomeMinChars > 10)

  const parsedHomePageSize = useMemo(() => {
    const n = Number(homePageSize)
    if (!isFinite(n)) return NaN
    return Math.max(10, Math.min(50, n))
  }, [homePageSize])
  const homePageSizeInvalid = homeAdvancedEnabled && (!isFinite(parsedHomePageSize) || parsedHomePageSize < 10 || parsedHomePageSize > 50)

  const parsedHomeDebounceMs = useMemo(() => {
    const n = Number(homeDebounceMs)
    if (!isFinite(n)) return NaN
    return Math.max(200, Math.min(800, n))
  }, [homeDebounceMs])
  const homeDebounceInvalid = homeAdvancedEnabled && (!isFinite(parsedHomeDebounceMs) || parsedHomeDebounceMs < 200 || parsedHomeDebounceMs > 800)

  const currentYear = useMemo(() => new Date().getFullYear(), [])
  const parsedHomeAcademicYear = useMemo(() => {
    const n = Number(homeAcademicYear)
    if (!isFinite(n)) return NaN
    return Math.max(currentYear, Math.min(2100, n))
  }, [homeAcademicYear, currentYear])
  const homeYearInvalid = !isFinite(parsedHomeAcademicYear) || parsedHomeAcademicYear < currentYear

  const handleSave = async () => {
    try {
      if (percentInvalid) {
        toast.error('Percentual inválido. Informe um valor entre 0 e 100.')
        return
      }

      // Helper: criar com fallback de categorias, caso a constraint de categoria seja aplicada no DB
      const createWithFallback = async (params: { chave: string; valor: string; descricao: string }) => {
        const categoriesFallback = ['geral', 'sistema', 'matriculas', 'config', 'admin']
        let lastErr: any = null
        for (const cat of categoriesFallback) {
          try {
            await createConfig({
              chave: params.chave,
              valor: params.valor,
              categoria: cat,
              descricao: params.descricao,
              updated_by: adminEmail,
            })
            return // sucesso
          } catch (e: any) {
            lastErr = e
            const msg = String(e?.message || '')
            // Continua tentando se for o erro de constraint de categoria; senão, re-lança
            if (!msg.includes('system_configs_categoria_valid')) throw e
          }
        }
        // Se todas as categorias falharem, re-lança o último erro
        throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
      }

      // Atualizar se existir; se falhar (linha ausente), criar com fallback de categoria
      const percentValue = Number.isFinite(parsedPercent) ? parsedPercent : 20
      const percentStr = String(percentValue)

      const existsEnabled = enabledPublic != null
      const existsPercent = percentPublic != null

      if (existsEnabled) {
        await updateConfigValue({ chave: KEY_ENABLED, valor: enabled ? 'true' : 'false', updated_by: adminEmail })
      } else {
        await createWithFallback({
          chave: KEY_ENABLED,
          valor: enabled ? 'true' : 'false',
          descricao: 'Feature flag para aplicar CAP no Desconto Sugerido do ano anterior',
        })
      }

      if (existsPercent) {
        await updateConfigValue({ chave: KEY_PERCENT, valor: percentStr, updated_by: adminEmail })
      } else {
        await createWithFallback({
          chave: KEY_PERCENT,
          valor: percentStr,
          descricao: 'Percentual máximo do Desconto Sugerido (0–100)',
        })
      }

      // Atualizar cache local imediatamente para refletir na UI do app
      invalidateSuggestedDiscountCapCache()
      primeSuggestedDiscountCapCache({ enabled, percent: Number(percentStr) })

      toast.success('Configurações salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar:', err)
      toast.error(err?.message || 'Erro ao salvar configurações')
    }
  }

  // Helper de criação para PAV com fallback de categoria (prioriza 'financeiro')
  const createWithFinanceFallback = async (params: { chave: string; valor: string; descricao: string }) => {
    const candidates = ['financeiro', 'geral']
    let lastErr: any = null
    for (const cat of candidates) {
      try {
        await createConfig({
          chave: params.chave,
          valor: params.valor,
          categoria: cat,
          descricao: params.descricao,
          updated_by: adminEmail,
        })
        return
      } catch (e: any) {
        lastErr = e
        const msg = String(e?.message || '')
        if (!msg.includes('system_configs_categoria_valid')) throw e
      }
    }
    throw lastErr || new Error('Falha ao criar configuração (categoria inválida)')
  }

  // Salvar configurações do PAV
  const handleSavePav = async () => {
    try {
      if (pavPercentInvalid) {
        toast.error('Percentual do PAV inválido. Informe um valor entre 0 e 100.')
        return
      }
      if (pavCodeInvalid) {
        toast.error('Informe um código para o PAV.')
        return
      }
      if (pavNameInvalid) {
        toast.error('Informe um nome para o PAV.')
        return
      }

      const existsPavEnabled = pavEnabledPublic != null
      const existsPavPercent = pavPercentPublic != null
      const existsPavCode = pavCodePublic != null
      const existsPavName = pavNamePublic != null

      const percentStr = String(Number.isFinite(parsedPavPercent) ? parsedPavPercent : 0)
      const codeStr = (pavCode || 'PAV').toString()
      const nameStr = (pavName || 'Pagamento à Vista').toString()

      // enabled
      if (existsPavEnabled) {
        await updateConfigValue({ chave: PAV_KEY_ENABLED, valor: pavEnabled ? 'true' : 'false', updated_by: adminEmail })
      } else {
        await createWithFinanceFallback({
          chave: PAV_KEY_ENABLED,
          valor: pavEnabled ? 'true' : 'false',
          descricao: 'Habilita/desabilita o toggle Pagamento à Vista na Rematrícula.',
        })
      }

      // percent
      if (existsPavPercent) {
        await updateConfigValue({ chave: PAV_KEY_PERCENT, valor: percentStr, updated_by: adminEmail })
      } else {
        await createWithFinanceFallback({
          chave: PAV_KEY_PERCENT,
          valor: percentStr,
          descricao: 'Percentual aplicado quando Pagamento à Vista estiver habilitado.',
        })
      }

      // code
      if (existsPavCode) {
        await updateConfigValue({ chave: PAV_KEY_CODE, valor: codeStr, updated_by: adminEmail })
      } else {
        await createWithFinanceFallback({
          chave: PAV_KEY_CODE,
          valor: codeStr,
          descricao: 'Código do desconto de Pagamento à Vista exibido em relatórios/PDF.',
        })
      }

      // name
      if (existsPavName) {
        await updateConfigValue({ chave: PAV_KEY_NAME, valor: nameStr, updated_by: adminEmail })
      } else {
        await createWithFinanceFallback({
          chave: PAV_KEY_NAME,
          valor: nameStr,
          descricao: 'Nome do desconto de Pagamento à Vista exibido para o usuário.',
        })
      }

      // Invalida cache local do PAV (efeito imediatamente visível para consumidores)
      invalidateCashDiscountConfigCache()

      toast.success('Configurações de Pagamento à Vista salvas com sucesso!')
    } catch (err: any) {
      console.error('[Admin Configurações] Falha ao salvar PAV:', err)
      toast.error(err?.message || 'Erro ao salvar configurações do PAV')
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações do Sistema</h1>
        <p className="text-muted-foreground">Gerencie parâmetros administrativos da aplicação.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CAP do Desconto Sugerido</CardTitle>
          <CardDescription>
            Aplica um limite máximo APENAS ao Desconto Sugerido (valor herdado do ano anterior). Não se aplica quando o operador adiciona outros descontos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar CAP para Desconto Sugerido</Label>
                  <p className="text-xs text-muted-foreground">Quando ativo, o valor sugerido será reduzido para não exceder o percentual máximo abaixo.</p>
                </div>
                <Switch checked={enabled} onCheckedChange={setEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label className="font-medium">Percentual máximo (0–100)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={percent}
                      onChange={(e) => setPercent(e.target.value)}
                      className="w-32"
                      disabled={!enabled}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  {enabled && percentInvalid && (
                    <p className="text-xs text-destructive">Informe um valor válido entre 0 e 100.</p>
                  )}
                </div>

                <Button onClick={handleSave} disabled={isSaving || (enabled && percentInvalid)}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Efeito no app é imediato (cache local é invalidado). A política se aplica apenas ao Desconto Sugerido e não interfere em descontos adicionados manualmente pelo operador.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rematrícula — Observações sobre a Forma de Pagamento</CardTitle>
          <CardDescription>
            Controla a exposição do campo de observações (texto livre) na etapa final de Rematrícula e sua inclusão no PDF. Dark Launch: nada muda até ligar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar Observações de Pagamento</Label>
                  <p className="text-xs text-muted-foreground">Exibe um campo de texto livre no final da Rematrícula e o inclui na proposta (PDF) quando preenchido.</p>
                </div>
                <Switch checked={payNotesEnabled} onCheckedChange={setPayNotesEnabled} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePaymentNotes} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Dark Launch seguro: com o toggle desligado, nada muda no app. O cache local é invalidado após salvar para refletir imediatamente nos consumidores.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aluno Novo — Observações sobre a Forma de Pagamento</CardTitle>
          <CardDescription>
            Controla a exposição do campo de observações (texto livre) na etapa final da Nova Matrícula e sua inclusão no PDF. Dark Launch: nada muda até ligar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar Observações de Pagamento</Label>
                  <p className="text-xs text-muted-foreground">Exibe um campo de texto livre no final da Nova Matrícula e o inclui na proposta (PDF) quando preenchido.</p>
                </div>
                <Switch checked={novoPayNotesEnabled} onCheckedChange={setNovoPayNotesEnabled} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveNovoPaymentNotes} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Dark Launch seguro: com o toggle desligado, nada muda no app. O cache local é invalidado após salvar para refletir imediatamente nos consumidores.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Séries — Valores Anuais</CardTitle>
          <CardDescription>
            Habilita a exibição e o input de valores ANUAIS das séries. Dark Launch: desligado = nada muda. Modo de entrada preferido controla o formulário em /admin/series.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar Valores Anuais das Séries</Label>
                  <p className="text-xs text-muted-foreground">Quando ligado, a UI passa a exibir os campos anuais (com fallback x12) onde apropriado.</p>
                </div>
                <Switch checked={seriesAnnualEnabled} onCheckedChange={setSeriesAnnualEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label className="font-medium">Modo de entrada preferido</Label>
                  <Select value={seriesAnnualMode} onValueChange={(v) => setSeriesAnnualMode((v as 'annual' | 'monthly'))}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal (legado)</SelectItem>
                      <SelectItem value="annual">Anual (preferido)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Controla como o formulário de Séries solicitará os valores durante a transição.</p>
                </div>
                <Button onClick={handleSaveSeriesAnnual} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Rollout seguro: os campos anuais permanecem facultativos no banco (F1). Este toggle apenas habilita a leitura/exibição no FE e a preferência de input.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rematrícula — MACOM (trilho maçom)</CardTitle>
          <CardDescription>
            Controla o fluxo especial para alunos do trilho "maçom": esconde o Desconto Sugerido e permite seleção manual de 1 desconto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar fluxo MACOM</Label>
                  <p className="text-xs text-muted-foreground">Habilita comportamento especial para alunos marcados como trilho "maçom".</p>
                </div>
                <Switch checked={macomEnabled} onCheckedChange={setMacomEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label className="font-medium">Categorias de descontos (CSV)</Label>
                  <Input value={macomCategories} onChange={(e) => setMacomCategories(e.target.value)} placeholder="ex.: especial,negociacao" />
                  <p className="text-xs text-muted-foreground">Usado para filtrar na tabela tipos_desconto.</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Permitir apenas 1 desconto</Label>
                  <p className="text-xs text-muted-foreground">Quando ligado, a UI só permite selecionar 1 desconto manual.</p>
                </div>
                <Switch checked={macomOneOnly} onCheckedChange={setMacomOneOnly} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ocultar Desconto Sugerido</Label>
                  <p className="text-xs text-muted-foreground">Recomendado. Para MACOM, o sistema não mostrará o sugerido.</p>
                </div>
                <Switch checked={macomHideSuggested} onCheckedChange={setMacomHideSuggested} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveMacom} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Dark Launch: com este toggle desligado, nada muda no app. A checagem lê as flags diretamente do servidor a cada chamada.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rematrícula — Inadimplência</CardTitle>
          <CardDescription>
            Bloqueia “Iniciar” e “Finalizar” Rematrícula para alunos em inadimplência. O servidor reforça a regra na RPC `enroll_finalize`.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar bloqueio por inadimplência</Label>
                  <p className="text-xs text-muted-foreground">Quando ativo, o app consulta a lista e impede o início/finalização da Rematrícula.</p>
                </div>
                <Switch checked={inadEnabled} onCheckedChange={setInadEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Exigir correspondência pelo responsável</Label>
                  <p className="text-xs text-muted-foreground">Para reduzir falsos positivos, além do nome do aluno, verifica o responsável.</p>
                </div>
                <Switch checked={inadReqGuardian} onCheckedChange={setInadReqGuardian} disabled={!inadEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Exigir mesma escola</Label>
                  <p className="text-xs text-muted-foreground">Quando ligado, só bloqueia se a escola também coincidir.</p>
                </div>
                <Switch checked={inadReqSchool} onCheckedChange={setInadReqSchool} disabled={!inadEnabled} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveInadimplencia} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Dark Launch: com este toggle desligado, nada muda no app. A checagem lê as flags diretamente do servidor a cada chamada.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rematrícula — Edição dos Cards</CardTitle>
          <CardDescription>
            Controla a edição faseada dos cards Aluno, Responsáveis e Endereço na Rematrícula. Por padrão, os toggles iniciam <strong>ligados</strong> (ON).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar edição na Rematrícula (master)</Label>
                  <p className="text-xs text-muted-foreground">Geral. Quando desligado, os botões de edição não serão exibidos em nenhum card.</p>
                </div>
                <Switch checked={editEnabled} onCheckedChange={setEditEnabled} />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Aluno</Label>
                    <p className="text-xs text-muted-foreground">Modal de edição do Aluno.</p>
                  </div>
                  <Switch checked={editStudentEnabled} onCheckedChange={setEditStudentEnabled} disabled={!editEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Responsáveis</Label>
                    <p className="text-xs text-muted-foreground">Modal de edição de Responsáveis (R1 obrigatório; R2 opcional).</p>
                  </div>
                  <Switch checked={editGuardiansEnabled} onCheckedChange={setEditGuardiansEnabled} disabled={!editEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Endereço</Label>
                    <p className="text-xs text-muted-foreground">Modal de edição do Endereço com validações de CEP/UF.</p>
                  </div>
                  <Switch checked={editAddressEnabled} onCheckedChange={setEditAddressEnabled} disabled={!editEnabled} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Telemetria leve</Label>
                    <p className="text-xs text-muted-foreground">Habilita logs/análises leves para monitorar a adoção. Não envia dados sensíveis.</p>
                  </div>
                  <Switch checked={editTelemetryEnabled} onCheckedChange={setEditTelemetryEnabled} disabled={!editEnabled} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveRematriculaEdit} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Dark Launch seguro: os modais e botões só aparecem quando estes toggles estão ativos. O app lê via cache com TTL e reflete a mudança imediatamente ao salvar.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rematrícula — Home e Busca Avançada</CardTitle>
          <CardDescription>
            Controle de exposição dos 3 botões na Home e da página de busca avançada por nome do aluno ou responsável. Dark Launch: nada muda até ativar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Exibir ações na Home</Label>
                  <p className="text-xs text-muted-foreground">Habilita os 3 botões (Realizar Rematrícula, Nova Matrícula, Matrículas Recentes).</p>
                </div>
                <Switch checked={homeActionsEnabled} onCheckedChange={setHomeActionsEnabled} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Habilitar Busca Avançada</Label>
                  <p className="text-xs text-muted-foreground">Exibe a página de busca e permite iniciar a Rematrícula por nome. Depende das ações da Home estarem ativas.</p>
                </div>
                <Switch checked={homeAdvancedEnabled} onCheckedChange={setHomeAdvancedEnabled} disabled={!homeActionsEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="font-medium">Min. caracteres (2–10)</Label>
                  <Input type="number" min={2} max={10} value={homeMinChars} onChange={(e) => setHomeMinChars(e.target.value)} disabled={!homeAdvancedEnabled || !homeActionsEnabled} className="w-32" />
                  {homeAdvancedEnabled && homeMinCharsInvalid && (
                    <p className="text-xs text-destructive">Informe um valor entre 2 e 10.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="font-medium">Page size (10–50)</Label>
                  <Input type="number" min={10} max={50} value={homePageSize} onChange={(e) => setHomePageSize(e.target.value)} disabled={!homeAdvancedEnabled || !homeActionsEnabled} className="w-32" />
                  {homeAdvancedEnabled && homePageSizeInvalid && (
                    <p className="text-xs text-destructive">Informe um valor entre 10 e 50.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="font-medium">Debounce (200–800 ms)</Label>
                  <Input type="number" min={200} max={800} value={homeDebounceMs} onChange={(e) => setHomeDebounceMs(e.target.value)} disabled={!homeAdvancedEnabled || !homeActionsEnabled} className="w-36" />
                  {homeAdvancedEnabled && homeDebounceInvalid && (
                    <p className="text-xs text-destructive">Informe um valor entre 200 e 800 ms.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="font-medium">Escopo padrão</Label>
                  <select
                    className="border rounded h-9 px-2 text-sm"
                    value={homeScopeDefault}
                    onChange={(e) => setHomeScopeDefault(e.target.value === 'guardian' ? 'guardian' : 'student')}
                    disabled={!homeAdvancedEnabled || !homeActionsEnabled}
                  >
                    <option value="student">Aluno</option>
                    <option value="guardian">Responsável</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 items-end">
                <div className="space-y-1">
                  <Label className="font-medium">Ano letivo (≥ ano atual)</Label>
                  <Input type="number" min={new Date().getFullYear()} max={2100} value={homeAcademicYear} onChange={(e) => setHomeAcademicYear(e.target.value)} className="w-40" />
                  {homeYearInvalid && (
                    <p className="text-xs text-destructive">Informe um ano ≥ {new Date().getFullYear()}.</p>
                  )}
                </div>
                <Button onClick={handleSaveHome} disabled={isSaving || homeYearInvalid || (homeAdvancedEnabled && (homeMinCharsInvalid || homePageSizeInvalid || homeDebounceInvalid))}>
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Dark Launch: com os toggles desligados, nada muda na Home. Após salvar, o cache local é invalidado para refletir imediatamente.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamento à Vista (Rematrícula)</CardTitle>
          <CardDescription>
            Controla o desconto de Pagamento à Vista exibido como toggle na Rematrícula. Quando ativado, o percentual será aplicado na composição financeira.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando configurações...</div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="font-medium">Ativar Pagamento à Vista</Label>
                  <p className="text-xs text-muted-foreground">Quando ativo, a UI da Rematrícula exibirá o toggle e aplicará o percentual configurado.</p>
                </div>
                <Switch checked={pavEnabled} onCheckedChange={setPavEnabled} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1">
                  <Label className="font-medium">Percentual (0–100)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={pavPercent}
                      onChange={(e) => setPavPercent(e.target.value)}
                      className="w-32"
                      disabled={!pavEnabled}
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                  {pavEnabled && pavPercentInvalid && (
                    <p className="text-xs text-destructive">Informe um valor válido entre 0 e 100.</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="font-medium">Código</Label>
                  <Input
                    value={pavCode}
                    onChange={(e) => setPavCode(e.target.value)}
                    placeholder="PAV"
                    disabled={!pavEnabled}
                  />
                  {pavEnabled && pavCodeInvalid && (
                    <p className="text-xs text-destructive">Informe um código.</p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="font-medium">Nome</Label>
                  <Input
                    value={pavName}
                    onChange={(e) => setPavName(e.target.value)}
                    placeholder="Pagamento à Vista"
                    disabled={!pavEnabled}
                  />
                  {pavEnabled && pavNameInvalid && (
                    <p className="text-xs text-destructive">Informe um nome.</p>
                  )}
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button onClick={handleSavePav} disabled={isSaving || (pavEnabled && (pavPercentInvalid || pavCodeInvalid || pavNameInvalid))}>
                    {isSaving ? 'Salvando...' : 'Salvar alterações'}
                  </Button>
                </div>
              </div>

              <Alert className="bg-muted/40">
                <AlertDescription className="text-xs">
                  Efeito no app é imediato (cache local é invalidado). Este card não altera nenhum fluxo até que o toggle esteja ligado.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
