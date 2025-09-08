import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Settings,
  Power,
  Palette,
  Type,
  ArrowUp,
  ArrowDown,
  Edit,
  Save,
  X,
  AlertCircle
} from 'lucide-react'
import { useUpdateTrilho } from '@/features/admin/hooks/useTrilhos'
import { toast } from 'sonner'
import type { TrilhoDesconto } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ============================================================================
// COMPONENTE DE CONTROLE DE TRILHOS
// ============================================================================

interface TrackControlProps {
  trilhos: TrilhoDesconto[]
  canEdit: boolean
}

export const TrackControl: React.FC<TrackControlProps> = ({ trilhos, canEdit }) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<TrilhoDesconto>>({})
  
  const updateTrilho = useUpdateTrilho()
  
  // Handler para iniciar edição
  const startEdit = (trilho: TrilhoDesconto) => {
    setEditingId(trilho.id)
    setEditData({
      titulo: trilho.titulo,
      descricao: trilho.descricao,
      icone: trilho.icone,
      cor_primaria: trilho.cor_primaria,
      cap_maximo: trilho.cap_maximo,
      ativo: trilho.ativo,
      ordem_exibicao: trilho.ordem_exibicao
    })
  }
  
  // Handler para cancelar edição
  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }
  
  // Handler para salvar edição
  const handleSave = async (trilhoId: string) => {
    console.log('🚀 TrackControl - Salvando trilho:', trilhoId)
    console.log('📝 Dados sendo salvos:', editData)
    console.log('📊 CAP_MAXIMO sendo enviado:', editData.cap_maximo, 'tipo:', typeof editData.cap_maximo)
    
    try {
      const result = await updateTrilho.mutateAsync({
        id: trilhoId,
        ...editData
      })
      
      console.log('✅ Resultado da atualização:', result)
      toast.success('Trilho atualizado com sucesso!')
      cancelEdit()
    } catch (error) {
      toast.error('Erro ao atualizar trilho')
      console.error('❌ Erro completo:', error)
    }
  }
  
  // Handler para toggle ativo/inativo
  const handleToggleActive = async (trilho: TrilhoDesconto) => {
    try {
      await updateTrilho.mutateAsync({
        id: trilho.id,
        ativo: !trilho.ativo
      })
      
      toast.success(
        trilho.ativo 
          ? `Trilho "${trilho.titulo}" desativado` 
          : `Trilho "${trilho.titulo}" ativado`
      )
    } catch (error) {
      toast.error('Erro ao alterar status do trilho')
      console.error(error)
    }
  }
  
  // Handler para alterar ordem
  const handleOrderChange = async (trilho: TrilhoDesconto, direction: 'up' | 'down') => {
    const currentIndex = trilhos.findIndex(t => t.id === trilho.id)
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex < 0 || targetIndex >= trilhos.length) return
    
    const targetTrilho = trilhos[targetIndex]
    
    try {
      // Trocar ordens
      await Promise.all([
        updateTrilho.mutateAsync({
          id: trilho.id,
          ordem_exibicao: targetTrilho.ordem_exibicao
        }),
        updateTrilho.mutateAsync({
          id: targetTrilho.id,
          ordem_exibicao: trilho.ordem_exibicao
        })
      ])
      
      toast.success('Ordem alterada com sucesso!')
    } catch (error) {
      toast.error('Erro ao alterar ordem')
      console.error(error)
    }
  }
  
  // Ordenar trilhos por ordem de exibição
  const sortedTrilhos = [...trilhos].sort((a, b) => a.ordem_exibicao - b.ordem_exibicao)
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Controle de Trilhos</CardTitle>
          <CardDescription>
            Configure a exibição e comportamento dos trilhos de desconto
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!canEdit && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Você não tem permissão para editar trilhos. 
                Entre em contato com um administrador para fazer alterações.
              </AlertDescription>
            </Alert>
          )}
          
          {canEdit && (
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Alterações nos trilhos afetam imediatamente o sistema de matrículas.
                Tenha cuidado ao desativar trilhos em uso.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Lista de Trilhos */}
      <div className="space-y-4">
        {sortedTrilhos.map((trilho, index) => {
          const isEditing = editingId === trilho.id
          
          return (
            <Card 
              key={trilho.id}
              className={cn(
                'transition-all',
                !trilho.ativo && 'opacity-60',
                isEditing && 'ring-2 ring-primary'
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {/* Ícone */}
                    {isEditing ? (
                      <Input
                        value={editData.icone}
                        onChange={(e) => setEditData({ ...editData, icone: e.target.value })}
                        className="w-20 text-center"
                        maxLength={2}
                      />
                    ) : (
                      <div className="text-3xl">{trilho.icone}</div>
                    )}
                    
                    {/* Título e Nome */}
                    <div>
                      {isEditing ? (
                        <Input
                          value={editData.titulo}
                          onChange={(e) => setEditData({ ...editData, titulo: e.target.value })}
                          className="font-semibold mb-1"
                        />
                      ) : (
                        <h3 className="font-semibold text-lg">{trilho.titulo}</h3>
                      )}
                      
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {trilho.nome.toUpperCase()}
                        </Badge>
                        
                        <Badge 
                          variant={trilho.ativo ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {trilho.ativo ? 'Ativo' : 'Inativo'}
                        </Badge>
                        
                        {trilho.cap_maximo !== null && (
                          <Badge variant="outline" className="text-xs font-semibold">
                            CAP: {trilho.cap_maximo}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Ações */}
                  {canEdit && (
                    <div className="flex items-center gap-2">
                      {/* Controles de ordem */}
                      {!isEditing && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOrderChange(trilho, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOrderChange(trilho, 'down')}
                            disabled={index === sortedTrilhos.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Botões de edição */}
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleSave(trilho.id)}
                            disabled={updateTrilho.isPending}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            Salvar
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEdit}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(trilho)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Descrição */}
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input
                        value={editData.descricao}
                        onChange={(e) => setEditData({ ...editData, descricao: e.target.value })}
                        placeholder="Descrição do trilho..."
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {trilho.descricao}
                    </p>
                  )}
                </div>
                
                {/* Configurações em edição */}
                {isEditing && (
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Cor */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Cor Primária
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={editData.cor_primaria}
                          onChange={(e) => setEditData({ ...editData, cor_primaria: e.target.value })}
                          className="w-20 h-10 p-1"
                        />
                        <Input
                          value={editData.cor_primaria}
                          onChange={(e) => setEditData({ ...editData, cor_primaria: e.target.value })}
                          placeholder="#000000"
                          maxLength={7}
                        />
                      </div>
                    </div>
                    
                    {/* Cap Máximo */}
                    <div className="space-y-2">
                      <Label>Cap Máximo (%)</Label>
                      <Input
                        type="number"
                        value={editData.cap_maximo || ''}
                        onChange={(e) => {
                          const newValue = e.target.value ? parseFloat(e.target.value) : null
                          console.log('🔢 CAP input change:', e.target.value, '→', newValue)
                          setEditData({ 
                            ...editData, 
                            cap_maximo: newValue
                          })
                        }}
                        placeholder="Sem limite"
                        min="0"
                        max="100"
                        step="0.5"
                      />
                      <span className="text-xs text-muted-foreground">
                        Valor atual no estado: {editData.cap_maximo ?? 'null'}
                      </span>
                    </div>
                    
                    {/* Status */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Power className="h-4 w-4" />
                        Status
                      </Label>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editData.ativo}
                          onCheckedChange={(checked) => setEditData({ ...editData, ativo: checked })}
                        />
                        <Label className="text-sm">
                          {editData.ativo ? 'Ativo' : 'Inativo'}
                        </Label>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Toggle rápido de status */}
                {!isEditing && canEdit && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm text-muted-foreground">
                      Status do trilho
                    </span>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={trilho.ativo}
                        onCheckedChange={() => handleToggleActive(trilho)}
                      />
                      <span className="text-sm font-medium">
                        {trilho.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}