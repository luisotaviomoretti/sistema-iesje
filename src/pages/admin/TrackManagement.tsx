import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { 
  Route,
  Settings,
  TrendingUp,
  Calculator,
  FileText,
  AlertCircle,
  ChevronLeft,
  RefreshCw,
  Save,
  History,
  Sliders,
  Shield
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '@/features/admin/hooks/useAdminAuth'
import { useTrilhos, useCapConfigs, useCurrentCapConfig } from '@/features/admin/hooks/useTrilhos'
import { TrackControl } from './components/TrackControl'

// ============================================================================
// PÁGINA PRINCIPAL DE GERENCIAMENTO DE TRILHOS
// ============================================================================

const TrackManagement: React.FC = () => {
  const navigate = useNavigate()
  const { data: session, isLoading: isLoadingAuth } = useAdminAuth()
  const { data: trilhos, isLoading: isLoadingTrilhos } = useTrilhos(true)
  const { data: currentCap, isLoading: isLoadingCap } = useCurrentCapConfig()
  const { data: capHistory, isLoading: isLoadingHistory } = useCapConfigs()
  
  const [activeTab, setActiveTab] = useState('overview')
  
  // Verificar permissões
  const canEdit = session?.role === 'super_admin' || session?.role === 'coordenador'
  const canViewReports = true // Todos podem ver relatórios
  
  // Estatísticas rápidas
  const stats = {
    trilhosAtivos: trilhos?.filter(t => t.ativo).length || 0,
    totalTrilhos: trilhos?.length || 0,
    capWithSecondary: currentCap?.cap_with_secondary || 0,
    capWithoutSecondary: currentCap?.cap_without_secondary || 0,
    capEspecial: currentCap?.cap_especial_maximo || 0,
    historicoAlteracoes: capHistory?.length || 0
  }
  
  const isLoading = isLoadingAuth || isLoadingTrilhos || isLoadingCap || isLoadingHistory
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    )
  }
  
  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você precisa estar autenticado para acessar esta página.
          </AlertDescription>
        </Alert>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Route className="h-6 w-6 text-primary" />
              Gerenciamento de Trilhos de Desconto
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Configure trilhos, caps e regras de compatibilidade do sistema de descontos
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="py-1">
            <Shield className="h-3 w-3 mr-1" />
            {session.role === 'super_admin' ? 'Super Admin' : 
             session.role === 'coordenador' ? 'Coordenador' : 'Operador'}
          </Badge>
        </div>
      </div>
      
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Trilhos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trilhosAtivos}/{stats.totalTrilhos}</div>
            <p className="text-xs text-muted-foreground">trilhos configurados</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cap Trilho B</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.capWithSecondary}%</div>
            <p className="text-xs text-muted-foreground">Regular + Negociação</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cap Trilho C</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.capWithoutSecondary}%</div>
            <p className="text-xs text-muted-foreground">Apenas Negociação</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cap Trilho A</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.capEspecial}%</div>
            <p className="text-xs text-muted-foreground">Desconto Especial</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          
          <TabsTrigger value="control" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Controle</span>
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral do Sistema de Trilhos</CardTitle>
              <CardDescription>
                Resumo das configurações atuais e status do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Trilhos */}
              <div>
                <h3 className="font-semibold mb-3">Trilhos Configurados</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {trilhos?.map(trilho => (
                    <Card key={trilho.id} className={!trilho.ativo ? 'opacity-50' : ''}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{trilho.icone}</span>
                          <Badge variant={trilho.ativo ? 'default' : 'secondary'}>
                            {trilho.ativo ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        <CardTitle className="text-base">{trilho.titulo}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">
                          {trilho.descricao}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Cap máximo:</span>
                          <Badge variant="outline">
                            {trilho.cap_maximo ? `${trilho.cap_maximo}%` : 'Sem limite'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* Configuração Atual */}
              <div>
                <h3 className="font-semibold mb-3">Configuração de Caps Vigente</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Cap Trilho B (Regular + Negociação)
                    </p>
                    <p className="text-2xl font-bold text-primary">
                      {currentCap?.cap_with_secondary || 0}%
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">
                      Cap Trilho C (Apenas Negociação)
                    </p>
                    <p className="text-2xl font-bold text-amber-600">
                      {currentCap?.cap_without_secondary || 0}%
                    </p>
                  </div>
                  
                  <div className="p-4 border rounded-lg md:col-span-2">
                    <p className="text-sm text-muted-foreground mb-1">
                      Cap Trilho A (Desconto Especial)
                    </p>
                    <p className="text-2xl font-bold text-purple-600">
                      {currentCap?.cap_especial_maximo || 0}%
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Últimas Alterações */}
              {capHistory && capHistory.length > 1 && (
                <>
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold">Últimas Alterações</h3>
                    </div>
                    <div className="space-y-2">
                      {capHistory.slice(0, 3).map((config, idx) => (
                        <div key={config.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="text-sm">
                            <p className="font-medium">
                              Alteração #{capHistory.length - idx}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(config.updated_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <div className="text-sm text-right">
                            <p>Caps: {config.cap_with_secondary}% / {config.cap_without_secondary}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Control Tab */}
        <TabsContent value="control">
          <TrackControl 
            trilhos={trilhos || []}
            canEdit={canEdit}
          />
        </TabsContent>
        
      </Tabs>
    </div>
  )
}

export default TrackManagement