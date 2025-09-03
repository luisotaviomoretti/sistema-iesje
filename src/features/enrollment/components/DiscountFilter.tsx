import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Search, 
  Filter, 
  X, 
  ChevronDown,
  ChevronUp,
  Percent,
  FileText,
  AlertCircle,
  Check,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TipoDesconto, CategoriaDesconto, TrilhoNome } from '@/lib/supabase'
import { useDescontosCompativeis } from '@/features/admin/hooks/useTrilhos'

// ============================================================================
// COMPONENTE DE FILTRO DE DESCONTOS POR TRILHO
// ============================================================================

interface DiscountFilterProps {
  trilho: TrilhoNome | null
  availableDiscounts: TipoDesconto[]
  selectedDiscounts: TipoDesconto[]
  onDiscountToggle: (discount: TipoDesconto) => void
  onDiscountsChange?: (discounts: TipoDesconto[]) => void
  className?: string
}

export const DiscountFilter: React.FC<DiscountFilterProps> = ({
  trilho,
  availableDiscounts,
  selectedDiscounts,
  onDiscountToggle,
  onDiscountsChange,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<CategoriaDesconto>>(
    new Set(['especial', 'regular', 'negociacao'])
  )
  
  // Buscar descontos compatíveis com o trilho
  const { data: compatibleDiscounts } = useDescontosCompativeis(trilho)
  
  // Filtrar e agrupar descontos
  const { filteredDiscounts, groupedDiscounts } = useMemo(() => {
    // Aplicar filtro de busca
    let filtered = availableDiscounts.filter(discount => {
      const searchLower = searchTerm.toLowerCase()
      return (
        discount.codigo.toLowerCase().includes(searchLower) ||
        discount.descricao.toLowerCase().includes(searchLower)
      )
    })
    
    // Se há trilho selecionado, marcar compatibilidade E FILTRAR APENAS OS COMPATÍVEIS
    if (trilho && compatibleDiscounts) {
      const compatibleIds = new Set(compatibleDiscounts.map(d => d.id))
      
      // 🎯 MUDANÇA: Mostrar apenas descontos compatíveis (remover incompatíveis)
      filtered = filtered
        .filter(discount => compatibleIds.has(discount.id)) // Filtrar apenas compatíveis
        .map(discount => ({
          ...discount,
          isCompatible: true // Todos que passaram são compatíveis
        }))
    }
    
    // Agrupar por categoria
    const grouped: Record<CategoriaDesconto, (TipoDesconto & { isCompatible?: boolean })[]> = {
      especial: [],
      regular: [],
      negociacao: []
    }
    
    filtered.forEach(discount => {
      grouped[discount.categoria].push(discount)
    })
    
    return { filteredDiscounts: filtered, groupedDiscounts: grouped }
  }, [availableDiscounts, searchTerm, trilho, compatibleDiscounts])
  
  // Toggle categoria expandida
  const toggleCategory = (categoria: CategoriaDesconto) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria)
    } else {
      newExpanded.add(categoria)
    }
    setExpandedCategories(newExpanded)
  }
  
  // Verificar se desconto está selecionado
  const isSelected = (discount: TipoDesconto) => {
    return selectedDiscounts.some(d => d.id === discount.id)
  }
  
  // Verificar se desconto está bloqueado por regras de exclusividade
  const isBlocked = (discount: TipoDesconto) => {
    // Trilho A (Especial): Apenas 1 desconto especial
    if (trilho === 'especial') {
      const hasEspecialSelected = selectedDiscounts.some(d => d.categoria === 'especial')
      
      // Se já tem um especial selecionado e está tentando selecionar outro especial
      if (discount.categoria === 'especial' && hasEspecialSelected && !isSelected(discount)) {
        return true
      }
    }
    
    // Trilho B (Combinado): 1 regular + 1 negociação
    if (trilho === 'combinado') {
      const hasRegularSelected = selectedDiscounts.some(d => d.categoria === 'regular')
      const hasNegociacaoSelected = selectedDiscounts.some(d => d.categoria === 'negociacao')
      
      // Se já tem um regular selecionado e está tentando selecionar outro regular
      if (discount.categoria === 'regular' && hasRegularSelected && !isSelected(discount)) {
        return true
      }
      
      // Se já tem uma negociação selecionada e está tentando selecionar outra negociação
      if (discount.categoria === 'negociacao' && hasNegociacaoSelected && !isSelected(discount)) {
        return true
      }
    }
    
    // Trilho C (Comercial): Sem restrições internas por enquanto
    
    return false
  }
  
  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalDesconto = selectedDiscounts.reduce((sum, d) => sum + (d.percentual_fixo || 0), 0)
    const countByCategory: Record<CategoriaDesconto, number> = {
      especial: selectedDiscounts.filter(d => d.categoria === 'especial').length,
      regular: selectedDiscounts.filter(d => d.categoria === 'regular').length,
      negociacao: selectedDiscounts.filter(d => d.categoria === 'negociacao').length
    }
    
    return { totalDesconto, countByCategory }
  }, [selectedDiscounts])
  
  // Obter info da categoria (versão minimalista)
  const getCategoryInfo = (categoria: CategoriaDesconto) => {
    switch (categoria) {
      case 'especial':
        return {
          label: 'Descontos Especiais',
          description: 'Bolsas e benefícios exclusivos',
          color: 'text-foreground',
          bgColor: 'bg-muted/30',
          borderColor: 'border-border',
          icon: '⭐'
        }
      case 'regular':
        return {
          label: 'Descontos Regulares', 
          description: 'Descontos padrão da instituição',
          color: 'text-foreground',
          bgColor: 'bg-muted/30',
          borderColor: 'border-border',
          icon: '📄'
        }
      case 'negociacao':
        return {
          label: 'Descontos de Negociação',
          description: 'Descontos comerciais flexíveis',
          color: 'text-foreground',
          bgColor: 'bg-muted/30',
          borderColor: 'border-border',
          icon: '💼'
        }
    }
  }
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtro de Descontos
            </CardTitle>
            <CardDescription>
              Selecione os descontos aplicáveis ao aluno
            </CardDescription>
          </div>
          
          {/* Estatísticas (minimalista) */}
          <div className="text-right">
            <div className="text-lg font-medium">
              {stats.totalDesconto.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedDiscounts.length} desconto{selectedDiscounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Barra de busca */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar desconto por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Alerta de trilho (minimalista) */}
        {trilho && (
          <div className="px-4 pt-4 space-y-2">
            <Alert className="bg-muted/50 border-border">
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                Trilho <strong>{trilho.toUpperCase()}</strong> selecionado - mostrando descontos compatíveis
              </AlertDescription>
            </Alert>
            
            {/* Regras do trilho (simplificadas) */}
            {trilho === 'especial' && (
              <Alert className="bg-background border-border">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limite:</strong> 1 desconto especial por matrícula
                </AlertDescription>
              </Alert>
            )}
            
            {trilho === 'combinado' && (
              <Alert className="bg-background border-border">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Limite:</strong> 1 desconto regular + 1 desconto de negociação
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        {/* Lista de descontos por categoria */}
        <ScrollArea className="h-[400px]">
          <div className="p-4 space-y-4">
            {(['especial', 'regular', 'negociacao'] as CategoriaDesconto[]).map(categoria => {
              const categoryInfo = getCategoryInfo(categoria)
              const discounts = groupedDiscounts[categoria]
              const isExpanded = expandedCategories.has(categoria)
              const selectedCount = stats.countByCategory[categoria]
              
              if (discounts.length === 0) return null
              
              return (
                <div
                  key={categoria}
                  className={cn(
                    'rounded-lg border',
                    categoryInfo.borderColor,
                    categoryInfo.bgColor
                  )}
                >
                  {/* Header da categoria */}
                  <button
                    className="w-full p-3 flex items-center justify-between hover:bg-white/50 transition-colors"
                    onClick={() => toggleCategory(categoria)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{categoryInfo.icon}</span>
                      <div className="text-left">
                        <p className={cn('font-medium', categoryInfo.color)}>
                          {categoryInfo.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {categoryInfo.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {selectedCount > 0 && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {selectedCount}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {/* Lista de descontos */}
                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      {discounts.map(discount => {
                        const selected = isSelected(discount)
                        const isCompatible = discount.isCompatible !== false
                        const blocked = isBlocked(discount)
                        const isDisabled = (!isCompatible && trilho !== null) || blocked
                        
                        return (
                          <div
                            key={discount.id}
                            className={cn(
                              'p-3 rounded-md bg-white border transition-all',
                              selected ? 'border-primary shadow-sm' : 'border-gray-200',
                              blocked && 'opacity-40 bg-gray-50'
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={discount.id}
                                checked={selected}
                                disabled={blocked}
                                onCheckedChange={() => onDiscountToggle(discount)}
                                className="mt-1"
                              />
                              
                              <div className="flex-1 space-y-1">
                                <Label
                                  htmlFor={discount.id}
                                  className="flex items-center gap-2 cursor-pointer"
                                >
                                  <span className="font-mono font-medium">
                                    {discount.codigo}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    {discount.percentual_fixo}%
                                  </Badge>
                                  
                                  {blocked && (
                                    <Badge variant="outline" className="text-xs">
                                      Limite atingido
                                    </Badge>
                                  )}
                                </Label>
                                
                                <p className="text-sm text-muted-foreground">
                                  {discount.descricao}
                                </p>
                                
                                {/* Documentos necessários */}
                                {discount.documentos_necessarios && 
                                 discount.documentos_necessarios.length > 0 && (
                                  <div className="flex items-center gap-1 mt-2">
                                    <FileText className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground">
                                      Requer: {discount.documentos_necessarios.join(', ')}
                                    </span>
                                  </div>
                                )}
                                
                                {/* Nível de aprovação */}
                                {discount.nivel_aprovacao_requerido !== 'AUTOMATICA' && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                    <span className="text-xs text-amber-600">
                                      Requer aprovação: {discount.nivel_aprovacao_requerido}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
        
        {/* Rodapé com ações (minimalista) */}
        <div className="p-4 border-t bg-background">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDiscountsChange?.([])}
              disabled={selectedDiscounts.length === 0}
              className="h-8"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
            
            <p className="text-xs text-muted-foreground">
              {filteredDiscounts.length} disponíveis
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}