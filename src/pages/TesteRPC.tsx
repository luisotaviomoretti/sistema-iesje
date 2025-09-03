/**
 * PÁGINA DE TESTE SIMPLES PARA VERIFICAR AS RPCS
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';

const TesteRPC: React.FC = () => {
  const [cep, setCep] = useState('37701000');
  const [resultado, setResultado] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testarClassifyCep = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🧪 Testando classify_cep com:', cep);
      
      const { data, error } = await supabase.rpc('classify_cep', { 
        input_cep: cep 
      });
      
      if (error) {
        console.error('❌ Erro na RPC:', error);
        setError(`Erro classify_cep: ${error.message}`);
        return;
      }
      
      console.log('✅ Resultado classify_cep:', data);
      setResultado({ tipo: 'classify_cep', data });
      
      // Se classify_cep funcionou, testar get_eligible_discounts
      if (data?.[0]?.categoria) {
        const categoria = data[0].categoria;
        console.log('🧪 Testando get_eligible_discounts com categoria:', categoria);
        
        const { data: eligibleData, error: eligibleError } = await supabase.rpc('get_eligible_discounts', {
          p_categoria_cep: categoria
        });
        
        if (eligibleError) {
          console.error('❌ Erro na RPC get_eligible_discounts:', eligibleError);
          setError(`Erro get_eligible_discounts: ${eligibleError.message}`);
        } else {
          console.log('✅ Resultado get_eligible_discounts:', eligibleData);
          setResultado({ 
            tipo: 'ambos', 
            classify: data, 
            eligible: eligibleData 
          });
        }
      }
      
    } catch (err) {
      console.error('❌ Erro geral:', err);
      setError(`Erro geral: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const testarTabelasDirectly = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Testar tabelas diretamente
      const { data: cepRanges, error: cepError } = await supabase
        .from('cep_ranges')
        .select('*')
        .limit(5);
        
      const { data: tiposDesconto, error: tiposError } = await supabase
        .from('tipos_desconto')
        .select('*')
        .limit(5);
        
      const { data: elegibilidade, error: elegError } = await supabase
        .from('cep_desconto_elegibilidade')
        .select('*')
        .limit(5);
      
      setResultado({
        tipo: 'tabelas',
        cep_ranges: { data: cepRanges, error: cepError },
        tipos_desconto: { data: tiposDesconto, error: tiposError },
        elegibilidade: { data: elegibilidade, error: elegError }
      });
      
    } catch (err) {
      setError(`Erro tabelas: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">🧪 Teste das Funções RPC</h1>
      
      <Card className="p-4 space-y-4">
        <div className="flex gap-2 items-center">
          <Input
            placeholder="CEP (ex: 37701000)"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={testarClassifyCep} disabled={loading}>
            {loading ? 'Testando...' : 'Testar RPCs'}
          </Button>
          <Button variant="outline" onClick={testarTabelasDirectly} disabled={loading}>
            Testar Tabelas
          </Button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded">
            <p className="text-red-800 font-mono text-sm">{error}</p>
          </div>
        )}
        
        {resultado && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded">
            <h3 className="font-bold mb-2">Resultado:</h3>
            <pre className="text-xs overflow-auto bg-white p-2 rounded border">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        )}
      </Card>
      
      <Card className="p-4">
        <h3 className="font-bold mb-2">Debug Console</h3>
        <p className="text-sm text-gray-600">
          Abra o DevTools (F12) e verifique o console para logs detalhados.
        </p>
      </Card>
    </div>
  );
};

export default TesteRPC;