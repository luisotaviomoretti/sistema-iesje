import type { EscolaInfo } from "../types";

// ============================================================================
// INFORMAÇÕES DAS ESCOLAS DO IESJE
// ============================================================================

export const ESCOLAS_INFO: Record<"pelicano" | "sete_setembro", EscolaInfo> = {
  pelicano: {
    codigo: "pelicano",
    nome: "IESJE - Unidade Pelicano",
    endereco: "Rua Pelicano, 123 - Centro, Poços de Caldas - MG",
    telefone: "(35) 3123-4567",
    email: "pelicano@iesje.edu.br",
    diretor: "Dr. João Silva"
  },
  sete_setembro: {
    codigo: "sete_setembro", 
    nome: "IESJE - Unidade Sete de Setembro",
    endereco: "Av. Sete de Setembro, 456 - Centro, Poços de Caldas - MG", 
    telefone: "(35) 3234-5678",
    email: "seteset@iesje.edu.br",
    diretor: "Dra. Maria Santos"
  }
};

// Função utilitária para obter informações da escola
export const getEscolaInfo = (codigo: "pelicano" | "sete_setembro" | null): EscolaInfo | null => {
  if (!codigo) return null;
  return ESCOLAS_INFO[codigo] || null;
};

// Função para obter nome amigável da escola
export const getEscolaNome = (codigo: "pelicano" | "sete_setembro" | null): string => {
  const info = getEscolaInfo(codigo);
  return info?.nome || "Escola não identificada";
};