/**
 * Seção de migração de descontos
 * Permite escolher entre herdar descontos do ano anterior ou selecionar novamente
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Gift, 
  Check, 
  X, 
  AlertTriangle, 
  Info,
  RefreshCw,
  Settings
} from 'lucide-react'
import type { DiscountSelection, DiscountMigrationAnalysis } from '../../types/rematricula'

interface DiscountMigrationSectionProps {
  previousDiscounts: DiscountSelection[]
  migrationAnalysis: DiscountMigrationAnalysis | null
  strategy: 'inherit' | 'manual'
  onStrategyChange: (strategy: 'inherit' | 'manual') => void
  className?: string
}

// Componente para preview da herança de descontos
function DiscountInheritancePreview({ 
  eligible, 
  mustRevalidate,
  noLongerEligible 
}: {
  eligible: DiscountSelection[]
  mustRevalidate: DiscountSelection[]
  noLongerEligible: DiscountSelection[]
}) {
  
  const formatPercentage = (value: number) => {
    return `${value}%`
  }
  
  return (
    <div className="space-y-4">
      {/* Descontos que serão mantidos */}
      {eligible.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-600" />
            <h4 className="text-sm font-medium">Descontos Mantidos</h4>
          </div>
          <div className="space-y-2">
            {eligible.map((discount) => (
              <div 
                key={discount.discount_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-green-50 border-green-200"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100">
                    {discount.discount_code}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatPercentage(discount.percentage)} de desconto
                  </span>
                </div>
                <Check className="h-4 w-4 text-green-600" />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Descontos que precisam revalidação */}
      {mustRevalidate.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <h4 className="text-sm font-medium">Precisam Revalidação</h4>
          </div>
          <div className="space-y-2">
            {mustRevalidate.map((discount) => (
              <div 
                key={discount.discount_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-yellow-50 border-yellow-200"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-yellow-100">
                    {discount.discount_code}
                  </Badge>
                  <span className="text-sm font-medium">
                    {formatPercentage(discount.percentage)} de desconto
                  </span>
                </div>
                <div className="text-xs text-yellow-700">
                  Documentos necessários
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Descontos não mais elegíveis */}
      {noLongerEligible.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-red-600" />
            <h4 className="text-sm font-medium">Não Mais Elegíveis</h4>
          </div>
          <div className="space-y-2">
            {noLongerEligible.map((discount) => (
              <div 
                key={discount.discount_id}
                className="flex items-center justify-between p-3 rounded-lg border bg-red-50 border-red-200"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-red-100">
                    {discount.discount_code}
                  </Badge>
                  <span className="text-sm font-medium line-through text-muted-foreground">
                    {formatPercentage(discount.percentage)} de desconto
                  </span>
                </div>
                <X className="h-4 w-4 text-red-600" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function DiscountMigrationSection({ 
  previousDiscounts, 
  migrationAnalysis,
  strategy,
  onStrategyChange,
  className = '' 
}: DiscountMigrationSectionProps) {
  
  // Calcular total de desconto anterior
  const previousTotalDiscount = previousDiscounts.reduce(
    (sum, d) => sum + d.percentage, 
    0
  )
  
  // Mapear códigos de desconto para nomes amigáveis
  const getDiscountName = (code: string): string => {
    const names: Record<string, string> = {
      'IIR': 'Irmãos',
      'RES': 'Outras Cidades',
      'PASS': 'Filho Prof. IESJE',
      'PBS': 'Filho Prof. Externa',
      'COL': 'Filho Func. IESJE',
      'SAE': 'Filho Func. Externa',
      'ABI': 'Bolsa Integral',
      'ABP': 'Bolsa Parcial',
      'PAV': 'Pagamento à Vista',
      'CEP': 'Desconto Regional'
    }
    return names[code] || code
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Descontos Aplicados
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {previousDiscounts.length} {previousDiscounts.length === 1 ? 'desconto' : 'descontos'}
            </Badge>
            {previousTotalDiscount > 0 && (
              <Badge variant="outline">
                Total: {previousTotalDiscount}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Descontos do ano anterior */}
        {previousDiscounts.length > 0 && (
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <p className="text-sm font-medium">Descontos do Ano Anterior:</p>
            <div className="flex flex-wrap gap-2">
              {previousDiscounts.map((discount) => (
                <Badge key={discount.discount_id} variant="secondary">
                  {discount.discount_code} - {getDiscountName(discount.discount_code)} ({discount.percentage}%)
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Estratégia de Migração */}
        <div className="space-y-4">
          <Label className="text-base">Como deseja proceder com os descontos?</Label>
          
          <RadioGroup 
            value={strategy} 
            onValueChange={(value) => onStrategyChange(value as 'inherit' | 'manual')}
            className="grid grid-cols-1 gap-4"
          >
            {/* Opção: Herdar descontos */}
            <div className="relative">
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="inherit" id="inherit" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="inherit" className="font-medium cursor-pointer">
                      Manter os mesmos descontos
                    </Label>
                    <RefreshCw className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Aplicar automaticamente os descontos que ainda são elegíveis. 
                    Sistema verificará documentação e elegibilidade atual.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Opção: Seleção manual */}
            <div className="relative">
              <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="manual" id="manual" className="mt-1" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="manual" className="font-medium cursor-pointer">
                      Escolher novamente
                    </Label>
                    <Settings className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Abrir sistema completo de seleção de descontos. 
                    Útil se houve mudanças na situação familiar ou financeira.
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        {/* Preview dos Descontos (quando herdar) */}
        {strategy === 'inherit' && migrationAnalysis && (
          <>
            <Separator />
            <DiscountInheritancePreview 
              eligible={migrationAnalysis.eligibleToKeep}
              mustRevalidate={migrationAnalysis.mustRevalidate}
              noLongerEligible={migrationAnalysis.noLongerEligible}
            />
          </>
        )}
        
        {/* Informação sobre novos descontos disponíveis */}
        {migrationAnalysis?.newlyAvailable && migrationAnalysis.newlyAvailable.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Novos Descontos Disponíveis</AlertTitle>
            <AlertDescription>
              Detectamos {migrationAnalysis.newlyAvailable.length} novo(s) desconto(s) 
              que você pode ser elegível. Considere escolher manualmente para revisar.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Aviso sobre documentação */}
        {strategy === 'inherit' && 
         migrationAnalysis?.mustRevalidate && 
         migrationAnalysis.mustRevalidate.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Documentação Necessária</AlertTitle>
            <AlertDescription>
              Alguns descontos precisarão de documentação atualizada para serem mantidos. 
              Prepare os documentos necessários para a conclusão da matrícula.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}