import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cleanCPF, formatCPF, validateCPF, normalizeName } from '../../utils/formValidators'
import type { ReadModelStudent } from '../../types/details'

export interface EditAlunoModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: Partial<ReadModelStudent> & { name: string; cpf: string }
  onSave: (next: Partial<ReadModelStudent>) => void
}

function isValidDateYYYYMMDD(value?: string | null): boolean {
  if (!value) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const d = new Date(value)
  return !isNaN(d.getTime()) && value === d.toISOString().split('T')[0]
}

export default function EditAlunoModal(props: EditAlunoModalProps) {
  const { open, onOpenChange, initial, onSave } = props
  const [name, setName] = useState(initial?.name || '')
  const [cpfInput, setCpfInput] = useState(initial?.cpf || '')
  const [birthDate, setBirthDate] = useState<string | undefined>(initial?.birth_date)
  const [gender, setGender] = useState<ReadModelStudent['gender'] | undefined>(initial?.gender)

  const cpfDigits = useMemo(() => cleanCPF(cpfInput || ''), [cpfInput])

  const [errors, setErrors] = useState<{ name?: string; cpf?: string; birth_date?: string }>({})

  useEffect(() => {
    if (open) {
      setName(initial?.name || '')
      setCpfInput(initial?.cpf || '')
      setBirthDate(initial?.birth_date)
      setGender(initial?.gender)
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!name || name.trim().length < 2) next.name = 'Informe um nome válido.'
    if (!cpfDigits || cpfDigits.length !== 11 || !validateCPF(cpfDigits)) next.cpf = 'CPF inválido (verifique os dígitos).'
    if (!isValidDateYYYYMMDD(birthDate)) next.birth_date = 'Data no formato YYYY-MM-DD.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const initialDigits = cleanCPF(initial?.cpf || '')
    const changedCpf = initialDigits !== cpfDigits
    if (changedCpf) {
      const ok = window.confirm('Você alterou o CPF do aluno. Confirma essa alteração?')
      if (!ok) return
    }
    onSave({ name: normalizeName(name.trim()), cpf: cpfDigits, birth_date: birthDate || undefined, gender: gender || undefined })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Aluno</DialogTitle>
          <DialogDescription>
            Ajuste as informações do aluno. Escola de destino permanece definida a partir do usuário logado e não é editável.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="aluno-nome">Nome completo</Label>
            <Input id="aluno-nome" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do aluno" />
            {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="aluno-cpf">CPF</Label>
            <Input
              id="aluno-cpf"
              value={formatCPF(cpfInput)}
              onChange={(e) => setCpfInput(e.target.value)}
              placeholder="000.000.000-00"
              inputMode="numeric"
            />
            {errors.cpf && <p className="text-sm text-red-600">{errors.cpf}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aluno-nasc">Data de nascimento</Label>
              <Input id="aluno-nasc" value={birthDate || ''} onChange={(e) => setBirthDate(e.target.value || undefined)} placeholder="YYYY-MM-DD" />
              {errors.birth_date && <p className="text-sm text-red-600">{errors.birth_date}</p>}
            </div>
            <div className="space-y-2">
              <Label>Gênero</Label>
              <Select value={gender || ''} onValueChange={(v) => setGender(v === 'NA' ? undefined : (v as any))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NA">Não informar</SelectItem>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
