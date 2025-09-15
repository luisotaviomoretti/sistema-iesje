import React from 'react'
import { Controller } from 'react-hook-form'
import { User, Phone, Mail, Heart, CreditCard } from 'lucide-react'

// Components
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ValidationFeedback } from '../ui/ValidationFeedback'

// Utils and validations
import { formatCPF, formatPhone, formatName } from '../../utils/formatters'
import { validators } from '../../services/business/validations'

// Types
import type { UseFormReturn } from 'react-hook-form'
import type { EnrollmentFormData } from '../../types/forms'

interface GuardianFormProps {
  form: UseFormReturn<EnrollmentFormData>
  guardianIndex: 1 | 2
  required?: boolean
}

/**
 * Formulário reutilizável para responsáveis
 * 
 * Características:
 * - Reutilizável para responsável 1 e 2
 * - Validação diferenciada (obrigatório/opcional)
 * - Formatação automática de CPF e telefone
 * - Opções de parentesco pré-definidas
 */
export function GuardianForm({ form, guardianIndex, required = true }: GuardianFormProps) {
  const fieldPrefix = guardianIndex === 1 ? 'guardians.guardian1' : 'guardians.guardian2'
  const guardianLabel = guardianIndex === 1 ? 'Principal' : 'Segundo'

  // Opções de parentesco
  const relationshipOptions = [
    { value: 'pai', label: 'Pai' },
    { value: 'mae', label: 'Mãe' },
    { value: 'avo', label: 'Avô' },
    { value: 'ava', label: 'Avó' },
    { value: 'tio', label: 'Tio' },
    { value: 'tia', label: 'Tia' },
    { value: 'padrasto', label: 'Padrasto' },
    { value: 'madrasta', label: 'Madrasta' },
    { value: 'irmao', label: 'Irmão' },
    { value: 'irma', label: 'Irmã' },
    { value: 'tutor', label: 'Tutor Legal' },
    { value: 'responsavel', label: 'Responsável Legal' },
    { value: 'outro', label: 'Outro' }
  ]

  return (
    <div className="space-y-4">
      {/* Nome */}
      <Controller
        name={`${fieldPrefix}.name` as keyof EnrollmentFormData}
        control={form.control}
        render={({ field, fieldState }) => {
          const validation = field.value ? validators.name(field.value as string) : null
          
          return (
            <FormField
              label="Nome Completo"
              error={fieldState.error?.message}
              required={required}
              id={`guardian${guardianIndex}-name`}
            >
              <Input
                {...field}
                id={`guardian${guardianIndex}-name`}
                placeholder="Digite o nome completo"
                error={!!fieldState.error}
                icon={<User className="w-4 h-4" />}
                onChange={(e) => {
                  field.onChange(e.target.value)
                }}
                onBlur={(e) => {
                  const formattedName = formatName(e.target.value)
                  field.onChange(formattedName)
                  field.onBlur()
                }}
              />
              <ValidationFeedback
                isValid={validation?.valid && !fieldState.error}
                isInvalid={!!fieldState.error || (validation && !validation.valid)}
                message={fieldState.error?.message || validation?.message}
                showSuccess={required || !!field.value}
              />
            </FormField>
          )
        }}
      />

      {/* CPF */}
      <Controller
        name={`${fieldPrefix}.cpf` as keyof EnrollmentFormData}
        control={form.control}
        render={({ field, fieldState }) => {
          const validation = field.value ? validators.cpf(field.value as string) : null
          
          return (
            <FormField
              label="CPF"
              error={fieldState.error?.message}
              required={false}
              id={`guardian${guardianIndex}-cpf`}
            >
              <Input
                {...field}
                id={`guardian${guardianIndex}-cpf`}
                placeholder="000.000.000-00"
                error={!!fieldState.error}
                icon={<CreditCard className="w-4 h-4" />}
                onChange={(e) => {
                  const formatted = formatCPF(e.target.value)
                  field.onChange(formatted)
                }}
                maxLength={14}
              />
              <ValidationFeedback
                isValid={validation?.valid && !fieldState.error}
                isInvalid={!!fieldState.error || (validation && !validation.valid)}
                message={fieldState.error?.message || validation?.message}
                showSuccess={required || !!field.value}
              />
            </FormField>
          )
        }}
      />

      {/* Parentesco */}
      <Controller
        name={`${fieldPrefix}.relationship` as keyof EnrollmentFormData}
        control={form.control}
        render={({ field, fieldState }) => {
          return (
            <FormField
              label="Parentesco"
              error={fieldState.error?.message}
              required={required}
              id={`guardian${guardianIndex}-relationship`}
            >
              <Select
                {...field}
                id={`guardian${guardianIndex}-relationship`}
                placeholder="Selecione o parentesco"
                error={!!fieldState.error}
                icon={<Heart className="w-4 h-4" />}
                options={relationshipOptions}
              />
              <ValidationFeedback
                isValid={!fieldState.error && field.value}
                isInvalid={!!fieldState.error}
                message={fieldState.error?.message}
                showSuccess={required || !!field.value}
              />
            </FormField>
          )
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Telefone */}
        <Controller
          name={`${fieldPrefix}.phone` as keyof EnrollmentFormData}
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = validators.phone(field.value as string || '', required)
            
            return (
              <FormField
                label="Telefone"
                error={fieldState.error?.message}
                required={required}
                id={`guardian${guardianIndex}-phone`}
              >
                <Input
                  {...field}
                  id={`guardian${guardianIndex}-phone`}
                  placeholder="(11) 99999-9999"
                  error={!!fieldState.error}
                  icon={<Phone className="w-4 h-4" />}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value)
                    field.onChange(formatted)
                  }}
                  maxLength={15}
                />
                <ValidationFeedback
                  isValid={validation.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || !validation.valid}
                  message={fieldState.error?.message || validation.message}
                  showSuccess={required || !!field.value}
                />
              </FormField>
            )
          }}
        />

        {/* Email */}
        <Controller
          name={`${fieldPrefix}.email` as keyof EnrollmentFormData}
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = validators.email(field.value as string || '', required)
            
            return (
              <FormField
                label="Email"
                error={fieldState.error?.message}
                required={required}
                id={`guardian${guardianIndex}-email`}
              >
                <Input
                  {...field}
                  id={`guardian${guardianIndex}-email`}
                  type="email"
                  placeholder="email@exemplo.com"
                  error={!!fieldState.error}
                  icon={<Mail className="w-4 h-4" />}
                />
                <ValidationFeedback
                  isValid={validation.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || !validation.valid}
                  message={fieldState.error?.message || validation.message}
                  showSuccess={required || !!field.value}
                />
              </FormField>
            )
          }}
        />
      </div>

      {/* Separador visual se não for o último */}
      {guardianIndex === 1 && (
        <div className="pt-4 border-b border-gray-100" />
      )}
    </div>
  )
}