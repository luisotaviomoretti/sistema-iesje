import React, { useCallback } from 'react'
import { Controller } from 'react-hook-form'
import { MapPin, Home, Hash, Building, Navigation } from 'lucide-react'

// Components
import { FormField } from '../ui/FormField'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { ValidationFeedback } from '../ui/ValidationFeedback'

// Hooks
import { useCep } from '../../hooks/data/useCep'

// Utils
import { formatCEP } from '../../utils/formatters'
import { validators } from '../../services/business/validators'

// Constants
import { BRAZILIAN_STATES } from '../../constants/validation'

// Types
import type { StepProps } from '../../types/forms'

/**
 * Step 3: Formulário de Endereço com busca automática de CEP
 */
export default function AddressFormStep({ form, isLoadingData }: StepProps) {
  const { searchCep, isLoading: isSearchingCep, data: cepData, error: cepError } = useCep()

  // Buscar endereço automaticamente quando CEP for preenchido
  const handleCepChange = useCallback(async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '')
    
    // Só buscar se CEP estiver completo (8 dígitos)
    if (cleanCep.length === 8) {
      const result = await searchCep(cep)
      
      if (result) {
        // Preencher campos automaticamente
        form.setValue('address.street', result.logradouro || '')
        form.setValue('address.district', result.bairro || '')
        form.setValue('address.city', result.localidade || '')
        form.setValue('address.state', result.uf || '')
        
        // Focar no campo número para continuar preenchimento
        setTimeout(() => {
          const numberField = document.getElementById('address-number')
          numberField?.focus()
        }, 100)
      }
    }
  }, [searchCep, form])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Endereço Residencial
        </h2>
        <p className="text-gray-600">
          Preencha o CEP para buscarmos o endereço automaticamente
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-6">
        {/* CEP */}
        <Controller
          name="address.cep"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.cep(field.value) : null
            
            return (
              <FormField
                label="CEP"
                error={fieldState.error?.message || cepError}
                required
                id="address-cep"
              >
                <div className="relative">
                  <Input
                    {...field}
                    id="address-cep"
                    placeholder="00000-000"
                    error={!!fieldState.error || !!cepError}
                    icon={<Navigation className="w-4 h-4" />}
                    maxLength={9}
                    onChange={(e) => {
                      const formattedCep = formatCEP(e.target.value)
                      field.onChange(formattedCep)
                      handleCepChange(formattedCep)
                    }}
                  />
                  
                  {/* Loading indicator */}
                  {isSearchingCep && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                </div>
                
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error && !cepError}
                  isInvalid={!!fieldState.error || !!cepError || (validation && !validation.valid)}
                  message={fieldState.error?.message || cepError || validation?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* Logradouro */}
        <Controller
          name="address.street"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.address(field.value) : null
            
            return (
              <FormField
                label="Logradouro"
                error={fieldState.error?.message}
                required
                id="address-street"
                hint={cepData ? "Preenchido automaticamente pelo CEP" : undefined}
              >
                <Input
                  {...field}
                  id="address-street"
                  placeholder="Rua, Avenida, etc."
                  error={!!fieldState.error}
                  icon={<Home className="w-4 h-4" />}
                  readOnly={!!cepData && !!field.value}
                />
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || (validation && !validation.valid)}
                  message={fieldState.error?.message || validation?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* Número e Complemento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Número */}
          <Controller
            name="address.number"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormField
                label="Número"
                error={fieldState.error?.message}
                required
                id="address-number"
              >
                <Input
                  {...field}
                  id="address-number"
                  placeholder="123"
                  error={!!fieldState.error}
                  icon={<Hash className="w-4 h-4" />}
                />
                <ValidationFeedback
                  isValid={!!field.value && !fieldState.error}
                  isInvalid={!!fieldState.error}
                  message={fieldState.error?.message}
                  showSuccess={true}
                />
              </FormField>
            )}
          />

          {/* Complemento */}
          <Controller
            name="address.complement"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormField
                label="Complemento"
                error={fieldState.error?.message}
                id="address-complement"
                hint="Opcional"
              >
                <Input
                  {...field}
                  id="address-complement"
                  placeholder="Apto 101, Bloco A, etc."
                  error={!!fieldState.error}
                  icon={<Building className="w-4 h-4" />}
                />
              </FormField>
            )}
          />
        </div>

        {/* Bairro */}
        <Controller
          name="address.district"
          control={form.control}
          render={({ field, fieldState }) => {
            const validation = field.value ? validators.address(field.value) : null
            
            return (
              <FormField
                label="Bairro"
                error={fieldState.error?.message}
                required
                id="address-district"
                hint={cepData ? "Preenchido automaticamente pelo CEP" : undefined}
              >
                <Input
                  {...field}
                  id="address-district"
                  placeholder="Nome do bairro"
                  error={!!fieldState.error}
                  icon={<MapPin className="w-4 h-4" />}
                  readOnly={!!cepData && !!field.value}
                />
                <ValidationFeedback
                  isValid={validation?.valid && !fieldState.error}
                  isInvalid={!!fieldState.error || (validation && !validation.valid)}
                  message={fieldState.error?.message || validation?.message}
                  showSuccess={true}
                />
              </FormField>
            )
          }}
        />

        {/* Cidade e Estado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cidade */}
          <Controller
            name="address.city"
            control={form.control}
            render={({ field, fieldState }) => {
              const validation = field.value ? validators.address(field.value) : null
              
              return (
                <FormField
                  label="Cidade"
                  error={fieldState.error?.message}
                  required
                  id="address-city"
                  hint={cepData ? "Preenchido automaticamente pelo CEP" : undefined}
                >
                  <Input
                    {...field}
                    id="address-city"
                    placeholder="Nome da cidade"
                    error={!!fieldState.error}
                    icon={<Building className="w-4 h-4" />}
                    readOnly={!!cepData && !!field.value}
                  />
                  <ValidationFeedback
                    isValid={validation?.valid && !fieldState.error}
                    isInvalid={!!fieldState.error || (validation && !validation.valid)}
                    message={fieldState.error?.message || validation?.message}
                    showSuccess={true}
                  />
                </FormField>
              )
            }}
          />

          {/* Estado */}
          <Controller
            name="address.state"
            control={form.control}
            render={({ field, fieldState }) => (
              <FormField
                label="Estado"
                error={fieldState.error?.message}
                required
                id="address-state"
                hint={cepData ? "Preenchido automaticamente pelo CEP" : undefined}
              >
                <Select
                  {...field}
                  id="address-state"
                  placeholder="Selecione o estado"
                  error={!!fieldState.error}
                  options={BRAZILIAN_STATES}
                  disabled={!!cepData && !!field.value}
                />
                <ValidationFeedback
                  isValid={!!field.value && !fieldState.error}
                  isInvalid={!!fieldState.error}
                  message={fieldState.error?.message}
                  showSuccess={true}
                />
              </FormField>
            )}
          />
        </div>
      </div>

      {/* CEP Success Message */}
      {cepData && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <MapPin className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">
                Endereço encontrado!
              </h4>
              <p className="text-sm text-green-700">
                {cepData.logradouro}, {cepData.bairro} - {cepData.localidade}/{cepData.uf}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Verifique se as informações estão corretas e preencha o número do endereço.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading state overlay */}
      {isLoadingData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-gray-700">Carregando dados...</span>
          </div>
        </div>
      )}
    </div>
  )
}