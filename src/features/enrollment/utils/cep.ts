export type CepClass = "" | "fora" | "baixa" | "alta";

export const formatCep = (raw: string | undefined | null): string => {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const classifyCep = (raw: string | undefined | null): CepClass => {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length < 8) return "";
  const isPocos = digits.startsWith("377");
  if (!isPocos) return "fora";
  const baixaPrefixes = ["37712", "37713"]; // placeholder — substituir por base oficial (Supabase futuramente)
  if (baixaPrefixes.some((p) => digits.startsWith(p))) return "baixa";
  return "alta";
};

export const describeCepClass = (cls: CepClass): string => {
  if (cls === "fora") return "Fora de Poços de Caldas — elegível a 10% (CEP10)";
  if (cls === "baixa") return "Poços (bairro de menor renda) — elegível a 5% (CEP5)";
  if (cls === "alta") return "Poços (bairro de maior renda) — sem desconto por CEP";
  return "Informe e verifique o CEP para checar o benefício.";
};
