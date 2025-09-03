import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Student, Matricula, Desconto, Responsavel } from "../types";
import { TIPOS_DESCONTO, MAX_DESCONTO_TOTAL } from "../constants";
import { calculateTotals } from "./discounts";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function normalizeDescontos(list: (Desconto | Partial<Desconto>)[]) {
  return (list || []).map((d) => {
    const tipo = TIPOS_DESCONTO.find(
      (t) => t.id === (d as any).tipo_desconto_id || t.codigo === (d as any).codigo_desconto
    );
    const percentual = Number((d as any).percentual_aplicado ?? tipo?.percentual_fixo ?? 0);
    return {
      id: (d as any).id || crypto.randomUUID(),
      codigo: (d as any).codigo_desconto || tipo?.codigo || "",
      descricao: tipo?.descricao || (d as any).codigo_desconto || "—",
      percentual,
    };
  });
}

function collectDocs(list: (Desconto | Partial<Desconto>)[]) {
  const docs = new Set<string>();
  for (const d of list) {
    const tipo = TIPOS_DESCONTO.find(
      (t) => t.id === (d as any).tipo_desconto_id || t.codigo === (d as any).codigo_desconto
    );
    if (tipo?.documentos_necessarios) {
      for (const doc of tipo.documentos_necessarios) docs.add(doc);
    }
  }
  return Array.from(docs);
}

export function generateProposalPdf(params: {
  flow: "nova" | "rematricula";
  student?: Student | null;
  matricula?: Partial<Matricula> | null;
  descontos: (Desconto | Partial<Desconto>)[];
  baseMensal?: number;
  responsaveis?: Array<Pick<Responsavel, "nome_completo" | "cpf" | "tipo">>;
  discountTypes?: any[];
  maxDiscountLimit?: number;
}) {
  const { flow, student, matricula, descontos, baseMensal, responsaveis, discountTypes = TIPOS_DESCONTO, maxDiscountLimit = MAX_DESCONTO_TOTAL } = params;
  const base = Number(baseMensal ?? matricula?.valor_mensalidade_base ?? 0);
  const descontoItems = normalizeDescontos(descontos);
  const summary = calculateTotals(base, (descontos as any) as Desconto[], discountTypes, maxDiscountLimit);
  const docs = collectDocs(descontos);

  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("IESJE - Proposta de Matrícula", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fluxo: ${flow === "nova" ? "Nova Matrícula" : "Rematrícula"}`, 40, 66);
  doc.text(`Emissão: ${new Date().toLocaleString("pt-BR")}`, 40, 80);

  // Aluno
  let y = 110;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Dados do Aluno", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nome: ${student?.nome_completo ?? "—"}`, 40, y);
  y += 16;
  doc.text(`CPF: ${student?.cpf ?? "—"}`, 40, y);

  // Responsáveis
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Responsáveis", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (responsaveis && responsaveis.length > 0) {
    for (const r of responsaveis) {
      doc.text(`${r.tipo ? r.tipo + ": " : ""}${r.nome_completo || "—"} — CPF: ${r.cpf || "—"}`, 40, y);
      y += 16;
    }
  } else {
    doc.text("—", 40, y);
    y += 16;
  }

  // Acadêmicos
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Dados Acadêmicos", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Série/Ano: ${matricula?.serie_ano ?? "—"}`, 40, y);
  y += 16;
  doc.text(`Turno: ${matricula?.turno ?? "—"}`, 40, y);

  // Financeiro
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Resumo Financeiro", 40, y);
  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Valor base: ${BRL(base)}`, 40, y);
  y += 16;
  doc.text(`Total de descontos: ${summary.cappedPercent}%${summary.capReached ? " (limitado a 60%)" : ""}`, 40, y);
  y += 16;
  doc.text(`Valor final: ${BRL(summary.finalValue)}`, 40, y);
  y += 16;
  doc.text(`Economia mensal: ${BRL(summary.savingsMonthly)} • anual: ${BRL(summary.savingsAnnual)}`, 40, y);

  // Tabela de descontos
  y += 20;
  autoTable(doc, {
    startY: y,
    head: [["Código", "Descrição", "%"]],
    body: descontoItems.map((it) => [it.codigo || "—", it.descricao, `${it.percentual}%`]),
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [22, 28, 45] },
    alternateRowStyles: { fillColor: [248, 249, 252] },
    theme: "striped",
    margin: { left: 40, right: 40 },
  });
  // After table
  // @ts-ignore - lastAutoTable available via plugin
  y = (doc as any).lastAutoTable?.finalY || y + 20;

  // Documentos necessários
  y += 26;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Documentos Necessários", 40, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (docs.length === 0) {
    doc.text("Nenhum documento adicional obrigatório pelos descontos selecionados.", 40, y + 12);
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Documento"]],
      body: docs.map((d) => [d]),
      styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [22, 28, 45] },
      theme: "grid",
      margin: { left: 40, right: 40 },
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable?.finalY || y + 20;
  }

  // Rodapé com numeração
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Proposta gerada automaticamente — IESJE | Página ${i} de ${pageCount}`,
      40,
      doc.internal.pageSize.getHeight() - 30
    );
  }

  const fileNameBase = (student?.nome_completo || "Aluno").split(" ")[0];
  doc.save(`Proposta_IESJE_${fileNameBase}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
