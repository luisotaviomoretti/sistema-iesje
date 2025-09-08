import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, FileText, RefreshCw } from 'lucide-react'
import { useDiscountDocuments, useDocumentDataSource } from '@/features/matricula-nova/hooks/useDiscountDocuments'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Página de teste para validar o hook useDiscountDocuments
 * Permite testar diferentes combinações de códigos de desconto
 */
export default function TestDiscountDocuments() {
  const queryClient = useQueryClient()
  const dataSource = useDocumentDataSource()
  
  // Códigos de teste disponíveis
  const availableCodes = [
    { code: 'IIR', name: 'Irmãos', color: 'bg-blue-100 text-blue-800' },
    { code: 'RES', name: 'Residência', color: 'bg-green-100 text-green-800' },
    { code: 'PASS', name: 'Professor IESJE', color: 'bg-purple-100 text-purple-800' },
    { code: 'PBS', name: 'Professor Externo', color: 'bg-indigo-100 text-indigo-800' },
    { code: 'COL', name: 'Funcionário IESJE', color: 'bg-yellow-100 text-yellow-800' },
    { code: 'SAE', name: 'Funcionário Externo', color: 'bg-orange-100 text-orange-800' },
    { code: 'ABI', name: 'Bolsa Integral', color: 'bg-red-100 text-red-800' },
    { code: 'ABP', name: 'Bolsa Parcial', color: 'bg-pink-100 text-pink-800' },
    { code: 'PAV', name: 'Pagamento à Vista', color: 'bg-teal-100 text-teal-800' },
  ]

  const [selectedCodes, setSelectedCodes] = useState<string[]>(['IIR', 'RES'])
  
  // Buscar documentos usando o hook
  const { 
    data: documents = [], 
    isLoading, 
    isError, 
    error,
    isFetching,
    refetch 
  } = useDiscountDocuments(selectedCodes)

  // Toggle código de desconto
  const toggleCode = (code: string) => {
    setSelectedCodes(prev => 
      prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code]
    )
  }

  // Limpar cache e refazer query
  const handleRefresh = () => {
    queryClient.invalidateQueries(['discount-documents'])
    refetch()
  }

  // Agrupar documentos por desconto
  const documentsByDiscount = documents.reduce((acc, doc) => {
    const code = doc.discountRelated
    if (!acc[code]) acc[code] = []
    acc[code].push(doc)
    return acc
  }, {} as Record<string, typeof documents>)

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>🧪 Teste do Hook useDiscountDocuments</span>
            <Badge variant={dataSource.isStatic ? 'destructive' : 'default'}>
              Fonte: {dataSource.source}
            </Badge>
          </CardTitle>
          <CardDescription>
            Teste a busca dinâmica de documentos do Supabase
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Seletor de códigos */}
            <div>
              <h3 className="text-sm font-medium mb-2">Selecione os códigos de desconto:</h3>
              <div className="flex flex-wrap gap-2">
                {availableCodes.map(({ code, name, color }) => (
                  <Button
                    key={code}
                    variant={selectedCodes.includes(code) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleCode(code)}
                    className={selectedCodes.includes(code) ? '' : 'hover:bg-gray-50'}
                  >
                    <Badge className={`mr-2 ${color}`}>{code}</Badge>
                    {name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Códigos selecionados */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Códigos selecionados:</strong>{' '}
                {selectedCodes.length > 0 
                  ? selectedCodes.join(', ')
                  : 'Nenhum (selecione acima)'
                }
              </p>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2">
              <Button 
                onClick={handleRefresh} 
                disabled={isLoading || isFetching}
                variant="outline"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                Recarregar
              </Button>
              <Button 
                onClick={() => setSelectedCodes([])}
                variant="outline"
                disabled={selectedCodes.length === 0}
              >
                Limpar Seleção
              </Button>
              <Button 
                onClick={() => setSelectedCodes(availableCodes.map(c => c.code))}
                variant="outline"
              >
                Selecionar Todos
              </Button>
            </div>

            {/* Status da Query */}
            <div className="p-3 border rounded-lg">
              <h4 className="font-medium text-sm mb-2">Status da Query:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="flex items-center gap-1">
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <span>{isLoading ? 'Carregando...' : 'Carregado'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isError ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  <span>{isError ? 'Erro' : 'Sem erros'}</span>
                </div>
                <div>
                  <strong>Total:</strong> {documents.length} docs
                </div>
                <div>
                  <strong>Cache:</strong> {isFetching ? 'Atualizando' : 'Atualizado'}
                </div>
              </div>
              {error && (
                <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded">
                  Erro: {error instanceof Error ? error.message : 'Erro desconhecido'}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Documentos Encontrados</CardTitle>
          <CardDescription>
            {documents.length} documento(s) para {Object.keys(documentsByDiscount).length} desconto(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Nenhum documento encontrado</p>
              <p className="text-sm mt-1">Selecione códigos de desconto acima</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(documentsByDiscount).map(([code, docs]) => {
                const discount = availableCodes.find(d => d.code === code)
                return (
                  <div key={code} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={discount?.color || 'bg-gray-100 text-gray-800'}>
                        {code}
                      </Badge>
                      <h3 className="font-medium">{discount?.name || code}</h3>
                      <span className="text-sm text-gray-500">
                        ({docs.length} documento{docs.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <div className="space-y-2">
                      {docs.map((doc, idx) => (
                        <div key={doc.id} className="pl-4 border-l-2 border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {idx + 1}. {doc.name}
                                </span>
                                {doc.required && (
                                  <Badge variant="destructive" className="text-xs">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                {doc.description}
                              </p>
                              <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                <span>
                                  <strong>Formatos:</strong> {doc.acceptedFormats.join(', ')}
                                </span>
                                <span>
                                  <strong>Tamanho:</strong> {doc.maxSize}
                                </span>
                                <span>
                                  <strong>Ordem:</strong> {doc.displayOrder}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono">
                            ID: {doc.id}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Debug Info */}
          {process.env.NODE_ENV === 'development' && documents.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                🐛 Debug: Ver dados brutos
              </summary>
              <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(documents, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}