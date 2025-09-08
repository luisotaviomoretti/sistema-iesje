import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  FileText, 
  Download, 
  Eye, 
  CheckCircle,
  Minimize2,
  DollarSign,
  Layout,
  Hash,
  Loader2,
  Info,
  Layers
} from 'lucide-react'
import { generateProposalPDF, generateProposalPreview, type ProposalData } from '../features/matricula-nova/services/pdf/proposalGeneratorCompact'
import { toast } from 'sonner'

/**
 * Página de teste para PDF compacto em 1 página
 */
export default function TestPDFCompact() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Dados de teste completos
  const mockData: ProposalData = {
    formData: {
      student: {
        name: 'João Pedro da Silva Santos',
        cpf: '123.456.789-00',
        rg: '12.345.678-X',
        birthDate: '2012-03-15',
        gender: 'Masculino',
        currentSchool: 'E.M. Paulo Freire'
      },
      guardians: {
        guardian1: {
          name: 'Maria Aparecida da Silva Santos',
          cpf: '987.654.321-00',
          phone: '(11) 94567-8901',
          email: 'maria.silva@email.com',
          relationship: 'Mãe'
        }
      },
      address: {
        cep: '13330-000',
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'Indaiatuba',
        state: 'SP'
      },
      academic: {
        seriesId: '1',
        trackId: '1',
        shift: 'Matutino'
      },
      selectedDiscounts: [
        { id: '1', percentual: 15 },
        { id: '2', percentual: 10 }
      ]
    },
    pricing: {
      isValid: true,
      baseValue: 1800,
      discountAmount: 450,  // 25% de 1800
      discountPercent: 25,
      finalValue: 1350,
      materialCost: 250,
      breakdown: {
        tuition: 1350,
        material: 250,
        total: 1600
      }
    },
    seriesInfo: {
      id: '1',
      nome: '7º Ano Fund.',
      valor_mensal_sem_material: 1800,
      valor_mensal_com_material: 2050,
      valor_material: 250
    },
    trackInfo: {
      id: '1',
      nome: 'Especial',
      cap_maximo: 101,
      tipo: 'especial'
    },
    discountsInfo: [
      {
        id: '1',
        codigo: 'IIR',
        nome: 'Irmão',
        percentual_maximo: 15,
        categoria: 'familiar'
      },
      {
        id: '2',
        codigo: 'ADI',
        nome: 'Adicional',
        percentual_maximo: 10,
        categoria: 'comercial'
      }
    ]
  }

  const generateTestPDF = async () => {
    setIsGenerating(true)

    try {
      // Gerar PDF
      await generateProposalPDF(mockData)
      
      // Gerar preview
      const previewUrl = await generateProposalPreview(mockData)
      setPreviewUrl(previewUrl)
      
      toast.success('PDF compacto gerado com sucesso!')
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const features = [
    {
      icon: Minimize2,
      title: '1 Página Única',
      description: 'Layout ultra compacto garantindo 1 página'
    },
    {
      icon: Layers,
      title: 'Separadores Sutis',
      description: 'Linhas delimitadoras entre blocos A, B, C, D, E'
    },
    {
      icon: DollarSign,
      title: 'Resumo Financeiro Otimizado',
      description: 'Tabela com fundo cinza claro e VALOR FINAL destacado'
    },
    {
      icon: Hash,
      title: 'Dados Corretos',
      description: 'Valor sem material, com material, desconto (% e R$)'
    }
  ]

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            PDF Compacto - 1 Página Otimizada
          </CardTitle>
          <CardDescription>
            Versão final com resumo financeiro reformulado e separadores entre seções
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Features */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {features.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Icon className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <h3 className="font-semibold text-sm mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Test Data */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📊 Dados de Teste - Resumo Financeiro</CardTitle>
          <CardDescription>
            Validação do novo formato do resumo financeiro
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-3">Valores Configurados:</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p><strong className="text-blue-600">Valores Base:</strong></p>
                <ul className="space-y-1 ml-4">
                  <li>• Valor sem material: <strong>R$ 1.800,00</strong></li>
                  <li>• Valor com material: <strong>R$ 2.050,00</strong></li>
                  <li>• Material didático: <strong>R$ 250,00</strong></li>
                </ul>
              </div>
              <div className="space-y-2">
                <p><strong className="text-blue-600">Descontos:</strong></p>
                <ul className="space-y-1 ml-4">
                  <li>• IIR (Irmão): <strong>15%</strong></li>
                  <li>• ADI (Adicional): <strong>10%</strong></li>
                  <li>• Total: <strong>25% = R$ 450,00</strong></li>
                  <li className="text-green-600">• Valor Final: <strong>R$ 1.350,00</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🚀 Gerar PDF Compacto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={generateTestPDF}
              disabled={isGenerating}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Gerar & Download
                </>
              )}
            </Button>

            {previewUrl && (
              <Button
                onClick={() => window.open(previewUrl, '_blank')}
                variant="outline"
                size="lg"
              >
                <Eye className="w-4 h-4 mr-2" />
                Visualizar Preview
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Layout Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📐 Preview do Layout Compacto</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-white border-2 border-gray-200 p-4 rounded-lg font-mono text-xs">
            {/* Header */}
            <div className="flex justify-between mb-2 pb-2 border-b">
              <span className="font-bold text-blue-600">IESJE</span>
              <span className="font-bold">PROPOSTA DE MATRÍCULA</span>
            </div>
            
            {/* Seções com separadores */}
            {[
              { title: 'A. DADOS DO ALUNO', content: 'Nome, CPF, Data Nasc., Gênero' },
              { title: 'B. RESPONSÁVEL PRINCIPAL', content: 'Nome, CPF, Tel, E-mail' },
              { title: 'C. ENDEREÇO E INFORMAÇÕES ACADÊMICAS', content: 'Endereço completo, Série, Trilho, Turno' },
              { title: 'D. DESCONTOS APLICADOS', content: 'Tabela compacta com códigos' },
              { 
                title: 'E. RESUMO FINANCEIRO', 
                content: (
                  <div className="mt-2">
                    <div className="bg-gray-100 p-2 border border-gray-300 mb-2">
                      <div className="flex justify-between mb-1">
                        <span>Valor sem material:</span>
                        <strong>R$ 1.800,00</strong>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span>Valor com material:</span>
                        <strong>R$ 2.050,00</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Desconto aplicado:</span>
                        <strong>25% (R$ 450,00)</strong>
                      </div>
                    </div>
                    <div className="border-2 border-blue-600 p-2 text-center">
                      <strong className="text-blue-600 text-sm">
                        VALOR FINAL MENSAL: R$ 1.350,00
                      </strong>
                    </div>
                  </div>
                )
              }
            ].map((section, index) => (
              <div key={index}>
                {index > 0 && <div className="my-2 border-t border-gray-300"></div>}
                <div className="py-2">
                  <div className="font-bold text-gray-700 mb-1">{section.title}</div>
                  <div className="text-gray-500 ml-4">
                    {typeof section.content === 'string' ? section.content : section.content}
                  </div>
                </div>
              </div>
            ))}
            
            {/* Footer */}
            <div className="mt-4 pt-2 border-t border-gray-300 text-gray-500">
              <div className="text-xs">Documentos em 5 dias | Confirmação por e-mail/telefone</div>
              <div className="mt-2">Assinatura: _______________________</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Improvements */}
      <Card>
        <CardHeader>
          <CardTitle>✅ Melhorias Implementadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span><strong>1 Página garantida:</strong> Layout ultra compacto com espaçamentos reduzidos</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span><strong>Separadores entre blocos:</strong> Linhas sutis delimitando seções A, B, C, D, E</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span><strong>Resumo financeiro reformulado:</strong> 3 campos essenciais com fundo cinza claro</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <span><strong>VALOR FINAL destacado:</strong> Centralizado em caixa alta com cor institucional</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {previewUrl && (
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>PDF compacto pronto!</strong> Documento otimizado em 1 página com todas as melhorias solicitadas.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
