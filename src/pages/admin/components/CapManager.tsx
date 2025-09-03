import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { 
  Save, 
  History, 
  AlertCircle, 
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  Info
} from 'lucide-react'
import { useCreateCapConfig, useUpdateCapConfig } from '@/features/admin/hooks/useTrilhos'
import { toast } from 'sonner'
import type { ConfigCap } from '@/lib/supabase'

// ============================================================================
// COMPONENTE DE GERENCIAMENTO DE CAPS
// ============================================================================

interface CapManagerProps {
  currentConfig: ConfigCap
  canEdit: boolean
  history: ConfigCap[]
}

export const CapManager: React.FC<CapManagerProps> = ({ 
  currentConfig, 
  canEdit, 
  history 
}) => {
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    cap_with_secondary: currentConfig.cap_with_secondary || 25,
    cap_without_secondary: currentConfig.cap_without_secondary || 12,
    cap_especial_maximo: currentConfig.cap_especial_maximo || 100,
    observacoes: ''
  })
  
  const createCapConfig = useCreateCapConfig()
  const updateCapConfig = useUpdateCapConfig()
  
  // Calcular mudanças
  const changes = {
    with_secondary: formData.cap_with_secondary - (currentConfig.cap_with_secondary || 25),
    without_secondary: formData.cap_without_secondary - (currentConfig.cap_without_secondary || 12),
    especial: formData.cap_especial_maximo - (currentConfig.cap_especial_maximo || 100)
  }
  
  const hasChanges = Object.values(changes).some(c => c !== 0)
  
  // Handler para salvar mudanças
  const handleSave = async () => {
    if (!hasChanges) {
      toast.error('Nenhuma alteração detectada')
      return
    }
    
    try {
      await createCapConfig.mutateAsync({
        cap_with_secondary: formData.cap_with_secondary,
        cap_without_secondary: formData.cap_without_secondary,
        cap_especial_maximo: formData.cap_especial_maximo,
        vigencia_inicio: new Date().toISOString().split('T')[0],
        observacoes: formData.observacoes || null
      })
      
      toast.success('Configuração de caps atualizada com sucesso!')
      setEditMode(false)
    } catch (error) {
      toast.error('Erro ao salvar configuração')
      console.error(error)
    }
  }
  
  // Componente de mudança
  const ChangeIndicator = ({ value }: { value: number }) => {
    if (value === 0) return <Minus className="h-4 w-4 text-muted-foreground" />
    if (value > 0) return (
      <span className="flex items-center text-green-600">
        <TrendingUp className="h-4 w-4 mr-1" />
        +{value.toFixed(1)}%
      </span>
    )
    return (
      <span className="flex items-center text-red-600">
        <TrendingDown className="h-4 w-4 mr-1" />
        {value.toFixed(1)}%
      </span>
    )
  }
  
  return (
    <div className="space-y-6">
      {/* Configuração Atual */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuração de Caps de Desconto</CardTitle>
              <CardDescription>
                Defina os limites máximos de desconto para cada trilho
              </CardDescription>
            </div>
            
            {canEdit && !editMode && (
              <Button onClick={() => setEditMode(true)}>
                Editar Configuração
              </Button>
            )}
            
            {editMode && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setEditMode(false)
                  setFormData({
                    cap_with_secondary: currentConfig.cap_with_secondary || 25,
                    cap_without_secondary: currentConfig.cap_without_secondary || 12,
                    cap_especial_maximo: currentConfig.cap_especial_maximo || 100,
                    observacoes: ''
                  })
                }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={!hasChanges || createCapConfig.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Alertas */}
          {editMode && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Alterações nos caps afetarão todas as novas matrículas. 
                Matrículas existentes não serão afetadas.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Formulário de Caps */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Cap Trilho B - Regular + Negociação */}
            <div className="space-y-2">
              <Label htmlFor="cap_with_secondary">
                Cap com Desconto Regular
                <span className="text-xs text-muted-foreground ml-2">
                  (Trilho B - Regular + Negociação)
                </span>
              </Label>
              
              <div className="relative">
                <Input
                  id="cap_with_secondary"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.cap_with_secondary}
                  onChange={(e) => setFormData({
                    ...formData,
                    cap_with_secondary: parseFloat(e.target.value) || 0
                  })}
                  disabled={!editMode}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              
              {editMode && changes.with_secondary !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mudança:</span>
                  <ChangeIndicator value={changes.with_secondary} />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                IIR, RES, PAV + descontos de negociação
              </p>
            </div>
            
            {/* Cap Trilho C - Apenas Negociação */}
            <div className="space-y-2">
              <Label htmlFor="cap_without_secondary">
                Cap sem Desconto Regular
                <span className="text-xs text-muted-foreground ml-2">
                  (Trilho C - Apenas Negociação)
                </span>
              </Label>
              
              <div className="relative">
                <Input
                  id="cap_without_secondary"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.cap_without_secondary}
                  onChange={(e) => setFormData({
                    ...formData,
                    cap_without_secondary: parseFloat(e.target.value) || 0
                  })}
                  disabled={!editMode}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              
              {editMode && changes.without_secondary !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mudança:</span>
                  <ChangeIndicator value={changes.without_secondary} />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Apenas CEP, adimplência e negociações comerciais
              </p>
            </div>
            
            {/* Cap Trilho Especial */}
            <div className="space-y-2">
              <Label htmlFor="cap_especial">
                Cap Máximo Especial
                <span className="text-xs text-muted-foreground ml-2">
                  (Trilho Especial)
                </span>
              </Label>
              
              <div className="relative">
                <Input
                  id="cap_especial"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.cap_especial_maximo}
                  onChange={(e) => setFormData({
                    ...formData,
                    cap_especial_maximo: parseFloat(e.target.value) || 0
                  })}
                  disabled={!editMode}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  %
                </span>
              </div>
              
              {editMode && changes.especial !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mudança:</span>
                  <ChangeIndicator value={changes.especial} />
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                Para bolsas e descontos especiais
              </p>
            </div>
          </div>
          
          {/* Observações */}
          {editMode && (
            <div className="space-y-2">
              <Label htmlFor="observacoes">
                Observações sobre a alteração
                <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
              </Label>
              <Textarea
                id="observacoes"
                placeholder="Descreva o motivo da alteração..."
                value={formData.observacoes}
                onChange={(e) => setFormData({
                  ...formData,
                  observacoes: e.target.value
                })}
                rows={3}
              />
            </div>
          )}
          
          {/* Informações adicionais */}
          {!editMode && currentConfig.observacoes && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Observações da última alteração:</strong><br />
                {currentConfig.observacoes}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Histórico de Alterações */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Histórico de Alterações</CardTitle>
            </div>
            <CardDescription>
              Registro de todas as mudanças nos caps de desconto
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {history.map((config, idx) => {
                const isActive = idx === 0
                const prevConfig = history[idx + 1]
                
                return (
                  <div 
                    key={config.id}
                    className={`p-4 border rounded-lg ${isActive ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {new Date(config.vigencia_inicio).toLocaleDateString('pt-BR')}
                          </span>
                          {isActive && (
                            <Badge variant="default" className="text-xs">
                              Vigente
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex gap-4 text-sm">
                          <span>
                            Com secundário: <strong>{config.cap_with_secondary}%</strong>
                            {prevConfig && config.cap_with_secondary !== prevConfig.cap_with_secondary && (
                              <span className="text-xs ml-1 text-muted-foreground">
                                ({config.cap_with_secondary > prevConfig.cap_with_secondary ? '+' : ''}
                                {(config.cap_with_secondary - prevConfig.cap_with_secondary).toFixed(1)}%)
                              </span>
                            )}
                          </span>
                          
                          <span>
                            Sem secundário: <strong>{config.cap_without_secondary}%</strong>
                            {prevConfig && config.cap_without_secondary !== prevConfig.cap_without_secondary && (
                              <span className="text-xs ml-1 text-muted-foreground">
                                ({config.cap_without_secondary > prevConfig.cap_without_secondary ? '+' : ''}
                                {(config.cap_without_secondary - prevConfig.cap_without_secondary).toFixed(1)}%)
                              </span>
                            )}
                          </span>
                          
                          <span>
                            Especial: <strong>{config.cap_especial_maximo}%</strong>
                            {prevConfig && config.cap_especial_maximo !== prevConfig.cap_especial_maximo && (
                              <span className="text-xs ml-1 text-muted-foreground">
                                ({config.cap_especial_maximo > prevConfig.cap_especial_maximo ? '+' : ''}
                                {(config.cap_especial_maximo - prevConfig.cap_especial_maximo).toFixed(1)}%)
                              </span>
                            )}
                          </span>
                        </div>
                        
                        {config.observacoes && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {config.observacoes}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-right">
                        <p>Atualizado em</p>
                        <p>{new Date(config.updated_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Simulador de Impacto */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Simulador de Impacto</CardTitle>
          </div>
          <CardDescription>
            Veja como as mudanças afetarão os descontos
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Use esta ferramenta para simular o impacto das mudanças nos caps 
                antes de aplicá-las ao sistema.
              </AlertDescription>
            </Alert>
            
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Simulador em desenvolvimento</p>
              <p className="text-sm">Em breve você poderá simular diferentes cenários</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}