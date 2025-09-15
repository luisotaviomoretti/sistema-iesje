import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { User, School, FileCheck, AlertCircle } from 'lucide-react'
import { formatCPF } from '../../utils/formValidators'

interface StickyStudentHeaderProps {
  name?: string
  cpf?: string
  escola?: string
  status?: 'previous_year_students' | 'enrollments' | null
  className?: string
  scrollThreshold?: number
}

export default function StickyStudentHeader({
  name,
  cpf,
  escola,
  status,
  className,
  scrollThreshold = 200
}: StickyStudentHeaderProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY
      setIsVisible(scrollY > scrollThreshold)
      setIsCompact(scrollY > scrollThreshold + 100)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial position

    return () => window.removeEventListener('scroll', handleScroll)
  }, [scrollThreshold])

  if (!name && !cpf) return null

  const getStatusBadge = () => {
    if (status === 'previous_year_students') {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <FileCheck className="h-3 w-3 mr-1" />
          Ano Anterior
        </Badge>
      )
    }
    if (status === 'enrollments') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <FileCheck className="h-3 w-3 mr-1" />
          Matrícula Ativa
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        <AlertCircle className="h-3 w-3 mr-1" />
        Não Encontrado
      </Badge>
    )
  }

  const getEscolaBadge = () => {
    if (!escola) return null
    
    const escolaDisplay = escola === 'pelicano' ? 'Pelicano' : 
                         escola === 'sete_setembro' ? '7 de Setembro' : 
                         escola

    return (
      <Badge variant="secondary" className="bg-gray-100">
        <School className="h-3 w-3 mr-1" />
        {escolaDisplay}
      </Badge>
    )
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b shadow-sm",
        "transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0",
        className
      )}
    >
      <div className="container mx-auto px-4">
        <div className={cn(
          "flex items-center justify-between transition-all duration-300",
          isCompact ? "py-2" : "py-3"
        )}>
          {/* Left side - Student info */}
          <div className="flex items-center gap-4 min-w-0">
            <div className={cn(
              "flex items-center justify-center rounded-full bg-primary/10 transition-all duration-300",
              isCompact ? "h-8 w-8" : "h-10 w-10"
            )}>
              <User className={cn(
                "text-primary transition-all duration-300",
                isCompact ? "h-4 w-4" : "h-5 w-5"
              )} />
            </div>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className={cn(
                  "font-semibold text-gray-900 truncate transition-all duration-300",
                  isCompact ? "text-sm" : "text-base"
                )}>
                  {name || 'Aluno'}
                </h3>
                {cpf && (
                  <span className={cn(
                    "text-gray-500 transition-all duration-300",
                    isCompact ? "text-xs" : "text-sm"
                  )}>
                    {formatCPF(cpf)}
                  </span>
                )}
              </div>
              
              {!isCompact && (
                <div className="flex items-center gap-2 mt-1">
                  {getEscolaBadge()}
                  {getStatusBadge()}
                </div>
              )}
            </div>
          </div>

          {/* Right side - Badges (always visible) */}
          {isCompact && (
            <div className="flex items-center gap-2">
              {getEscolaBadge()}
              {getStatusBadge()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}