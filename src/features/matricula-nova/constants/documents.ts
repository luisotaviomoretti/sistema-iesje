// Mapeamento de documentos necessários por tipo de desconto e categoria

export interface DocumentRequirement {
  id: string
  name: string
  description: string
  category: 'student' | 'guardian' | 'address' | 'academic' | 'discount'
  required: boolean
  discountRelated?: string // Código do desconto que requer este documento
  acceptedFormats: string[]
  maxSize?: string
}

// Documentos base obrigatórios para qualquer matrícula
export const BASE_REQUIRED_DOCUMENTS: DocumentRequirement[] = [
  // Documentos do Aluno
  {
    id: 'doc-student-cpf',
    name: 'CPF do Aluno',
    description: 'Documento de CPF do aluno ou CNH com CPF',
    category: 'student',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  },
  {
    id: 'doc-student-rg',
    name: 'RG ou Certidão de Nascimento',
    description: 'Documento de identidade do aluno ou certidão de nascimento',
    category: 'student',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  },
  {
    id: 'doc-student-photo',
    name: 'Foto 3x4',
    description: 'Foto recente do aluno no formato 3x4',
    category: 'student',
    required: true,
    acceptedFormats: ['JPG', 'PNG'],
    maxSize: '2MB'
  },

  // Documentos dos Responsáveis
  {
    id: 'doc-guardian1-cpf',
    name: 'CPF do Responsável Principal',
    description: 'Documento de CPF do responsável principal',
    category: 'guardian',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  },
  {
    id: 'doc-guardian1-rg',
    name: 'RG do Responsável Principal',
    description: 'Documento de identidade do responsável principal',
    category: 'guardian',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  },
  {
    id: 'doc-guardian1-income',
    name: 'Comprovante de Renda',
    description: 'Comprovante de renda do responsável financeiro',
    category: 'guardian',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  },

  // Comprovante de Residência
  {
    id: 'doc-address-proof',
    name: 'Comprovante de Residência',
    description: 'Conta de luz, água, telefone ou contrato de aluguel (máx. 3 meses)',
    category: 'address',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  },

  // Documentos Acadêmicos
  {
    id: 'doc-academic-history',
    name: 'Histórico Escolar',
    description: 'Histórico escolar do último ano cursado',
    category: 'academic',
    required: true,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '10MB'
  },
  {
    id: 'doc-academic-transfer',
    name: 'Declaração de Transferência',
    description: 'Declaração de transferência da escola anterior',
    category: 'academic',
    required: false,
    acceptedFormats: ['PDF', 'JPG', 'PNG'],
    maxSize: '5MB'
  }
]

// Documentos específicos por tipo de desconto
export const DISCOUNT_SPECIFIC_DOCUMENTS: Record<string, DocumentRequirement[]> = {
  // IIR - Alunos Irmãos
  'IIR': [
    {
      id: 'doc-discount-iir-sibling',
      name: 'Comprovante de Matrícula do Irmão',
      description: 'Declaração de matrícula do irmão já estudante do IESJE',
      category: 'discount',
      required: true,
      discountRelated: 'IIR',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    },
    {
      id: 'doc-discount-iir-birth',
      name: 'Certidão de Nascimento dos Irmãos',
      description: 'Certidão comprovando o parentesco entre os alunos',
      category: 'discount',
      required: true,
      discountRelated: 'IIR',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ],

  // RES - Alunos de Outras Cidades
  'RES': [
    {
      id: 'doc-discount-res-address',
      name: 'Comprovante de Residência Fora de João Pessoa',
      description: 'Comprovante de endereço em outra cidade (máx. 3 meses)',
      category: 'discount',
      required: true,
      discountRelated: 'RES',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ],

  // PASS - Filhos de Professores IESJE
  'PASS': [
    {
      id: 'doc-discount-pass-employment',
      name: 'Comprovante de Vínculo IESJE',
      description: 'Contracheque ou declaração de vínculo empregatício com IESJE',
      category: 'discount',
      required: true,
      discountRelated: 'PASS',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    },
    {
      id: 'doc-discount-pass-union',
      name: 'Comprovante de Sindicalização',
      description: 'Carteirinha ou declaração do sindicato',
      category: 'discount',
      required: true,
      discountRelated: 'PASS',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ],

  // PBS - Filhos Prof. Sindicalizados de Outras Instituições
  'PBS': [
    {
      id: 'doc-discount-pbs-employment',
      name: 'Comprovante de Vínculo como Professor',
      description: 'Contracheque ou declaração comprovando atuação como professor',
      category: 'discount',
      required: true,
      discountRelated: 'PBS',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    },
    {
      id: 'doc-discount-pbs-union',
      name: 'Comprovante de Sindicalização',
      description: 'Carteirinha ou declaração do sindicato dos professores',
      category: 'discount',
      required: true,
      discountRelated: 'PBS',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ],

  // COL - Filhos de Funcionários IESJE (SAAE)
  'COL': [
    {
      id: 'doc-discount-col-employment',
      name: 'Comprovante de Vínculo IESJE',
      description: 'Contracheque ou declaração de vínculo empregatício com IESJE',
      category: 'discount',
      required: true,
      discountRelated: 'COL',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    },
    {
      id: 'doc-discount-col-saae',
      name: 'Comprovante SAAE',
      description: 'Carteirinha ou declaração do SAAE',
      category: 'discount',
      required: true,
      discountRelated: 'COL',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ],

  // SAE - Filhos de Func. Outros Estabelecimentos (SAAE)
  'SAE': [
    {
      id: 'doc-discount-sae-employment',
      name: 'Comprovante de Vínculo Empregatício',
      description: 'Contracheque ou carteira de trabalho',
      category: 'discount',
      required: true,
      discountRelated: 'SAE',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    },
    {
      id: 'doc-discount-sae-saae',
      name: 'Comprovante SAAE',
      description: 'Carteirinha ou declaração do SAAE',
      category: 'discount',
      required: true,
      discountRelated: 'SAE',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ],

  // ABI - Bolsa Integral Filantropia
  'ABI': [
    {
      id: 'doc-discount-abi-social',
      name: 'Estudo Socioeconômico',
      description: 'Relatório socioeconômico emitido por assistente social',
      category: 'discount',
      required: true,
      discountRelated: 'ABI',
      acceptedFormats: ['PDF'],
      maxSize: '10MB'
    },
    {
      id: 'doc-discount-abi-income-all',
      name: 'Comprovantes de Renda Familiar',
      description: 'Comprovantes de renda de todos os membros da família',
      category: 'discount',
      required: true,
      discountRelated: 'ABI',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '10MB'
    },
    {
      id: 'doc-discount-abi-expenses',
      name: 'Comprovantes de Despesas',
      description: 'Contas básicas e comprovantes de despesas essenciais',
      category: 'discount',
      required: true,
      discountRelated: 'ABI',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '10MB'
    }
  ],

  // ABP - Bolsa Parcial Filantropia
  'ABP': [
    {
      id: 'doc-discount-abp-social',
      name: 'Estudo Socioeconômico',
      description: 'Relatório socioeconômico emitido por assistente social',
      category: 'discount',
      required: true,
      discountRelated: 'ABP',
      acceptedFormats: ['PDF'],
      maxSize: '10MB'
    },
    {
      id: 'doc-discount-abp-income',
      name: 'Comprovantes de Renda Familiar',
      description: 'Comprovantes de renda dos responsáveis',
      category: 'discount',
      required: true,
      discountRelated: 'ABP',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '10MB'
    }
  ],

  // PAV - Pagamento à Vista
  'PAV': [
    {
      id: 'doc-discount-pav-bank',
      name: 'Comprovante Bancário',
      description: 'Extrato ou comprovante de capacidade de pagamento à vista',
      category: 'discount',
      required: false, // Opcional
      discountRelated: 'PAV',
      acceptedFormats: ['PDF', 'JPG', 'PNG'],
      maxSize: '5MB'
    }
  ]
}

// Função helper para obter todos os documentos necessários baseado nos descontos selecionados
export function getRequiredDocuments(selectedDiscountCodes: string[]): DocumentRequirement[] {
  const documents: DocumentRequirement[] = []
  
  // Adicionar APENAS documentos específicos dos descontos (sem documentos base)
  selectedDiscountCodes.forEach(code => {
    const discountDocs = DISCOUNT_SPECIFIC_DOCUMENTS[code]
    if (discountDocs) {
      documents.push(...discountDocs)
    }
  })

  // Remover duplicatas baseado no ID
  const uniqueDocs = documents.filter((doc, index, self) =>
    index === self.findIndex(d => d.id === doc.id)
  )

  return uniqueDocs
}

// Função para contar documentos obrigatórios
export function countRequiredDocuments(documents: DocumentRequirement[]): {
  total: number
  required: number
  optional: number
  byCategory: Record<string, number>
} {
  const required = documents.filter(d => d.required).length
  const optional = documents.filter(d => !d.required).length
  
  const byCategory = documents.reduce((acc, doc) => {
    acc[doc.category] = (acc[doc.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    total: documents.length,
    required,
    optional,
    byCategory
  }
}

// Lista de descrições detalhadas dos descontos para referência
export const DISCOUNT_DESCRIPTIONS = {
  'IIR': {
    name: 'Irmãos',
    description: 'Desconto para alunos que possuem irmãos matriculados no IESJE',
    percentage: 10,
    documents: 'Comprovante de matrícula do irmão e certidão de nascimento'
  },
  'RES': {
    name: 'Residência',
    description: 'Desconto para alunos residentes fora de João Pessoa',
    percentage: 20,
    documents: 'Comprovante de residência em outra cidade'
  },
  'PASS': {
    name: 'Professor IESJE',
    description: 'Desconto para filhos de professores sindicalizados do IESJE',
    percentage: 100,
    documents: 'Comprovante de vínculo e sindicalização'
  },
  'PBS': {
    name: 'Professor Externo',
    description: 'Desconto para filhos de professores sindicalizados de outras instituições',
    percentage: 40,
    documents: 'Comprovante de vínculo como professor e sindicalização'
  },
  'COL': {
    name: 'Funcionário IESJE',
    description: 'Desconto para filhos de funcionários do IESJE sindicalizados SAAE',
    percentage: 50,
    documents: 'Comprovante de vínculo IESJE e SAAE'
  },
  'SAE': {
    name: 'Funcionário Externo',
    description: 'Desconto para filhos de funcionários de outros estabelecimentos sindicalizados SAAE',
    percentage: 40,
    documents: 'Comprovante de vínculo empregatício e SAAE'
  },
  'ABI': {
    name: 'Bolsa Integral',
    description: 'Bolsa integral de filantropia baseada em análise socioeconômica',
    percentage: 100,
    documents: 'Estudo socioeconômico, comprovantes de renda familiar e despesas'
  },
  'ABP': {
    name: 'Bolsa Parcial',
    description: 'Bolsa parcial de filantropia baseada em análise socioeconômica',
    percentage: 50,
    documents: 'Estudo socioeconômico e comprovantes de renda'
  },
  'PAV': {
    name: 'Pagamento à Vista',
    description: 'Desconto para pagamento integral antecipado',
    percentage: 15,
    documents: 'Comprovante bancário (opcional)'
  }
}