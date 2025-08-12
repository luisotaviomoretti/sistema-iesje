export type StoredEnrollment = {
  id: string;
  createdAt: string; // ISO
  flow: "nova" | "rematricula";
  student: { id: string; nome_completo: string; cpf: string };
  matricula?: { serie_ano?: string; turno?: string; valor_mensalidade_base?: number } | null;
  descontos: Array<{
    id: string;
    tipo_desconto_id?: string | null;
    codigo_desconto: string;
    percentual_aplicado: number;
    observacoes?: string | null;
  }>;
  responsaveis?: Array<{ nome_completo: string; cpf: string; tipo?: string }>;
  enderecoAluno?: {
    cep?: string; logradouro?: string; numero?: string; complemento?: string; bairro?: string; cidade?: string; uf?: string;
  } | null;
};

const STORAGE_KEY = "iesje.recentEnrollments";

function safeParse(json: string | null): StoredEnrollment[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json) as StoredEnrollment[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function readRecent(): StoredEnrollment[] {
  const list = safeParse(localStorage.getItem(STORAGE_KEY));
  return list
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
    .slice(0, 20);
}

export function addRecent(entry: StoredEnrollment) {
  const current = readRecent();
  const next = [entry, ...current].slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearRecent() {
  localStorage.removeItem(STORAGE_KEY);
}
