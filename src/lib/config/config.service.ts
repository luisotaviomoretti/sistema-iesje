import { supabase } from '@/lib/supabase'

export interface SuggestedDiscountCapConfig {
  enabled: boolean
  percent: number
}

function readLSMacom(): { value: MacomDiscountConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.rematriculaMacom)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

export interface CashDiscountConfig {
  enabled: boolean
  percent: number
  code: string
  name: string
}

export interface RematriculaEditConfig {
  enabled: boolean
  studentEnabled: boolean
  guardiansEnabled: boolean
  addressEnabled: boolean
  telemetryEnabled: boolean
}

// Rematrícula — Observações da Forma de Pagamento (flag simples)
export interface PaymentNotesConfig {
  enabled: boolean
}

// Rematrícula — MACOM (fluxo especial de descontos)
export interface MacomDiscountConfig {
  enabled: boolean
  categories: string[]
  oneDiscountOnly: boolean
  hideSuggested: boolean
}

// Séries — Valores Anuais (feature flag)
export interface SeriesAnnualValuesConfig {
  enabled: boolean
  inputMode: 'annual' | 'monthly'
}

// Rematrícula — Ajuste por Cluster do Desconto Sugerido
export interface ClusterAdjustmentConfig {
  enabled: boolean
  clusterA: number // 5% a <10%
  clusterB: number // 10% a <15%
  clusterC: number // 15% a <20%
  clusterD: number // ≥20%
}

// Chaves no Supabase
const CAP_KEYS = {
  enabled: 'rematricula.suggested_discount_cap.enabled',
  percent: 'rematricula.suggested_discount_cap.percent',
} as const

const PAV_KEYS = {
  enabled: 'rematricula.pav.enabled',
  percent: 'rematricula.pav.percent',
  code: 'rematricula.pav.code',
  name: 'rematricula.pav.name',
} as const

const REMATRICULA_EDIT_KEYS = {
  enabled: 'rematricula.edit.enabled',
  studentEnabled: 'rematricula.edit.student.enabled',
  guardiansEnabled: 'rematricula.edit.guardians.enabled',
  addressEnabled: 'rematricula.edit.address.enabled',
  telemetryEnabled: 'rematricula.edit.telemetry.enabled',
} as const

// Chaves Rematrícula — Observações da Forma de Pagamento
const PAYMENT_NOTES_KEYS = {
  enabled: 'rematricula.payment_notes.enabled',
} as const

// Chaves Aluno Novo — Observações da Forma de Pagamento
const NOVO_PAYMENT_NOTES_KEYS = {
  enabled: 'novomatricula.payment_notes.enabled',
} as const

// Chaves Rematrícula — MACOM
const MACOM_KEYS = {
  enabled: 'rematricula.macom.enabled',
  categories: 'rematricula.macom.discount.categories',
  oneDiscountOnly: 'rematricula.macom.one_discount_only',
  hideSuggested: 'rematricula.macom.hide_suggested',
} as const

// Chaves Séries — Valores Anuais
const SERIES_ANNUAL_KEYS = {
  enabled: 'series.annual_values.enabled',
  inputMode: 'series.annual_values.input_mode', // 'annual' | 'monthly'
} as const

// Rematrícula — Ajuste por Cluster do Desconto Sugerido
const CLUSTER_KEYS = {
  enabled: 'rematricula.cluster_adjustment.enabled',
  clusterA: 'rematricula.cluster_adjustment.cluster_a.adjustment',
  clusterB: 'rematricula.cluster_adjustment.cluster_b.adjustment',
  clusterC: 'rematricula.cluster_adjustment.cluster_c.adjustment',
  clusterD: 'rematricula.cluster_adjustment.cluster_d.adjustment',
} as const

// Chaves de cache no localStorage
const LS_KEYS = {
  suggestedCap: 'cfg.suggested_discount_cap.v1',
  pav: 'cfg.rematricula_pav.v1',
  rematriculaHome: 'cfg.rematricula_home.v1',
  rematriculaEdit: 'cfg.rematricula_edit.v1',
  rematriculaMacom: 'cfg.rematricula_macom.v1',
  rematriculaInad: 'cfg.rematricula_inad.v1',
  rematriculaPaymentNotes: 'cfg.rematricula_payment_notes.v1',
  novomatriculaPaymentNotes: 'cfg.novomatricula_payment_notes.v1',
  seriesAnnualValues: 'cfg.series_annual_values.v1',
  rematriculaCluster: 'cfg.rematricula_cluster_adjustment.v1',
} as const

const DEFAULTS: SuggestedDiscountCapConfig = { enabled: false, percent: 20 }
const PAV_DEFAULTS: CashDiscountConfig = { enabled: false, percent: 0, code: 'PAV', name: 'Pagamento à Vista' }
const REMATRICULA_EDIT_DEFAULTS: RematriculaEditConfig = { 
  enabled: false,
  studentEnabled: false,
  guardiansEnabled: false,
  addressEnabled: false,
  telemetryEnabled: false,
}
const CLUSTER_DEFAULTS: ClusterAdjustmentConfig = {
  enabled: false,
  clusterA: 0,
  clusterB: 0,
  clusterC: 0,
  clusterD: 0,
}

const MACOM_DEFAULTS: MacomDiscountConfig = {
  enabled: false,
  categories: ['especial', 'negociacao'],
  oneDiscountOnly: true,
  hideSuggested: true,
}
const PAYMENT_NOTES_DEFAULTS: PaymentNotesConfig = { enabled: false }
const SERIES_ANNUAL_DEFAULTS: SeriesAnnualValuesConfig = { enabled: false, inputMode: 'monthly' }
const TTL_MS = 5 * 60 * 1000 // 5 minutos

// Cache em memória
let memCache: { value: SuggestedDiscountCapConfig; expiresAt: number } | null = null
let memCachePav: { value: CashDiscountConfig; expiresAt: number } | null = null
let memCacheEdit: { value: RematriculaEditConfig; expiresAt: number } | null = null
let memCacheMacom: { value: MacomDiscountConfig; expiresAt: number } | null = null
let memCacheInad: { value: InadimplenciaConfig; expiresAt: number } | null = null
let memCachePaymentNotes: { value: PaymentNotesConfig; expiresAt: number } | null = null
let memCacheNovoPaymentNotes: { value: PaymentNotesConfig; expiresAt: number } | null = null
let memCacheSeriesAnnual: { value: SeriesAnnualValuesConfig; expiresAt: number } | null = null
let memCacheCluster: { value: ClusterAdjustmentConfig; expiresAt: number } | null = null

function now() {
  return Date.now()
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function clamp(n: number, min: number, max: number): number {
  if (!isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}

function parseBooleanLike(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes' || s === 'on'
}

function parseInputMode(v: unknown): 'annual' | 'monthly' {
  const s = String(v ?? 'monthly').trim().toLowerCase()
  return s === 'annual' ? 'annual' : 'monthly'
}

function readLS(): { value: SuggestedDiscountCapConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.suggestedCap)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLS(value: SuggestedDiscountCapConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.suggestedCap, payload)
  } catch {
    // ignorar erros de armazenamento
  }
}

function removeLS() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.suggestedCap)
  } catch {
    // noop
  }
}

function readLSPav(): { value: CashDiscountConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.pav)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSPav(value: CashDiscountConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.pav, payload)
  } catch {
    // ignorar erros de armazenamento
  }
}

function removeLSPav() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.pav)
  } catch {
    // noop
  }
}

function readLSEdit(): { value: RematriculaEditConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.rematriculaEdit)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSEdit(value: RematriculaEditConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.rematriculaEdit, payload)
  } catch {
    // noop
  }
}

function removeLSEdit() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.rematriculaEdit)
  } catch {
    // noop
  }
}

function isExpired(expiresAt: number): boolean {
  return now() > expiresAt
}

async function fetchSuggestedDiscountCapFromServer(): Promise<SuggestedDiscountCapConfig | null> {
  try {
    const [enabledRes, percentRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: CAP_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: CAP_KEYS.percent }),
    ])

    if (enabledRes.error) {
      console.warn('[config.service] get_system_config error (enabled):', enabledRes.error)
    }
    if (percentRes.error) {
      console.warn('[config.service] get_system_config error (percent):', percentRes.error)
    }

    const enabled = parseBooleanLike(enabledRes.data ?? DEFAULTS.enabled)
    const percentNum = Number(percentRes.data ?? DEFAULTS.percent)
    const percent = clamp(percentNum, 0, 100)

    return { enabled, percent }
  } catch (err) {
    console.error('[config.service] fetchSuggestedDiscountCapFromServer failed:', err)
    return null
  }
}

export async function getSuggestedDiscountCap(options?: { forceRefresh?: boolean }): Promise<SuggestedDiscountCapConfig> {
  const force = !!options?.forceRefresh

  // 1) Cache em memória
  if (!force && memCache && !isExpired(memCache.expiresAt)) {
    return memCache.value
  }

  // 2) Cache em localStorage
  if (!force) {
    const ls = readLS()
    if (ls && !isExpired(ls.expiresAt)) {
      // hidratar memória com LS para próximos acessos
      memCache = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) Buscar do servidor
  const remote = await fetchSuggestedDiscountCapFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCache = { value: remote, expiresAt }
    writeLS(remote, TTL_MS)
    return remote
  }

  // 4) Fallbacks seguros
  // Se havia LS expirado, ainda pode servir como fallback suave
  const lsExpired = readLS()
  if (lsExpired && lsExpired.value) {
    // usar valor expirado apenas como último recurso, e por 30s para evitar loop de rede
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCache = { value: fallback, expiresAt }
    return fallback
  }

  // Último recurso: defaults estáticos
  const expiresAt = now() + 30 * 1000
  memCache = { value: DEFAULTS, expiresAt }
  return DEFAULTS
}

export function invalidateSuggestedDiscountCapCache() {
  memCache = null
  removeLS()
}

export function primeSuggestedDiscountCapCache(value: Partial<SuggestedDiscountCapConfig>, ttlMs = TTL_MS) {
  const v: SuggestedDiscountCapConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : DEFAULTS.enabled,
    percent: typeof value.percent === 'number' ? clamp(value.percent, 0, 100) : DEFAULTS.percent,
  }
  const expiresAt = now() + ttlMs
  memCache = { value: v, expiresAt }
  writeLS(v, ttlMs)
}

// Função pura para aplicar o CAP ao desconto sugerido (0–100)
export function applySuggestedDiscountCap(
  previousPercent: number,
  cfg: SuggestedDiscountCapConfig
): { finalPercent: number; capped: boolean } {
  const p = clamp(isFinite(previousPercent) ? previousPercent : 0, 0, 100)
  if (!cfg?.enabled) return { finalPercent: p, capped: false }
  const cap = clamp(isFinite(cfg.percent) ? cfg.percent : 100, 0, 100)
  const finalPercent = Math.min(p, cap)
  return { finalPercent, capped: finalPercent < p }
}

// =============================
// Pagamento à Vista (PAV)
// =============================

async function fetchPavConfigFromServer(): Promise<CashDiscountConfig | null> {
  try {
    const [enabledRes, percentRes, codeRes, nameRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: PAV_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: PAV_KEYS.percent }),
      supabase.rpc('get_system_config', { config_key: PAV_KEYS.code }),
      supabase.rpc('get_system_config', { config_key: PAV_KEYS.name }),
    ])

    if (enabledRes.error) {
      console.warn('[config.service] get_system_config error (pav.enabled):', enabledRes.error)
    }
    if (percentRes.error) {
      console.warn('[config.service] get_system_config error (pav.percent):', percentRes.error)
    }
    if (codeRes.error) {
      console.warn('[config.service] get_system_config error (pav.code):', codeRes.error)
    }
    if (nameRes.error) {
      console.warn('[config.service] get_system_config error (pav.name):', nameRes.error)
    }

    const enabled = parseBooleanLike(enabledRes.data ?? PAV_DEFAULTS.enabled)
    const percentNum = Number(percentRes.data ?? PAV_DEFAULTS.percent)
    const percent = clamp(percentNum, 0, 100)
    const code = String(codeRes.data ?? PAV_DEFAULTS.code)
    const name = String(nameRes.data ?? PAV_DEFAULTS.name)

    return { enabled, percent, code, name }
  } catch (err) {
    console.error('[config.service] fetchPavConfigFromServer failed:', err)
    return null
  }
}

export async function getCashDiscountConfig(options?: { forceRefresh?: boolean }): Promise<CashDiscountConfig> {
  const force = !!options?.forceRefresh

  // 1) Cache em memória
  if (!force && memCachePav && !isExpired(memCachePav.expiresAt)) {
    return memCachePav.value
  }

  // 2) Cache em localStorage
  if (!force) {
    const ls = readLSPav()
    if (ls && !isExpired(ls.expiresAt)) {
      memCachePav = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) Buscar do servidor
  const remote = await fetchPavConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCachePav = { value: remote, expiresAt }
    writeLSPav(remote, TTL_MS)
    return remote
  }

  // 4) Fallbacks seguros
  const lsExpired = readLSPav()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCachePav = { value: fallback, expiresAt }
    return fallback
  }

  const expiresAt = now() + 30 * 1000
  memCachePav = { value: PAV_DEFAULTS, expiresAt }
  return PAV_DEFAULTS
}

export function invalidateCashDiscountConfigCache() {
  memCachePav = null
  removeLSPav()
}

// =============================
// Rematrícula — Ajuste por Cluster (F2)
// =============================

function readLSCluster(): { value: ClusterAdjustmentConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.rematriculaCluster)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSCluster(value: ClusterAdjustmentConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.rematriculaCluster, payload)
  } catch {
    // noop
  }
}

function removeLSCluster() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.rematriculaCluster)
  } catch {
    // noop
  }
}

async function fetchClusterAdjustmentConfigFromServer(): Promise<ClusterAdjustmentConfig | null> {
  try {
    const [eRes, aRes, bRes, cRes, dRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: CLUSTER_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: CLUSTER_KEYS.clusterA }),
      supabase.rpc('get_system_config', { config_key: CLUSTER_KEYS.clusterB }),
      supabase.rpc('get_system_config', { config_key: CLUSTER_KEYS.clusterC }),
      supabase.rpc('get_system_config', { config_key: CLUSTER_KEYS.clusterD }),
    ])

    if (eRes.error) console.warn('[config.service] get_system_config error (cluster.enabled):', eRes.error)
    if (aRes.error) console.warn('[config.service] get_system_config error (cluster.a):', aRes.error)
    if (bRes.error) console.warn('[config.service] get_system_config error (cluster.b):', bRes.error)
    if (cRes.error) console.warn('[config.service] get_system_config error (cluster.c):', cRes.error)
    if (dRes.error) console.warn('[config.service] get_system_config error (cluster.d):', dRes.error)

    const enabled = parseBooleanLike(eRes.data ?? CLUSTER_DEFAULTS.enabled)
    const clusterA = clamp(Number(aRes.data ?? CLUSTER_DEFAULTS.clusterA), -100, 100)
    const clusterB = clamp(Number(bRes.data ?? CLUSTER_DEFAULTS.clusterB), -100, 100)
    const clusterC = clamp(Number(cRes.data ?? CLUSTER_DEFAULTS.clusterC), -100, 100)
    const clusterD = clamp(Number(dRes.data ?? CLUSTER_DEFAULTS.clusterD), -100, 100)

    return { enabled, clusterA, clusterB, clusterC, clusterD }
  } catch (err) {
    console.error('[config.service] fetchClusterAdjustmentConfigFromServer failed:', err)
    return null
  }
}

export async function getClusterAdjustmentConfig(options?: { forceRefresh?: boolean }): Promise<ClusterAdjustmentConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCacheCluster && !isExpired(memCacheCluster.expiresAt)) {
    return memCacheCluster.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSCluster()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheCluster = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchClusterAdjustmentConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheCluster = { value: remote, expiresAt }
    writeLSCluster(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave a LS expirado
  const lsExpired = readLSCluster()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheCluster = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults
  const expiresAt = now() + 30 * 1000
  memCacheCluster = { value: CLUSTER_DEFAULTS, expiresAt }
  return CLUSTER_DEFAULTS
}

export function invalidateClusterAdjustmentConfigCache() {
  memCacheCluster = null
  removeLSCluster()
}

export function primeClusterAdjustmentConfigCache(value: Partial<ClusterAdjustmentConfig>, ttlMs = TTL_MS) {
  const v: ClusterAdjustmentConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : CLUSTER_DEFAULTS.enabled,
    clusterA: typeof value.clusterA === 'number' ? clamp(value.clusterA, -100, 100) : CLUSTER_DEFAULTS.clusterA,
    clusterB: typeof value.clusterB === 'number' ? clamp(value.clusterB, -100, 100) : CLUSTER_DEFAULTS.clusterB,
    clusterC: typeof value.clusterC === 'number' ? clamp(value.clusterC, -100, 100) : CLUSTER_DEFAULTS.clusterC,
    clusterD: typeof value.clusterD === 'number' ? clamp(value.clusterD, -100, 100) : CLUSTER_DEFAULTS.clusterD,
  }
  const expiresAt = now() + ttlMs
  memCacheCluster = { value: v, expiresAt }
  writeLSCluster(v, ttlMs)
}

// Função pura — aplica ajuste por cluster e retorna metadados úteis
export function applyClusterAdjustment(
  previousPercent: number,
  cfg: ClusterAdjustmentConfig
): { finalPercent: number; clusterApplied: 'A' | 'B' | 'C' | 'D' | null; adjustment: number } {
  const p = clamp(isFinite(previousPercent) ? previousPercent : 0, 0, 100)

  if (!cfg?.enabled) {
    return { finalPercent: p, clusterApplied: null, adjustment: 0 }
  }

  let adjustment = 0
  let clusterApplied: 'A' | 'B' | 'C' | 'D' | null = null

  if (p >= 5 && p < 10) {
    adjustment = cfg.clusterA
    clusterApplied = 'A'
  } else if (p >= 10 && p < 15) {
    adjustment = cfg.clusterB
    clusterApplied = 'B'
  } else if (p >= 15 && p <= 20) {
    adjustment = cfg.clusterC
    clusterApplied = 'C'
  } else if (p > 20) {
    adjustment = cfg.clusterD
    clusterApplied = 'D'
  }

  const finalPercent = clamp(p + adjustment, 0, 100)
  return { finalPercent, clusterApplied, adjustment }
}

// =============================
// Rematrícula — Home & Busca
// =============================

export interface RematriculaHomeConfig {
  actionsEnabled: boolean
  advancedSearchEnabled: boolean
  minChars: number
  pageSize: number
  debounceMs: number
  searchScopeDefault: 'student' | 'guardian'
  academicYear: number
}

const HOME_KEYS = {
  actionsEnabled: 'rematricula.home.actions.enabled',
  advancedEnabled: 'rematricula.home.advanced_search.enabled',
  minChars: 'rematricula.home.advanced_search.min_chars',
  pageSize: 'rematricula.home.advanced_search.page_size',
  debounceMs: 'rematricula.home.advanced_search.debounce_ms',
  scopeDefault: 'rematricula.home.advanced_search.search_scope_default',
  academicYear: 'rematricula.academic_year',
} as const

const HOME_DEFAULTS: RematriculaHomeConfig = {
  actionsEnabled: false,
  advancedSearchEnabled: false,
  minChars: 3,
  pageSize: 20,
  debounceMs: 350,
  searchScopeDefault: 'student',
  academicYear: new Date().getFullYear(),
}

let memCacheHome: { value: RematriculaHomeConfig; expiresAt: number } | null = null

function readLSHome(): { value: RematriculaHomeConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.rematriculaHome)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSHome(value: RematriculaHomeConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.rematriculaHome, payload)
  } catch {
    // noop
  }
}

function removeLSHome() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.rematriculaHome)
  } catch {
    // noop
  }
}

async function fetchRematriculaHomeConfigFromServer(): Promise<RematriculaHomeConfig | null> {
  try {
    const [actionsRes, advRes, minCharsRes, pageSizeRes, debounceMsRes, scopeRes, yearRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.actionsEnabled }),
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.advancedEnabled }),
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.minChars }),
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.pageSize }),
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.debounceMs }),
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.scopeDefault }),
      supabase.rpc('get_system_config', { config_key: HOME_KEYS.academicYear }),
    ])

    if (actionsRes.error) console.warn('[config.service] get_system_config error (home.actionsEnabled):', actionsRes.error)
    if (advRes.error) console.warn('[config.service] get_system_config error (home.advancedEnabled):', advRes.error)
    if (minCharsRes.error) console.warn('[config.service] get_system_config error (home.minChars):', minCharsRes.error)
    if (pageSizeRes.error) console.warn('[config.service] get_system_config error (home.pageSize):', pageSizeRes.error)
    if (debounceMsRes.error) console.warn('[config.service] get_system_config error (home.debounceMs):', debounceMsRes.error)
    if (scopeRes.error) console.warn('[config.service] get_system_config error (home.scopeDefault):', scopeRes.error)
    if (yearRes.error) console.warn('[config.service] get_system_config error (home.academicYear):', yearRes.error)

    const actionsEnabled = parseBooleanLike(actionsRes.data ?? HOME_DEFAULTS.actionsEnabled)
    const advancedSearchEnabled = parseBooleanLike(advRes.data ?? HOME_DEFAULTS.advancedSearchEnabled)

    const minCharsNum = Number(minCharsRes.data ?? HOME_DEFAULTS.minChars)
    const minChars = clamp(minCharsNum, 2, 10)

    const pageSizeNum = Number(pageSizeRes.data ?? HOME_DEFAULTS.pageSize)
    const pageSize = clamp(pageSizeNum, 10, 50)

    const debounceMsNum = Number(debounceMsRes.data ?? HOME_DEFAULTS.debounceMs)
    const debounceMs = clamp(debounceMsNum, 200, 800)

    const scopeRaw = String(scopeRes.data ?? HOME_DEFAULTS.searchScopeDefault).toLowerCase()
    const searchScopeDefault: 'student' | 'guardian' = scopeRaw === 'guardian' ? 'guardian' : 'student'

    const yearNum = Number(yearRes.data ?? HOME_DEFAULTS.academicYear)
    const academicYear = clamp(yearNum, 2000, 2100)

    return { actionsEnabled, advancedSearchEnabled, minChars, pageSize, debounceMs, searchScopeDefault, academicYear }
  } catch (err) {
    console.error('[config.service] fetchRematriculaHomeConfigFromServer failed:', err)
    return null
  }
}

export async function getRematriculaHomeConfig(options?: { forceRefresh?: boolean }): Promise<RematriculaHomeConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCacheHome && !isExpired(memCacheHome.expiresAt)) {
    return memCacheHome.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSHome()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheHome = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchRematriculaHomeConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheHome = { value: remote, expiresAt }
    writeLSHome(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave a LS expirado
  const lsExpired = readLSHome()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheHome = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults estáticos (curto prazo)
  const expiresAt = now() + 30 * 1000
  memCacheHome = { value: HOME_DEFAULTS, expiresAt }
  return HOME_DEFAULTS
}

export function invalidateRematriculaHomeConfigCache() {
  memCacheHome = null
  removeLSHome()
}

export function primeRematriculaHomeConfigCache(value: Partial<RematriculaHomeConfig>, ttlMs = TTL_MS) {
  const v: RematriculaHomeConfig = {
    actionsEnabled: typeof value.actionsEnabled === 'boolean' ? value.actionsEnabled : HOME_DEFAULTS.actionsEnabled,
    advancedSearchEnabled: typeof value.advancedSearchEnabled === 'boolean' ? value.advancedSearchEnabled : HOME_DEFAULTS.advancedSearchEnabled,
    minChars: typeof value.minChars === 'number' ? clamp(value.minChars, 2, 10) : HOME_DEFAULTS.minChars,
    pageSize: typeof value.pageSize === 'number' ? clamp(value.pageSize, 10, 50) : HOME_DEFAULTS.pageSize,
    debounceMs: typeof value.debounceMs === 'number' ? clamp(value.debounceMs, 200, 800) : HOME_DEFAULTS.debounceMs,
    searchScopeDefault: value.searchScopeDefault === 'guardian' ? 'guardian' : 'student',
    academicYear: typeof value.academicYear === 'number' ? clamp(value.academicYear, 2000, 2100) : HOME_DEFAULTS.academicYear,
  }
  const expiresAt = now() + ttlMs
  memCacheHome = { value: v, expiresAt }
  writeLSHome(v, ttlMs)
}

// =============================
// Rematrícula — Edit Flags (F0)
// =============================

async function fetchRematriculaEditConfigFromServer(): Promise<RematriculaEditConfig | null> {
  try {
    const [eRes, sRes, gRes, aRes, tRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: REMATRICULA_EDIT_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: REMATRICULA_EDIT_KEYS.studentEnabled }),
      supabase.rpc('get_system_config', { config_key: REMATRICULA_EDIT_KEYS.guardiansEnabled }),
      supabase.rpc('get_system_config', { config_key: REMATRICULA_EDIT_KEYS.addressEnabled }),
      supabase.rpc('get_system_config', { config_key: REMATRICULA_EDIT_KEYS.telemetryEnabled }),
    ])

    if (eRes.error) console.warn('[config.service] get_system_config error (edit.enabled):', eRes.error)
    if (sRes.error) console.warn('[config.service] get_system_config error (edit.studentEnabled):', sRes.error)
    if (gRes.error) console.warn('[config.service] get_system_config error (edit.guardiansEnabled):', gRes.error)
    if (aRes.error) console.warn('[config.service] get_system_config error (edit.addressEnabled):', aRes.error)
    if (tRes.error) console.warn('[config.service] get_system_config error (edit.telemetryEnabled):', tRes.error)

    const cfg: RematriculaEditConfig = {
      enabled: parseBooleanLike(eRes.data ?? REMATRICULA_EDIT_DEFAULTS.enabled),
      studentEnabled: parseBooleanLike(sRes.data ?? REMATRICULA_EDIT_DEFAULTS.studentEnabled),
      guardiansEnabled: parseBooleanLike(gRes.data ?? REMATRICULA_EDIT_DEFAULTS.guardiansEnabled),
      addressEnabled: parseBooleanLike(aRes.data ?? REMATRICULA_EDIT_DEFAULTS.addressEnabled),
      telemetryEnabled: parseBooleanLike(tRes.data ?? REMATRICULA_EDIT_DEFAULTS.telemetryEnabled),
    }

    return cfg
  } catch (err) {
    console.error('[config.service] fetchRematriculaEditConfigFromServer failed:', err)
    return null
  }
}

export async function getRematriculaEditConfig(options?: { forceRefresh?: boolean }): Promise<RematriculaEditConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCacheEdit && !isExpired(memCacheEdit.expiresAt)) {
    return memCacheEdit.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSEdit()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheEdit = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchRematriculaEditConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheEdit = { value: remote, expiresAt }
    writeLSEdit(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave
  const lsExpired = readLSEdit()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheEdit = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults
  const expiresAt = now() + 30 * 1000
  memCacheEdit = { value: REMATRICULA_EDIT_DEFAULTS, expiresAt }
  return REMATRICULA_EDIT_DEFAULTS
}

export function invalidateRematriculaEditConfigCache() {
  memCacheEdit = null
  removeLSEdit()
}

export function primeRematriculaEditConfigCache(value: Partial<RematriculaEditConfig>, ttlMs = TTL_MS) {
  const v: RematriculaEditConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : REMATRICULA_EDIT_DEFAULTS.enabled,
    studentEnabled: typeof value.studentEnabled === 'boolean' ? value.studentEnabled : REMATRICULA_EDIT_DEFAULTS.studentEnabled,
    guardiansEnabled: typeof value.guardiansEnabled === 'boolean' ? value.guardiansEnabled : REMATRICULA_EDIT_DEFAULTS.guardiansEnabled,
    addressEnabled: typeof value.addressEnabled === 'boolean' ? value.addressEnabled : REMATRICULA_EDIT_DEFAULTS.addressEnabled,
    telemetryEnabled: typeof value.telemetryEnabled === 'boolean' ? value.telemetryEnabled : REMATRICULA_EDIT_DEFAULTS.telemetryEnabled,
  }
  const expiresAt = now() + ttlMs
  memCacheEdit = { value: v, expiresAt }
  writeLSEdit(v, ttlMs)
}

// =============================
// Rematrícula — MACOM (config público)
// =============================

function writeLSMacom(value: MacomDiscountConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.rematriculaMacom, payload)
  } catch {
    // noop
  }
}

function removeLSMacom() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.rematriculaMacom)
  } catch {
    // noop
  }
}

function parseCategories(raw: unknown): string[] {
  const s = String(raw ?? '')
  return s
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.length > 0)
}

async function fetchMacomConfigFromServer(): Promise<MacomDiscountConfig | null> {
  try {
    const [eRes, cRes, oRes, hRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: MACOM_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: MACOM_KEYS.categories }),
      supabase.rpc('get_system_config', { config_key: MACOM_KEYS.oneDiscountOnly }),
      supabase.rpc('get_system_config', { config_key: MACOM_KEYS.hideSuggested }),
    ])

    if (eRes.error) console.warn('[config.service] get_system_config error (macom.enabled):', eRes.error)
    if (cRes.error) console.warn('[config.service] get_system_config error (macom.categories):', cRes.error)
    if (oRes.error) console.warn('[config.service] get_system_config error (macom.oneDiscountOnly):', oRes.error)
    if (hRes.error) console.warn('[config.service] get_system_config error (macom.hideSuggested):', hRes.error)

    const enabled = parseBooleanLike(eRes.data ?? MACOM_DEFAULTS.enabled)
    const categories = (() => {
      const arr = parseCategories(cRes.data)
      return arr.length > 0 ? arr : MACOM_DEFAULTS.categories
    })()
    const oneDiscountOnly = parseBooleanLike(oRes.data ?? MACOM_DEFAULTS.oneDiscountOnly)
    const hideSuggested = parseBooleanLike(hRes.data ?? MACOM_DEFAULTS.hideSuggested)

    return { enabled, categories, oneDiscountOnly, hideSuggested }
  } catch (err) {
    console.error('[config.service] fetchMacomConfigFromServer failed:', err)
    return null
  }
}

export async function getMacomConfig(options?: { forceRefresh?: boolean }): Promise<MacomDiscountConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCacheMacom && !isExpired(memCacheMacom.expiresAt)) {
    return memCacheMacom.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSMacom()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheMacom = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchMacomConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheMacom = { value: remote, expiresAt }
    writeLSMacom(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave a LS expirado
  const lsExpired = readLSMacom()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheMacom = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults
  const expiresAt = now() + 30 * 1000
  memCacheMacom = { value: MACOM_DEFAULTS, expiresAt }
  return MACOM_DEFAULTS
}

export function invalidateMacomConfigCache() {
  memCacheMacom = null
  removeLSMacom()
}

export function primeMacomConfigCache(value: Partial<MacomDiscountConfig>, ttlMs = TTL_MS) {
  const v: MacomDiscountConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : MACOM_DEFAULTS.enabled,
    categories: Array.isArray(value.categories) && value.categories.length > 0 ? value.categories : MACOM_DEFAULTS.categories,
    oneDiscountOnly: typeof value.oneDiscountOnly === 'boolean' ? value.oneDiscountOnly : MACOM_DEFAULTS.oneDiscountOnly,
    hideSuggested: typeof value.hideSuggested === 'boolean' ? value.hideSuggested : MACOM_DEFAULTS.hideSuggested,
  }
  const expiresAt = now() + ttlMs
  memCacheMacom = { value: v, expiresAt }
  writeLSMacom(v, ttlMs)
}

// =============================
// Rematrícula — Inadimplência (config)
// =============================

export interface InadimplenciaConfig {
  enabled: boolean
  requireGuardian: boolean
  requireSameSchool: boolean
}

const INAD_KEYS = {
  enabled: 'rematricula.inadimplencia.enabled',
  reqGuardian: 'rematricula.inadimplencia.match.require_guardian',
  reqSchool: 'rematricula.inadimplencia.match.require_same_school',
} as const

const INAD_DEFAULTS: InadimplenciaConfig = {
  enabled: false,
  requireGuardian: false,
  requireSameSchool: false,
}

function readLSInad(): { value: InadimplenciaConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.rematriculaInad)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSInad(value: InadimplenciaConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.rematriculaInad, payload)
  } catch {}
}

function removeLSInad() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.rematriculaInad)
  } catch {}
}

async function fetchInadimplenciaConfigFromServer(): Promise<InadimplenciaConfig | null> {
  try {
    const [eRes, gRes, sRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: INAD_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: INAD_KEYS.reqGuardian }),
      supabase.rpc('get_system_config', { config_key: INAD_KEYS.reqSchool }),
    ])
    if (eRes.error) console.warn('[config.service] get_system_config error (inad.enabled):', eRes.error)
    if (gRes.error) console.warn('[config.service] get_system_config error (inad.reqGuardian):', gRes.error)
    if (sRes.error) console.warn('[config.service] get_system_config error (inad.reqSchool):', sRes.error)

    const enabled = parseBooleanLike(eRes.data ?? INAD_DEFAULTS.enabled)
    const requireGuardian = parseBooleanLike(gRes.data ?? INAD_DEFAULTS.requireGuardian)
    const requireSameSchool = parseBooleanLike(sRes.data ?? INAD_DEFAULTS.requireSameSchool)
    return { enabled, requireGuardian, requireSameSchool }
  } catch (err) {
    console.error('[config.service] fetchInadimplenciaConfigFromServer failed:', err)
    return null
  }
}

export async function getInadimplenciaConfig(options?: { forceRefresh?: boolean }): Promise<InadimplenciaConfig> {
  const force = !!options?.forceRefresh
  if (!force && memCacheInad && !isExpired(memCacheInad.expiresAt)) return memCacheInad.value
  if (!force) {
    const ls = readLSInad()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheInad = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }
  const remote = await fetchInadimplenciaConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheInad = { value: remote, expiresAt }
    writeLSInad(remote, TTL_MS)
    return remote
  }
  const lsExpired = readLSInad()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheInad = { value: fallback, expiresAt }
    return fallback
  }
  const expiresAt = now() + 30 * 1000
  memCacheInad = { value: INAD_DEFAULTS, expiresAt }
  return INAD_DEFAULTS
}

export function invalidateInadimplenciaConfigCache() {
  memCacheInad = null
  removeLSInad()
}

export function primeInadimplenciaConfigCache(value: Partial<InadimplenciaConfig>, ttlMs = TTL_MS) {
  const v: InadimplenciaConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : INAD_DEFAULTS.enabled,
    requireGuardian: typeof value.requireGuardian === 'boolean' ? value.requireGuardian : INAD_DEFAULTS.requireGuardian,
    requireSameSchool: typeof value.requireSameSchool === 'boolean' ? value.requireSameSchool : INAD_DEFAULTS.requireSameSchool,
  }
  const expiresAt = now() + ttlMs
  memCacheInad = { value: v, expiresAt }
  writeLSInad(v, ttlMs)
}

// =============================
// Rematrícula — Observações da Forma de Pagamento (config)
// =============================

function readLSPaymentNotes(): { value: PaymentNotesConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.rematriculaPaymentNotes)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSPaymentNotes(value: PaymentNotesConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.rematriculaPaymentNotes, payload)
  } catch {
    // noop
  }
}

function removeLSPaymentNotes() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.rematriculaPaymentNotes)
  } catch {
    // noop
  }
}

async function fetchRematriculaPaymentNotesFromServer(): Promise<PaymentNotesConfig | null> {
  try {
    const enabledRes = await supabase.rpc('get_system_config', { config_key: PAYMENT_NOTES_KEYS.enabled })
    if (enabledRes.error) {
      console.warn('[config.service] get_system_config error (payment_notes.enabled):', enabledRes.error)
    }
    const enabled = parseBooleanLike(enabledRes.data ?? PAYMENT_NOTES_DEFAULTS.enabled)
    return { enabled }
  } catch (err) {
    console.error('[config.service] fetchRematriculaPaymentNotesFromServer failed:', err)
    return null
  }
}

export async function getRematriculaPaymentNotesConfig(options?: { forceRefresh?: boolean }): Promise<PaymentNotesConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCachePaymentNotes && !isExpired(memCachePaymentNotes.expiresAt)) {
    return memCachePaymentNotes.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSPaymentNotes()
    if (ls && !isExpired(ls.expiresAt)) {
      memCachePaymentNotes = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchRematriculaPaymentNotesFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCachePaymentNotes = { value: remote, expiresAt }
    writeLSPaymentNotes(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave a LS expirado
  const lsExpired = readLSPaymentNotes()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCachePaymentNotes = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults
  const expiresAt = now() + 30 * 1000
  memCachePaymentNotes = { value: PAYMENT_NOTES_DEFAULTS, expiresAt }
  return PAYMENT_NOTES_DEFAULTS
}

export function invalidateRematriculaPaymentNotesConfigCache() {
  memCachePaymentNotes = null
  removeLSPaymentNotes()
}

export function primeRematriculaPaymentNotesConfigCache(value: Partial<PaymentNotesConfig>, ttlMs = TTL_MS) {
  const v: PaymentNotesConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : PAYMENT_NOTES_DEFAULTS.enabled,
  }
  const expiresAt = now() + ttlMs
  memCachePaymentNotes = { value: v, expiresAt }
  writeLSPaymentNotes(v, ttlMs)
}

// =============================
// Aluno Novo — Observações da Forma de Pagamento (config)
// =============================

function readLSNovoPaymentNotes(): { value: PaymentNotesConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.novomatriculaPaymentNotes)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSNovoPaymentNotes(value: PaymentNotesConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.novomatriculaPaymentNotes, payload)
  } catch {
    // noop
  }
}

function removeLSNovoPaymentNotes() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.novomatriculaPaymentNotes)
  } catch {
    // noop
  }
}

async function fetchNovomatriculaPaymentNotesFromServer(): Promise<PaymentNotesConfig | null> {
  try {
    const enabledRes = await supabase.rpc('get_system_config', { config_key: NOVO_PAYMENT_NOTES_KEYS.enabled })
    if (enabledRes.error) {
      console.warn('[config.service] get_system_config error (novo.payment_notes.enabled):', enabledRes.error)
    }
    const enabled = parseBooleanLike(enabledRes.data ?? PAYMENT_NOTES_DEFAULTS.enabled)
    return { enabled }
  } catch (err) {
    console.error('[config.service] fetchNovomatriculaPaymentNotesFromServer failed:', err)
    return null
  }
}

export async function getNovomatriculaPaymentNotesConfig(options?: { forceRefresh?: boolean }): Promise<PaymentNotesConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCacheNovoPaymentNotes && !isExpired(memCacheNovoPaymentNotes.expiresAt)) {
    return memCacheNovoPaymentNotes.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSNovoPaymentNotes()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheNovoPaymentNotes = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchNovomatriculaPaymentNotesFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheNovoPaymentNotes = { value: remote, expiresAt }
    writeLSNovoPaymentNotes(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave a LS expirado
  const lsExpired = readLSNovoPaymentNotes()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheNovoPaymentNotes = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults
  const expiresAt = now() + 30 * 1000
  memCacheNovoPaymentNotes = { value: PAYMENT_NOTES_DEFAULTS, expiresAt }
  return PAYMENT_NOTES_DEFAULTS
}

export function invalidateNovomatriculaPaymentNotesConfigCache() {
  memCacheNovoPaymentNotes = null
  removeLSNovoPaymentNotes()
}

export function primeNovomatriculaPaymentNotesConfigCache(value: Partial<PaymentNotesConfig>, ttlMs = TTL_MS) {
  const v: PaymentNotesConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : PAYMENT_NOTES_DEFAULTS.enabled,
  }
  const expiresAt = now() + ttlMs
  memCacheNovoPaymentNotes = { value: v, expiresAt }
  writeLSNovoPaymentNotes(v, ttlMs)
}

// =============================
// Séries — Valores Anuais (config)
// =============================

function readLSSeriesAnnual(): { value: SeriesAnnualValuesConfig; expiresAt: number } | null {
  try {
    if (!hasWindow()) return null
    const raw = localStorage.getItem(LS_KEYS.seriesAnnualValues)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.expiresAt !== 'number' || !parsed.value) return null
    return parsed
  } catch {
    return null
  }
}

function writeLSSeriesAnnual(value: SeriesAnnualValuesConfig, ttlMs = TTL_MS) {
  try {
    if (!hasWindow()) return
    const payload = JSON.stringify({ value, expiresAt: now() + ttlMs })
    localStorage.setItem(LS_KEYS.seriesAnnualValues, payload)
  } catch {
    // noop
  }
}

function removeLSSeriesAnnual() {
  try {
    if (!hasWindow()) return
    localStorage.removeItem(LS_KEYS.seriesAnnualValues)
  } catch {
    // noop
  }
}

async function fetchSeriesAnnualValuesConfigFromServer(): Promise<SeriesAnnualValuesConfig | null> {
  try {
    const [enabledRes, modeRes] = await Promise.all([
      supabase.rpc('get_system_config', { config_key: SERIES_ANNUAL_KEYS.enabled }),
      supabase.rpc('get_system_config', { config_key: SERIES_ANNUAL_KEYS.inputMode }),
    ])

    if (enabledRes.error) {
      console.warn('[config.service] get_system_config error (series.annual_values.enabled):', enabledRes.error)
    }
    if (modeRes.error) {
      console.warn('[config.service] get_system_config error (series.annual_values.input_mode):', modeRes.error)
    }

    const enabled = parseBooleanLike(enabledRes.data ?? SERIES_ANNUAL_DEFAULTS.enabled)
    const inputMode = parseInputMode(modeRes.data ?? SERIES_ANNUAL_DEFAULTS.inputMode)
    return { enabled, inputMode }
  } catch (err) {
    console.error('[config.service] fetchSeriesAnnualValuesConfigFromServer failed:', err)
    return null
  }
}

export async function getSeriesAnnualValuesConfig(options?: { forceRefresh?: boolean }): Promise<SeriesAnnualValuesConfig> {
  const force = !!options?.forceRefresh

  // 1) memória
  if (!force && memCacheSeriesAnnual && !isExpired(memCacheSeriesAnnual.expiresAt)) {
    return memCacheSeriesAnnual.value
  }

  // 2) localStorage
  if (!force) {
    const ls = readLSSeriesAnnual()
    if (ls && !isExpired(ls.expiresAt)) {
      memCacheSeriesAnnual = { value: ls.value, expiresAt: ls.expiresAt }
      return ls.value
    }
  }

  // 3) servidor
  const remote = await fetchSeriesAnnualValuesConfigFromServer()
  if (remote) {
    const expiresAt = now() + TTL_MS
    memCacheSeriesAnnual = { value: remote, expiresAt }
    writeLSSeriesAnnual(remote, TTL_MS)
    return remote
  }

  // 4) fallback suave a LS expirado
  const lsExpired = readLSSeriesAnnual()
  if (lsExpired && lsExpired.value) {
    const fallback = lsExpired.value
    const expiresAt = now() + 30 * 1000
    memCacheSeriesAnnual = { value: fallback, expiresAt }
    return fallback
  }

  // 5) defaults
  const expiresAt = now() + 30 * 1000
  memCacheSeriesAnnual = { value: SERIES_ANNUAL_DEFAULTS, expiresAt }
  return SERIES_ANNUAL_DEFAULTS
}

export function invalidateSeriesAnnualValuesConfigCache() {
  memCacheSeriesAnnual = null
  removeLSSeriesAnnual()
}

export function primeSeriesAnnualValuesConfigCache(value: Partial<SeriesAnnualValuesConfig>, ttlMs = TTL_MS) {
  const v: SeriesAnnualValuesConfig = {
    enabled: typeof value.enabled === 'boolean' ? value.enabled : SERIES_ANNUAL_DEFAULTS.enabled,
    inputMode: value.inputMode === 'annual' ? 'annual' : SERIES_ANNUAL_DEFAULTS.inputMode,
  }
  const expiresAt = now() + ttlMs
  memCacheSeriesAnnual = { value: v, expiresAt }
  writeLSSeriesAnnual(v, ttlMs)
}
