import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import type { ReadModelFinancial } from '../../types/details'

interface Props {
  financial: ReadModelFinancial
}

export function FinancialSection({ financial }: Props) {
  const base = typeof financial.base_value !== 'undefined' ? financial.base_value : undefined
  const disc = typeof financial.total_discount_percentage !== 'undefined' ? financial.total_discount_percentage : undefined
  const finalV = typeof financial.final_monthly_value !== 'undefined' ? financial.final_monthly_value : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financeiro</CardTitle>
        <CardDescription>Resumo do último registro</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
        {typeof base !== 'undefined' && (
          <div><span className="font-medium">Valor base:</span> R$ {base?.toFixed(2)}</div>
        )}
        {typeof disc !== 'undefined' && (
          <div><span className="font-medium">Desconto:</span> {disc?.toFixed(2)}%</div>
        )}
        {typeof finalV !== 'undefined' && (
          <div><span className="font-medium">Valor final:</span> R$ {finalV?.toFixed(2)}</div>
        )}
      </CardContent>
    </Card>
  )
}

export default FinancialSection

