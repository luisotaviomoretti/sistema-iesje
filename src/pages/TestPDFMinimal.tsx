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
  Palette,
  Ruler,
  Type,
  Layout,
  Loader2,
  Info,
  Star
} from 'lucide-react'
import { generateProposalPDF, generateProposalPreview, type ProposalData } from '../features/matricula-nova/services/pdf/proposalGeneratorMinimal'
import { toast } from 'sonner'

/**
 * Página de teste para o PDF com design minimalista
 */
export default function TestPDFMinimal() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generationTime, setGenerationTime] = useState<number>(0)

  // Dados de teste com diversos cenários
  const mockData: ProposalData = {
    formData: {
      student: {
        name: 'Ana Beatriz dos Santos Silva',
        cpf: '123.456.789-01',
        rg: '12.345.678-9',
        birthDate: '2010-05-15',
        gender: 'Feminino',
        currentSchool: 'Escola Municipal João Carlos de Oliveira'
      },
      guardians: {
        guardian1: {
          name: 'Carlos Eduardo dos Santos Silva',
          cpf: '987.654.321-00',
          phone: '(11) 98765-4321',
          email: 'carlos.santos@email.com.br',
          relationship: 'Pai'
        }
      },
      address: {
        cep: '01234-567',
        street: 'Avenida Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP'
      },
      academic: {
        seriesId: '1',
        trackId: '1',
        shift: 'Matutino'
      },
      selectedDiscounts: [
        { id: '1', percentual: 10 },
        { id: '2', percentual: 8 },
        { id: '3', percentual: 5 }
      ]
    },
    pricing: {
      isValid: true,
      baseValue: 1500,
      discountAmount: 345,
      finalValue: 1155,
      materialCost: 200,
      breakdown: {
        tuition: 1155,
        material: 200,
        total: 1355
      }
    },
    seriesInfo: {
      id: '1',
      nome: '6º Ano do Ensino Fundamental',
      valor_mensal_com_material: 1700,
      valor_mensal_sem_material: 1500,
      valor_material: 200
    },
    trackInfo: {
      id: '1',
      nome: 'Trilho Especial Premium',
      cap_maximo: 101,
      tipo: 'especial'
    },
    discountsInfo: [
      {
        id: '1',
        codigo: 'IIR',
        nome: 'Desconto Irmão Carnal - Aplicado por Parentesco Direto',
        percentual_maximo: 10,
        categoria: 'familiar'
      },
      {
        id: '2',
        codigo: 'RES',
        nome: 'Desconto por Residência Fora do Município Principal',
        percentual_maximo: 20,
        categoria: 'localização'
      },
      {
        id: '3',
        codigo: 'ADI',
        nome: 'Desconto Adicional por Bom Histórico de Pagamentos',
        percentual_maximo: 10,
        categoria: 'comercial'
      }
    ],
    approvalInfo: {
      level: 'COORDENACAO',
      description: 'Aprovação de coordenação necessária para descontos acima de 20%'
    }
  }

  const generateTestPDF = async () => {
    setIsGenerating(true)
    const startTime = Date.now()

    try {
      // Gerar PDF
      await generateProposalPDF(mockData)
      const endTime = Date.now()
      setGenerationTime(endTime - startTime)
      
      // Gerar preview
      const previewUrl = await generateProposalPreview(mockData)
      setPreviewUrl(previewUrl)
      
      toast.success(`PDF minimalista gerado! Tempo: ${endTime - startTime}ms`)
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast.error('Erro ao gerar PDF: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const designFeatures = [
    {
      icon: Palette,
      title: 'Paleta Minimalista',
      description: 'Máximo 2 cores principais',
      details: 'Azul escuro (#1e3a8a) + Preto, com cinza claro apenas para separações'
    },
    {
      icon: Layout,
      title: 'Espaço em Branco',
      description: 'Margens amplas e respiração',
      details: 'Margens de 25mm, espaçamento consistente entre seções'
    },
    {
      icon: Type,
      title: 'Tipografia Hierárquica',
      description: 'Helvetica com tamanhos consistentes',
      details: 'Títulos (18pt), Seções (14pt), Texto (10pt) - todos bem definidos'
    },
    {
      icon: Ruler,
      title: 'Alinhamento em Grade',
      description: 'Organização estruturada',
      details: 'Tudo alinhado à esquerda, tabelas com espaçamento uniforme'
    }
  ]

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            PDF Minimalista - Design Corporativo Clean
          </CardTitle>
          <CardDescription>
            Layout profissional seguindo princípios de design minimalista
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Design Principles */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {designFeatures.map((feature, index) => {
          const Icon = feature.icon
          return (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 text-blue-600 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      {feature.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {feature.details}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Test Data Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📋 Dados de Teste - Cenário Complexo</CardTitle>
          <CardDescription>
            Teste com nomes longos, múltiplos descontos e valores variados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Aluno:</h4>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Nome:</strong> Ana Beatriz dos Santos Silva</p>
                <p><strong>CPF:</strong> 123.456.789-01</p>
                <p><strong>Escola:</strong> E.M. João Carlos de Oliveira</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Descontos (3):</h4>
              <div className="space-y-1 text-muted-foreground">
                <p>• IIR - Irmão Carnal (10%)</p>
                <p>• RES - Residência Fora (8%)</p>
                <p>• ADI - Histórico Bom (5%)</p>
                <p><strong>Total: 23%</strong></p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Financeiro:</h4>
              <div className="space-y-1 text-muted-foreground">
                <p><strong>Base:</strong> R$ 1.500,00</p>
                <p><strong>Desconto:</strong> R$ 345,00</p>
                <p><strong>Material:</strong> R$ 200,00</p>
                <p><strong className="text-blue-600">Final: R$ 1.155,00</strong></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>🚀 Testar PDF Minimalista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
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

          {generationTime > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span>PDF gerado em {generationTime}ms</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Layout Structure Preview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>📐 Estrutura do Layout</CardTitle>
          <CardDescription>
            Preview da organização das seções no PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 p-4 rounded-lg font-mono text-xs">
            <div className="border-2 border-blue-200 p-2 mb-2 bg-white">
              <div className="flex justify-between items-center text-blue-600 font-bold">
                <span>IESJE - Instituto São João da Escócia</span>
                <span>PROPOSTA DE MATRÍCULA</span>
              </div>
            </div>
            
            {[
              'A. DADOS DO ALUNO',
              'B. DADOS DOS RESPONSÁVEIS', 
              'C. ENDEREÇO RESIDENCIAL',
              'D. INFORMAÇÕES ACADÊMICAS',
              'E. DESCONTOS SELECIONADOS',
              'F. RESUMO FINANCEIRO'
            ].map((section, index) => (
              <div key={index} className="border-l-2 border-gray-300 pl-3 py-2 mb-1 bg-white">
                <div className="font-bold text-gray-700 mb-1">{section}</div>
                <div className="text-gray-500">└─ Conteúdo organizado em grade limpa</div>
              </div>
            ))}
            
            <div className="border-t-2 border-gray-300 pt-2 mt-2 text-gray-500">
              <div>Assinatura: _________________________</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Melhorias do Design Minimalista</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-red-600 mb-3">❌ Problemas Anteriores</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Símbolos estranhos (∅=0d, etc.)</li>
                <li>• Cores muito chamativas</li>
                <li>• Fundos coloridos pesados</li>
                <li>• Margens pequenas</li>
                <li>• Layout desorgan dro e poluído</li>
                <li>• Tipografia inconsistente</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-green-600 mb-3">✅ Design Minimalista</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Encoding UTF-8 perfeito</li>
                <li>• Máximo 2 cores principais</li>
                <li>• Espaço em branco generoso</li>
                <li>• Margens amplas (25mm)</li>
                <li>• Alinhamento em grade limpa</li>
                <li>• Hierarquia tipográfica clara</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {previewUrl && (
        <Alert className="mt-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>PDF minimalista gerado!</strong> Um design limpo, profissional e corporativo.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
