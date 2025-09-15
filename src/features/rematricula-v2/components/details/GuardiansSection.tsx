import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ReadModelGuardians } from '../../types/details'
import { formatCPF, formatPhone } from '../../utils/formValidators'

interface Props {
  guardians: ReadModelGuardians
  canEdit?: boolean
  onEdit?: () => void
  showAlterado?: boolean
  onRestore?: () => void
}

export function GuardiansSection({ guardians, canEdit, onEdit, showAlterado, onRestore }: Props) {
  const g1 = guardians.guardian1
  const g2 = guardians.guardian2

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            Responsáveis
            {showAlterado && (
              <Badge variant="secondary">Alterado</Badge>
            )}
          </CardTitle>
          <CardDescription>Contatos e relacionamento</CardDescription>
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
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <div><span className="font-medium">Responsável 1:</span> {g1.name}</div>
          <div className="text-muted-foreground">{g1.relationship || '—'}</div>
          <div>CPF: {formatCPF(g1.cpf || '')}</div>
          {g1.phone && <div>Telefone: {formatPhone(g1.phone)}</div>}
          {g1.email && <div>Email: {g1.email}</div>}
        </div>
        {g2 && (
          <div>
            <div><span className="font-medium">Responsável 2:</span> {g2.name}</div>
            <div className="text-muted-foreground">{g2.relationship || '—'}</div>
            <div>CPF: {formatCPF(g2.cpf || '')}</div>
            {g2.phone && <div>Telefone: {formatPhone(g2.phone)}</div>}
            {g2.email && <div>Email: {g2.email}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default GuardiansSection

