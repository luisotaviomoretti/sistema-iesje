import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Percent, AlertCircle, FileText } from 'lucide-react'
import { useDiscountConfig } from '../../hooks/data/useDiscountConfig'
import { useDiscountDocuments } from '../../hooks/data/useDiscountDocuments'
// Tipos do supabase não são necessários aqui após remoção do diálogo de adição
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { getCashDiscountConfig } from '@/lib/config/config.service'

type TrilhoNome = 'especial' | 'combinado' | 'negociacao'

interface DiscountSelectionCardProps {
  suggestedPercentage?: number | null
  suggestedCode?: string | null
  suggestedDescription?: string | null
  onChange?: (data: { trilho: TrilhoNome | null; tipoDescontoId: string | null; percentual: number | null }) => void
  onChangeAll?: (items: { trilho: TrilhoNome; tipoDescontoId: string; percentual: number }[]) => void
  capInfo?: { capped: boolean; capPercent: number; previousPercent: number } | null
  // F3: modo manual (ex.: MACOM) — esconde sugerido/PAV e mostra botão "Adicionar Desconto"
  manualOnly?: boolean
  onRequestManualSelection?: () => void
  // F4: seleção manual controlada externamente (injeta 0 ou 1 desconto)
  manualSelection?: { trilho: TrilhoNome; tipoDescontoId: string; percentual: number } | null
}

export default function DiscountSelectionCard({ suggestedPercentage, suggestedCode, suggestedDescription, onChange, onChangeAll, capInfo, manualOnly = false, onRequestManualSelection, manualSelection = null }: DiscountSelectionCardProps) {
  const { tipos, isLoading, isError } = useDiscountConfig()

  const displaySuggested = !manualOnly && typeof suggestedPercentage === 'number' && isFinite(suggestedPercentage)
  // Feature flag leve via env (default OFF; em DEV, tolerante)
  const envVal = String(((import.meta as any)?.env?.VITE_SHOW_SUGGESTED_DISCOUNT_DETAILS ?? '')).toLowerCase()
  const parsedFlag = envVal === 'true' || envVal === '1' || envVal === 'yes' || envVal === 'on'
  const showSuggestedDetailsFlag = parsedFlag || (!!((import.meta as any)?.env?.DEV) && envVal === '')
  const hasSuggestedDetailsRaw = Boolean((suggestedCode && suggestedCode.trim()) || (suggestedDescription && suggestedDescription.trim()))
  const hasSuggestedDetails = showSuggestedDetailsFlag && hasSuggestedDetailsRaw

  const [appliedList, setAppliedList] = useState<{ trilho: TrilhoNome; tipoDescontoId: string; percentual: number }[]>([])

  // F4: quando recebemos seleção manual externa, substitui a lista aplicada
  useEffect(() => {
    if (manualOnly) {
      if (manualSelection && manualSelection.tipoDescontoId) {
        setAppliedList([manualSelection])
      } else {
        // quando manualSelection é null, não forçamos limpar para permitir remoção manual pelo usuário
      }
    }
  }, [manualOnly, manualSelection])

  // PAV — configuração e toggle local
  const [pavEnabledCfg, setPavEnabledCfg] = useState<boolean>(false)
  const [pavPercentCfg, setPavPercentCfg] = useState<number>(0)
  const [pavCodeCfg, setPavCodeCfg] = useState<string>('PAV')
  const [pavOn, setPavOn] = useState<boolean>(false)

  useEffect(() => {
    if (manualOnly) return // Em modo manual, não aplicar lógica de PAV automaticamente
    // Buscar config do PAV com cache seguro
    ;(async () => {
      try {
        const cfg = await getCashDiscountConfig()
        setPavEnabledCfg(!!cfg.enabled)
        setPavPercentCfg(Number(cfg.percent) || 0)
        setPavCodeCfg(String(cfg.code || 'PAV'))
      } catch (e) {
        // Fallbacks seguros já são tratados no service; manter valores padrão
      }
    })()
  }, [manualOnly])

  // Buscar documentos necessários para os descontos selecionados
  // Apenas IDs existentes na tabela tipos (evita 400 para PAV/SUGERIDO, que são pseudo-códigos)
  const selectedDiscountIds = useMemo(() => {
    const validIds = new Set(tipos.map(t => t.id))
    return appliedList
      .map(item => item.tipoDescontoId)
      .filter(id => Boolean(id) && validIds.has(id))
  }, [appliedList, tipos])
  const { data: requiredDocuments, isLoading: isLoadingDocs } = useDiscountDocuments(selectedDiscountIds)

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[DiscountSelectionCard] Debug:', {
        appliedList,
        selectedDiscountIds,
        requiredDocuments,
        isLoadingDocs,
        hasDocuments: requiredDocuments && requiredDocuments.length > 0
      })
    }
  }, [appliedList, selectedDiscountIds, requiredDocuments, isLoadingDocs])

  const handleRemove = (index: number) => {
    const copy = [...appliedList]
    const removed = copy.splice(index, 1)[0]
    setAppliedList(copy)
    // Se o item removido era o PAV, desligar o toggle
    if (removed?.tipoDescontoId === pavCodeCfg) {
      setPavOn(false)
    }
  }

  const handleReset = () => {
    setAppliedList([])
    // Reset também desliga PAV
    if (pavOn) setPavOn(false)
    onChange?.({ trilho: null, tipoDescontoId: null, percentual: null })
  }

  useEffect(() => {
    if (onChangeAll) onChangeAll(appliedList)
  }, [appliedList, onChangeAll])

  // Efeito para ligar/desligar PAV na lista aplicada
  useEffect(() => {
    if (manualOnly) return
    if (!pavEnabledCfg) return // não renderiza nem aplica se cfg global está desativada
    const idxPav = appliedList.findIndex(it => it.tipoDescontoId === pavCodeCfg)
    const idxSug = appliedList.findIndex(it => it.tipoDescontoId === 'SUGERIDO')
    if (pavOn) {
      // Garantir PAV presente/atualizado
      const pavItem = { trilho: 'especial' as TrilhoNome, tipoDescontoId: pavCodeCfg, percentual: pavPercentCfg }
      let next = [...appliedList]
      if (idxPav >= 0) next[idxPav] = pavItem; else next.push(pavItem)
      // Incluir também o Sugerido (capado) quando disponível
      if (displaySuggested && typeof suggestedPercentage === 'number' && isFinite(suggestedPercentage)) {
        const sugItem = { trilho: 'especial' as TrilhoNome, tipoDescontoId: 'SUGERIDO', percentual: Number(suggestedPercentage) }
        if (idxSug >= 0) next[idxSug] = sugItem; else next.push(sugItem)
      }
      setAppliedList(next)
    } else {
      // Remover PAV
      if (idxPav >= 0) {
        const copy = [...appliedList]
        copy.splice(idxPav, 1)
        setAppliedList(copy)
      }
      // Não remove SUGERIDO aqui: fallback visual já cobre quando não houver appliedList
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pavOn, pavEnabledCfg, pavPercentCfg, pavCodeCfg, displaySuggested, suggestedPercentage, manualOnly])

  // Cálculo de total aplicado
  const totalApplied = useMemo(() => appliedList.reduce((acc, it) => acc + (it.percentual || 0), 0), [appliedList])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Descontos</CardTitle>
            <CardDescription>
              {manualOnly ? 'Selecione um desconto manual quando necessário' : 'Mantenha o desconto sugerido do último ano'}
            </CardDescription>
          </div>
          {appliedList.length > 0 ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" /> Aplicado: {Number(totalApplied).toFixed(1)}%
            </Badge>
          ) : displaySuggested ? (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" /> Sugerido: {Number(suggestedPercentage).toFixed(1)}%
            </Badge>
          ) : null}
          {manualOnly && (
            <div className="ml-3">
              <Button onClick={onRequestManualSelection}>
                Adicionar Desconto
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Estado base */}
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando configurações de descontos...
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              Não foi possível carregar as configurações de descontos.
            </AlertDescription>
          </Alert>
        ) : (
          <div>
            {/* Toggle PAV — oculto no modo manual */}
            {!manualOnly && pavEnabledCfg && (
              <div className="p-3 border rounded-md bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="font-medium">Pagamento à Vista</Label>
                    <p className="text-xs text-muted-foreground">Ative para aplicar o desconto de Pagamento à Vista configurado no painel administrativo.</p>
                  </div>
                  <Switch checked={pavOn} onCheckedChange={setPavOn} />
                </div>
                {pavOn && (
                  <div className="text-xs text-muted-foreground">
                    Aplicando: <span className="font-medium">{pavCodeCfg}</span> • <span className="font-medium">{pavPercentCfg.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}

            {appliedList.length > 0 ? (
              <div className="rounded-lg border p-3 text-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-muted-foreground">Descontos aplicados</div>
                  <div className="font-medium">Total: {Number(totalApplied).toFixed(1)}%</div>
                </div>
                <div className="divide-y">
                  {appliedList.map((item, idx) => {
                    const td = tipos.find(t => t.id === item.tipoDescontoId)
                    return (
                      <div key={`${item.tipoDescontoId}-${idx}`} className="py-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{td?.codigo || item.tipoDescontoId}</span>
                            <span className="text-xs text-muted-foreground capitalize">({item.trilho})</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">{td?.descricao || ''}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-medium w-16 text-right">{item.percentual.toFixed(1)}%</span>
                          <Button variant="ghost" size="sm" onClick={() => handleRemove(idx)}>Remover</Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {manualOnly ? 'Permitido selecionar somente UM DESCONTO para este aluno.' : 'Observação: ao aplicar descontos manuais, o desconto sugerido do último ano deixa de valer.'}
                </div>
                <div className="mt-3 flex gap-2">
                  {!manualOnly ? (
                    <Button variant="ghost" size="sm" onClick={handleReset}>Reverter para sugerido</Button>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setAppliedList([])}>Limpar descontos</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border p-3 text-sm">
                {manualOnly ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Nenhum desconto selecionado.</span>
                    <Button size="sm" onClick={onRequestManualSelection}>Adicionar Desconto</Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Desconto sugerido (último ano)</span>
                      {!hasSuggestedDetails && (
                        <span className="font-medium">{displaySuggested ? `${Number(suggestedPercentage).toFixed(1)}%` : '-'}</span>
                      )}
                    </div>
                    {hasSuggestedDetails && (
                      <div className="mt-2 py-2 px-2 rounded-md border bg-muted/30 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {suggestedCode && (
                              <span className="font-medium">{suggestedCode}</span>
                            )}
                          </div>
                          {suggestedDescription && (
                            <div className="text-xs text-muted-foreground truncate" title={suggestedDescription || undefined}>
                              {suggestedDescription}
                            </div>
                          )}
                        </div>
                        {displaySuggested && (
                          <span className="font-medium shrink-0">{Number(suggestedPercentage).toFixed(1)}%</span>
                        )}
                      </div>
                    )}
                    {capInfo?.capped && displaySuggested && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-xs text-amber-900">
                          O Desconto Sugerido foi ajustado para {Number(suggestedPercentage).toFixed(1)}% devido a regras administrativas (CAP). O desconto do ano anterior era {Number(capInfo.previousPercent).toFixed(1)}%.
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Seção de Documentos Necessários */}
        {appliedList.length > 0 && (
          <div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Documentos Necessários
              </div>
              {isLoadingDocs ? (
                <div className="text-sm text-muted-foreground">Carregando documentos...</div>
              ) : requiredDocuments && requiredDocuments.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                {requiredDocuments.map((doc, index) => {
                  // Usar o código/nome do desconto que já vem do hook (tipos podem variar)
                  const discountCode = (doc as any).discount_code || ''
                  const discountName = (doc as any).discount_name || discountCode
                  
                  return (
                    <li key={doc.id} className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">•</span>
                      <div className="flex-1">
                        <span>{doc.document_name}</span>
                        {discountCode && (
                          <span className="text-xs text-muted-foreground/70 ml-1">
                            ({discountCode} - {discountName})
                          </span>
                        )}
                        {doc.document_description && (
                          <div className="text-xs text-muted-foreground/70 mt-0.5">
                            {doc.document_description}
                          </div>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Nenhum documento adicional necessário para os descontos selecionados.
                </div>
              )}
              {requiredDocuments && requiredDocuments.length > 2 && (
                <Alert className="bg-amber-50/50 border-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-900">
                    Todos os documentos listados são obrigatórios para aprovação dos descontos.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
