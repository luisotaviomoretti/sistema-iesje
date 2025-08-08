export const cpfIsValid = (cpf: string): boolean => {
  const cleaned = (cpf || "").replace(/\D/g, "");
  if (cleaned.length !== 11 || /^([0-9])\1+$/.test(cleaned)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(cleaned.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(cleaned.charAt(10));
};

export const emailIsValid = (email?: string | null): boolean => {
  if (!email) return false;
  return /.+@.+\..+/.test(email);
};

import { MAX_DESCONTO_TOTAL } from "../constants";
import type { Desconto } from "../types";

export const calcularMensalidadeComDescontos = (
  valorBase: number,
  descontos: Pick<Desconto, "percentual_aplicado">[]
): { percentualTotal: number; valorFinal: number } => {
  if (descontos.some((d) => d.percentual_aplicado >= 100)) {
    return { percentualTotal: 100, valorFinal: 0 };
  }
  const total = Math.min(
    descontos.reduce((acc, d) => acc + (d.percentual_aplicado || 0), 0),
    MAX_DESCONTO_TOTAL
  );
  const valorFinal = Math.max(0, valorBase * (1 - total / 100));
  return { percentualTotal: total, valorFinal };
};

export const documentosFaltantes = (
  requeridos: string[],
  enviados: string[]
): string[] => {
  const set = new Set(enviados.map((s) => s.trim().toLowerCase()));
  return requeridos.filter((r) => !set.has(r.trim().toLowerCase()));
};
