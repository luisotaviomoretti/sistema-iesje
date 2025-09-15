import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ReadModelAddress } from '../../types/details'

interface Props {
  address: ReadModelAddress
  canEdit?: boolean
  onEdit?: () => void
  showAlterado?: boolean
  onRestore?: () => void
}

export function AddressSection({ address, canEdit, onEdit, showAlterado, onRestore }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex items-center gap-2">
          <CardTitle>Endereço</CardTitle>
          {showAlterado && (
            <Badge variant="secondary">Alterado</Badge>
          )}
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {showAlterado && onRestore && (
              <Button variant="ghost" size="sm" onClick={onRestore}>Restaurar</Button>
            )}
            <Button variant="outline" size="sm" onClick={onEdit}>Editar</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {address.cep && <div><span className="font-medium">CEP:</span> {address.cep}</div>}
        {address.street && <div><span className="font-medium">Rua:</span> {address.street}</div>}
        {address.number && <div><span className="font-medium">Número:</span> {address.number}</div>}
        {address.complement && <div><span className="font-medium">Compl.:</span> {address.complement}</div>}
        {address.district && <div><span className="font-medium">Bairro:</span> {address.district}</div>}
        {address.city && <div><span className="font-medium">Cidade:</span> {address.city}</div>}
        {address.state && <div><span className="font-medium">UF:</span> {address.state}</div>}
      </CardContent>
    </Card>
  )
}

export default AddressSection

