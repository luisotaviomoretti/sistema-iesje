import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingDown, 
  Calculator
} from 'lucide-react';

interface FinancialData {
  valorBaseComMaterial: number;
  valorBaseSemMaterial: number;
  valorMaterial: number;
  totalDescontoPercentual: number;
  totalDescontoValor: number;
  valorFinal: number;
  capUtilizado: number;
  capMaximo: number;
  capAtingido: boolean;
}

interface FinancialDashboardProps {
  data: FinancialData;
  trilhoNome?: string;
  className?: string;
}

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ 
  data, 
  trilhoNome,
  className = '' 
}) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);


  return (
    <div className={className}>


      {/* Breakdown detalhado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Resumo Financeiro da Matrícula
            {trilhoNome && (
              <Badge variant="outline" className="ml-2 text-gray-600 border-gray-300">
                Trilho: {trilhoNome}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Mensalidade com Material</span>
              <span className="font-semibold">{formatCurrency(data.valorBaseComMaterial)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">(-) Valor do Material</span>
              <span className="text-red-600">-{formatCurrency(data.valorMaterial)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Base para Desconto</span>
              <span className="font-semibold">{formatCurrency(data.valorBaseSemMaterial)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">(-) Desconto Aplicado ({data.totalDescontoPercentual.toFixed(1)}%)</span>
              <span className="text-green-600 font-semibold">-{formatCurrency(data.totalDescontoValor)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Mensalidade sem Material</span>
              <span className="font-semibold">{formatCurrency(data.valorBaseSemMaterial - data.totalDescontoValor)}</span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">(+) Valor do Material</span>
              <span className="text-blue-600">+{formatCurrency(data.valorMaterial)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 bg-blue-50 px-3 rounded-lg border-2 border-blue-200">
              <span className="text-lg font-semibold text-blue-900">Mensalidade Final</span>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(data.valorFinal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;