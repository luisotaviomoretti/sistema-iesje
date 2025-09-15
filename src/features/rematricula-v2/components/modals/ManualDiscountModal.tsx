import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface ManualDiscountModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: string[]
  onSelect: (item: { id: string; codigo: string; descricao: string; percentual: number; trilho: string }) => void
}

export default function ManualDiscountModal({ open, onOpenChange, categories, onSelect }: ManualDiscountModalProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['macom-manual-discounts', categories],
    queryFn: async () => {
      const cats = Array.isArray(categories) && categories.length > 0 ? categories : ['especial', 'negociacao']
      const { data, error } = await supabase
        .from('tipos_desconto')
        .select('id,codigo,descricao,categoria,percentual_fixo,eh_variavel,ativo')
        .in('categoria', cats)
        .eq('ativo', true)
        .order('codigo', { ascending: true })
      if (error) throw new Error(error.message)
      return data as Array<{ id: string; codigo: string; descricao: string; categoria: string; percentual_fixo: number | null; eh_variavel: boolean }>
    },
    staleTime: 5 * 60 * 1000,
  })

  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const list = useMemo(() => {
    const f = filter.trim().toLowerCase()
    const arr = (data || []).filter((d) => {
      if (!f) return true
      const code = String(d.codigo || '').toLowerCase()
      const desc = String(d.descricao || '').toLowerCase()
      return code.includes(f) || desc.includes(f)
    })
    const prio = (c?: string) => (c === 'especial' ? 0 : c === 'negociacao' ? 1 : 2)
    return arr.sort((a: any, b: any) => {
      const pa = prio(a.categoria)
      const pb = prio(b.categoria)
      if (pa !== pb) return pa - pb
      return String(a.codigo || '').localeCompare(String(b.codigo || ''))
    })
  }, [data, filter])

  const selected = useMemo(() => (list || []).find((d) => d.id === selectedId) || null, [list, selectedId])

  const handleConfirm = () => {
    if (!selected) return
    const pct = typeof (selected as any).percentual_fixo === 'number' ? (selected as any).percentual_fixo : 0
    const categoria = (selected as any).categoria as string
    onSelect({ id: selected.id, codigo: selected.codigo, descricao: selected.descricao, percentual: Number(pct || 0), trilho: categoria })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] grid grid-rows-[auto,minmax(0,1fr),auto] gap-0 p-0">
        <DialogHeader className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Selecionar Desconto</DialogTitle>
          <DialogDescription>
            Escolha um desconto manual para aplicar. Apenas um desconto pode ser selecionado.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto px-6 py-4 space-y-4">
          <div className="flex items-end gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="filter">Filtrar por código ou descrição</Label>
              <Input id="filter" value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ex.: NEG, Especial" />
            </div>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando descontos...</div>
          ) : isError ? (
            <Alert variant="destructive">
              <AlertDescription>Não foi possível carregar os descontos elegíveis.</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border divide-y">
              {(list || []).map((d) => (
                <label key={d.id} className="flex items-center justify-between p-3 gap-4 cursor-pointer">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{d.codigo}</div>
                    <div className="text-xs text-muted-foreground truncate">{d.descricao}</div>
                    <div className="text-xs text-muted-foreground/70">Trilho: {(d as any).categoria}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-muted-foreground">{Number((d as any).percentual_fixo || 0).toFixed(1)}%</span>
                    <input
                      type="radio"
                      name="manual-discount"
                      checked={selectedId === d.id}
                      onChange={() => setSelectedId(d.id)}
                      className="h-4 w-4"
                    />
                  </div>
                </label>
              ))}
              {list && list.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">Nenhum desconto encontrado para as categorias configuradas.</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t px-6 py-4 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!selected}>Selecionar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
