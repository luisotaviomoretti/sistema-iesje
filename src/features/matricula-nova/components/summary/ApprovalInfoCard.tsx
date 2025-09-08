import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Crown,
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  Building,
  FileCheck,
  Calendar,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApprovalInfo {
  level: 'automatic' | 'coordinator' | 'director' | 'special'
  description: string
  maxPercentage?: number
  estimatedTime?: string
  requiredDocuments?: string[]
  approver?: string
  priority?: 'low' | 'medium' | 'high'
}

interface ApprovalInfoCardProps {
  approvalInfo: ApprovalInfo | null
  totalDiscountPercentage: number
  className?: string
  showDetailedTimeline?: boolean
}

export function ApprovalInfoCard({
  approvalInfo,
  totalDiscountPercentage,
  className,
  showDetailedTimeline = true
}: ApprovalInfoCardProps) {
  
  if (!approvalInfo) {
    return (
      <Card className={cn("border-gray-200 bg-gray-50", className)}>
        <div className="p-4 text-center">
          <div className="w-8 h-8 mx-auto mb-2 text-gray-400">
            <FileCheck className="w-full h-full" />
          </div>
          <p className="text-sm text-gray-500">
            Informações de aprovação não disponíveis
          </p>
        </div>
      </Card>
    )
  }

  // Configurações por nível de aprovação
  const getApprovalConfig = (level: string) => {
    const configs = {
      automatic: {
        icon: <CheckCircle className="w-5 h-5" />,
        color: 'green',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-900',
        iconClass: 'bg-green-100 text-green-600',
        badgeClass: 'bg-green-100 text-green-800 border-green-300',
        title: '✅ Aprovação Automática',
        subtitle: 'Processamento imediato'
      },
      coordinator: {
        icon: <Users className="w-5 h-5" />,
        color: 'yellow',
        bgClass: 'bg-yellow-50 border-yellow-200',
        textClass: 'text-yellow-900',
        iconClass: 'bg-yellow-100 text-yellow-600',
        badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        title: '⏳ Aprovação da Coordenação',
        subtitle: 'Requer análise da coordenação acadêmica'
      },
      director: {
        icon: <Building className="w-5 h-5" />,
        color: 'red',
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-900',
        iconClass: 'bg-red-100 text-red-600',
        badgeClass: 'bg-red-100 text-red-800 border-red-300',
        title: '🔴 Aprovação da Direção',
        subtitle: 'Requer aprovação da diretoria'
      },
      special: {
        icon: <Crown className="w-5 h-5" />,
        color: 'purple',
        bgClass: 'bg-purple-50 border-purple-200',
        textClass: 'text-purple-900',
        iconClass: 'bg-purple-100 text-purple-600',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        title: '👑 Aprovação Especial',
        subtitle: 'Caso especial - análise individualizada'
      }
    }
    return configs[level as keyof typeof configs] || configs.automatic
  }

  const config = getApprovalConfig(approvalInfo.level)

  // Timeline estimado baseado no nível
  const getEstimatedTimeline = (level: string) => {
    const timelines = {
      automatic: { time: 'Imediato', description: 'Processamento automático' },
      coordinator: { time: '1-2 dias úteis', description: 'Análise da coordenação' },
      director: { time: '3-5 dias úteis', description: 'Aprovação da diretoria' },
      special: { time: '5-7 dias úteis', description: 'Análise detalhada' }
    }
    return timelines[level as keyof typeof timelines] || timelines.automatic
  }

  const timeline = getEstimatedTimeline(approvalInfo.level)

  // Calcular progresso baseado no percentual
  const getDiscountProgress = () => {
    const thresholds = [
      { limit: 20, label: 'Baixo', color: 'green' },
      { limit: 50, label: 'Médio', color: 'yellow' },
      { limit: 80, label: 'Alto', color: 'orange' },
      { limit: 100, label: 'Máximo', color: 'red' }
    ]
    
    for (let threshold of thresholds) {
      if (totalDiscountPercentage <= threshold.limit) {
        return { ...threshold, percentage: (totalDiscountPercentage / threshold.limit) * 100 }
      }
    }
    return { limit: 100, label: 'Excepcional', color: 'purple', percentage: 100 }
  }

  const discountProgress = getDiscountProgress()

  return (
    <Card className={cn(config.bgClass, "overflow-hidden", className)}>
      <div className="p-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={cn("p-2 rounded-lg", config.iconClass)}>
              {config.icon}
            </div>
            <div>
              <h3 className={cn("font-semibold", config.textClass)}>
                {config.title}
              </h3>
              <p className={cn("text-sm opacity-80", config.textClass)}>
                {config.subtitle}
              </p>
            </div>
          </div>
          
          <Badge className={config.badgeClass}>
            {approvalInfo.level.toUpperCase()}
          </Badge>
        </div>

        {/* Descrição */}
        <div className="mb-4">
          <p className={cn("text-sm", config.textClass)}>
            {approvalInfo.description}
          </p>
        </div>

        {/* Indicador de Desconto */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Percentual de Desconto Total
            </span>
            <span className="font-bold text-lg text-gray-900">
              {totalDiscountPercentage.toFixed(1)}%
            </span>
          </div>
          
          <Progress 
            value={discountProgress.percentage} 
            className={cn(
              "h-2 mb-1",
              discountProgress.color === 'green' && "[&>div]:bg-green-500",
              discountProgress.color === 'yellow' && "[&>div]:bg-yellow-500",
              discountProgress.color === 'orange' && "[&>div]:bg-orange-500",
              discountProgress.color === 'red' && "[&>div]:bg-red-500",
              discountProgress.color === 'purple' && "[&>div]:bg-purple-500"
            )}
          />
          
          <div className="flex justify-between text-xs text-gray-600">
            <span>Nível: {discountProgress.label}</span>
            {approvalInfo.maxPercentage && (
              <span>Máx: {approvalInfo.maxPercentage}%</span>
            )}
          </div>
        </div>

        {/* Timeline de Aprovação */}
        {showDetailedTimeline && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Tempo Estimado
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">
                {approvalInfo.estimatedTime || timeline.time}
              </span>
              <span className="text-xs text-gray-600">
                {timeline.description}
              </span>
            </div>
          </div>
        )}

        {/* Responsável pela Aprovação */}
        {approvalInfo.approver && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Responsável
              </span>
            </div>
            <span className="text-sm text-gray-900">
              {approvalInfo.approver}
            </span>
          </div>
        )}

        {/* Documentos Necessários */}
        {approvalInfo.requiredDocuments && approvalInfo.requiredDocuments.length > 0 && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center space-x-2 mb-2">
              <FileCheck className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">
                Documentos Necessários
              </span>
            </div>
            
            <div className="space-y-1">
              {approvalInfo.requiredDocuments.map((doc, index) => (
                <div key={index} className="flex items-center text-xs text-gray-600">
                  <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                  {doc}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações Recomendadas */}
        {approvalInfo.level !== 'automatic' && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-blue-800 text-sm">
                <p className="font-medium mb-1">Próximos Passos:</p>
                <ul className="text-xs space-y-1">
                  <li>• Certifique-se de que todos os documentos estão anexados</li>
                  <li>• A matrícula será processada após aprovação</li>
                  <li>• Você receberá notificação sobre o status</li>
                  {approvalInfo.level === 'director' && (
                    <li>• Descontos altos requerem justificativa adicional</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Aprovação Automática - Parabéns */}
        {approvalInfo.level === 'automatic' && (
          <div className="p-3 bg-green-100 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-green-800 text-sm">
                <p className="font-medium mb-1">🎉 Ótima notícia!</p>
                <p className="text-xs">
                  Sua matrícula será processada automaticamente. 
                  Os descontos aplicados estão dentro dos limites de aprovação automática.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Prioridade (se aplicável) */}
        {approvalInfo.priority && approvalInfo.priority !== 'low' && (
          <div className="mt-3 flex items-center justify-center">
            <Badge 
              className={cn(
                "text-xs",
                approvalInfo.priority === 'high' 
                  ? "bg-red-100 text-red-800 border-red-300"
                  : "bg-orange-100 text-orange-800 border-orange-300"
              )}
            >
              {approvalInfo.priority === 'high' ? '🔥 Alta Prioridade' : '⚡ Prioridade Média'}
            </Badge>
          </div>
        )}

        {/* Footer com data */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Status verificado em {new Date().toLocaleDateString('pt-BR')}</span>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Válido por 30 dias</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default ApprovalInfoCard