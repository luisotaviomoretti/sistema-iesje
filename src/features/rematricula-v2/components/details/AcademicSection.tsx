import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ReadModelAcademic } from '../../types/details'

interface Props {
  academic: ReadModelAcademic
}

export function AcademicSection({ academic }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acadêmico</CardTitle>
        <CardDescription>Último registro acadêmico disponível</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {academic.series_name && (
          <div><span className="font-medium">Série:</span> {academic.series_name}</div>
        )}
        {academic.track_name && (
          <div><span className="font-medium">Trilho:</span> {academic.track_name}</div>
        )}
        {academic.shift && (
          <div><span className="font-medium">Turno:</span> {academic.shift}</div>
        )}
        {academic.academic_year && (
          <div><span className="font-medium">Ano acadêmico:</span> {academic.academic_year}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default AcademicSection

