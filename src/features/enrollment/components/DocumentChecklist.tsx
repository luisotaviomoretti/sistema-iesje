import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Upload,
  Download,
  Eye,
  X
} from 'lucide-react';

export interface DocumentItem {
  id: string;
  nome: string;
  tipo: string;
  obrigatorio: boolean;
  status: 'pendente' | 'enviado' | 'aprovado' | 'rejeitado' | 'expirado';
  dataEnvio?: string;
  dataAprovacao?: string;
  dataVencimento?: string;
  observacoes?: string;
  url?: string;
  descontoRelacionado?: string;
}

interface DocumentChecklistProps {
  documentos: DocumentItem[];
  onUpload?: (documentoId: string) => void;
  onView?: (documento: DocumentItem) => void;
  onDownload?: (documento: DocumentItem) => void;
  className?: string;
  title?: string; // Título personalizado
}

const DocumentChecklist: React.FC<DocumentChecklistProps> = ({ 
  documentos, 
  onUpload,
  onView,
  onDownload,
  className = '',
  title = 'Documentação Necessária' // Valor padrão
}) => {
  const getStatusIcon = (status: DocumentItem['status']) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejeitado':
        return <X className="h-4 w-4 text-red-600" />;
      case 'expirado':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'enviado':
        return <Clock className="h-4 w-4 text-blue-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: DocumentItem['status']) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Aprovado</Badge>;
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>;
      case 'expirado':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Expirado</Badge>;
      case 'enviado':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Em análise</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const obrigatorios = documentos.filter(d => d.obrigatorio);
  const opcionais = documentos.filter(d => !d.obrigatorio);
  
  const totalObrigatorios = obrigatorios.length;
  const aprovadosObrigatorios = obrigatorios.filter(d => d.status === 'aprovado').length;
  const progressoObrigatorios = totalObrigatorios > 0 ? (aprovadosObrigatorios / totalObrigatorios) * 100 : 0;

  const renderDocumento = (documento: DocumentItem) => (
    <div 
      key={documento.id}
      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        {getStatusIcon(documento.status)}
        <div className="flex-grow">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900">
              {documento.nome}
            </h4>
            {documento.obrigatorio && (
              <Badge variant="outline" className="text-xs">
                Obrigatório
              </Badge>
            )}
            {documento.descontoRelacionado && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                {documento.descontoRelacionado}
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-gray-600 mt-1">
            {documento.tipo}
          </p>
          
          {documento.dataEnvio && (
            <p className="text-xs text-gray-500 mt-1">
              Enviado em: {new Date(documento.dataEnvio).toLocaleDateString('pt-BR')}
            </p>
          )}
          
          {documento.observacoes && (
            <p className="text-xs text-orange-600 mt-1 italic">
              {documento.observacoes}
            </p>
          )}
          
          {documento.dataVencimento && (
            <p className="text-xs text-red-600 mt-1">
              Vence em: {new Date(documento.dataVencimento).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        {getStatusBadge(documento.status)}
        
        <div className="flex space-x-1">
          {documento.status === 'pendente' && onUpload && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpload(documento.id)}
              className="h-8 w-8 p-0"
            >
              <Upload className="h-3 w-3" />
            </Button>
          )}
          
          {documento.url && onView && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onView(documento)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-3 w-3" />
            </Button>
          )}
          
          {documento.url && onDownload && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDownload(documento)}
              className="h-8 w-8 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header com progresso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {title}
            </div>
            <Badge 
              variant={progressoObrigatorios === 100 ? "default" : "secondary"}
              className={progressoObrigatorios === 100 ? "bg-green-100 text-green-800 border-green-200" : ""}
            >
              {aprovadosObrigatorios}/{totalObrigatorios} obrigatórios
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Progresso dos obrigatórios */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Documentos Obrigatórios</span>
                <span className="font-medium">{progressoObrigatorios.toFixed(0)}%</span>
              </div>
              <Progress 
                value={progressoObrigatorios} 
                className="h-3"
                // @ts-ignore
                indicatorClassName={progressoObrigatorios === 100 ? "bg-green-500" : "bg-blue-500"}
              />
              {progressoObrigatorios === 100 && (
                <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Todos os documentos obrigatórios foram aprovados!
                </div>
              )}
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Documentos obrigatórios */}
      {obrigatorios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Documentos Obrigatórios
              <Badge variant="outline" className="text-red-700 border-red-200">
                {obrigatorios.length} documentos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {obrigatorios.map(renderDocumento)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documentos opcionais */}
      {opcionais.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Documentos Opcionais
              <Badge variant="outline" className="text-blue-700 border-blue-200">
                {opcionais.length} documentos
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {opcionais.map(renderDocumento)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio */}
      {documentos.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum documento necessário para os descontos selecionados.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentChecklist;