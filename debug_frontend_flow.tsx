// =====================================================
// DEBUG COMPONENT - Investigar fluxo completo no frontend
// =====================================================

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePublicCepClassification } from '@/features/admin/hooks/useCepRanges';
import { useFilteredEligibleDiscounts } from '@/features/enrollment/hooks/useEligibleDiscounts';

export function DebugFrontendFlow() {
  const [testCep, setTestCep] = useState('01000-000');
  
  // Hooks para debug
  const cepClassification = usePublicCepClassification(testCep);
  const eligibilityData = useFilteredEligibleDiscounts(cepClassification.cepCategory);
  
  return (
    <div className="space-y-4 p-4">
      <h1 className="text-2xl font-bold">🐛 Debug Frontend Flow</h1>
      
      <div className="flex gap-2">
        <Input 
          value={testCep} 
          onChange={(e) => setTestCep(e.target.value)}
          className="max-w-xs"
        />
        <Button onClick={() => console.log('Manual refresh')}>Test</Button>
      </div>

      {/* Debug CEP Classification */}
      <Card>
        <CardHeader>
          <CardTitle>🗺️ CEP Classification Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono">
          <p><strong>CEP Input:</strong> {testCep}</p>
          <p><strong>isLoading:</strong> {String(cepClassification.isLoading)}</p>
          <p><strong>error:</strong> {cepClassification.error?.message || 'null'}</p>
          <p><strong>data (raw):</strong> {JSON.stringify(cepClassification.data, null, 2)}</p>
          <p><strong>cepCategory:</strong> {String(cepClassification.cepCategory)}</p>
          <p><strong>discountType:</strong> {String(cepClassification.discountType)}</p>
        </CardContent>
      </Card>

      {/* Debug Eligibility Data */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Eligibility Data Debug</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-mono">
          <p><strong>isLoading:</strong> {String(eligibilityData.isLoading)}</p>
          <p><strong>error:</strong> {eligibilityData.error?.message || 'null'}</p>
          <p><strong>totalDiscounts:</strong> {eligibilityData.totalDiscounts}</p>
          <p><strong>eligibleCount:</strong> {eligibilityData.eligibleCount}</p>
          <p><strong>ineligibleCount:</strong> {eligibilityData.ineligibleCount}</p>
        </CardContent>
      </Card>

      {/* Raw Data Debug */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Raw Data Debug</CardTitle>
        </CardHeader>
        <CardContent>
          <details className="space-y-2">
            <summary className="cursor-pointer">All Discounts (raw)</summary>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(eligibilityData.data, null, 2)}
            </pre>
          </details>
          
          <details className="space-y-2 mt-2">
            <summary className="cursor-pointer">Eligible Discounts</summary>
            <pre className="text-xs bg-green-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(eligibilityData.eligibleDiscounts, null, 2)}
            </pre>
          </details>
          
          <details className="space-y-2 mt-2">
            <summary className="cursor-pointer">Ineligible Discounts</summary>
            <pre className="text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(eligibilityData.ineligibleDiscounts, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>

      {/* Quick Tests */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Quick Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setTestCep('01000-000')}>
              São Paulo (fora)
            </Button>
            <Button variant="outline" onClick={() => setTestCep('37700-000')}>
              Poços Centro (alta)
            </Button>
            <Button variant="outline" onClick={() => setTestCep('37715-000')}>
              Poços Periferia (baixa)
            </Button>
            <Button variant="outline" onClick={() => setTestCep('30000-000')}>
              BH (fora)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}