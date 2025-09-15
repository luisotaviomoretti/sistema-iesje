/**
 * Schema de validação Zod para o formulário de rematrícula
 * Focado apenas nos campos editáveis
 */

import { z } from 'zod'

// Validação de CPF
const cpfRegex = /^\d{11}$/
const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/

// Schema do responsável
const guardianSchema = z.object({
  name: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  
  // CPF opcional no fluxo de Rematrícula
  cpf: z.string().optional().or(z.literal('')),
  
  phone: z.string()
    .regex(phoneRegex, 'Telefone inválido. Use (XX) XXXXX-XXXX'),
  
  email: z.string()
    .email('E-mail inválido')
    .max(100, 'E-mail deve ter no máximo 100 caracteres'),
  
  relationship: z.enum(['Pai', 'Mãe', 'Avô', 'Avó', 'Tio', 'Tia', 'Responsável Legal', 'Outro'])
    .or(z.string().min(1, 'Parentesco é obrigatório')),
  
  is_financial_responsible: z.boolean().optional()
})

// Schema de endereço
const addressSchema = z.object({
  cep: z.string()
    .regex(/^\d{8}$/, 'CEP deve conter 8 dígitos')
    .transform(val => val.replace(/\D/g, '')),
  
  street: z.string()
    .min(3, 'Rua deve ter no mínimo 3 caracteres')
    .max(100, 'Rua deve ter no máximo 100 caracteres'),
  
  number: z.string()
    .min(1, 'Número é obrigatório')
    .max(10, 'Número deve ter no máximo 10 caracteres'),
  
  complement: z.string()
    .max(50, 'Complemento deve ter no máximo 50 caracteres')
    .optional(),
  
  district: z.string()
    .min(2, 'Bairro deve ter no mínimo 2 caracteres')
    .max(50, 'Bairro deve ter no máximo 50 caracteres')
    .optional()
    .or(z.literal('')),
  
  city: z.string()
    .min(2, 'Cidade deve ter no mínimo 2 caracteres')
    .max(50, 'Cidade deve ter no máximo 50 caracteres'),
  
  state: z.string()
    .length(2, 'Estado deve ter 2 caracteres')
    .transform(val => val.toUpperCase())
})

// Schema acadêmico
const academicSchema = z.object({
  selectedSeriesId: z.string()
    .uuid('ID da série inválido')
    .min(1, 'Série é obrigatória'),
  
  selectedTrackId: z.string()
    .uuid('ID do trilho inválido')
    .min(1, 'Trilho é obrigatório'),
  
  shift: z.enum(['morning', 'afternoon', 'night'], {
    errorMap: () => ({ message: 'Turno inválido' })
  })
})

// Schema de seleção de desconto
const discountSelectionSchema = z.object({
  discount_id: z.string().uuid(),
  discount_code: z.string().min(1),
  percentage: z.number().min(0).max(100),
  requires_documents: z.boolean().optional()
})

// Schema de migração de descontos
const discountMigrationSchema = z.object({
  strategy: z.enum(['inherit', 'manual'], {
    errorMap: () => ({ message: 'Estratégia de migração inválida' })
  }),
  
  selectedDiscounts: z.array(discountSelectionSchema).optional()
}).refine(
  (data) => {
    // Se a estratégia for manual, deve ter descontos selecionados
    if (data.strategy === 'manual') {
      return data.selectedDiscounts && data.selectedDiscounts.length >= 0
    }
    return true
  },
  {
    message: 'Ao escolher seleção manual, você deve selecionar os descontos',
    path: ['selectedDiscounts']
  }
)

// Schema principal do formulário de rematrícula
export const rematriculaSchema = z.object({
  // Responsáveis - pelo menos guardian1 é obrigatório
  guardians: z.object({
    guardian1: guardianSchema,
    guardian2: guardianSchema.optional()
  }).refine(
    (data) => {
      // Pelo menos um responsável deve ser o responsável financeiro
      const g1Financial = data.guardian1?.is_financial_responsible
      const g2Financial = data.guardian2?.is_financial_responsible
      return g1Financial || g2Financial
    },
    {
      message: 'Pelo menos um responsável deve ser o responsável financeiro',
      path: ['guardian1', 'is_financial_responsible']
    }
  ),
  
  // Endereço - todos os campos obrigatórios exceto complemento
  address: addressSchema,
  
  // Acadêmico - seleção livre sem validação de progressão
  academic: academicSchema,
  
  // Migração de descontos
  discountMigration: discountMigrationSchema
})

// Tipo inferido do schema
export type RematriculaFormData = z.infer<typeof rematriculaSchema>

// Schema parcial para salvamento de rascunho
export const rematriculaDraftSchema = rematriculaSchema.partial()

// Tipo para rascunho
export type RematriculaDraftData = z.infer<typeof rematriculaDraftSchema>

// Validações auxiliares exportadas
export const validators = {
  cpf: (value: string) => cpfRegex.test(value.replace(/\D/g, '')),
  phone: (value: string) => phoneRegex.test(value),
  email: (value: string) => z.string().email().safeParse(value).success,
  cep: (value: string) => /^\d{8}$/.test(value.replace(/\D/g, ''))
}