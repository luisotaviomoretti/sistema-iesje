/**
 * Seção de dados editáveis (responsáveis e endereço)
 * Permite edição dos dados que podem ser atualizados na rematrícula
 */

import React from 'react'
import { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, Home, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { RematriculaFormData } from '../../schemas/rematriculaSchema'
import { formatCPF, formatPhone, formatCEP, cleanCPF } from '../../utils/formValidators'

interface EditableDataSectionProps {
  form: UseFormReturn<RematriculaFormData>
  className?: string
}

export function EditableDataSection({ 
  form, 
  className = '' 
}: EditableDataSectionProps) {
  
  const { register, formState: { errors }, watch, setValue } = form
  
  // Watch para o segundo responsável
  const hasGuardian2 = watch('guardians.guardian2')
  
  // Formatadores com atualização do valor limpo
  const handleCPFChange = (field: any, value: string) => {
    const clean = cleanCPF(value)
    if (clean.length <= 11) {
      setValue(field, clean)
    }
  }
  
  const handlePhoneChange = (field: any, value: string) => {
    const clean = value.replace(/\D/g, '')
    if (clean.length <= 11) {
      const formatted = formatPhone(clean)
      setValue(field, formatted)
    }
  }
  
  const handleCEPChange = (value: string) => {
    const clean = value.replace(/\D/g, '')
    if (clean.length <= 8) {
      setValue('address.cep', clean)
    }
  }
  
  // Toggle para adicionar/remover segundo responsável
  const toggleGuardian2 = () => {
    if (hasGuardian2) {
      setValue('guardians.guardian2', undefined)
    } else {
      setValue('guardians.guardian2', {
        name: '',
        cpf: '',
        phone: '',
        email: '',
        relationship: '',
        is_financial_responsible: false
      })
    }
  }
  
  // Relacionamentos disponíveis
  const relationships = [
    'Pai', 'Mãe', 'Avô', 'Avó', 'Tio', 'Tia',
    'Padrasto', 'Madrasta', 'Responsável Legal', 'Outro'
  ]
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Seção de Responsáveis */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Responsáveis
            </CardTitle>
            {!hasGuardian2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleGuardian2}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Adicionar 2º Responsável
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="guardian1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="guardian1">
                Responsável 1 {errors.guardians?.guardian1 && '⚠️'}
              </TabsTrigger>
              <TabsTrigger value="guardian2" disabled={!hasGuardian2}>
                Responsável 2 {hasGuardian2 ? (errors.guardians?.guardian2 && '⚠️') : '(Opcional)'}
              </TabsTrigger>
            </TabsList>
            
            {/* Responsável 1 */}
            <TabsContent value="guardian1" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nome */}
                <div className="md:col-span-2">
                  <Label htmlFor="guardian1-name">
                    Nome Completo *
                  </Label>
                  <Input
                    id="guardian1-name"
                    {...register('guardians.guardian1.name')}
                    className={errors.guardians?.guardian1?.name ? 'border-red-500' : ''}
                  />
                  {errors.guardians?.guardian1?.name && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.guardians.guardian1.name.message}
                    </p>
                  )}
                </div>
                
                {/* CPF */}
                <div>
                  <Label htmlFor="guardian1-cpf">
                    CPF *
                  </Label>
                  <Input
                    id="guardian1-cpf"
                    {...register('guardians.guardian1.cpf')}
                    onChange={(e) => handleCPFChange('guardians.guardian1.cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className={errors.guardians?.guardian1?.cpf ? 'border-red-500' : ''}
                  />
                  {errors.guardians?.guardian1?.cpf && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.guardians.guardian1.cpf.message}
                    </p>
                  )}
                </div>
                
                {/* Telefone */}
                <div>
                  <Label htmlFor="guardian1-phone">
                    Telefone *
                  </Label>
                  <Input
                    id="guardian1-phone"
                    {...register('guardians.guardian1.phone')}
                    onChange={(e) => handlePhoneChange('guardians.guardian1.phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className={errors.guardians?.guardian1?.phone ? 'border-red-500' : ''}
                  />
                  {errors.guardians?.guardian1?.phone && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.guardians.guardian1.phone.message}
                    </p>
                  )}
                </div>
                
                {/* E-mail */}
                <div>
                  <Label htmlFor="guardian1-email">
                    E-mail *
                  </Label>
                  <Input
                    id="guardian1-email"
                    type="email"
                    {...register('guardians.guardian1.email')}
                    className={errors.guardians?.guardian1?.email ? 'border-red-500' : ''}
                  />
                  {errors.guardians?.guardian1?.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.guardians.guardian1.email.message}
                    </p>
                  )}
                </div>
                
                {/* Parentesco */}
                <div>
                  <Label htmlFor="guardian1-relationship">
                    Parentesco *
                  </Label>
                  <Select
                    value={watch('guardians.guardian1.relationship')}
                    onValueChange={(value) => setValue('guardians.guardian1.relationship', value)}
                  >
                    <SelectTrigger className={errors.guardians?.guardian1?.relationship ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Selecione o parentesco" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((rel) => (
                        <SelectItem key={rel} value={rel}>
                          {rel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.guardians?.guardian1?.relationship && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.guardians.guardian1.relationship.message}
                    </p>
                  )}
                </div>
                
                {/* Responsável Financeiro */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="guardian1-financial"
                      checked={watch('guardians.guardian1.is_financial_responsible')}
                      onCheckedChange={(checked) => 
                        setValue('guardians.guardian1.is_financial_responsible', checked as boolean)
                      }
                    />
                    <Label htmlFor="guardian1-financial" className="cursor-pointer">
                      Responsável Financeiro
                    </Label>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* Responsável 2 */}
            {hasGuardian2 && (
              <TabsContent value="guardian2" className="space-y-4">
                <div className="flex justify-end mb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleGuardian2}
                    className="gap-2 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover 2º Responsável
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campos similares ao guardian1 */}
                  <div className="md:col-span-2">
                    <Label htmlFor="guardian2-name">Nome Completo</Label>
                    <Input
                      id="guardian2-name"
                      {...register('guardians.guardian2.name')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="guardian2-cpf">CPF</Label>
                    <Input
                      id="guardian2-cpf"
                      {...register('guardians.guardian2.cpf')}
                      onChange={(e) => handleCPFChange('guardians.guardian2.cpf', e.target.value)}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="guardian2-phone">Telefone</Label>
                    <Input
                      id="guardian2-phone"
                      {...register('guardians.guardian2.phone')}
                      onChange={(e) => handlePhoneChange('guardians.guardian2.phone', e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="guardian2-email">E-mail</Label>
                    <Input
                      id="guardian2-email"
                      type="email"
                      {...register('guardians.guardian2.email')}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="guardian2-relationship">Parentesco</Label>
                    <Select
                      value={watch('guardians.guardian2.relationship')}
                      onValueChange={(value) => setValue('guardians.guardian2.relationship', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o parentesco" />
                      </SelectTrigger>
                      <SelectContent>
                        {relationships.map((rel) => (
                          <SelectItem key={rel} value={rel}>
                            {rel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="guardian2-financial"
                        checked={watch('guardians.guardian2.is_financial_responsible')}
                        onCheckedChange={(checked) => 
                          setValue('guardians.guardian2.is_financial_responsible', checked as boolean)
                        }
                      />
                      <Label htmlFor="guardian2-financial" className="cursor-pointer">
                        Responsável Financeiro
                      </Label>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
          
          {/* Alerta sobre responsável financeiro */}
          {errors.guardians && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Pelo menos um responsável deve ser marcado como responsável financeiro.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Seção de Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Endereço
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CEP */}
            <div>
              <Label htmlFor="cep">CEP *</Label>
              <Input
                id="cep"
                {...register('address.cep')}
                onChange={(e) => handleCEPChange(e.target.value)}
                placeholder="00000-000"
                className={errors.address?.cep ? 'border-red-500' : ''}
              />
              {errors.address?.cep && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.cep.message}
                </p>
              )}
            </div>
            
            {/* Rua */}
            <div className="md:col-span-2">
              <Label htmlFor="street">Rua *</Label>
              <Input
                id="street"
                {...register('address.street')}
                className={errors.address?.street ? 'border-red-500' : ''}
              />
              {errors.address?.street && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.street.message}
                </p>
              )}
            </div>
            
            {/* Número */}
            <div>
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                {...register('address.number')}
                className={errors.address?.number ? 'border-red-500' : ''}
              />
              {errors.address?.number && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.number.message}
                </p>
              )}
            </div>
            
            {/* Complemento */}
            <div>
              <Label htmlFor="complement">Complemento</Label>
              <Input
                id="complement"
                {...register('address.complement')}
                placeholder="Apto, Bloco, etc."
              />
            </div>
            
            {/* Bairro */}
            <div>
              <Label htmlFor="district">Bairro</Label>
              <Input
                id="district"
                {...register('address.district')}
                className={errors.address?.district ? 'border-red-500' : ''}
              />
              {errors.address?.district && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.district.message}
                </p>
              )}
            </div>
            
            {/* Cidade */}
            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                {...register('address.city')}
                className={errors.address?.city ? 'border-red-500' : ''}
              />
              {errors.address?.city && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.city.message}
                </p>
              )}
            </div>
            
            {/* Estado */}
            <div>
              <Label htmlFor="state">Estado *</Label>
              <Input
                id="state"
                {...register('address.state')}
                maxLength={2}
                placeholder="CE"
                className={errors.address?.state ? 'border-red-500' : ''}
              />
              {errors.address?.state && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.address.state.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}