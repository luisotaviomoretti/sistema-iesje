import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cleanCPF, formatCPF, formatPhone } from '../../utils/formValidators'
import type { ReadModelGuardians } from '../../types/details'

export interface EditResponsaveisModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: {
    guardian1: Partial<ReadModelGuardians['guardian1']> & { name: string; cpf: string }
    guardian2?: Partial<NonNullable<ReadModelGuardians['guardian2']>> | undefined
  }
  onSave: (next: {
    guardian1?: Partial<ReadModelGuardians['guardian1']>
    guardian2?: Partial<NonNullable<ReadModelGuardians['guardian2']>> | null
  }) => void
}

function isValidEmail(v?: string | null): boolean {
  if (!v) return true
  return /.+@.+\..+/.test(v)
}

function onlyDigits(v?: string | null): string {
  return String(v ?? '').replace(/\D/g, '')
}

export default function EditResponsaveisModal(props: EditResponsaveisModalProps) {
  const { open, onOpenChange, initial, onSave } = props
  // G1
  const [g1Name, setG1Name] = useState(initial?.guardian1?.name || '')
  const [g1CpfInput, setG1CpfInput] = useState(initial?.guardian1?.cpf || '')
  const [g1Phone, setG1Phone] = useState<string | undefined>(initial?.guardian1?.phone)
  const [g1Email, setG1Email] = useState<string | undefined>(initial?.guardian1?.email)
  const [g1Rel, setG1Rel] = useState<string | undefined>(initial?.guardian1?.relationship)

  const g1CpfDigits = useMemo(() => cleanCPF(g1CpfInput || ''), [g1CpfInput])

  // G2
  const initialHasG2 = !!initial?.guardian2
  const [hasG2, setHasG2] = useState<boolean>(initialHasG2)
  const [g2Name, setG2Name] = useState(initial?.guardian2?.name || '')
  const [g2CpfInput, setG2CpfInput] = useState(initial?.guardian2?.cpf || '')
  const [g2Phone, setG2Phone] = useState<string | undefined>(initial?.guardian2?.phone)
  const [g2Email, setG2Email] = useState<string | undefined>(initial?.guardian2?.email)
  const [g2Rel, setG2Rel] = useState<string | undefined>(initial?.guardian2?.relationship)

  const g2CpfDigits = useMemo(() => cleanCPF(g2CpfInput || ''), [g2CpfInput])

  const [errors, setErrors] = useState<{ g1Name?: string; g1Cpf?: string; g1Phone?: string; g1Email?: string; g2Cpf?: string; g2Email?: string }>({})

  useEffect(() => {
    if (open) {
      setG1Name(initial?.guardian1?.name || '')
      setG1CpfInput(initial?.guardian1?.cpf || '')
      setG1Phone(initial?.guardian1?.phone)
      setG1Email(initial?.guardian1?.email)
      setG1Rel(initial?.guardian1?.relationship)

      const has2 = !!initial?.guardian2
      setHasG2(has2)
      setG2Name(initial?.guardian2?.name || '')
      setG2CpfInput(initial?.guardian2?.cpf || '')
      setG2Phone(initial?.guardian2?.phone)
      setG2Email(initial?.guardian2?.email)
      setG2Rel(initial?.guardian2?.relationship)

      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!g1Name || g1Name.trim().length < 2) next.g1Name = 'Informe o nome do responsável 1.'
    if (!g1CpfDigits || g1CpfDigits.length !== 11) next.g1Cpf = 'CPF do responsável 1 deve ter 11 dígitos.'
    const phoneDigits = onlyDigits(g1Phone)
    if (phoneDigits && !(phoneDigits.length === 10 || phoneDigits.length === 11)) next.g1Phone = 'Telefone deve ter 10–11 dígitos.'
    if (!isValidEmail(g1Email)) next.g1Email = 'Email inválido.'

    if (hasG2) {
      if (g2CpfInput) {
        if (!g2CpfDigits || g2CpfDigits.length !== 11) next.g2Cpf = 'CPF do responsável 2 deve ter 11 dígitos quando informado.'
      }
      if (!isValidEmail(g2Email)) next.g2Email = 'Email inválido.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return

    // Confirmação se CPF do G1 mudou
    const initialG1CpfDigits = cleanCPF(initial?.guardian1?.cpf || '')
    const changedG1Cpf = initialG1CpfDigits !== g1CpfDigits
    if (changedG1Cpf) {
      const ok = window.confirm('Você alterou o CPF do Responsável 1. Confirma essa alteração?')
      if (!ok) return
    }

    const payload: any = {
      guardian1: {
        name: g1Name.trim(),
        cpf: g1CpfDigits,
        phone: g1Phone || undefined,
        email: g1Email || undefined,
        relationship: g1Rel || undefined,
      },
    }

    if (hasG2) {
      const anyG2Value = [g2Name, g2CpfDigits, g2Phone, g2Email, g2Rel].some((v) => Boolean(v))
      if (anyG2Value) {
        payload.guardian2 = {
          name: (g2Name || '').trim(),
          cpf: g2CpfDigits || '',
          phone: g2Phone || undefined,
          email: g2Email || undefined,
          relationship: g2Rel || undefined,
        }
      } else {
        // Sem valores: manter como indefinido (sem mudar)
      }
    } else {
      // Usuário optou por remover G2
      payload.guardian2 = null
    }

    onSave(payload)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Responsáveis</DialogTitle>
          <DialogDescription>
            Ajuste os dados de contato e relacionamento. O Responsável 1 é obrigatório; o Responsável 2 é opcional.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Responsável 1 */}
          <div className="space-y-3">
            <h3 className="text-base font-medium">Responsável 1 (principal)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="g1-nome">Nome</Label>
                <Input id="g1-nome" value={g1Name} onChange={(e) => setG1Name(e.target.value)} placeholder="Nome completo" />
                {errors.g1Name && <p className="text-sm text-red-600">{errors.g1Name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="g1-cpf">CPF</Label>
                <Input id="g1-cpf" value={formatCPF(g1CpfInput)} onChange={(e) => setG1CpfInput(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
                {errors.g1Cpf && <p className="text-sm text-red-600">{errors.g1Cpf}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="g1-phone">Telefone</Label>
                <Input id="g1-phone" value={formatPhone(g1Phone || '')} onChange={(e) => setG1Phone(e.target.value || undefined)} placeholder="(00) 00000-0000" inputMode="tel" />
                {errors.g1Phone && <p className="text-sm text-red-600">{errors.g1Phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="g1-email">Email</Label>
                <Input id="g1-email" value={g1Email || ''} onChange={(e) => setG1Email(e.target.value || undefined)} placeholder="email@exemplo.com" type="email" />
                {errors.g1Email && <p className="text-sm text-red-600">{errors.g1Email}</p>}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="g1-rel">Vínculo/Parentesco</Label>
                <Input id="g1-rel" value={g1Rel || ''} onChange={(e) => setG1Rel(e.target.value || undefined)} placeholder="ex.: pai, mãe, responsável" />
              </div>
            </div>
          </div>

          {/* Responsável 2 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">Responsável 2 (opcional)</h3>
              <div className="flex gap-2">
                {hasG2 ? (
                  <Button variant="ghost" size="sm" onClick={() => setHasG2(false)}>Remover</Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setHasG2(true)}>Adicionar</Button>
                )}
              </div>
            </div>

            {hasG2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="g2-nome">Nome</Label>
                  <Input id="g2-nome" value={g2Name} onChange={(e) => setG2Name(e.target.value)} placeholder="Nome completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="g2-cpf">CPF</Label>
                  <Input id="g2-cpf" value={formatCPF(g2CpfInput)} onChange={(e) => setG2CpfInput(e.target.value)} placeholder="000.000.000-00" inputMode="numeric" />
                  {errors.g2Cpf && <p className="text-sm text-red-600">{errors.g2Cpf}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="g2-phone">Telefone</Label>
                  <Input id="g2-phone" value={formatPhone(g2Phone || '')} onChange={(e) => setG2Phone(e.target.value || undefined)} placeholder="(00) 00000-0000" inputMode="tel" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="g2-email">Email</Label>
                  <Input id="g2-email" value={g2Email || ''} onChange={(e) => setG2Email(e.target.value || undefined)} placeholder="email@exemplo.com" type="email" />
                  {errors.g2Email && <p className="text-sm text-red-600">{errors.g2Email}</p>}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="g2-rel">Vínculo/Parentesco</Label>
                  <Input id="g2-rel" value={g2Rel || ''} onChange={(e) => setG2Rel(e.target.value || undefined)} placeholder="ex.: pai, mãe, responsável" />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
