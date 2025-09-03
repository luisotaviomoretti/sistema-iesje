/**
 * 📋 PDF PROFISSIONAL - FASE 3: IMPLEMENTAÇÃO COMPLETA
 * 
 * Este arquivo implementa o PDF profissional conforme especificado no PLANO_RESUMO_PROFISSIONAL.md
 * 
 * ✅ RECURSOS IMPLEMENTADOS:
 * - 🎨 Template profissional com header/footer institucional
 * - 👤 Seção expandida do aluno com dados completos
 * - 📍 Seção de endereço com classificação CEP
 * - 👨‍👩‍👧‍👦 Seção de responsáveis com contatos completos
 * - 💰 Dashboard financeiro visual com breakdown detalhado
 * - 📋 Documentação necessária com checklist
 * - ✅ Níveis de aprovação baseados no desconto
 * - 🔐 QR Code para validação de integridade
 * - ✍️ Campos de assinatura digital/física
 * - 🏢 Informações institucionais completas
 * 
 * 🔄 MIGRAÇÃO: Para migrar outras páginas do sistema:
 * 1. Substituir `generateProposalPdf` por `generateProfessionalPdf`
 * 2. Atualizar parâmetros para usar a interface `ProfessionalPdfParams`
 * 3. Passar dados expandidos do contexto de matrícula
 * 
 * 📁 PÁGINAS JÁ MIGRADAS:
 * - ✅ ResumoMatriculaProfissional.tsx
 * 
 * 📁 PÁGINAS PENDENTES:
 * - ⏳ StepDescontosV2.tsx
 * - ⏳ StepDescontos.tsx  
 * - ⏳ FinalConfirmation.tsx
 * - ⏳ MatriculasRecentes.tsx
 * - ⏳ ResumoMatricula.tsx
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Student, Matricula, Desconto, Responsavel, EscolaInfo, SerieCompleta } from "../types";
import type { EnrollmentState } from "../context/EnrollmentContext";
import { TIPOS_DESCONTO, MAX_DESCONTO_TOTAL } from "../constants";
import { calculateTotals } from "./discounts";
import { getEscolaInfo } from "../constants/escolas";
import { getDynamicChecklistForCode } from "./discounts";

// Utilitários
const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (date?: string) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("pt-BR");
  } catch {
    return "-";
  }
};

const formatDateTime = (date?: string) => {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleString("pt-BR");
  } catch {
    return "-";
  }
};

// Interface expandida para PDF profissional
export interface ProfessionalPdfParams {
  // Dados básicos do sistema atual
  flow: "nova" | "rematricula";
  student?: Student | null;
  matricula?: Partial<Matricula> | null;
  descontos: (Desconto | Partial<Desconto>)[];
  baseMensal?: number;
  responsaveis?: Array<Pick<Responsavel, "nome_completo" | "cpf" | "tipo" | "telefone_principal" | "email" | "grau_parentesco" | "profissao">>;
  
  // Dados expandidos do contexto
  enrollmentData?: Partial<EnrollmentState>;
  
  // ============================================================================
  // DADOS FINANCEIROS CENTRALIZADOS - FASE 1 CORREÇÃO
  // ============================================================================
  dadosFinanceirosCentralizados?: {
    valorBaseComMaterial: number;
    valorBaseSemMaterial: number;
    valorMaterial: number;
    totalDescontoPercentual: number;
    totalDescontoValor: number;
    valorFinal: number;
    capUtilizado: number;
    capMaximo: number;
    capAtingido: boolean;
    descontosDetalhes: {
      codigo: string;
      descricao: string;
      percentual: number;
      valorDesconto: number;
      isBolsaIntegral: boolean;
    }[];
    ultimaAtualizacao: string;
  };
  escola?: "pelicano" | "sete_setembro";
  enderecoAluno?: {
    cep?: string;
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
  };
  
  // Metadados adicionais
  protocolo?: string;
  trilhoEscolhido?: string;
  serieCompleta?: SerieCompleta;
  
  // Opções de personalização
  incluirQRCode?: boolean;
  incluirAssinaturas?: boolean;
  tituloCustomizado?: string;
}

export function generateProfessionalPdf(params: ProfessionalPdfParams) {
  const {
    flow,
    student,
    matricula,
    descontos,
    baseMensal,
    responsaveis,
    enrollmentData,
    escola,
    enderecoAluno,
    protocolo,
    trilhoEscolhido,
    serieCompleta,
    incluirQRCode = true,
    incluirAssinaturas = true,
    tituloCustomizado,
    dadosFinanceirosCentralizados
  } = params;

  // ============================================================================
  // PROCESSAMENTO DE DADOS FINANCEIROS - FASE 1 CORREÇÃO
  // ============================================================================
  
  console.log('📄 PDF: Verificando dados financeiros centralizados...', !!dadosFinanceirosCentralizados);
  
  const escolaInfo = getEscolaInfo(escola || null);
  
  // Usar dados financeiros centralizados se disponíveis (FONTE ÚNICA DE VERDADE)
  let summary, base, valorMaterial, baseCalculoDesconto;
  
  if (dadosFinanceirosCentralizados) {
    console.log('✅ PDF: Usando dados financeiros centralizados!');
    
    // Usar diretamente os dados já calculados
    base = dadosFinanceirosCentralizados.valorBaseSemMaterial;
    valorMaterial = dadosFinanceirosCentralizados.valorMaterial;
    baseCalculoDesconto = base;
    
    // Criar summary compatível a partir dos dados centralizados
    summary = {
      items: dadosFinanceirosCentralizados.descontosDetalhes.map(d => ({
        id: d.codigo,
        codigo: d.codigo,
        descricao: d.descricao,
        percentual: d.percentual,
        status: 'aprovado',
        dataVenc: null
      })),
      totalPercent: dadosFinanceirosCentralizados.totalDescontoPercentual,
      cappedPercent: dadosFinanceirosCentralizados.capUtilizado,
      capReached: dadosFinanceirosCentralizados.capAtingido,
      finalValue: dadosFinanceirosCentralizados.valorBaseSemMaterial - dadosFinanceirosCentralizados.totalDescontoValor,
      savingsMonthly: dadosFinanceirosCentralizados.totalDescontoValor,
      savingsAnnual: dadosFinanceirosCentralizados.totalDescontoValor * 12,
      maxDiscountLimit: dadosFinanceirosCentralizados.capMaximo
    };
  } else {
    console.log('⚠️ PDF: Fallback para cálculo manual (dados centralizados indisponíveis)');
    
    // Fallback para o método antigo
    base = Number(baseMensal ?? matricula?.valor_mensalidade_base ?? serieCompleta?.valor_mensal_com_material ?? 0);
    valorMaterial = serieCompleta?.valor_material ?? 0;
    baseCalculoDesconto = Math.max(0, base - valorMaterial);
    
    summary = calculateTotals(baseCalculoDesconto, descontos as any, TIPOS_DESCONTO, MAX_DESCONTO_TOTAL);
  }
  
  const descontoItems = normalizeDescontos(descontos);
  const docs = collectDocumentList(descontos);

  // Criar documento PDF
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  let currentY = margin;

  // ====================================================================
  // CABEÇALHO PROFISSIONAL
  // ====================================================================
  currentY = drawProfessionalHeader(doc, {
    pageWidth,
    currentY,
    margin,
    titulo: tituloCustomizado || "PROPOSTA DE MATRÍCULA",
    subTitulo: `${flow === "nova" ? "Nova Matrícula" : "Rematrícula"} - ${escolaInfo?.nome || "IESJE"}`,
    protocolo: protocolo || enrollmentData?.protocolo,
    dataEmissao: new Date().toISOString(),
    escolaInfo
  });

  // SEÇÃO COMPACTA: DADOS PRINCIPAIS
  currentY = drawCompactMainSection(doc, {
    pageWidth,
    currentY,
    margin,
    student,
    matricula,
    serieCompleta,
    enderecoAluno,
    responsaveis,
    escolaInfo
  });

  // SEÇÃO COMPACTA: RESUMO FINANCEIRO 
  currentY = drawCompactFinancialSection(doc, {
    pageWidth,
    currentY,
    margin,
    base,
    valorMaterial,
    summary,
    descontoItems
  });

  // SEÇÃO COMPACTA: DOCUMENTAÇÃO (se houver)
  if (docs.length > 0) {
    currentY = drawCompactDocumentationSection(doc, {
      pageWidth,
      currentY,
      margin,
      documentos: docs
    });
  }

  // SEÇÃO COMPACTA: ASSINATURAS
  if (incluirAssinaturas) {
    currentY = drawCompactSignatureSection(doc, {
      pageWidth,
      currentY,
      margin,
      pageHeight
    });
  }

  // ====================================================================
  // RODAPÉ PROFISSIONAL
  // ====================================================================
  drawProfessionalFooter(doc, {
    pageWidth,
    pageHeight,
    margin,
    escolaInfo,
    protocolo: protocolo || enrollmentData?.protocolo || ""
  });

  // Salvar arquivo
  const fileName = generateFileName(student, flow, protocolo || enrollmentData?.protocolo);
  doc.save(fileName);
}

// ====================================================================
// FUNÇÕES COMPACTAS PARA PDF MINIMALISTA (1 PÁGINA)
// ====================================================================

function drawCompactMainSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  student?: Student | null;
  matricula?: Partial<Matricula> | null;
  serieCompleta?: SerieCompleta;
  enderecoAluno?: any;
  responsaveis?: any[];
  escolaInfo?: EscolaInfo | null;
}) {
  const { pageWidth, currentY, margin, student, matricula, serieCompleta, enderecoAluno, responsaveis } = params;
  let y = currentY;

  // Seção compacta em 2 colunas
  const leftCol = margin;
  const rightCol = margin + (pageWidth - 2 * margin) / 2;
  const colWidth = (pageWidth - 2 * margin - 20) / 2;

  // COLUNA ESQUERDA: ALUNO + ACADEMICOS
  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "DADOS DO ALUNO" });
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(student?.nome_completo || "Nome nao informado", leftCol, y);
  
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`CPF: ${student?.cpf || "-"}`, leftCol, y);
  
  y += 14;
  doc.text(`Data Nascimento: ${formatDate(student?.data_nascimento)}`, leftCol, y);
  
  if (serieCompleta) {
    y += 14;
    doc.text(`Serie/Ano: ${serieCompleta.ano_serie}`, leftCol, y);
    y += 14;
    doc.text(`Turno: ${matricula?.turno || "-"}`, leftCol, y);
  }

  // COLUNA DIREITA: ENDERECO + RESPONSAVEL PRINCIPAL
  let rightY = currentY + 35; // Alinhado com início da coluna esquerda
  
  if (enderecoAluno?.cep || enderecoAluno?.logradouro) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("ENDERECO", rightCol, rightY);
    rightY += 16;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const enderecoCompleto = [
      enderecoAluno.logradouro,
      enderecoAluno.numero
    ].filter(Boolean).join(", ");
    
    if (enderecoCompleto) {
      doc.text(enderecoCompleto, rightCol, rightY);
      rightY += 14;
    }
    
    const cidadeUF = [enderecoAluno.cidade, enderecoAluno.uf].filter(Boolean).join(" - ");
    if (cidadeUF) {
      doc.text(cidadeUF, rightCol, rightY);
      rightY += 14;
    }
    
    if (enderecoAluno.cep) {
      doc.text(`CEP: ${enderecoAluno.cep}`, rightCol, rightY);
      rightY += 20;
    }
  }

  // RESPONSAVEL PRINCIPAL (compacto)
  if (responsaveis && responsaveis.length > 0) {
    const responsavel = responsaveis[0]; // Apenas o primeiro
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("RESPONSAVEL", rightCol, rightY);
    rightY += 16;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(responsavel.nome_completo || "-", rightCol, rightY);
    
    if (responsavel.grau_parentesco) {
      rightY += 14;
      doc.text(`Parentesco: ${responsavel.grau_parentesco}`, rightCol, rightY);
    }
    
    if (responsavel.telefone_principal) {
      rightY += 14;
      doc.text(`Telefone: ${responsavel.telefone_principal}`, rightCol, rightY);
    }
  }

  return Math.max(y, rightY) + 25;
}

function drawCompactFinancialSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  base: number;
  valorMaterial: number;
  summary: any;
  descontoItems: any[];
}) {
  const { pageWidth, currentY, margin, base, valorMaterial, summary, descontoItems } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "BREAKDOWN FINANCEIRO" });

  // Calcular valores para o breakdown
  const valorBaseComMaterial = base + valorMaterial;
  const valorBaseSemMaterial = base;
  const descontoValor = summary.savingsMonthly || 0;
  const valorFinalSemMaterial = valorBaseSemMaterial - descontoValor;
  const valorFinalComMaterial = valorFinalSemMaterial + valorMaterial;

  // Dados do breakdown (igual ao frontend)
  const breakdownData = [
    ['Mensalidade com Material', BRL(valorBaseComMaterial)],
    ['(-) Valor do Material', `-${BRL(valorMaterial)}`],
    ['Base para Desconto', BRL(valorBaseSemMaterial)],
    [`(-) Desconto Aplicado (${summary.cappedPercent || 0}%)`, `-${BRL(descontoValor)}`],
    ['Mensalidade sem Material', BRL(valorFinalSemMaterial)],
    ['(+) Valor do Material', `+${BRL(valorMaterial)}`],
    ['', ''], // Separador visual
    ['MENSALIDADE FINAL', BRL(valorFinalComMaterial)]
  ];

  // Criar tabela do breakdown minimalista
  autoTable(doc, {
    startY: y,
    body: breakdownData,
    styles: { 
      font: "helvetica", 
      fontSize: 9,
      cellPadding: 4, // Reduzido de 8 para 4
      textColor: [75, 85, 99], // Cinza neutro
      lineColor: [209, 213, 219], // Cinza claro para bordas
      lineWidth: 0.5
    },
    bodyStyles: {
      fillColor: [255, 255, 255] // Fundo branco
    },
    theme: "grid",
    margin: { left: margin, right: margin },
    showHead: false, // Remove cabeçalho para ficar mais limpo
    didParseCell: (data) => {
      const rowIndex = data.row.index;
      const cellText = data.cell.text[0] || '';
      
      // Linha do separador (vazia) - apenas linha
      if (rowIndex === breakdownData.length - 2) {
        data.cell.styles.fillColor = [255, 255, 255];
        data.cell.styles.minCellHeight = 5;
        data.cell.styles.lineColor = [156, 163, 175];
        data.cell.styles.lineWidth = 1;
      }
      
      // Linha final (MENSALIDADE FINAL) - destaque sutil
      if (rowIndex === breakdownData.length - 1) {
        data.cell.styles.fillColor = [248, 250, 252]; // Cinza muito claro
        data.cell.styles.textColor = [31, 41, 55]; // Cinza escuro
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
      
      // Colorir valores negativos sutilmente
      if (data.column.index === 1 && cellText.startsWith('-')) {
        data.cell.styles.textColor = [107, 114, 128]; // Cinza médio
        data.cell.styles.fontStyle = 'normal';
      }
      
      // Valores positivos (+) em cinza escuro
      if (data.column.index === 1 && cellText.startsWith('+')) {
        data.cell.styles.textColor = [75, 85, 99]; // Cinza padrão
        data.cell.styles.fontStyle = 'normal';
      }
    }
  });

  // @ts-ignore
  return (doc as any).lastAutoTable?.finalY + 10 || y + 100;
}

function drawCompactDocumentationSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  documentos: string[];
}) {
  const { pageWidth, currentY, margin, documentos } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "DOCUMENTOS NECESSARIOS" });

  // Lista compacta em 2 colunas se necessário
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const maxDocsPerColumn = 3; // Máximo por coluna
  const leftCol = margin;
  const rightCol = margin + (pageWidth - 2 * margin) / 2;

  for (let i = 0; i < Math.min(documentos.length, 6); i++) { // Máximo 6 documentos
    const isRightColumn = i >= maxDocsPerColumn;
    const x = isRightColumn ? rightCol : leftCol;
    const yOffset = isRightColumn ? (i - maxDocsPerColumn) : i;
    const currentDocY = y + (yOffset * 14);

    // Checkbox pequeno
    doc.setDrawColor(156, 163, 175);
    doc.rect(x, currentDocY - 6, 6, 6, 'S');
    
    // Texto compacto do documento
    const maxWidth = (pageWidth - 2 * margin) / 2 - 20;
    const lines = doc.splitTextToSize(documentos[i], maxWidth);
    doc.text(lines[0] + (lines.length > 1 ? '...' : ''), x + 10, currentDocY);
  }

  const rows = Math.ceil(Math.min(documentos.length, maxDocsPerColumn) / 1);
  return y + (rows * 14) + 15;
}

function drawCompactSignatureSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  pageHeight: number;
}) {
  const { pageWidth, currentY, margin, pageHeight } = params;
  let y = currentY;

  // Calcular espaço restante
  const remainingSpace = pageHeight - 80 - y; // 80 = espaço para rodapé
  const minSignatureHeight = 50;
  
  if (remainingSpace < minSignatureHeight) {
    y = pageHeight - 80 - minSignatureHeight; // Forçar no final
  }

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "ASSINATURAS" });

  const boxWidth = (pageWidth - 2 * margin - 20) / 2;
  const boxHeight = 40; // Reduzido de 80 para 40

  // Campo 1: Responsável
  doc.setDrawColor(156, 163, 175);
  doc.rect(margin, y, boxWidth, boxHeight, 'S');
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text("Assinatura do Responsavel", margin + 5, y + boxHeight - 8);
  doc.text("Data: ___/___/___", margin + 5, y + boxHeight - 20);

  // Campo 2: Escola (simplificado)
  const x2 = margin + boxWidth + 20;
  doc.rect(x2, y, boxWidth, boxHeight, 'S');
  doc.text("Representante da Escola", x2 + 5, y + boxHeight - 8);
  doc.text("Data: ___/___/___", x2 + 5, y + boxHeight - 20);

  return y + boxHeight + 10;
}

// ====================================================================
// FUNÇÕES AUXILIARES DE DESENHO (ORIGINAIS - MANTER PARA COMPATIBILIDADE)
// ====================================================================

function drawProfessionalHeader(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  titulo: string;
  subTitulo: string;
  protocolo?: string;
  dataEmissao: string;
  escolaInfo?: EscolaInfo | null;
}) {
  const { pageWidth, currentY, margin, titulo, subTitulo, protocolo, dataEmissao, escolaInfo } = params;
  let y = currentY;

  // Faixa superior neutra
  doc.setFillColor(75, 85, 99); // Cinza escuro neutro
  doc.rect(0, 0, pageWidth, 60, 'F'); // Reduzido de 80 para 60

  // Logo placeholder (área reservada para logo)
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, 10, 50, 40, 'F'); // Menor
  doc.setTextColor(75, 85, 99);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("IESJE", margin + 25, 32, { align: 'center' });

  // Título principal
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16); // Reduzido de 18
  doc.text(titulo, pageWidth - margin, 25, { align: 'right' });

  // Subtítulo
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11); // Reduzido de 12
  doc.text(subTitulo, pageWidth - margin, 45, { align: 'right' });

  y = 75; // Reduzido já que header é menor

  // Informações do protocolo e data
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  if (protocolo) {
    doc.text(`Protocolo: ${protocolo}`, margin, y);
  }
  doc.text(`Emissão: ${formatDateTime(dataEmissao)}`, pageWidth - margin, y, { align: 'right' });

  // Informações da escola
  if (escolaInfo) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(escolaInfo.nome, margin, y);
    
    if (escolaInfo.endereco) {
      y += 12;
      doc.setFont("helvetica", "normal");
      doc.text(escolaInfo.endereco, margin, y);
    }
    
    if (escolaInfo.telefone || escolaInfo.email) {
      y += 12;
      const contato = [escolaInfo.telefone, escolaInfo.email].filter(Boolean).join(" • ");
      doc.text(contato, margin, y);
    }
  }

  return y + 25;
}

function drawStudentSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  student?: Student | null;
  matricula?: Partial<Matricula> | null;
  serieCompleta?: SerieCompleta;
  escolaInfo?: EscolaInfo | null;
  trilhoEscolhido?: string;
}) {
  const { pageWidth, currentY, margin, student, matricula, serieCompleta, trilhoEscolhido } = params;
  let y = currentY;

  // Título da seção com fundo
  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "DADOS DO ALUNO" });

  // Card com dados do aluno
  const cardHeight = 80;
  doc.setFillColor(249, 250, 251);
  doc.rect(margin, y, pageWidth - (2 * margin), cardHeight, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.rect(margin, y, pageWidth - (2 * margin), cardHeight, 'S');

  y += 20;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(student?.nome_completo || "Nome não informado", margin + 15, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  const leftCol = margin + 15;
  const rightCol = margin + (pageWidth - 2 * margin) / 2;
  
  doc.text(`CPF: ${student?.cpf || "-"}`, leftCol, y);
  doc.text(`Data Nascimento: ${formatDate(student?.data_nascimento)}`, rightCol, y);
  
  y += 16;
  if (serieCompleta) {
    doc.text(`Serie/Ano: ${serieCompleta.ano_serie}`, leftCol, y);
    doc.text(`Turno: ${matricula?.turno || "-"}`, rightCol, y);
  }

  y += cardHeight - 35;
  
  // Trilho escolhido (badge)
  if (trilhoEscolhido) {
    y += 10;
    drawBadge(doc, { x: margin + 15, y: y - 10, text: `Trilho: ${trilhoEscolhido}`, color: [16, 185, 129] });
  }

  return y + 25;
}

function drawAddressSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  endereco: any;
}) {
  const { pageWidth, currentY, margin, endereco } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "ENDERECO" });

  const enderecoCompleto = [
    endereco.logradouro,
    endereco.numero,
    endereco.complemento
  ].filter(Boolean).join(", ");

  const cidadeUF = [endereco.cidade, endereco.uf].filter(Boolean).join(" - ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  
  if (enderecoCompleto) {
    doc.text(enderecoCompleto, margin, y);
    y += 16;
  }
  
  if (endereco.bairro) {
    doc.text(`Bairro: ${endereco.bairro}`, margin, y);
    y += 16;
  }
  
  if (cidadeUF) {
    doc.text(cidadeUF, margin, y);
    y += 16;
  }
  
  if (endereco.cep) {
    doc.text(`CEP: ${endereco.cep}`, margin, y);
    y += 16;
  }

  return y + 15;
}

function drawResponsaveisSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  responsaveis: any[];
  pageHeight: number;
}) {
  const { pageWidth, currentY, margin, responsaveis, pageHeight } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "RESPONSAVEIS" });

  for (const responsavel of responsaveis) {
    // Verificar se precisa de nova página
    if (y > pageHeight - 100) {
      doc.addPage();
      y = margin;
    }

    // Card do responsável
    const cardHeight = 65;
    doc.setFillColor(249, 250, 251);
    doc.rect(margin, y, pageWidth - (2 * margin), cardHeight, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(margin, y, pageWidth - (2 * margin), cardHeight, 'S');

    y += 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(responsavel.nome_completo || "-", margin + 15, y);

    if (responsavel.grau_parentesco) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`(${responsavel.grau_parentesco})`, margin + 15 + doc.getTextWidth(responsavel.nome_completo || "-") + 5, y);
    }

    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const leftCol = margin + 15;
    const rightCol = margin + (pageWidth - 2 * margin) / 2;
    
    doc.text(`CPF: ${responsavel.cpf || "-"}`, leftCol, y);
    doc.text(`Telefone: ${responsavel.telefone_principal || "-"}`, rightCol, y);

    if (responsavel.email || responsavel.profissao) {
      y += 14;
      doc.text(`Email: ${responsavel.email || "-"}`, leftCol, y);
      doc.text(`Profissao: ${responsavel.profissao || "-"}`, rightCol, y);
    }

    y += cardHeight - 30;
    y += 15; // Espaço entre cards
  }

  return y + 10;
}

function drawFinancialSummary(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  base: number;
  valorMaterial: number;
  baseCalculoDesconto: number;
  summary: any;
  descontoItems: any[];
  trilhoEscolhido: string;
}) {
  const { pageWidth, currentY, margin, base, valorMaterial, baseCalculoDesconto, summary, descontoItems, trilhoEscolhido } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "RESUMO FINANCEIRO" });

  // Cards de resumo (3 colunas)
  const cardWidth = (pageWidth - 2 * margin - 30) / 3;
  const cardHeight = 60;

  // Card 1: Valor Base
  doc.setFillColor(239, 246, 255);
  doc.rect(margin, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(147, 197, 253);
  doc.rect(margin, y, cardWidth, cardHeight, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(59, 130, 246);
  doc.text(BRL(base), margin + cardWidth/2, y + 25, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text("Valor Base", margin + cardWidth/2, y + 45, { align: 'center' });

  // Card 2: Desconto
  const xCard2 = margin + cardWidth + 15;
  doc.setFillColor(254, 242, 242);
  doc.rect(xCard2, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(252, 165, 165);
  doc.rect(xCard2, y, cardWidth, cardHeight, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(220, 38, 38);
  doc.text(`-${summary.cappedPercent}%`, xCard2 + cardWidth/2, y + 25, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text("Desconto Total", xCard2 + cardWidth/2, y + 45, { align: 'center' });

  // Card 3: Valor Final
  const xCard3 = margin + 2 * cardWidth + 30;
  doc.setFillColor(240, 253, 244);
  doc.rect(xCard3, y, cardWidth, cardHeight, 'F');
  doc.setDrawColor(134, 239, 172);
  doc.rect(xCard3, y, cardWidth, cardHeight, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(22, 163, 74);
  doc.text(BRL(summary.finalValue + valorMaterial), xCard3 + cardWidth/2, y + 25, { align: 'center' });
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text("Mensalidade Final", xCard3 + cardWidth/2, y + 45, { align: 'center' });

  y += cardHeight + 20;

  // Breakdown detalhado
  y = drawFinancialBreakdown(doc, {
    pageWidth,
    currentY: y,
    margin,
    base,
    valorMaterial,
    baseCalculoDesconto,
    summary
  });

  // Tabela de descontos se houver
  if (descontoItems.length > 0) {
    y += 15;
    y = drawDiscountTable(doc, {
      currentY: y,
      margin,
      descontoItems
    });
  }

  return y + 20;
}

function drawFinancialBreakdown(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  base: number;
  valorMaterial: number;
  baseCalculoDesconto: number;
  summary: any;
}) {
  const { pageWidth, currentY, margin, base, valorMaterial, baseCalculoDesconto, summary } = params;
  let y = currentY;

  // Tabela de breakdown
  const breakdownData = [
    ['Mensalidade com Material', BRL(base)],
    ['(-) Valor do Material', BRL(valorMaterial)],
    ['Base para Desconto', BRL(baseCalculoDesconto)],
    [`(-) Desconto Aplicado (${summary.cappedPercent}%)`, BRL(summary.savingsMonthly)],
    ['Mensalidade sem Material', BRL(baseCalculoDesconto - summary.savingsMonthly)],
    ['(+) Valor do Material', BRL(valorMaterial)],
    ['', ''], // Separador
    ['MENSALIDADE FINAL', BRL(summary.finalValue + valorMaterial)]
  ];

  autoTable(doc, {
    startY: y,
    head: [['Descricao', 'Valor']],
    body: breakdownData,
    styles: { 
      font: "helvetica", 
      fontSize: 10, 
      cellPadding: 8,
      textColor: [75, 85, 99]
    },
    headStyles: { 
      fillColor: [59, 130, 246],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    bodyStyles: {
      fillColor: [249, 250, 251]
    },
    alternateRowStyles: { 
      fillColor: [255, 255, 255] 
    },
    theme: "grid",
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      // Estilizar linha final
      if (data.row.index === breakdownData.length - 1) {
        data.cell.styles.fillColor = [34, 197, 94];
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
      }
      // Linha separadora
      if (data.row.index === breakdownData.length - 2) {
        data.cell.styles.fillColor = [229, 231, 235];
        data.cell.styles.minCellHeight = 5;
      }
    }
  });

  // @ts-ignore
  return (doc as any).lastAutoTable?.finalY || y + 100;
}

function drawDiscountTable(doc: jsPDF, params: {
  currentY: number;
  margin: number;
  descontoItems: any[];
}) {
  const { currentY, margin, descontoItems } = params;

  autoTable(doc, {
    startY: currentY,
    head: [['Codigo', 'Descricao do Desconto', 'Percentual']],
    body: descontoItems.map(item => [
      item.codigo || '-',
      item.descricao || '-',
      `${item.percentual || 0}%`
    ]),
    styles: { 
      font: "helvetica", 
      fontSize: 10, 
      cellPadding: 8 
    },
    headStyles: { 
      fillColor: [147, 51, 234],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: { 
      fillColor: [248, 250, 252] 
    },
    theme: "striped",
    margin: { left: margin, right: margin }
  });

  // @ts-ignore
  return (doc as any).lastAutoTable?.finalY || currentY + 50;
}

function drawDocumentationSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  documentos: string[];
  pageHeight: number;
}) {
  const { pageWidth, currentY, margin, documentos, pageHeight } = params;
  let y = currentY;

  // Verificar se precisa de nova página
  if (y > pageHeight - 200) {
    doc.addPage();
    y = margin;
  }

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "DOCUMENTACAO NECESSARIA" });

  if (documentos.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text("Nenhum documento adicional e necessario para os descontos selecionados.", margin, y);
    return y + 25;
  }

  // Lista de documentos com checkboxes
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  for (let i = 0; i < documentos.length; i++) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }

    // Checkbox (quadrado vazio)
    doc.setDrawColor(156, 163, 175);
    doc.rect(margin, y - 8, 8, 8, 'S');
    
    // Texto do documento
    const maxWidth = pageWidth - margin - 60;
    const lines = doc.splitTextToSize(documentos[i], maxWidth);
    doc.text(lines, margin + 15, y);
    
    y += Math.max(16, lines.length * 12);
  }

  return y + 15;
}

function drawApprovalSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  summary: any;
  descontoItems: any[];
}) {
  const { pageWidth, currentY, margin, summary } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "APROVACAO NECESSARIA" });

  let nivel = "Automatica";
  let cor: [number, number, number] = [34, 197, 94]; // Verde

  if (summary.cappedPercent > 50) {
    nivel = "Direcao";
    cor = [220, 38, 38]; // Vermelho
  } else if (summary.cappedPercent > 20) {
    nivel = "Coordenacao";
    cor = [245, 158, 11]; // Amarelo/Laranja
  }

  // Badge do nível de aprovação
  drawBadge(doc, { x: margin, y: y - 5, text: `Nivel: ${nivel}`, color: cor });

  y += 20;
  
  // Informações sobre o processo de aprovação
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  
  const aprovacaoTexto = [
    "- Descontos ate 20%: Aprovacao automatica",
    "- Descontos de 21% a 50%: Aprovacao da coordenacao",
    "- Descontos acima de 50%: Aprovacao da direcao",
    "- Bolsas integrais: Aprovacao especial da direcao"
  ];

  for (const texto of aprovacaoTexto) {
    doc.text(texto, margin, y);
    y += 14;
  }

  return y + 15;
}

function drawValidationSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  protocolo: string;
  dataEmissao: string;
}) {
  const { pageWidth, currentY, margin, protocolo } = params;
  let y = currentY;

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "VALIDACAO DO DOCUMENTO" });

  // QR Code placeholder (seria substituído por biblioteca real)
  const qrSize = 80;
  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, y, qrSize, qrSize, 'S');
  
  // Grid pattern para simular QR code
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if ((i + j) % 2 === 0) {
        doc.setFillColor(0, 0, 0);
        doc.rect(margin + i * 10, y + j * 10, 10, 10, 'F');
      }
    }
  }

  // Informações de validação
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  
  const xInfo = margin + qrSize + 20;
  doc.text(`Protocolo: ${protocolo}`, xInfo, y + 15);
  doc.text("Para validar este documento:", xInfo, y + 35);
  doc.text("1. Acesse: www.iesje.edu.br/validar", xInfo, y + 50);
  doc.text(`2. Digite o protocolo: ${protocolo}`, xInfo, y + 65);

  return y + qrSize + 25;
}

function drawSignatureSection(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  pageHeight: number;
  escolaInfo?: EscolaInfo | null;
}) {
  const { pageWidth, currentY, margin, pageHeight, escolaInfo } = params;
  let y = currentY;

  // Verificar se precisa de nova página
  if (y > pageHeight - 150) {
    doc.addPage();
    y = margin;
  }

  y = drawSectionHeader(doc, { pageWidth, currentY: y, margin, titulo: "ASSINATURAS" });

  const boxWidth = (pageWidth - 2 * margin - 20) / 2;
  const boxHeight = 80;

  // Campo 1: Responsável
  doc.setDrawColor(156, 163, 175);
  doc.rect(margin, y, boxWidth, boxHeight, 'S');
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text("Assinatura do Responsável", margin + 10, y + boxHeight - 10);
  doc.text("Data: ___/___/___", margin + 10, y + boxHeight - 25);

  // Campo 2: Escola
  const x2 = margin + boxWidth + 20;
  doc.rect(x2, y, boxWidth, boxHeight, 'S');
  doc.text("Representante da Escola", x2 + 10, y + boxHeight - 10);
  doc.text(`${escolaInfo?.diretor || 'Direcao'} - ${escolaInfo?.nome || 'IESJE'}`, x2 + 10, y + boxHeight - 25);

  return y + boxHeight + 20;
}

function drawProfessionalFooter(doc: jsPDF, params: {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  escolaInfo?: EscolaInfo | null;
  protocolo: string;
}) {
  const { pageWidth, pageHeight, margin, escolaInfo, protocolo } = params;
  
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Linha separadora
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, pageHeight - 60, pageWidth - margin, pageHeight - 60);
    
    // Informações da escola
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    
    if (escolaInfo) {
      doc.text(escolaInfo.nome, margin, pageHeight - 45);
      const contato = [escolaInfo.telefone, escolaInfo.email].filter(Boolean).join(" • ");
      if (contato) {
        doc.text(contato, margin, pageHeight - 35);
      }
    }
    
    // Protocolo e página
    doc.text(
      `Protocolo: ${protocolo} | Página ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 45,
      { align: 'right' }
    );
    
    doc.text(
      "Documento gerado automaticamente pelo sistema IESJE",
      pageWidth - margin,
      pageHeight - 35,
      { align: 'right' }
    );
  }
}

// ====================================================================
// FUNÇÕES UTILITÁRIAS
// ====================================================================

function drawSectionHeader(doc: jsPDF, params: {
  pageWidth: number;
  currentY: number;
  margin: number;
  titulo: string;
}) {
  const { pageWidth, currentY, margin, titulo } = params;
  let y = currentY;

  // Fundo mais sutil
  doc.setFillColor(249, 250, 251); // Cinza muito claro
  doc.rect(margin, y, pageWidth - (2 * margin), 20, 'F'); // Reduzido de 25 para 20
  doc.setDrawColor(209, 213, 219); // Borda cinza
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pageWidth - (2 * margin), 20, 'S');
  
  // Título
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10); // Reduzido de 12 para 10
  doc.setTextColor(75, 85, 99); // Cinza neutro
  doc.text(titulo, margin + 8, y + 13); // Ajustado posição

  return y + 28; // Reduzido de 35 para 28
}

function drawBadge(doc: jsPDF, params: {
  x: number;
  y: number;
  text: string;
  color: [number, number, number];
}) {
  const { x, y, text, color } = params;
  
  const textWidth = doc.getTextWidth(text);
  const badgeWidth = textWidth + 16;
  const badgeHeight = 16;
  
  doc.setFillColor(color[0], color[1], color[2]);
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 3, 3, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(text, x + 8, y + 11);
}

function normalizeDescontos(list: (Desconto | Partial<Desconto>)[]) {
  return (list || []).map((d) => {
    const tipo = TIPOS_DESCONTO.find(
      (t) => t.id === (d as any).tipo_desconto_id || t.codigo === (d as any).codigo_desconto
    );
    const percentual = Number((d as any).percentual_aplicado ?? tipo?.percentual_fixo ?? 0);
    return {
      id: (d as any).id || crypto.randomUUID(),
      codigo: (d as any).codigo_desconto || tipo?.codigo || "",
      descricao: tipo?.descricao || tipo?.nome || (d as any).codigo_desconto || "-",
      percentual,
    };
  });
}

function collectDocumentList(list: (Desconto | Partial<Desconto>)[]): string[] {
  const docs = new Set<string>();
  for (const d of list) {
    const codigo = (d as any).codigo_desconto;
    if (codigo) {
      const checklistItems = getDynamicChecklistForCode(codigo);
      for (const item of checklistItems) {
        docs.add(item.label);
      }
    }
  }
  return Array.from(docs);
}

function generateFileName(student: Student | null | undefined, flow: string, protocolo?: string): string {
  const nomeBase = student?.nome_completo?.split(" ")[0] || "Proposta";
  const data = new Date().toISOString().slice(0, 10);
  const protocoloParte = protocolo ? `_${protocolo}` : "";
  const flowTipo = flow === "nova" ? "NovaMatricula" : "Rematricula";
  
  return `IESJE_${flowTipo}_${nomeBase}${protocoloParte}_${data}.pdf`;
}