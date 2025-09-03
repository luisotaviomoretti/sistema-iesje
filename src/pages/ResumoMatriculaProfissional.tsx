import React, { useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  CheckCircle, 
  ArrowLeft, 
  User, 
  GraduationCap,
  Users,
  MapPin,
  FileText,
  DollarSign,
  Building,
  Calendar,
  Phone,
  Mail,
  UserCircle,
  Clock
} from 'lucide-react';

import { useEnrollment } from '@/features/enrollment/context/EnrollmentContext';
import { useToast } from '@/hooks/use-toast';

// Novos componentes profissionais
import MatriculaTimeline from '@/features/enrollment/components/MatriculaTimeline';
import FinancialDashboard from '@/features/enrollment/components/FinancialDashboard';
import DocumentChecklist from '@/features/enrollment/components/DocumentChecklist';
import { StatusSummary } from '@/features/enrollment/components/StatusBadges';

// Utilitários
import { generateProfessionalPdf } from '@/features/enrollment/utils/professional-pdf';
import { addRecent } from '@/features/enrollment/utils/recent-enrollments';
import { TIPOS_DESCONTO } from '@/features/enrollment/constants'; // Necessário para o contexto

import type { DocumentItem } from '@/features/enrollment/components/DocumentChecklist';
import type { ResumoMatricula } from '@/features/enrollment/types';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ResumoMatriculaProfissional: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const { 
    flow,
    selectedStudent,
    matricula,
    descontos,
    enderecoAluno,
    responsaveis,
    escola,
    escolaInfo,
    protocolo,
    dataInicioProcesso,
    dataUltimaAtualizacao,
    statusGeral,
    aprovacaoStatus,
    documentosNecessarios: contextDocumentosNecessarios,
    documentosPendentes: contextDocumentosPendentes,
    observacoesGerais: contextObservacoesGerais,
    trilhos,
    calculosFinanceiros,
    generateProtocolo,
    setStatusGeral,
    calculateAndStoreFinancials,
    recalculateFinancials
  } = useEnrollment();

  // ============================================================================
  // EFEITOS E INICIALIZAÇÃO
  // ============================================================================

  // SEO e meta tags
  useEffect(() => {
    const title = `${flow === "rematricula" ? "Resumo Rematrícula" : "Resumo Nova Matrícula"} - IESJE`;
    document.title = title;
    
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Resumo profissional da matrícula IESJE com informações completas do aluno, financeiro e documentação necessária.");
    document.head.appendChild(metaDesc);
  }, [flow]);

  // Gerar protocolo se não existir
  useEffect(() => {
    if (!protocolo && selectedStudent && matricula) {
      generateProtocolo();
    }
  }, [protocolo, selectedStudent, matricula, generateProtocolo]);

  // ============================================================================
  // CALCULAR FINANCEIROS AUTOMATICAMENTE
  // ============================================================================
  
  // Calcular dados financeiros quando dados necessários estão disponíveis
  useEffect(() => {
    if (matricula?.serie_dados?.valor_mensal_sem_material && descontos.length >= 0) {
      console.log('🔥 RESUMO: Disparando cálculo centralizado...');
      calculateAndStoreFinancials();
    }
  }, [matricula?.serie_dados?.valor_mensal_sem_material, descontos.length]); // ← REMOVIDO calculateAndStoreFinancials das dependências!

  // ============================================================================
  // DADOS CALCULADOS E MEMOS
  // ============================================================================

  // ============================================================================
  // DADOS FINANCEIROS - LEITURA DIRETA DO CONTEXTO (FONTE ÚNICA DE VERDADE)
  // ============================================================================
  
  const dadosFinanceiros = calculosFinanceiros;
  
  console.log('💰 RESUMO: Usando dados financeiros centralizados:', {
    temDados: !!dadosFinanceiros,
    ultimaAtualizacao: dadosFinanceiros?.ultimaAtualizacao,
    percentual: dadosFinanceiros?.totalDescontoPercentual,
    capMaximo: dadosFinanceiros?.capMaximo
  });

  // Timeline do processo
  const timelineSteps = useMemo(() => {
    const steps = [
      {
        id: 'dados-aluno',
        title: 'Dados do Aluno',
        description: 'Informações pessoais do estudante',
        status: selectedStudent ? 'completed' : 'current',
        timestamp: dataInicioProcesso,
        details: selectedStudent ? [
          `Nome: ${selectedStudent.nome_completo}`,
          `CPF: ${selectedStudent.cpf}`
        ] : []
      },
      {
        id: 'responsaveis',
        title: 'Responsáveis',
        description: 'Informações dos responsáveis financeiros',
        status: (responsaveis?.principal?.nome_completo ? 'completed' : 'pending'),
        details: responsaveis?.principal ? [
          `Principal: ${responsaveis.principal.nome_completo}`,
          responsaveis.secundario?.nome_completo ? `Secundário: ${responsaveis.secundario.nome_completo}` : ''
        ].filter(Boolean) : []
      },
      {
        id: 'endereco',
        title: 'Endereço',
        description: 'Localização do aluno para classificação CEP',
        status: enderecoAluno?.cep ? 'completed' : 'pending',
        details: enderecoAluno ? [
          `${enderecoAluno.cidade} - ${enderecoAluno.uf}`,
          `CEP: ${enderecoAluno.cep}`
        ] : []
      },
      {
        id: 'academicos',
        title: 'Dados Acadêmicos',
        description: 'Série, turno e escola selecionados',
        status: matricula?.serie_ano ? 'completed' : 'pending',
        details: matricula ? [
          `${matricula.serie_ano} - ${matricula.turno}`,
          escolaInfo?.nome || escola || ''
        ].filter(Boolean) : []
      },
      {
        id: 'descontos',
        title: 'Descontos',
        description: 'Configuração de descontos e trilhas',
        status: descontos.length > 0 ? 'completed' : 'current',
        details: [
          `${descontos.length} desconto(s) aplicado(s)`,
          trilhos?.trilho_escolhido ? `Trilho: ${trilhos.trilho_escolhido}` : ''
        ].filter(Boolean)
      },
      {
        id: 'revisao',
        title: 'Revisão Final',
        description: 'Confirmação e geração da proposta',
        status: 'current',
        timestamp: dataUltimaAtualizacao
      }
    ];

    return steps;
  }, [selectedStudent, responsaveis, enderecoAluno, matricula, descontos, escolaInfo, escola, trilhos, dataInicioProcesso, dataUltimaAtualizacao]);

  // Debug: Verificar descontos recebidos no resumo
  useEffect(() => {
    console.log('📊 Resumo - Descontos recebidos do contexto:', {
      quantidade: descontos.length,
      codigos: descontos.map(d => d.codigo_desconto).filter(Boolean)
    });
  }, [descontos]);

  // Documentos necessários baseados nos descontos selecionados
  const documentosNecessarios = useMemo((): DocumentItem[] => {
    // Documentos básicos sempre obrigatórios
    const documentosBasicos: DocumentItem[] = [
      {
        id: 'rg-aluno',
        nome: 'RG do Aluno',
        tipo: 'Documento de Identidade',
        obrigatorio: true,
        status: 'pendente'
      },
      {
        id: 'cpf-aluno',
        nome: 'CPF do Aluno',
        tipo: 'Documento de Identidade',
        obrigatorio: true,
        status: 'pendente'
      },
      {
        id: 'comprovante-endereco',
        nome: 'Comprovante de Endereço',
        tipo: 'Comprovante de Residência',
        obrigatorio: true,
        status: 'pendente'
      }
    ];

    // Se não há descontos, retornar apenas documentos básicos
    if (!descontos || descontos.length === 0) {
      return documentosBasicos;
    }

    // Coletar documentos dos descontos selecionados
    const documentosDescontos: DocumentItem[] = [];
    const documentosJaAdicionados = new Set<string>();
    
    // 🎯 FILTRAR APENAS DESCONTOS ÚNICOS POR CÓDIGO para evitar duplicação
    const descontosUnicos = descontos.reduce((acc, desconto) => {
      const key = desconto.codigo_desconto;
      if (!acc.some(d => d.codigo_desconto === key)) {
        acc.push(desconto);
      }
      return acc;
    }, [] as typeof descontos);

    descontosUnicos.forEach(desconto => {
      const tipoDesconto = TIPOS_DESCONTO.find(t => t.codigo === desconto.codigo_desconto);
      
      if (tipoDesconto?.documentos_necessarios && tipoDesconto.documentos_necessarios.length > 0) {
        tipoDesconto.documentos_necessarios.forEach((nomeDoc, docIndex) => {
          const chaveDoc = nomeDoc.toLowerCase().trim().replace(/\s+/g, ' ');
          
          if (!documentosJaAdicionados.has(chaveDoc)) {
            documentosJaAdicionados.add(chaveDoc);
            
            documentosDescontos.push({
              id: `${tipoDesconto.codigo}-doc-${docIndex}`,
              nome: nomeDoc,
              tipo: `Para desconto ${tipoDesconto.codigo}`,
              obrigatorio: true,
              status: 'pendente',
              descontoRelacionado: tipoDesconto.codigo
            });
          }
        });
      }
    });

    return [...documentosBasicos, ...documentosDescontos];
  }, [descontos]);

  // ============================================================================
  // HANDLERS E AÇÕES
  // ============================================================================

  const handleDownloadPDF = () => {
    if (!dadosFinanceiros) {
      toast({
        title: "Erro na geração do PDF",
        description: "Dados financeiros incompletos.",
        variant: "destructive"
      });
      return;
    }

    console.log('📄 PDF: Usando dados financeiros centralizados para PDF:', dadosFinanceiros);
    
    generateProfessionalPdf({
      flow: flow || "nova",
      student: selectedStudent as any,
      matricula: matricula as any,
      descontos: descontos as any,
      baseMensal: dadosFinanceiros.valorBaseSemMaterial,
      // Passar todos os dados financeiros calculados centralmente
      dadosFinanceirosCentralizados: dadosFinanceiros,
      responsaveis: [
        responsaveis?.principal ? {
          nome_completo: responsaveis.principal.nome_completo || '',
          cpf: responsaveis.principal.cpf || '',
          tipo: 'principal',
          telefone_principal: responsaveis.principal.telefone_principal,
          email: responsaveis.principal.email,
          grau_parentesco: responsaveis.principal.grau_parentesco,
          profissao: responsaveis.principal.profissao
        } : null,
        responsaveis?.secundario ? {
          nome_completo: responsaveis.secundario.nome_completo || '',
          cpf: responsaveis.secundario.cpf || '',
          tipo: 'secundario',
          telefone_principal: responsaveis.secundario.telefone_principal,
          email: responsaveis.secundario.email,
          grau_parentesco: responsaveis.secundario.grau_parentesco,
          profissao: responsaveis.secundario.profissao
        } : null
      ].filter(Boolean) as any,
      // Dados expandidos do contexto
      enrollmentData: {
        protocolo,
        dataInicioProcesso,
        dataUltimaAtualizacao,
        statusGeral,
        aprovacaoStatus,
        documentosNecessarios: contextDocumentosNecessarios,
        documentosPendentes: contextDocumentosPendentes,
        trilhos,
        observacoesGerais: contextObservacoesGerais
      },
      escola,
      enderecoAluno,
      protocolo,
      trilhoEscolhido: trilhos?.trilho_escolhido || undefined,
      serieCompleta: undefined, // Seria buscado dos dados da série se disponível
      incluirQRCode: true,
      incluirAssinaturas: true,
      tituloCustomizado: `${flow === "rematricula" ? "REMATRÍCULA" : "NOVA MATRÍCULA"} - IESJE`
    });

    toast({
      title: "PDF Profissional gerado com sucesso",
      description: "A proposta profissional foi baixada para seus arquivos com todas as informações expandidas."
    });
  };

  const handleConfirmMatricula = () => {
    try {
      // Salvar no histórico local
      addRecent({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        flow: flow === "rematricula" ? "rematricula" : "nova",
        student: {
          id: selectedStudent?.id || "",
          nome_completo: selectedStudent?.nome_completo || "",
          cpf: selectedStudent?.cpf || "",
        },
        matricula: {
          serie_ano: matricula?.serie_ano,
          turno: matricula?.turno,
          valor_mensalidade_base: dadosFinanceiros?.valorBaseComMaterial || 0,
        },
        descontos: descontos.map((d: any) => ({
          id: d.id || crypto.randomUUID(),
          tipo_desconto_id: d.tipo_desconto_id,
          codigo_desconto: d.codigo_desconto,
          percentual_aplicado: Number(d.percentual_aplicado ?? 0),
          observacoes: d.observacoes,
        })),
        responsaveis: [
          responsaveis?.principal,
          responsaveis?.secundario
        ].filter(Boolean) as any,
        enderecoAluno: enderecoAluno as any,
      });

      setStatusGeral("PENDENTE_APROVACAO");

      toast({
        title: "Matrícula registrada com sucesso! 🎉",
        description: `Protocolo: ${protocolo}. A matrícula está pendente de aprovação.`,
      });

      // Redirecionar para início após 2 segundos
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (error) {
      toast({
        title: "Erro ao registrar matrícula",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    }
  };

  // ============================================================================
  // VALIDAÇÕES
  // ============================================================================

  const isFormValid = useMemo(() => {
    return !!(
      selectedStudent?.nome_completo &&
      matricula?.serie_ano &&
      matricula?.turno &&
      dadosFinanceiros &&
      responsaveis?.principal?.nome_completo &&
      enderecoAluno?.cep
    );
  }, [selectedStudent, matricula, dadosFinanceiros, responsaveis, enderecoAluno]);

  // ============================================================================
  // RENDERIZAÇÃO
  // ============================================================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header Profissional */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(-1)}
                  className="p-2"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {flow === "rematricula" ? "Resumo da Rematrícula" : "Resumo da Nova Matrícula"}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Revise todas as informações antes da confirmação final
                  </p>
                </div>
              </div>
              
              {/* Status Summary */}
              <StatusSummary
                statusGeral={statusGeral || "RASCUNHO"}
                statusAprovacao={aprovacaoStatus || "PENDENTE"}
                flow={flow || "nova"}
                escola={escolaInfo?.nome || escola || ""}
                protocolo={protocolo}
                dataGeracao={dataInicioProcesso}
              />
            </div>

            {/* Logo IESJE */}
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">IESJE</div>
              <div className="text-xs text-gray-500">Instituto São João da Escócia</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Dados do Aluno */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Dados do Aluno
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedStudent ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">Nome Completo</span>
                      </div>
                      <p className="font-medium">{selectedStudent.nome_completo}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-600">CPF</span>
                      </div>
                      <p className="font-medium font-mono">{selectedStudent.cpf}</p>
                    </div>
                    {selectedStudent.data_nascimento && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Data de Nascimento</span>
                        </div>
                        <p className="font-medium">
                          {new Date(selectedStudent.data_nascimento).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Dados do aluno não informados</p>
                )}
              </CardContent>
            </Card>

            {/* Dados Acadêmicos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-green-600" />
                  Dados Acadêmicos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <span className="text-sm text-gray-600">Série/Ano</span>
                    <p className="font-medium">{matricula?.serie_ano || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-600">Turno</span>
                    <p className="font-medium">{matricula?.turno || "—"}</p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-sm text-gray-600">Escola</span>
                    <p className="font-medium">{escolaInfo?.nome || "—"}</p>
                  </div>
                </div>
                
                {escolaInfo && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Building className="h-4 w-4" />
                      Informações da Escola
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>{escolaInfo.endereco}</p>
                      <div className="flex gap-4">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {escolaInfo.telefone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {escolaInfo.email}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Responsáveis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Responsáveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {responsaveis?.principal || responsaveis?.secundario ? (
                  <div className="space-y-6">
                    {responsaveis.principal && (
                      <div>
                        <Badge variant="outline" className="mb-3">Responsável Principal</Badge>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <span className="text-sm text-gray-600">Nome</span>
                            <p className="font-medium">{responsaveis.principal.nome_completo}</p>
                          </div>
                          <div className="space-y-2">
                            <span className="text-sm text-gray-600">CPF</span>
                            <p className="font-medium font-mono">{responsaveis.principal.cpf}</p>
                          </div>
                          {responsaveis.principal.telefone_principal && (
                            <div className="space-y-2">
                              <span className="text-sm text-gray-600">Telefone</span>
                              <p className="font-medium">{responsaveis.principal.telefone_principal}</p>
                            </div>
                          )}
                          {responsaveis.principal.email && (
                            <div className="space-y-2">
                              <span className="text-sm text-gray-600">Email</span>
                              <p className="font-medium">{responsaveis.principal.email}</p>
                            </div>
                          )}
                          {responsaveis.principal.grau_parentesco && (
                            <div className="space-y-2">
                              <span className="text-sm text-gray-600">Parentesco</span>
                              <p className="font-medium">{responsaveis.principal.grau_parentesco}</p>
                            </div>
                          )}
                          {responsaveis.principal.profissao && (
                            <div className="space-y-2">
                              <span className="text-sm text-gray-600">Profissão</span>
                              <p className="font-medium">{responsaveis.principal.profissao}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {responsaveis.secundario?.nome_completo && (
                      <>
                        <Separator />
                        <div>
                          <Badge variant="outline" className="mb-3">Responsável Secundário</Badge>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <span className="text-sm text-gray-600">Nome</span>
                              <p className="font-medium">{responsaveis.secundario.nome_completo}</p>
                            </div>
                            <div className="space-y-2">
                              <span className="text-sm text-gray-600">CPF</span>
                              <p className="font-medium font-mono">{responsaveis.secundario.cpf}</p>
                            </div>
                            {responsaveis.secundario.telefone_principal && (
                              <div className="space-y-2">
                                <span className="text-sm text-gray-600">Telefone</span>
                                <p className="font-medium">{responsaveis.secundario.telefone_principal}</p>
                              </div>
                            )}
                            {responsaveis.secundario.email && (
                              <div className="space-y-2">
                                <span className="text-sm text-gray-600">Email</span>
                                <p className="font-medium">{responsaveis.secundario.email}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nenhum responsável informado</p>
                )}
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-red-600" />
                  Endereço do Aluno
                </CardTitle>
              </CardHeader>
              <CardContent>
                {enderecoAluno ? (
                  <div className="space-y-2">
                    <p className="font-medium">
                      {enderecoAluno.logradouro}
                      {enderecoAluno.numero && `, ${enderecoAluno.numero}`}
                      {enderecoAluno.complemento && ` - ${enderecoAluno.complemento}`}
                    </p>
                    <p className="text-gray-600">
                      {enderecoAluno.bairro}, {enderecoAluno.cidade} - {enderecoAluno.uf}
                    </p>
                    <p className="text-sm font-mono text-gray-600">
                      CEP: {enderecoAluno.cep}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Endereço não informado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            
            {/* Timeline do Processo */}
            <MatriculaTimeline 
              steps={timelineSteps as any}
              currentStep="revisao"
            />

            {/* Ações Principais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Ações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={handleDownloadPDF}
                  variant="outline" 
                  className="w-full"
                  disabled={!isFormValid}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF Profissional
                </Button>

                <Button 
                  onClick={handleConfirmMatricula}
                  className="w-full"
                  disabled={!isFormValid}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Matrícula
                </Button>

                {!isFormValid && (
                  <p className="text-xs text-red-600 text-center">
                    Complete todas as informações obrigatórias
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Timestamps */}
            {(dataInicioProcesso || dataUltimaAtualizacao) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-gray-500" />
                    Informações do Processo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {dataInicioProcesso && (
                    <div>
                      <span className="text-gray-600">Iniciado em:</span>
                      <p className="font-medium">
                        {new Date(dataInicioProcesso).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                  {dataUltimaAtualizacao && (
                    <div>
                      <span className="text-gray-600">Última atualização:</span>
                      <p className="font-medium">
                        {new Date(dataUltimaAtualizacao).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Dashboard Financeiro */}
        {dadosFinanceiros && (
          <FinancialDashboard
            data={dadosFinanceiros}
            trilhoNome={trilhos?.trilho_escolhido || undefined}
          />
        )}

        {/* Documentos Obrigatórios baseados nos descontos selecionados */}
        {contextDocumentosNecessarios && contextDocumentosNecessarios.length > 0 && (
          <DocumentChecklist 
            documentos={contextDocumentosNecessarios}
            title="Documentos Obrigatórios"
          />
        )}

      </div>
    </main>
  );
};

export default ResumoMatriculaProfissional;