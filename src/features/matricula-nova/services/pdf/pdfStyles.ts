import { jsPDFOptions } from 'jspdf'

// Configurações do PDF
export const PDF_CONFIG: jsPDFOptions = {
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
  compress: true
}

// Dimensões da página A4 em mm
export const PAGE_DIMENSIONS = {
  width: 210,
  height: 297,
  margins: {
    top: 20,
    right: 15,
    bottom: 20,
    left: 15
  },
  contentWidth: 180, // width - left - right
  contentHeight: 257 // height - top - bottom
}

// Cores do tema IESJE
export const COLORS = {
  primary: '#1e40af',      // Azul IESJE
  secondary: '#059669',    // Verde confirmação
  accent: '#dc2626',       // Vermelho destaque
  dark: '#111827',         // Texto principal
  gray: '#6b7280',         // Texto secundário
  lightGray: '#e5e7eb',    // Bordas e linhas
  background: '#f9fafb',   // Fundos
  white: '#ffffff'
}

// Fontes e tamanhos
export const FONTS = {
  title: {
    size: 20,
    style: 'bold'
  },
  subtitle: {
    size: 16,
    style: 'bold'
  },
  heading: {
    size: 14,
    style: 'bold'
  },
  subheading: {
    size: 12,
    style: 'bold'
  },
  normal: {
    size: 10,
    style: 'normal'
  },
  small: {
    size: 8,
    style: 'normal'
  }
}

// Estilos de tabela
export const TABLE_STYLES = {
  default: {
    theme: 'grid' as const,
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 10,
      fontStyle: 'bold' as const,
      halign: 'left' as const
    },
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.dark,
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: COLORS.background
    },
    margin: { top: 5, right: 0, bottom: 5, left: 0 }
  },
  financial: {
    theme: 'grid' as const,
    headStyles: {
      fillColor: COLORS.secondary,
      textColor: COLORS.white,
      fontSize: 10,
      fontStyle: 'bold' as const,
      halign: 'center' as const
    },
    bodyStyles: {
      fontSize: 10,
      textColor: COLORS.dark,
      cellPadding: 4,
      halign: 'right' as const
    },
    footStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 11,
      fontStyle: 'bold' as const,
      halign: 'right' as const
    },
    columnStyles: {
      0: { halign: 'left' as const }
    }
  },
  summary: {
    theme: 'plain' as const,
    bodyStyles: {
      fontSize: 9,
      textColor: COLORS.dark,
      cellPadding: 2
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold' as const,
        cellWidth: 60
      },
      1: { 
        cellWidth: 120
      }
    }
  }
}

// Estilos de seção
export const SECTION_STYLES = {
  header: {
    backgroundColor: COLORS.primary,
    textColor: COLORS.white,
    padding: 8,
    borderRadius: 2
  },
  subheader: {
    backgroundColor: COLORS.background,
    textColor: COLORS.dark,
    padding: 5,
    borderBottom: 1,
    borderColor: COLORS.lightGray
  },
  content: {
    padding: 5,
    lineHeight: 1.5
  }
}

// Posições padrão para elementos
export const POSITIONS = {
  logo: {
    x: PAGE_DIMENSIONS.margins.left,
    y: PAGE_DIMENSIONS.margins.top,
    width: 40,
    height: 15
  },
  title: {
    x: PAGE_DIMENSIONS.width / 2,
    y: PAGE_DIMENSIONS.margins.top + 10
  },
  footer: {
    x: PAGE_DIMENSIONS.margins.left,
    y: PAGE_DIMENSIONS.height - 15
  }
}

// Helpers de formatação
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d)
}

export const formatCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '')
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  } else if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }
  return phone
}

export const formatCEP = (cep: string): string => {
  const cleaned = cep.replace(/\D/g, '')
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2')
}

// Texto padrão
export const DEFAULT_TEXTS = {
  header: {
    title: 'PROPOSTA DE MATRÍCULA',
    subtitle: 'Instituto São João da Escócia - IESJE',
    year: new Date().getFullYear()
  },
  footer: {
    validity: 'Esta proposta é válida por 30 dias a partir da data de emissão.',
    contact: 'Contato: (83) 3222-1234 | secretaria@iesje.edu.br',
    address: 'Rua Principal, 123 - Centro - João Pessoa/PB'
  },
  terms: {
    title: 'TERMOS E CONDIÇÕES',
    content: [
      '1. Esta proposta de matrícula está sujeita à disponibilidade de vagas.',
      '2. Os descontos aplicados são válidos para pagamento em dia.',
      '3. A documentação completa deve ser entregue na secretaria.',
      '4. O não cumprimento dos requisitos pode resultar no cancelamento dos descontos.',
      '5. Valores sujeitos a reajuste conforme convenção coletiva.'
    ]
  },
  signature: {
    title: 'ACEITE DA PROPOSTA',
    student: 'Assinatura do Aluno',
    guardian: 'Assinatura do Responsável',
    date: 'Data',
    place: 'João Pessoa/PB'
  }
}