import React from 'react';
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TimelineStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  timestamp?: string;
  details?: string[];
}

interface MatriculaTimelineProps {
  steps: TimelineStep[];
  currentStep?: string;
}

const MatriculaTimeline: React.FC<MatriculaTimelineProps> = ({ 
  steps, 
  currentStep 
}) => {
  const getStepIcon = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600 fill-current" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-600 fill-current animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600 fill-current" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepBadge = (status: TimelineStep['status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>;
      case 'current':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 border-blue-200">Em andamento</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Timeline do Processo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Linha vertical conectora */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gray-200" />
          
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`relative flex items-start space-x-4 ${
                  step.status === 'current' ? 'bg-blue-50 -mx-4 px-4 py-3 rounded-lg' : ''
                }`}
              >
                {/* Ícone do step */}
                <div className="relative z-10 flex-shrink-0 bg-white border-2 border-gray-200 rounded-full p-1">
                  {getStepIcon(step.status)}
                </div>
                
                {/* Conteúdo do step */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900">
                      {step.title}
                    </h3>
                    {getStepBadge(step.status)}
                  </div>
                  
                  <p className="mt-1 text-sm text-gray-600">
                    {step.description}
                  </p>
                  
                  {step.timestamp && (
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(step.timestamp).toLocaleString('pt-BR')}
                    </p>
                  )}
                  
                  {step.details && step.details.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {step.details.map((detail, detailIndex) => (
                        <li key={detailIndex} className="text-xs text-gray-600 flex items-center gap-1">
                          <div className="w-1 h-1 bg-gray-400 rounded-full" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatriculaTimeline;