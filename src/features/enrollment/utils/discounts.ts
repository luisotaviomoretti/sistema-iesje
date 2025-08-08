import type { Desconto, TipoDesconto } from "@/features/enrollment/types";
import { MAX_DESCONTO_TOTAL, TIPOS_DESCONTO } from "@/features/enrollment/constants";

export type ChecklistItem = {
  id: string;
  label: string;
  required: boolean;
};

// Catálogo de documentos por número conforme PRD
export const DOCUMENT_CATALOG: Record<string, string> = {
  "1": "Cópia da identidade e certidões de nascimento dos irmãos",
  "2": "Comprovante de residência fora de Poços de Caldas-MG",
  "4": "Comprovante de filiação ao SINPRO-MG",
  "5": "Comprovante de vínculo trabalhista (SAAE/Instituição)",
  "6": "Comprovante de membro ativo da Loja Maçônica Estrela Caldense",
  "7": "Comprovante de vínculo familiar com membro da Loja",
  "8": "Certidão de sócio da Loja Maçônica Estrela Caldense",
  "9": "Certidão de membro ativo de outras Lojas Maçônicas",
  "10": "Certidão de avô membro da Loja Maçônica Estrela Caldense",
  "11": "Comprovante de vínculo familiar (certidão nascimento/casamento)",
  // 12-19: pacotes socioeconômicos
  "12": "Formulário socioeconômico preenchido",
  "13": "Comprovantes de renda do núcleo familiar",
  "14": "Comprovante de residência",
  "15": "Declaração de composição familiar",
  "16": "Despesas essenciais (água, luz, alimentação)",
  "17": "Declaração de imposto de renda ou isenção",
  "18": "Situação habitacional (aluguel/financiamento)",
  "19": "Outros documentos comprobatórios pertinentes",
  PAV: "Comprovante de pagamento integral anual",
};

// Mapeamento de códigos -> documentos requeridos
export const DOCUMENTS_BY_CODIGO: Record<string, string[]> = {
  IIR: ["1"],
  RES: ["2"],
  PASS: ["4"],
  PBS: ["4"],
  COL: ["5"],
  SAE: ["5"],
  LEC: ["6", "7"],
  FBM: ["6", "8"],
  MAC: ["9", "7"],
  NEC: ["10", "11"],
  ABI: ["12", "13", "14", "15", "16", "17", "18", "19"],
  ABP: ["12", "13", "14", "15", "16", "17", "18", "19"], // parcial: revisão manual
  PAV: ["PAV"],
};

export function getChecklistForCodigo(codigo: string): ChecklistItem[] {
  const ids = DOCUMENTS_BY_CODIGO[codigo] ?? [];
  return ids.map((id) => ({ id, label: DOCUMENT_CATALOG[id], required: true }));
}

export function calculateTotals(
  baseMensal: number,
  descontos: Desconto[],
  tipos: TipoDesconto[] = TIPOS_DESCONTO
) {
  const items = descontos.map((d) => {
    const tipo = tipos.find((t) => t.id === d.tipo_desconto_id || t.codigo === d.codigo_desconto);
    const percentual = d.percentual_aplicado ?? tipo?.percentual_fixo ?? 0;
    return {
      id: d.id,
      codigo: d.codigo_desconto,
      descricao: tipo?.descricao ?? d.codigo_desconto,
      percentual,
      status: d.status_aprovacao,
      dataVenc: d.data_vencimento || null,
    };
  });

  const totalPercent = items.reduce((acc, it) => acc + (it.percentual || 0), 0);
  const cappedPercent = Math.min(totalPercent, MAX_DESCONTO_TOTAL);
  const percentualEfetivo = isFinite(cappedPercent) ? Math.max(0, cappedPercent) : 0;

  const finalValue = baseMensal > 0 ? Number((baseMensal * (1 - percentualEfetivo / 100)).toFixed(2)) : 0;
  const savingsMonthly = baseMensal > 0 ? Number((baseMensal - finalValue).toFixed(2)) : 0;
  const savingsAnnual = Number((savingsMonthly * 12).toFixed(2));

  return {
    items,
    totalPercent,
    cappedPercent,
    capReached: totalPercent > MAX_DESCONTO_TOTAL,
    finalValue,
    savingsMonthly,
    savingsAnnual,
  } as const;
}
