import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { RematriculaHomeConfig } from '@/lib/config/config.service'
import { RematriculaSearchService, SearchScope, createRematriculaSearchManager } from '@/features/rematricula-v2/services/rematriculaSearchService'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { checkInadimplenciaOnce } from '@/features/rematricula-v2/hooks/useInadimplencia'

function statusLabel(s: 'NONE' | 'IN_PROGRESS' | 'COMPLETED'): string {
  if (s === 'IN_PROGRESS') return 'Em andamento'
  if (s === 'COMPLETED') return 'Concluída'
  return 'Não iniciada'
}

function statusBadgeVariant(s: 'NONE' | 'IN_PROGRESS' | 'COMPLETED'): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (s === 'IN_PROGRESS') return 'secondary'
  if (s === 'COMPLETED') return 'default'
  return 'outline'
}

export default function RematriculaBuscaPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [cfg, setCfg] = useState<RematriculaHomeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI local state (F6 — sem integração real ainda)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<SearchScope>('student')
  const [page, setPage] = useState(0)
  const [searching, setSearching] = useState(false)
  const [items, setItems] = useState<Array<{
    student_id: string
    student_name: string
    student_slug: string
    selection_token: string
    guardian_names: string[] | null
    school_name: string | null
    grade_name: string | null
    reenrollment_status: 'NONE' | 'IN_PROGRESS' | 'COMPLETED'
    reenrollment_id: string | null
    has_reenrollment: boolean
  }>>([])
  const [resultLimit, setResultLimit] = useState(20)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [validatingId, setValidatingId] = useState<string | null>(null)

  const mgr = useMemo(() => createRematriculaSearchManager(), [])

  // Dispose manager on unmount to avoid leaks
  useEffect(() => {
    return () => {
      try { mgr.dispose() } catch {}
    }
  }, [mgr])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const c = await RematriculaSearchService.getConfig()
        if (!mounted) return
        setCfg(c)
        setScope(c.searchScopeDefault === 'guardian' ? 'guardian' : 'student')
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Falha ao carregar configurações')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Trigger debounced search when query/scope/page change and minChars met
  useEffect(() => {
    if (!cfg) return
    const minChars = Math.max(2, Math.min(10, cfg.minChars))
    const q = (query || '').trim()
    if (q.length < minChars) {
      setItems([])
      setSearchError(null)
      return
    }
    let cancelled = false
    setSearching(true)
    setSearchError(null)
    mgr.debouncedSearch({ query: q, scope, page })
      .then((res) => {
        if (cancelled) return
        setItems(res.items || [])
        setResultLimit(res.limit)
      })
      .catch((err) => {
        if (cancelled) return
        setSearchError(err?.message || 'Falha ao buscar resultados')
        setItems([])
      })
      .finally(() => {
        if (cancelled) return
        setSearching(false)
      })
    return () => { cancelled = true }
  }, [cfg, query, scope, page, mgr])

  // Reset page when scope changes or query changes
  useEffect(() => { setPage(0) }, [scope])
  useEffect(() => { setPage(0) }, [query])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        <div className="h-10 w-full bg-muted animate-pulse rounded" />
        <div className="h-72 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Busca Avançada</CardTitle>
            <CardDescription>Ocorreu um erro ao carregar as configurações.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!cfg?.advancedSearchEnabled) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Busca Avançada desabilitada</CardTitle>
            <CardDescription>Ative a opção em Admin &gt; Configurações para utilizar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Esta página faz parte do rollout controlado (dark launch). Enquanto desabilitada, utilize os fluxos existentes normalmente.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const minChars = Math.max(2, Math.min(10, cfg.minChars))

  async function handleValidateStart(row: {
    student_id: string
    student_name: string
    reenrollment_status: 'NONE' | 'IN_PROGRESS' | 'COMPLETED'
    has_reenrollment: boolean
  }) {
    try {
      setValidatingId(row.student_id)
      // F5: Checagem de inadimplência (não-disruptiva: usa flag no servidor)
      let override1mAccepted = false
      let inadSnapshot: { meses_inadim: number | null; codigo_inadim: string | null } | null = null
      try {
        const guardian = (items.find(i => i.student_id === row.student_id)?.guardian_names || [])[0] || null
        const school = (items.find(i => i.student_id === row.student_id)?.school_name) || null
        const inad = await checkInadimplenciaOnce({
          studentName: row.student_name,
          guardianName: guardian || undefined,
          school: school || undefined,
        })
        if (inad.is_inadimplente) {
          const meses = Number(inad.meses_inadim ?? 0)
          inadSnapshot = { meses_inadim: inad.meses_inadim ?? null, codigo_inadim: inad.codigo_inadim ?? null }
          if (meses === 1) {
            const ok = window.confirm('Este aluno consta inadimplência (1 mês). Deseja continuar?')
            if (!ok) return
            override1mAccepted = true
          } else {
            toast({
              title: 'Ação bloqueada por inadimplência',
              description: `Este aluno consta em inadimplência${inad.meses_inadim ? ` (${inad.meses_inadim} mês(es))` : ''}${inad.codigo_inadim ? ` — código ${inad.codigo_inadim}` : ''}. Procure a Tesouraria para regularizar.`,
              duration: 6000,
            })
            return
          }
        }
      } catch {
        // Falha silenciosa: segue fluxo normal
      }
      const config = cfg || (await RematriculaSearchService.getConfig())
      // Revalidar por nome do aluno (escopo student) para trazê-lo no topo por similaridade
      const res = await RematriculaSearchService.searchCandidates({
        query: row.student_name,
        scope: 'student',
        year: config.academicYear,
        page: 0,
        limit: config.pageSize,
      })
      const fresh = (res.items || []).find((r) => r.student_id === row.student_id)
      if (!fresh) {
        toast({
          title: 'Não foi possível validar agora',
          description: 'Recarregue a busca e tente novamente. O aluno pode ter sido atualizado recentemente.',
          duration: 5000,
        })
        return
      }
      const canStart = RematriculaSearchService.canInitiateReenrollment(fresh)
      if (!canStart) {
        const reason = fresh.reenrollment_status === 'COMPLETED'
          ? 'Rematrícula já concluída.'
          : 'Já existe uma rematrícula em andamento.'
        toast({
          title: 'Ação bloqueada',
          description: `${reason} Utilize "Matrículas Recentes" para acompanhar detalhes.`,
          duration: 6000,
        })
        return
      }
      // Navegar para detalhes usando slug + token (sem expor CPF)
      const path = RematriculaSearchService.buildDetailPath({ student_slug: fresh.student_slug })
      const token = fresh.selection_token
      const qs = `?t=${encodeURIComponent(token)}`
      navigate(`${path}${qs}`, {
        state: {
          studentData: {
            name: fresh.student_name,
            escola: fresh.school_name,
            previousSeries: fresh.grade_name,
          },
          inadOverride1m: override1mAccepted || undefined,
          inadSnapshot: inadSnapshot || undefined,
        }
      })
    } catch (e: any) {
      toast({
        title: 'Falha ao validar',
        description: e?.message || 'Tente novamente em instantes.',
        duration: 5000,
      })
    } finally {
      setValidatingId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Busca Avançada de Rematrícula</h1>
        <p className="text-muted-foreground text-sm">Pesquise por nome do aluno ou do responsável.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Digite ao menos {minChars} caracteres para iniciar a busca.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr,200px] gap-4 items-end">
            <div className="space-y-2">
              <Label className="font-medium" htmlFor="rematricula-search-input">Pesquisar</Label>
              <Input
                id="rematricula-search-input"
                placeholder={`Ex.: Ana, João, Ferreira...`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Pesquisar por nome do aluno ou do responsável"
              />
              <p className="text-xs text-muted-foreground">Mínimo: {minChars} caracteres. Debounce configurado em {cfg.debounceMs} ms.</p>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">Escopo</Label>
              <div className="flex gap-2">
                <Button type="button" variant={scope === 'student' ? 'default' : 'outline'} onClick={() => setScope('student')} aria-pressed={scope === 'student'} aria-label="Buscar por aluno">Aluno</Button>
                <Button type="button" variant={scope === 'guardian' ? 'default' : 'outline'} onClick={() => setScope('guardian')} aria-pressed={scope === 'guardian'} aria-label="Buscar por responsável">Responsável</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>Resultados em tempo real com debounce. Status semânticos e paginação básica.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.trim().length < minChars ? (
            <div className="text-sm text-muted-foreground">Digite ao menos {minChars} caracteres para ver resultados.</div>
          ) : (
            <>
              <div className="w-full overflow-x-auto" aria-busy={searching} aria-live="polite">
                <table className="w-full text-sm" role="table" aria-label="Resultados de alunos para rematrícula">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b" role="row">
                      <th className="py-2 pr-4" scope="col">Aluno</th>
                      <th className="py-2 pr-4" scope="col">Responsável(es)</th>
                      <th className="py-2 pr-4" scope="col">Escola</th>
                      <th className="py-2 pr-4" scope="col">Série</th>
                      <th className="py-2 pr-4" scope="col">Status</th>
                      <th className="py-2 pr-4" scope="col">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searching ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b last:border-none" role="row">
                          <td className="py-3 pr-4"><div className="h-4 w-40 bg-muted animate-pulse rounded" /></td>
                          <td className="py-3 pr-4"><div className="h-4 w-56 bg-muted animate-pulse rounded" /></td>
                          <td className="py-3 pr-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                          <td className="py-3 pr-4"><div className="h-4 w-28 bg-muted animate-pulse rounded" /></td>
                          <td className="py-3 pr-4"><div className="h-4 w-24 bg-muted animate-pulse rounded" /></td>
                          <td className="py-3 pr-4">
                            <Button size="sm" disabled>Iniciar</Button>
                          </td>
                        </tr>
                      ))
                    ) : items.length === 0 ? (
                      <tr role="row">
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">Nenhum resultado para os filtros informados.</td>
                      </tr>
                    ) : (
                      items.map((r) => {
                        const canStart = RematriculaSearchService.canInitiateReenrollment(r)
                        const busy = validatingId === r.student_id
                        return (
                          <tr key={`${r.student_id}`} className="border-b last:border-none hover:bg-muted/30" role="row">
                            <td className="py-3 pr-4">{r.student_name}</td>
                            <td className="py-3 pr-4">{(r.guardian_names || []).filter(Boolean).join(', ') || '-'}</td>
                            <td className="py-3 pr-4">{r.school_name || '-'}</td>
                            <td className="py-3 pr-4">{r.grade_name || '-'}</td>
                            <td className="py-3 pr-4">
                              <Badge variant={statusBadgeVariant(r.reenrollment_status)} aria-label={`Status: ${statusLabel(r.reenrollment_status)}`}>{statusLabel(r.reenrollment_status)}</Badge>
                            </td>
                            <td className="py-3 pr-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <Button
                                      size="sm"
                                      disabled={!canStart || busy}
                                      onClick={() => handleValidateStart(r)}
                                      aria-label={canStart ? (busy ? 'Validando...' : `Iniciar rematrícula para ${r.student_name}`) : 'Ação indisponível'}
                                    >
                                      {busy ? 'Validando...' : 'Iniciar'}
                                    </Button>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {!canStart
                                      ? (r.reenrollment_status === 'COMPLETED'
                                          ? 'Rematrícula já concluída — acompanhe em Matrículas Recentes.'
                                          : 'Rematrícula em andamento — acompanhe em Matrículas Recentes.')
                                      : 'Validação rápida antes de iniciar.'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {searchError ? (
                <div className="mt-3 text-sm text-destructive">{searchError}</div>
              ) : null}
              <Separator className="my-4" />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page <= 0 || searching} aria-label="Página anterior" aria-disabled={page <= 0 || searching}>Anterior</Button>
                <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={searching || items.length < resultLimit} aria-label="Próxima página" aria-disabled={searching || items.length < resultLimit}>Próxima</Button>
              </div>
              <div className="sr-only" aria-live="polite">
                {items.length} resultados exibidos na página {page + 1}.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
