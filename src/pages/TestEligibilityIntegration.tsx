import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePublicCepClassification } from '@/features/admin/hooks/useCepRanges';
import { useFilteredEligibleDiscounts } from '@/features/enrollment/hooks/useEligibleDiscounts';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

/**
 * Página de teste da integração do sistema de elegibilidade
 * Permite testar se a matriz de elegibilidade está funcionando corretamente
 */
export default function TestEligibilityIntegration() {
  const [testCep, setTestCep] = useState('37701-000'); // CEP padrão de Poços Centro

  // Classificação do CEP
  const { data: cepClassification, isLoading: loadingCep } = usePublicCepClassification(testCep);
  
  // Descontos elegíveis baseados na categoria
  const { 
    eligibleDiscounts, 
    ineligibleDiscounts,
    totalDiscounts,
    eligibleCount,
    ineligibleCount,
    isLoading: loadingDiscounts
  } = useFilteredEligibleDiscounts(cepClassification?.cepCategory);

  const testCeps = [
    { cep: '37701-000', label: 'Poços Centro (Alta Renda)', expected: 'alta' },
    { cep: '37704-000', label: 'Poços Sul (Baixa Renda)', expected: 'baixa' },
    { cep: '13000-000', label: 'Campinas (Fora)', expected: 'fora' },
    { cep: '99999-999', label: 'CEP Inexistente', expected: null }
  ];

  const runAllTests = async () => {
    console.group('🧪 TESTE DE INTEGRAÇÃO - SISTEMA DE ELEGIBILIDADE');
    
    // Teste direto no Supabase
    console.group('🔍 TESTE DIRETO SUPABASE');
    
    try {
      const { supabase } = await import('@/lib/supabase');
      
      // Testar função classify_cep diretamente
      console.log('📡 Testando classify_cep diretamente...');
      const { data, error } = await supabase.rpc('classify_cep', { 
        input_cep: '37701000' 
      });
      
      if (error) {
        console.error('❌ Erro na RPC classify_cep:', error);
      } else {
        console.log('✅ Resultado da RPC classify_cep:', data);
      }
      
      // Testar tabela cep_ranges
      console.log('📡 Testando acesso à tabela cep_ranges...');
      const { data: ranges, error: rangesError } = await supabase
        .from('cep_ranges')
        .select('*')
        .limit(5);
        
      if (rangesError) {
        console.error('❌ Erro ao acessar cep_ranges:', rangesError);
      } else {
        console.log('✅ Faixas de CEP encontradas:', ranges?.length || 0);
        console.log('📊 Exemplo de faixas:', ranges);
      }
      
    } catch (err) {
      console.error('❌ Erro no teste direto:', err);
    }
    
    console.groupEnd();
    
    // Testes de CEP individuais
    testCeps.forEach(test => {
      console.group(`📍 Testando CEP: ${test.cep} - ${test.label}`);
      setTestCep(test.cep);
      setTimeout(() => {
        console.log('Categoria esperada:', test.expected);
        console.log('Categoria obtida:', cepClassification?.cepCategory);
        console.log('Match:', cepClassification?.cepCategory === test.expected ? '✅' : '❌');
        console.groupEnd();
      }, 500);
    });
    
    console.groupEnd();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Teste de Integração - Sistema de Elegibilidade</CardTitle>
          <CardDescription>
            Valide se a Matriz de Elegibilidade está funcionando corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Entrada de CEP */}
          <div className="space-y-2">
            <Label htmlFor="test-cep">CEP para Teste</Label>
            <div className="flex gap-2">
              <Input
                id="test-cep"
                value={testCep}
                onChange={(e) => setTestCep(e.target.value)}
                placeholder="Digite um CEP"
                className="max-w-xs"
              />
              <Button onClick={runAllTests} variant="outline">
                Executar Todos os Testes
              </Button>
            </div>
          </div>

          {/* CEPs de Teste Rápido */}
          <div className="flex flex-wrap gap-2">
            {testCeps.map(test => (
              <Button
                key={test.cep}
                variant="outline"
                size="sm"
                onClick={() => setTestCep(test.cep)}
              >
                {test.label}
              </Button>
            ))}
          </div>

          {/* Resultado da Classificação */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1️⃣ Classificação do CEP</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingCep ? (
                <div>Carregando classificação...</div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">CEP:</span>
                    <code className="bg-muted px-2 py-1 rounded">{testCep}</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Categoria:</span>
                    {cepClassification?.cepCategory ? (
                      <Badge variant="default">
                        {cepClassification.cepCategory.toUpperCase()}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">NÃO CLASSIFICADO</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Desconto CEP:</span>
                    <span>{cepClassification?.discountType || 'Nenhum'}</span>
                    {cepClassification?.discountPercentage > 0 && (
                      <Badge variant="outline">{cepClassification.discountPercentage}%</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {cepClassification?.description}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descontos Elegíveis */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2️⃣ Descontos Elegíveis</CardTitle>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {eligibleCount || 0} Elegíveis
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  <XCircle className="w-3 h-3 mr-1" />
                  {ineligibleCount || 0} Bloqueados
                </Badge>
                <Badge variant="outline">
                  Total: {totalDiscounts || 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDiscounts ? (
                <div>Carregando descontos...</div>
              ) : (
                <div className="space-y-4">
                  {/* Descontos Elegíveis */}
                  {eligibleDiscounts && eligibleDiscounts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-green-600">✅ Permitidos:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {eligibleDiscounts.map(d => (
                          <div key={d.codigo} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                              <strong>{d.codigo}</strong> - {d.descricao}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Descontos Bloqueados */}
                  {ineligibleDiscounts && ineligibleDiscounts.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-600">❌ Bloqueados:</h4>
                      <div className="space-y-2">
                        {ineligibleDiscounts.map(d => (
                          <div key={d.codigo} className="p-2 bg-red-50 rounded">
                            <div className="flex items-start gap-2">
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                              <div className="flex-1">
                                <span className="text-sm">
                                  <strong>{d.codigo}</strong> - {d.descricao}
                                </span>
                                {d.motivo_restricao && (
                                  <div className="text-xs text-red-700 mt-1">
                                    {d.motivo_restricao}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sem dados */}
                  {!cepClassification?.cepCategory && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        CEP não classificado. Todos os descontos estão disponíveis por padrão.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Console de Debug */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3️⃣ Console de Debug</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Abra o console do navegador (F12) para ver logs detalhados da integração.
                </AlertDescription>
              </Alert>
              <div className="mt-4 p-4 bg-muted rounded font-mono text-xs space-y-1">
                <div>🔍 Categoria CEP: {cepClassification?.cepCategory || 'null'}</div>
                <div>📊 Total de descontos: {totalDiscounts || 0}</div>
                <div>✅ Elegíveis: {eligibleCount || 0}</div>
                <div>❌ Bloqueados: {ineligibleCount || 0}</div>
                <div>🎯 Filtro aplicado: {cepClassification?.cepCategory ? 'SIM' : 'NÃO'}</div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}