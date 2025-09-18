import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { RematriculaReadModel } from '../types/details'
import { formatCPF } from '../utils/formValidators'
import { RematriculaPricingService } from '../services/rematriculaPricingService'

type DiscountItem = { id?: string; percentual?: number; code?: string; name?: string; category?: string; value?: number }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  readModel: RematriculaReadModel
  selection: {
    series: any | null
    discounts: DiscountItem[]
  }
  onConfirm: () => void
  isSubmitting?: boolean
  errors?: string[]
  originEscolaLabel?: string | null
  destinationEscolaLabel?: string | null
  // Quando não houver descontos manuais, usar o sugerido capado (F5)
  suggestedPercentageOverride?: number | null
  // Info de CAP para aviso visual (F6)
  capInfo?: { capped: boolean; previousPercent: number; capPercent?: number } | null
  // F3 — Observações sobre a Forma de Pagamento
  paymentNotesEnabled?: boolean
  paymentNotes?: string
  onChangePaymentNotes?: (value: string) => void
}

const formatCurrency = (value?: number | null) => {
  const v = typeof value === 'number' ? value : 0
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const formatPercent = (value?: number | null) => {
  const v = typeof value === 'number' ? value : 0
  return `${v.toFixed(2)}%`
}

export default function RematriculaFinalizeModal({ open, onOpenChange, readModel, selection, onConfirm, isSubmitting, errors, originEscolaLabel, destinationEscolaLabel, suggestedPercentageOverride, capInfo, paymentNotesEnabled, paymentNotes, onChangePaymentNotes }: Props) {
  const academicSummary = useMemo(() => {
    const current = readModel?.academic || {}
    const sel = selection?.series || null
    return {
      previous: {
        series: current.series_name || '—',
        track: current.track_name || '—',
        shift: current.shift || '—',
      },
      next: sel
        ? {
            series: sel?.nome || sel?.name || sel?.label || sel?.seriesName || '—',
            track: sel?.trilho_nome || sel?.trackName || sel?.track?.name || '—',
            shift: sel?.shift || sel?.turno || readModel?.academic?.shift || '—',
          }
        : null,
    }
  }, [readModel?.academic, selection?.series])

  const discountsSummary = useMemo(() => {
    const selected = selection?.discounts || []
    const hasNewSelection = selected.length > 0
    const items = hasNewSelection
      ? selected.map((d) => ({
          code: (d as any).codigo || (d as any).code || (d as any).tipoDescontoId,
          name: (d as any).nome || (d as any).name || (d as any).descricao,
          category: (d as any).category,
          percentual: (d as any).percentual,
          value: (d as any).value,
        }))
      : []
    return {
      items,
      source: hasNewSelection ? 'selecionados nesta página' : 'sugeridos do ano anterior',
    }
  }, [selection?.discounts])

  const financialPreview = useMemo(() => {
    const series = selection?.series as any
    const suggestedPercentage = (!selection?.discounts || selection.discounts.length === 0)
      ? (typeof suggestedPercentageOverride === 'number' ? suggestedPercentageOverride : (readModel?.financial?.total_discount_percentage || 0))
      : null

    // Quando não há série selecionada, usar somente referências do read model
    if (!series) {
      return {
        pricing: null as any,
        baseValue: readModel?.financial?.base_value,
        material: readModel?.financial?.material_cost,
        totalDiscountPercentage: readModel?.financial?.total_discount_percentage || 0,
        totalDiscountValue: readModel?.financial?.total_discount_value,
        finalMonthly: readModel?.financial?.final_monthly_value,
      }
    }

    // Mapear descontos no mesmo formato do FinancialBreakdownCard
    let effectiveDiscounts = (selection?.discounts || []) as any[]
    if (effectiveDiscounts.length === 0 && suggestedPercentage && suggestedPercentage > 0) {
      effectiveDiscounts = [{
        id: 'suggested',
        codigo: 'SUGERIDO',
        nome: 'Desconto do ano anterior',
        percentual: suggestedPercentage,
        trilho: 'especial'
      }]
    }

    const formattedDiscounts = effectiveDiscounts.map(d => ({
      id: d.tipoDescontoId || d.id,
      codigo: d.tipoDescontoId || d.codigo || 'SUGERIDO',
      nome: d.nome || 'Desconto',
      percentual: d.percentual,
      trilho: d.trilho
    }))

    const pricing = RematriculaPricingService.calculate(series, formattedDiscounts as any)
    return {
      pricing,
      baseValue: pricing.baseValue,
      material: pricing.materialValue,
      totalDiscountPercentage: pricing.totalDiscountPercentage,
      totalDiscountValue: pricing.totalDiscountValue,
      finalMonthly: pricing.finalMonthlyValue,
    }
  }, [selection?.series, selection?.discounts, readModel?.financial, suggestedPercentageOverride])

  const address = readModel?.address || {}
  const guardians = readModel?.guardians || ({} as any)
  const student = readModel?.student || ({} as any)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] grid grid-rows-[auto,minmax(0,1fr),auto] gap-0 p-0">
        <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Confirmar Finalização da Rematrícula</DialogTitle>
          <DialogDescription>
            Revise atentamente os dados antes de enviar. Você poderá voltar e editar se necessário.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          {!!(errors && errors.length) && (
            <Alert variant="destructive">
              <AlertDescription>
                Corrija os seguintes problemas antes de enviar:
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  {errors.map((e, idx) => (
                    <li key={idx}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Aluno */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Aluno</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Nome: </span>
                <span>{student?.name || '—'}</span>
              </div>
              <div>
                <span className="font-medium">CPF: </span>
                <span>{formatCPF(student?.cpf || '')}</span>
              </div>
              {student?.birth_date && (
                <div>
                  <span className="font-medium">Nascimento: </span>
                  <span>{student.birth_date}</span>
                </div>
              )}
              {(destinationEscolaLabel || originEscolaLabel || student?.escola) && (
                <div className="col-span-1 md:col-span-2">
                  {destinationEscolaLabel ? (
                    <>
                      <span className="font-medium">Escola de destino: </span>
                      <span>{destinationEscolaLabel}</span>
                      {originEscolaLabel && originEscolaLabel !== destinationEscolaLabel && (
                        <>
                          <span> • </span>
                          <span className="font-medium">Origem: </span>
                          <span>{originEscolaLabel}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium">Escola: </span>
                      <span>{originEscolaLabel || (student?.escola as any) || '—'}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Acadêmico */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Acadêmico</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Série atual: </span>
                <span>{academicSummary.previous.series}</span>
              </div>
              <div>
                <span className="font-medium">Turno atual: </span>
                <span>{academicSummary.previous.shift}</span>
              </div>
              <div>
                <span className="font-medium">Trilha atual: </span>
                <span>{academicSummary.previous.track}</span>
              </div>
              {academicSummary.next ? (
                <>
                  <div>
                    <span className="font-medium">Série selecionada: </span>
                    <span>{academicSummary.next.series}</span>
                  </div>
                  <div>
                    <span className="font-medium">Turno selecionado: </span>
                    <span>{academicSummary.next.shift}</span>
                  </div>
                  <div>
                    <span className="font-medium">Trilha selecionada: </span>
                    <span>{academicSummary.next.track}</span>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">Nenhuma seleção de próxima série/turno realizada.</div>
              )}
            </div>
          </section>

          <Separator />

          {/* Descontos */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Descontos</h3>
            {capInfo?.capped && (!selection?.discounts || selection.discounts.length === 0) && (
              <Alert className="mb-3">
                <AlertDescription className="text-xs">
                  O Desconto Sugerido foi ajustado para {formatPercent(suggestedPercentageOverride ?? (readModel?.financial?.total_discount_percentage || 0))} devido a regras administrativas (CAP). O desconto do ano anterior era {formatPercent(capInfo.previousPercent)}.
                </AlertDescription>
              </Alert>
            )}
            <div className="space-y-1 text-sm">
              <div className="text-muted-foreground">Origem: {discountsSummary.source}</div>
              {discountsSummary.items?.length > 0 && (
                <>
                  {discountsSummary.items.map((d, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{d.name || d.code || 'Desconto'}</span>
                      <span className="font-medium">{formatPercent(d.percentual as any)}</span>
                    </div>
                  ))}
                </>
              )}
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="font-medium">Total de descontos</span>
                <span className="font-semibold">{formatPercent((financialPreview as any)?.totalDiscountPercentage)}</span>
              </div>
            </div>
          </section>

          <Separator />

          {/* Financeiro (espelha o Detalhamento Financeiro) */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Financeiro</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Valor base: </span>
                <span>{formatCurrency(financialPreview.baseValue)}</span>
              </div>
              <div>
                <span className="font-medium">Material: </span>
                <span>{formatCurrency(financialPreview.material)}</span>
              </div>
              <div>
                <span className="font-medium">Total de descontos: </span>
                <span>{formatPercent(financialPreview.totalDiscountPercentage)}</span>
              </div>
              {typeof financialPreview.finalMonthly === 'number' && (
                <div>
                  <span className="font-medium">Mensalidade com desconto: </span>
                  <span>{formatCurrency(financialPreview.finalMonthly)}</span>
                </div>
              )}
            </div>
            {typeof financialPreview.totalDiscountValue === 'number' && (
              <div className="mt-2 text-xs text-muted-foreground">
                Economia total: {formatCurrency(financialPreview.totalDiscountValue)}
              </div>
            )}
          </section>

          <Separator />

          {/* Responsáveis e Endereço */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Responsáveis</h3>
            <div className="space-y-1 text-sm">
              <div>
                <span className="font-medium">Responsável 1: </span>
                <span>
                  {guardians?.guardian1?.name || '—'} • {formatCPF(guardians?.guardian1?.cpf || '')}
                  {guardians?.guardian1?.phone ? ` • ${guardians.guardian1.phone}` : ''}
                  {guardians?.guardian1?.email ? ` • ${guardians.guardian1.email}` : ''}
                </span>
              </div>
              {guardians?.guardian2?.cpf && (
                <div>
                  <span className="font-medium">Responsável 2: </span>
                  <span>
                    {guardians?.guardian2?.name || '—'} • {formatCPF(guardians?.guardian2?.cpf || '')}
                    {guardians?.guardian2?.phone ? ` • ${guardians.guardian2.phone}` : ''}
                    {guardians?.guardian2?.email ? ` • ${guardians.guardian2.email}` : ''}
                  </span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">CEP: </span>
                <span>{address?.cep || '—'}</span>
              </div>
              <div>
                <span className="font-medium">Logradouro: </span>
                <span>{address?.street || '—'}</span>
              </div>
              <div>
                <span className="font-medium">Número: </span>
                <span>{address?.number || '—'}</span>
              </div>
              {address?.complement && (
                <div>
                  <span className="font-medium">Complemento: </span>
                  <span>{address?.complement}</span>
                </div>
              )}
              <div>
                <span className="font-medium">Bairro: </span>
                <span>{address?.district || '—'}</span>
              </div>
              <div>
                <span className="font-medium">Cidade/UF: </span>
                <span>{address?.city || '—'}{address?.state ? `/${address.state}` : ''}</span>
              </div>
            </div>
          </section>

          {/* F3 — Observações sobre a Forma de Pagamento */}
          {paymentNotesEnabled && (
            <section>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Observações sobre a Forma de Pagamento</h3>
              <div className="space-y-2">
                <Label htmlFor="payment-notes" className="text-sm">Campo livre (opcional)</Label>
                <Textarea
                  id="payment-notes"
                  placeholder="Ex.: pagamento combinado via boleto até dia 05, com ajuste pró-rata no primeiro mês."
                  value={paymentNotes || ''}
                  onChange={(e) => onChangePaymentNotes?.(e.target.value)}
                  maxLength={1000}
                  rows={4}
                />
                <div className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>Será incluído na proposta (PDF) quando preenchido.</span>
                  <span>{`${(paymentNotes || '').length}/1000`}</span>
                </div>
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!isSubmitting}>Voltar e Editar</Button>
          <Button onClick={onConfirm} disabled={!!isSubmitting || !!(errors && errors.length)}>{isSubmitting ? 'Enviando...' : 'Confirmar e Enviar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
