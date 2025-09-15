import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ReadModelAddress } from '../../types/details'
import { formatCEP } from '../../utils/formValidators'

export interface EditEnderecoModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial: Partial<ReadModelAddress>
  onSave: (next: Partial<ReadModelAddress>) => void
}

function onlyDigits(v?: string | null): string {
  return String(v ?? '').replace(/\D/g, '')
}

export default function EditEnderecoModal(props: EditEnderecoModalProps) {
  const { open, onOpenChange, initial, onSave } = props
  const [cep, setCep] = useState<string>(initial?.cep || '')
  const [street, setStreet] = useState<string>(initial?.street || '')
  const [number, setNumber] = useState<string>(initial?.number || '')
  const [complement, setComplement] = useState<string>(initial?.complement || '')
  const [district, setDistrict] = useState<string>(initial?.district || '')
  const [city, setCity] = useState<string>(initial?.city || '')
  const [stateUf, setStateUf] = useState<string>(initial?.state || '')

  const [errors, setErrors] = useState<{ cep?: string; street?: string; number?: string; district?: string; city?: string; state?: string }>({})

  useEffect(() => {
    if (open) {
      setCep(initial?.cep || '')
      setStreet(initial?.street || '')
      setNumber(initial?.number || '')
      setComplement(initial?.complement || '')
      setDistrict(initial?.district || '')
      setCity(initial?.city || '')
      setStateUf(initial?.state || '')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const cepDigits = useMemo(() => onlyDigits(cep), [cep])

  const validate = (): boolean => {
    const next: typeof errors = {}
    if (!cepDigits || cepDigits.length !== 8) next.cep = 'CEP deve ter 8 dígitos.'
    if (!street || street.trim().length < 2) next.street = 'Informe a rua.'
    if (!number || number.trim().length < 1) next.number = 'Informe o número.'
    if (!city || city.trim().length < 2) next.city = 'Informe a cidade.'
    const uf = (stateUf || '').trim().toUpperCase()
    if (!uf || uf.length !== 2) next.state = 'UF deve ter 2 letras.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    const uf = (stateUf || '').trim().toUpperCase()
    onSave({
      cep: cepDigits,
      street: street.trim(),
      number: number.trim(),
      complement: complement ? complement.trim() : undefined,
      district: district ? district.trim() : undefined,
      city: city.trim(),
      state: uf,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Endereço</DialogTitle>
          <DialogDescription>
            Ajuste as informações do endereço. CEP com 8 dígitos e UF com 2 letras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-cep">CEP</Label>
              <Input id="end-cep" value={formatCEP(cep)} onChange={(e) => setCep(e.target.value)} placeholder="00000-000" inputMode="numeric" />
              {errors.cep && <p className="text-sm text-red-600">{errors.cep}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="end-street">Rua</Label>
              <Input id="end-street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="Rua" />
              {errors.street && <p className="text-sm text-red-600">{errors.street}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-number">Número</Label>
              <Input id="end-number" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" />
              {errors.number && <p className="text-sm text-red-600">{errors.number}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="end-complement">Complemento (opcional)</Label>
              <Input id="end-complement" value={complement} onChange={(e) => setComplement(e.target.value)} placeholder="Apto, bloco, etc." />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end-district">Bairro</Label>
              <Input id="end-district" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Bairro" />
              {errors.district && <p className="text-sm text-red-600">{errors.district}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-city">Cidade</Label>
              <Input id="end-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Cidade" />
              {errors.city && <p className="text-sm text-red-600">{errors.city}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-uf">UF</Label>
              <Input id="end-uf" value={stateUf} onChange={(e) => setStateUf((e.target.value || '').toUpperCase())} placeholder="UF" maxLength={2} />
              {errors.state && <p className="text-sm text-red-600">{errors.state}</p>}
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
