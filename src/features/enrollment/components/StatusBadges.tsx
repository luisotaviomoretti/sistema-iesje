import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  FileText,
  Shield,
  UserCheck,
  Building,
  Calendar
} from 'lucide-react';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type StatusGeral = "RASCUNHO" | "PENDENTE_APROVACAO" | "APROVADA" | "REJEITADA";
export type StatusAprovacao = "PENDENTE" | "PARCIAL" | "COMPLETA";
export type NivelAprovacao = "AUTOMATICA" | "COORDENACAO" | "DIRECAO";

interface StatusBadgeProps {
  status: StatusGeral;
  className?: string;
}

interface ApprovalBadgeProps {
  status: StatusAprovacao;
  className?: string;
}

interface ApprovalLevelBadgeProps {
  nivel: NivelAprovacao;
  aprovado?: boolean;
  className?: string;
}

interface FlowBadgeProps {
  flow: "nova" | "rematricula";
  className?: string;
}

interface SchoolBadgeProps {
  escola: "pelicano" | "sete_setembro" | string;
  className?: string;
}

interface ProtocolBadgeProps {
  protocolo: string;
  dataGeracao?: string;
  className?: string;
}

// ============================================================================
// COMPONENTES DE STATUS
// ============================================================================

// Badge para status geral da matrícula
export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  status, 
  className = '' 
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'RASCUNHO':
        return {
          icon: <FileText className="h-3 w-3" />,
          text: 'Rascunho',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
      case 'PENDENTE_APROVACAO':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Pendente',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      case 'APROVADA':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Aprovada',
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'REJEITADA':
        return {
          icon: <X className="h-3 w-3" />,
          text: 'Rejeitada',
          className: 'bg-red-100 text-red-700 border-red-200'
        };
      default:
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Desconhecido',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </Badge>
  );
};

// Badge para status de aprovação
export const ApprovalBadge: React.FC<ApprovalBadgeProps> = ({ 
  status, 
  className = '' 
}) => {
  const getApprovalConfig = () => {
    switch (status) {
      case 'PENDENTE':
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Aprovação Pendente',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200'
        };
      case 'PARCIAL':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'Parcialmente Aprovada',
          className: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'COMPLETA':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: 'Totalmente Aprovada',
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          text: 'Pendente',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getApprovalConfig();

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
    </Badge>
  );
};

// Badge para nível de aprovação necessário
export const ApprovalLevelBadge: React.FC<ApprovalLevelBadgeProps> = ({ 
  nivel, 
  aprovado = false,
  className = '' 
}) => {
  const getLevelConfig = () => {
    switch (nivel) {
      case 'AUTOMATICA':
        return {
          icon: <Shield className="h-3 w-3" />,
          text: 'Automática',
          className: aprovado 
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'COORDENACAO':
        return {
          icon: <UserCheck className="h-3 w-3" />,
          text: 'Coordenação',
          className: aprovado 
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case 'DIRECAO':
        return {
          icon: <Building className="h-3 w-3" />,
          text: 'Direção',
          className: aprovado 
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-red-100 text-red-700 border-red-200'
        };
      default:
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: 'N/A',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getLevelConfig();

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      {config.icon}
      <span className="ml-1">{config.text}</span>
      {aprovado && <CheckCircle className="h-3 w-3 ml-1" />}
    </Badge>
  );
};

// Badge para tipo de fluxo
export const FlowBadge: React.FC<FlowBadgeProps> = ({ 
  flow, 
  className = '' 
}) => {
  const isNova = flow === 'nova';
  
  return (
    <Badge 
      variant="outline" 
      className={`${isNova 
        ? 'bg-blue-100 text-blue-700 border-blue-200' 
        : 'bg-green-100 text-green-700 border-green-200'
      } ${className}`}
    >
      {isNova ? '🆕 Nova Matrícula' : '🔄 Rematrícula'}
    </Badge>
  );
};

// Badge para escola
export const SchoolBadge: React.FC<SchoolBadgeProps> = ({ 
  escola, 
  className = '' 
}) => {
  const getSchoolConfig = () => {
    switch (escola) {
      case 'pelicano':
        return {
          icon: '🏫',
          text: 'Pelicano',
          className: 'bg-purple-100 text-purple-700 border-purple-200'
        };
      case 'sete_setembro':
        return {
          icon: '🏫',
          text: 'Sete de Setembro',
          className: 'bg-indigo-100 text-indigo-700 border-indigo-200'
        };
      default:
        return {
          icon: '🏫',
          text: escola,
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
    }
  };

  const config = getSchoolConfig();

  return (
    <Badge variant="outline" className={`${config.className} ${className}`}>
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </Badge>
  );
};

// Badge para protocolo com data
export const ProtocolBadge: React.FC<ProtocolBadgeProps> = ({ 
  protocolo, 
  dataGeracao,
  className = '' 
}) => {
  return (
    <Badge 
      variant="outline" 
      className={`bg-slate-100 text-slate-700 border-slate-200 font-mono text-xs ${className}`}
    >
      <Calendar className="h-3 w-3 mr-1" />
      {protocolo}
      {dataGeracao && (
        <span className="ml-2 text-slate-500">
          {new Date(dataGeracao).toLocaleDateString('pt-BR')}
        </span>
      )}
    </Badge>
  );
};

// ============================================================================
// COMPONENTE COMPOSTO - STATUS SUMMARY
// ============================================================================

interface StatusSummaryProps {
  statusGeral: StatusGeral;
  statusAprovacao: StatusAprovacao;
  flow: "nova" | "rematricula";
  escola: string;
  protocolo?: string;
  dataGeracao?: string;
  nivelAprovacao?: NivelAprovacao;
  aprovado?: boolean;
  className?: string;
}

export const StatusSummary: React.FC<StatusSummaryProps> = ({
  statusGeral,
  statusAprovacao,
  flow,
  escola,
  protocolo,
  dataGeracao,
  nivelAprovacao,
  aprovado = false,
  className = ''
}) => {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <StatusBadge status={statusGeral} />
      <ApprovalBadge status={statusAprovacao} />
      <FlowBadge flow={flow} />
      <SchoolBadge escola={escola} />
      
      {nivelAprovacao && (
        <ApprovalLevelBadge 
          nivel={nivelAprovacao} 
          aprovado={aprovado} 
        />
      )}
      
      {protocolo && (
        <ProtocolBadge 
          protocolo={protocolo} 
          dataGeracao={dataGeracao} 
        />
      )}
    </div>
  );
};