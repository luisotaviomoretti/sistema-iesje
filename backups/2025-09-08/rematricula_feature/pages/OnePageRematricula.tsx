import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

import { useRematriculaForm } from '../hooks/useRematriculaForm'
import { useAcademicProgression } from '../hooks/useAcademicProgression'
import { useRematriculaDiscounts } from '../hooks/useRematriculaDiscounts'
import type { PreviousYearPrefill } from '../types'
import { FinancialBreakdownCard } from '@/features/matricula-nova/components/summary/FinancialBreakdownCard'

type LocationState = { cpf?: string }

export default function OnePageRematricula() {
  const location = useLocation()
  const initialCpf = (location.state as LocationState | null)?.cpf || ''

  const [cpf, setCpf] = useState(initialCpf)
  const [birthHint, setBirthHint] = useState('')

  const { enrollment, prefill, loading, error, ready, reload } = useRematriculaForm(cpf, birthHint)
  const [cooldown, setCooldown] = useState(false)

  // Academic progression (after prefill)
  const previousAcademic = useMemo(() => {
    if (!prefill) return null
    return {
      previousSeriesId: prefill.academic.series_id,
      previousSeriesName: prefill.academic.series_name,
      previousTrackId: prefill.academic.track_id,
      previousTrackName: prefill.academic.track_name,
      shift: prefill.academic.shift,
    }
  }, [prefill])

  const escola = enrollment.form.watch('student.escola') || (prefill?.student.escola as any)
  const progression = useAcademicProgression(enrollment.form, previousAcademic || null, escola)

  // Discounts
  const discounts = useRematriculaDiscounts(enrollment.form, prefill as PreviousYearPrefill | null)

  const onLoadPrefill = async () => {
    if (!cpf || !birthHint || loading || cooldown) return
    setCooldown(true)
    try {
      await reload()
    } finally {
      setTimeout(() => setCooldown(false), 2000)
    }
  }

  useEffect(() => {
    // If came with cpf from Identificação but without birthHint, keep focus on birthHint
  }, [])

  return (
    <main className="container py-8 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Rematrícula — One‑Page</h1>
        <p className="text-muted-foreground text-sm">Valide sua identidade e atualize os dados necessários. Campos do aluno são somente leitura.</p>
      </header>

      {/* Identity gate */}
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF do aluno</Label>
            <Input id="cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="___.___.___-__" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birth">Dia/Mês de nascimento (DD/MM)</Label>
            <Input id="birth" value={birthHint} onChange={(e) => setBirthHint(e.target.value)} placeholder="DD/MM" />
          </div>
          <div className="flex items-end">
            <Button onClick={onLoadPrefill} disabled={!cpf || !birthHint || loading || cooldown} className="w-full md:w-auto">
              {loading ? 'Carregando...' : 'Carregar dados'}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive md:col-span-3">{error}</p>}
        </CardContent>
      </Card>

      {/* Only render the form when ready (prefill loaded) */}
      {ready && (
        <section className="space-y-8">
          {/* Student (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle>Dados do Aluno (somente leitura)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              <TextFieldReadOnly label="Nome" value={enrollment.form.getValues('student.name')} />
              <TextFieldReadOnly label="CPF" value={enrollment.form.getValues('student.cpf')} />
              <TextFieldReadOnly label="RG" value={enrollment.form.getValues('student.rg') || ''} />
              <TextFieldReadOnly label="Nascimento" value={enrollment.form.getValues('student.birthDate')} />
              <TextFieldReadOnly label="Gênero" value={enrollment.form.getValues('student.gender')} />
              <TextFieldReadOnly label="Escola" value={enrollment.form.getValues('student.escola')} />
            </CardContent>
          </Card>

          {/* Guardians */}
          <Card>
            <CardHeader>
              <CardTitle>Responsáveis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-4">
                <FormInput form={enrollment.form} path="guardians.guardian1.name" label="Nome (Resp. Principal)" required />
                <FormInput form={enrollment.form} path="guardians.guardian1.cpf" label="CPF" />
                <FormInput form={enrollment.form} path="guardians.guardian1.phone" label="Telefone" />
                <FormInput form={enrollment.form} path="guardians.guardian1.email" label="E-mail" />
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <FormInput form={enrollment.form} path="guardians.guardian2.name" label="Nome (Resp. Secundário)" />
                <FormInput form={enrollment.form} path="guardians.guardian2.cpf" label="CPF" />
                <FormInput form={enrollment.form} path="guardians.guardian2.phone" label="Telefone" />
                <FormInput form={enrollment.form} path="guardians.guardian2.email" label="E-mail" />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-6">
              <FormInput form={enrollment.form} path="address.cep" label="CEP" />
              <FormInput form={enrollment.form} path="address.street" label="Rua" className="md:col-span-3" />
              <FormInput form={enrollment.form} path="address.number" label="Número" />
              <FormInput form={enrollment.form} path="address.complement" label="Complemento" />
              <FormInput form={enrollment.form} path="address.district" label="Bairro" />
              <FormInput form={enrollment.form} path="address.city" label="Cidade" />
              <FormInput form={enrollment.form} path="address.state" label="UF" />
            </CardContent>
          </Card>

          {/* Academic */}
          <Card>
            <CardHeader>
              <CardTitle>Acadêmico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {progression.warnings.length > 0 && (
                <ul className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                  {progression.warnings.map((w, i) => <li key={i}>• {w}</li>)}
                </ul>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Série (sugerida: {progression.recommended.recommendedName || '—'})</Label>
                  <select
                    className="w-full border rounded h-10 px-3"
                    value={enrollment.form.watch('academic.seriesId')}
                    onChange={(e) => enrollment.form.setValue('academic.seriesId', e.target.value, { shouldValidate: true })}
                  >
                    <option value="">Selecione</option>
                    {(progression.seriesList || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Trilho</Label>
                  <select
                    className="w-full border rounded h-10 px-3"
                    value={enrollment.form.watch('academic.trackId')}
                    onChange={(e) => enrollment.form.setValue('academic.trackId', e.target.value, { shouldValidate: true })}
                  >
                    <option value="">Selecione</option>
                    {(progression.tracksList || []).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Turno</Label>
                  <select
                    className="w-full border rounded h-10 px-3"
                    value={enrollment.form.watch('academic.shift')}
                    onChange={(e) => enrollment.form.setValue('academic.shift', e.target.value as any, { shouldValidate: true })}
                  >
                    <option value="morning">Manhã</option>
                    <option value="afternoon">Tarde</option>
                    <option value="night">Noite</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Discounts */}
          <Card>
            <CardHeader>
              <CardTitle>Descontos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label>Estratégia:</Label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="strat" checked={discounts.strategy === 'keep_previous'} onChange={() => discounts.setStrategy('keep_previous')} />
                  <span>Manter descontos anteriores (se elegíveis)</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input type="radio" name="strat" checked={discounts.strategy === 'alter'} onChange={() => discounts.setStrategy('alter')} />
                  <span>Alterar descontos</span>
                </label>
              </div>
              {discounts.previousIneligible.length > 0 && (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
                  <div className="font-medium mb-2">Alguns descontos anteriores não são mais elegíveis:</div>
                  <ul className="list-disc ml-5">
                    {discounts.previousIneligible.map((d, i) => (
                      <li key={i}>{d.code} — {d.reason || 'restrito'}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Separator />
              <div>
                <div className="font-medium mb-2">Documentos requeridos</div>
                {discounts.documentsLoading && <p className="text-sm text-muted-foreground">Carregando documentos...</p>}
                {!discounts.documentsLoading && discounts.documents.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum documento adicional necessário.</p>
                )}
                {discounts.documents.length > 0 && (
                  <ul className="text-sm grid gap-2">
                    {discounts.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between border rounded p-2">
                        <span>{doc.name} <span className="text-muted-foreground">({doc.discountRelated})</span></span>
                        <span className="text-muted-foreground text-xs">{doc.required ? 'Obrigatório' : 'Opcional'}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial summary */}
          <FinancialBreakdownCard pricing={enrollment.pricing as any} seriesData={null} readOnlyMode className="border" />

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => enrollment.resetForm()}>Limpar</Button>
            <Button onClick={enrollment.submitForm} disabled={!enrollment.canSubmit || enrollment.isSubmitting}>
              {enrollment.isSubmitting ? 'Enviando…' : 'Enviar Rematrícula'}
            </Button>
          </div>
        </section>
      )}
    </main>
  )
}

function TextFieldReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value || ''} readOnly disabled />
    </div>
  )
}

function FormInput({ form, path, label, className, required }: { form: any; path: string; label: string; className?: string; required?: boolean }) {
  const fieldState = form.getFieldState(path as any)
  const error = (fieldState?.error?.message as string) || undefined
  return (
    <div className={className}>
      <Label htmlFor={path}>{label}{required ? ' *' : ''}</Label>
      <Input id={path} {...form.register(path as any)} aria-invalid={!!error || undefined} />
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  )
}
