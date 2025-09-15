import { Badge } from '@/components/ui/badge'
import { formatCPF } from '../../utils/formValidators'

export interface StudentHeaderProps {
  name?: string
  cpf?: string
  escola?: string
  status?: 'previous_year' | 'enrollment' | 'both' | 'unknown'
  originEscolaLabel?: string
  destinationEscolaLabel?: string
}

export function StudentHeader({ name, cpf, escola, status = 'unknown', originEscolaLabel, destinationEscolaLabel }: StudentHeaderProps) {
  const badge = (() => {
    if (status === 'previous_year') return { label: 'Aluno veterano', variant: 'success' as any }
    if (status === 'enrollment') return { label: 'Já matriculado', variant: 'secondary' as any }
    if (status === 'both') return { label: 'Consolidado', variant: 'secondary' as any }
    return null
  })()

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl font-semibold">{name || 'Aluno'}</h2>
        {badge && (
          <Badge variant={badge.variant}>{badge.label}</Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {cpf ? <>CPF: {formatCPF(cpf)}</> : null}
        {/* Preferir destino/origem quando informados; senão, manter escola única */}
        {destinationEscolaLabel ? (
          <>
            <span> • Escola de destino: {destinationEscolaLabel}</span>
            {originEscolaLabel ? <span> • Origem: {originEscolaLabel}</span> : null}
          </>
        ) : escola ? (
          <span> • Escola: {escola}</span>
        ) : null}
      </div>
    </div>
  )
}

export default StudentHeader

