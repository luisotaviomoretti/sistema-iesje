import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';
import { usePublicCepClassification } from '@/features/admin/hooks/useCepRanges';
import { useFilteredEligibleDiscounts, useValidateDiscounts } from '@/features/enrollment/hooks/useEligibleDiscounts';
// import { useDiscountEligibilityMatrix, useEligibilityStats } from '@/features/admin/hooks/useDiscountEligibility'; // REMOVIDO
import { DiscountEligibilityService } from '@/features/enrollment/services/discountEligibilityService';
import { classifyCepWithDynamic } from '@/features/enrollment/utils/cep';

export default function TestElegibilidade() {
  const [testCep, setTestCep] = useState('01000-000'); // CEP de São Paulo
  const queryClient = useQueryClient();
  
  // Hooks para testar
  const { data: cepClassification, isLoading: cepLoading, error: cepError } = usePublicCepClassification(testCep);
  const cepCategory = cepClassification?.cepCategory;
  
  // Função para limpar cache
  const clearCache = () => {
    queryClient.invalidateQueries({ queryKey: ['eligible-discounts'] });
    queryClient.invalidateQueries({ queryKey: ['cep-classification'] });
    queryClient.invalidateQueries({ queryKey: ['discount-eligibility-matrix'] });
    console.log('🧹 Cache limpo! Dados serão recarregados...');
  };
  
  const { eligibleDiscounts, ineligibleDiscounts, totalDiscounts } = useFilteredEligibleDiscounts(cepCategory);
  // const { data: matrixData } = useDiscountEligibilityMatrix(); // REMOVIDO
  const matrixData = null;
  // const { data: statsData } = useEligibilityStats(); // REMOVIDO
  const statsData = null;
  
  // Teste de validação
  const testCodes = ['CEP5', 'CEP10', 'RES', 'ABI', 'ABP'];
  const { data: validationResults } = useValidateDiscounts(testCodes, cepCategory);
  
  // Classificação estática para comparação
  const staticClassification = classifyCepWithDynamic(testCep, null, true);

  const testCeps = [
    { cep: '01000-000', local: 'São Paulo - SP (deve ser fora)' },
    { cep: '37700-000', local: 'Poços de Caldas Centro (deve ser alta)' },
    { cep: '37715-000', local: 'Poços de Caldas Periferia (deve ser baixa)' },
    { cep: '30000-000', local: 'Belo Horizonte - MG (deve ser fora)' },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">🧪 Teste do Sistema de Elegibilidade</h1>
      
      {/* Teste de CEP */}
      <Card>
        <CardHeader>
          <CardTitle>Teste de Classificação de CEP</CardTitle>
          <CardDescription>Digite um CEP para testar o sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input 
              value={testCep} 
              onChange={(e) => setTestCep(e.target.value)}
              placeholder="Digite um CEP"
              className="max-w-xs"
            />
            <Button onClick={() => setTestCep(testCep)}>Testar</Button>
            <Button variant="outline" onClick={clearCache}>🧹 Limpar Cache</Button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold">📊 Classificação Dinâmica</h3>
              {cepLoading && <Badge variant="secondary">Carregando...</Badge>}
              {cepError && <Badge variant="destructive">Erro: {cepError.message}</Badge>}
              {cepClassification && (
                <div className="space-y-1 text-sm">
                  <p><strong>Categoria:</strong> {cepClassification.cepCategory || 'Não classificado'}</p>
                  <p><strong>Desconto:</strong> {cepClassification.data?.percentual_desconto || 0}%</p>
                  <p><strong>Descrição:</strong> {cepClassification.data?.descricao}</p>
                  <p><strong>Desconto Type:</strong> {cepClassification.discountType || 'Nenhum'}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">🔧 Classificação Estática</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Categoria:</strong> {staticClassification || 'Não classificado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status do Sistema */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📋 Dados do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Matriz de Elegibilidade:</strong> {matrixData?.length || 0} registros</p>
            <p><strong>Estatísticas:</strong> {statsData?.length || 0} categorias</p>
            <p><strong>Total Descontos:</strong> {totalDiscounts || 0}</p>
            <p><strong>Elegíveis:</strong> {eligibleDiscounts?.length || 0}</p>
            <p><strong>Inelegíveis:</strong> {ineligibleDiscounts?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">✅ Descontos Elegíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {eligibleDiscounts?.map(d => (
                <Badge key={d.codigo} variant="default" className="mr-1 mb-1">
                  {d.codigo}
                </Badge>
              ))}
              {!eligibleDiscounts?.length && <p className="text-sm text-muted-foreground">Nenhum</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">❌ Descontos Restritos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {ineligibleDiscounts?.map(d => (
                <Badge key={d.codigo} variant="destructive" className="mr-1 mb-1">
                  {d.codigo}
                </Badge>
              ))}
              {!ineligibleDiscounts?.length && <p className="text-sm text-muted-foreground">Nenhum</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teste de Validação */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle>🧪 Teste de Validação de Descontos</CardTitle>
            <CardDescription>Validando: {testCodes.join(', ')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {testCodes.map(code => {
                const validation = validationResults.get(code);
                return (
                  <div key={code} className="flex items-center justify-between p-2 border rounded">
                    <span className="font-mono">{code}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={validation?.elegivel ? 'default' : 'destructive'}>
                        {validation?.elegivel ? 'Elegível' : 'Restrito'}
                      </Badge>
                      {validation?.motivo_restricao && (
                        <span className="text-xs text-muted-foreground max-w-xs truncate">
                          {validation.motivo_restricao}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CEPs de Teste */}
      <Card>
        <CardHeader>
          <CardTitle>📍 CEPs de Teste Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {testCeps.map(({ cep, local }) => (
              <Button 
                key={cep}
                variant="outline" 
                className="justify-start text-left"
                onClick={() => setTestCep(cep)}
              >
                <div>
                  <div className="font-mono">{cep}</div>
                  <div className="text-xs text-muted-foreground">{local}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      <Alert>
        <AlertDescription>
          <details className="space-y-2">
            <summary className="cursor-pointer font-medium">🔍 Informações de Debug</summary>
            <div className="text-xs space-y-1 mt-2 font-mono bg-muted p-2 rounded">
              <p><strong>CEP Testado:</strong> {testCep}</p>
              <p><strong>Categoria Dinâmica:</strong> {JSON.stringify(cepCategory)}</p>
              <p><strong>Categoria Estática:</strong> {JSON.stringify(staticClassification)}</p>
              <p><strong>Dados CEP Classification:</strong> {JSON.stringify(cepClassification?.data)}</p>
              <p><strong>Loading States:</strong> CEP={cepLoading}</p>
              <p><strong>Errors:</strong> {cepError?.message || 'Nenhum'}</p>
              <hr className="my-2" />
              <p><strong>🔍 DADOS BRUTOS ELEGIBILIDADE:</strong></p>
              <p><strong>Elegíveis Raw:</strong> {JSON.stringify(eligibleDiscounts?.map(d => ({codigo: d.codigo, elegivel: d.elegivel})))}</p>
              <p><strong>Inelegíveis Raw:</strong> {JSON.stringify(ineligibleDiscounts?.map(d => ({codigo: d.codigo, elegivel: d.elegivel})))}</p>
              <p><strong>CEP Category para Hook:</strong> {JSON.stringify(cepCategory)}</p>
            </div>
          </details>
        </AlertDescription>
      </Alert>
    </div>
  );
}