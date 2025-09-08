import React from 'react'
import { User } from 'lucide-react'
import { DataSummaryCard } from './DataSummaryCard'
import type { StepProps } from '../../types/forms'

interface StudentSummarySectionProps {
  studentData: StepProps['form'] extends { watch: (key: string) => any } 
    ? ReturnType<StepProps['form']['watch']> 
    : any
  onEdit: () => void
  isEditable?: boolean
}

export function StudentSummarySection({ 
  studentData, 
  onEdit, 
  isEditable = true 
}: StudentSummarySectionProps) {
  
  // Validar completude dos dados obrigatórios
  const requiredFields = ['name', 'cpf', 'birthDate', 'gender', 'escola']
  const missingFields = requiredFields.filter(field => !studentData?.[field])
  const validationErrors = missingFields.map(field => {
    const fieldNames: Record<string, string> = {
      'name': 'Nome é obrigatório',
      'cpf': 'CPF é obrigatório', 
      'birthDate': 'Data de nascimento é obrigatória',
      'gender': 'Gênero é obrigatório',
      'escola': 'Escola deve ser selecionada'
    }
    return fieldNames[field] || `${field} é obrigatório`
  })

  const isComplete = validationErrors.length === 0

  // Formatar dados para exibição
  const formatStudentData = (data: any) => {
    if (!data) return {}
    
    return {
      name: data.name || '',
      cpf: data.cpf || '',
      rg: data.rg || 'Não informado',
      birthDate: data.birthDate || '',
      gender: formatGender(data.gender),
      escola: formatEscola(data.escola)
    }
  }

  const formatGender = (gender: string) => {
    const genderMap: Record<string, string> = {
      'M': 'Masculino',
      'F': 'Feminino',
      'other': 'Outro'
    }
    return genderMap[gender] || gender || ''
  }

  const formatEscola = (escola: string) => {
    const escolaMap: Record<string, string> = {
      'pelicano': 'Colégio Pelicano',
      'sete_setembro': 'Colégio Sete de Setembro'
    }
    return escolaMap[escola] || escola || ''
  }

  return (
    <DataSummaryCard
      title="Dados do Aluno"
      icon={<User className="w-5 h-5" />}
      data={formatStudentData(studentData)}
      onEdit={isEditable ? onEdit : undefined}
      isEditable={isEditable}
      stepNumber={1}
      isComplete={isComplete}
      validationErrors={validationErrors}
      className="w-full"
    />
  )
}

export default StudentSummarySection