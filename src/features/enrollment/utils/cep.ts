export type CepClass = "" | "fora" | "baixa" | "alta";

export interface AddressInfo {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export const formatCep = (raw: string | undefined | null): string => {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

// =============================================================================
// NOVA FASE 2: INTEGRAÇÃO ViaCEP E VALIDAÇÃO AUTOMÁTICA
// =============================================================================

/**
 * Detecta se uma cidade é Poços de Caldas
 */
export const isPocosDeCaldas = (cidade: string): boolean => {
  const normalizada = cidade?.toLowerCase().trim() || "";
  return normalizada === "poços de caldas" || normalizada === "pocos de caldas";
};

/**
 * Classificação automática baseada na cidade obtida via ViaCEP
 */
export const autoClassifyByCidade = (cidade: string): CepClass => {
  if (!cidade) return "";
  return isPocosDeCaldas(cidade) ? "" : "fora"; // "" permite seleção manual para Poços
};

/**
 * Buscar dados de endereço via ViaCEP
 */
export const fetchViaCep = async (cep: string): Promise<AddressInfo | null> => {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data?.erro) return null;
    
    return {
      logradouro: data?.logradouro || "",
      bairro: data?.bairro || "", 
      cidade: data?.localidade || "",
      uf: data?.uf || "",
    };
  } catch {
    return null;
  }
};

/**
 * Buscar dados de endereço via BrasilAPI (fallback)
 */
export const fetchBrasilApi = async (cep: string): Promise<AddressInfo | null> => {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
    if (!res.ok) return null;
    
    const data = await res.json();
    return {
      logradouro: data?.street || "",
      bairro: data?.neighborhood || "",
      cidade: data?.city || "",
      uf: data?.state || "",
    };
  } catch {
    return null;
  }
};

/**
 * Buscar endereço com fallback automático
 */
export const fetchAddress = async (cep: string): Promise<AddressInfo | null> => {
  // Tentar ViaCEP primeiro
  let address = await fetchViaCep(cep);
  
  // Se falhar, tentar BrasilAPI
  if (!address) {
    address = await fetchBrasilApi(cep);
  }
  
  return address;
};

// =============================================================================
// SISTEMA CEP ESTÁTICO (FALLBACK)
// =============================================================================

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
  if (cls === "fora") return "Fora de Poços de Caldas";
  if (cls === "baixa") return "Poços de Caldas - Menor Renda";
  if (cls === "alta") return "Poços de Caldas - Maior Renda";
  return "Informe e verifique o CEP para classificação.";
};

// =============================================================================
// SISTEMA CEP DINÂMICO (COM FALLBACK INTELIGENTE)
// =============================================================================

/**
 * Classificação de CEP usando dados dinâmicos ou fallback estático
 */
export const classifyCepWithDynamic = (
  raw: string | undefined | null, 
  dynamicClassification?: {
    categoria: CepClass;
    percentual_desconto: number;
    descricao: string;
  } | null,
  fallbackToStatic = true
): CepClass => {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Usar dados dinâmicos primeiro
  if (dynamicClassification && dynamicClassification.categoria) {
    return dynamicClassification.categoria;
  }

  // 🎯 FALLBACK: Usar classificação estática
  if (fallbackToStatic) {
    return classifyCep(raw);
  }

  return "";
};

/**
 * Descrição de CEP usando dados dinâmicos ou fallback estático
 */
export const describeCepClassWithDynamic = (
  cls: CepClass,
  dynamicClassification?: {
    categoria: CepClass;
    percentual_desconto: number;
    descricao: string;
  } | null,
  fallbackToStatic = true
): string => {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Usar descrição dinâmica primeiro
  if (dynamicClassification && dynamicClassification.categoria === cls && dynamicClassification.descricao) {
    return dynamicClassification.descricao;
  }

  // 🎯 FALLBACK: Usar descrição estática
  if (fallbackToStatic) {
    return describeCepClass(cls);
  }

  return "Classificação não disponível";
};

/**
 * Obter percentual de desconto para CEP
 */
export const getCepDiscountPercentage = (
  cls: CepClass,
  dynamicClassification?: {
    categoria: CepClass;
    percentual_desconto: number;
    descricao: string;
  } | null,
  fallbackToStatic = true
): number => {
  // 🔄 MIGRAÇÃO PROGRESSIVA: Usar dados dinâmicos primeiro
  if (dynamicClassification && dynamicClassification.categoria === cls) {
    return dynamicClassification.percentual_desconto;
  }

  // 🎯 FALLBACK: Usar valores estáticos
  if (fallbackToStatic) {
    if (cls === "fora") return 10;
    if (cls === "baixa") return 5;
  }

  return 0;
};

/**
 * Obter código de desconto para CEP
 */
export const getCepDiscountCode = (
  cls: CepClass,
  dynamicClassification?: {
    categoria: CepClass;
    percentual_desconto: number;
    descricao: string;
  } | null
): string | null => {
  // A lógica de códigos permanece a mesma independente dos dados dinâmicos
  // pois os códigos são padrão do sistema
  if (cls === "fora") return "CEP10";
  if (cls === "baixa") return "CEP5";
  return null;
};
