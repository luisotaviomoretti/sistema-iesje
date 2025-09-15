/**
 * Seção de dados somente leitura do aluno
 * Exibe informações do ano anterior que não podem ser alteradas
 */

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { User, Calendar, School, Hash, MapPin } from 'lucide-react'
import type { PreviousYearStudent } from '../../types/rematricula'
import { formatCPF } from '../../utils/formValidators'

interface StudentReadOnlySectionProps {
  studentData: PreviousYearStudent
  className?: string
}

export function StudentReadOnlySection({ 
  studentData, 
  className = '' 
}: StudentReadOnlySectionProps) {
  
  // Formatar data de nascimento
  const formatBirthDate = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('pt-BR')
  }
  
  // Calcular idade
  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate)
    const today = new Date()
    const age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    return monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) 
      ? age - 1 
      : age
  }
  
  // Formatar gênero
  const formatGender = (gender: string) => {
    return gender === 'M' ? 'Masculino' : 'Feminino'
  }
  
  // Formatar escola
  const formatSchool = (school: string) => {
    return school === 'pelicano' ? 'Pelicano' : 'Sete de Setembro'
  }
  
  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Dados do Aluno
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            Ano Anterior: {new Date().getFullYear() - 1}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Informações Principais */}
        <div className="space-y-3">
          {/* Nome */}
          <div className="flex items-start gap-3">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Nome Completo</p>
              <p className="font-medium text-lg">{studentData.student.name}</p>
            </div>
          </div>
          
          {/* CPF e RG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">CPF</p>
                <p className="font-medium">{formatCPF(studentData.student.cpf)}</p>
              </div>
            </div>
            
            {studentData.student.rg && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">RG</p>
                  <p className="font-medium">{studentData.student.rg}</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Data de Nascimento e Idade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium">
                  {formatBirthDate(studentData.student.birth_date)}
                  <span className="text-muted-foreground ml-2">
                    ({calculateAge(studentData.student.birth_date)} anos)
                  </span>
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Gênero</p>
                <p className="font-medium">{formatGender(studentData.student.gender)}</p>
              </div>
            </div>
          </div>
          
          {/* Escola */}
          <div className="flex items-start gap-3">
            <School className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Escola</p>
              <p className="font-medium">{formatSchool(studentData.student.escola)}</p>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Informações Acadêmicas do Ano Anterior */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Dados Acadêmicos do Ano Anterior</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Série */}
            <div className="flex items-start gap-3">
              <School className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Série</p>
                <p className="font-medium">{studentData.academic.series_name}</p>
              </div>
            </div>
            
            {/* Trilho */}
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Trilho</p>
                <p className="font-medium">{studentData.academic.track_name}</p>
              </div>
            </div>
            
            {/* Turno */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Turno</p>
                <p className="font-medium">
                  {studentData.academic.shift === 'morning' ? 'Manhã' : 
                   studentData.academic.shift === 'afternoon' ? 'Tarde' : 'Noite'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Nota informativa */}
        <div className="rounded-lg bg-muted/50 p-3">
          <p className="text-xs text-muted-foreground">
            ℹ️ Estes dados são importados do ano anterior e não podem ser alterados. 
            Para correções, entre em contato com a secretaria.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}