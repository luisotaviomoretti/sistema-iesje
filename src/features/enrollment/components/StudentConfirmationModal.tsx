/**
 * Modal de Confirmação de Identidade do Aluno do Ano Anterior
 * FASE 1.2: Componente isolado para confirmação antes da rematrícula
 * 
 * Exibe 3 informações essenciais para confirmação:
 * - Nome do aluno
 * - Série anterior
 * - Responsável primário
 * 
 * Estados suportados: loading, success, error
 * Totalmente isolado - não afeta funcionalidade atual
 */

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, User, GraduationCap, Users } from 'lucide-react'

// Importar tipo do hook criado na FASE 1.1
import type { StudentConfirmationData } from '../hooks/useStudentConfirmation'

interface StudentConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  data: StudentConfirmationData | null
  isLoading: boolean
  error?: string | null
  originSchool?: string | null
  destinationSchool?: string | null
}

/**
 * Modal de confirmação completamente isolado
 * Reutiliza componentes shadcn/ui já existentes no projeto
 */
export const StudentConfirmationModal: React.FC<StudentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  data,
  isLoading,
  error,
  originSchool,
  destinationSchool,
}) => {
  // Log apenas em desenvolvimento
  if (import.meta.env.DEV && isOpen) {
    console.log('[StudentConfirmationModal] Renderizado:', { data, isLoading, error })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-md"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
      >
        <DialogHeader>
          <DialogTitle id="confirmation-title">
            Confirmar Identidade do Aluno
          </DialogTitle>
          <DialogDescription id="confirmation-description">
            Verifique se as informações abaixo correspondem ao aluno desejado para prosseguir com a rematrícula.
          </DialogDescription>
        </DialogHeader>

        {/* Aviso profissional sobre escola de origem/destino */}
        {data && !isLoading && !error && originSchool && (
          <Alert className="my-2">
            <AlertDescription>
              {(() => {
                const hasDest = Boolean(destinationSchool)
                const cross = hasDest && destinationSchool !== originSchool
                if (cross) {
                  return (
                    <>
                      Este CPF pertence atualmente à escola <strong>{originSchool}</strong>. Você está logado na unidade <strong>{destinationSchool}</strong>. Ao prosseguir, a rematrícula será registrada nesta unidade (destino).
                    </>
                  )
                }
                if (hasDest) {
                  return (
                    <>
                      Identificamos vínculo na escola <strong>{originSchool}</strong>. Ao prosseguir, a rematrícula será registrada nesta mesma unidade.
                    </>
                  )
                }
                return (
                  <>
                    Identificamos vínculo na escola <strong>{originSchool}</strong>. Deseja prosseguir?
                  </>
                )
              })()}
            </AlertDescription>
          </Alert>
        )}

        {/* Estado: Carregando dados */}
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">
              Carregando dados do aluno...
            </span>
          </div>
        )}

        {/* Estado: Erro na busca */}
        {error && !isLoading && (
          <Alert variant="destructive" className="my-4">
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Erro ao carregar dados:</p>
                <p className="text-sm">{error}</p>
                <p className="text-sm text-muted-foreground">
                  Você pode prosseguir mesmo assim. Os dados serão carregados na próxima tela.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Estado: Dados carregados com sucesso */}
        {data && !isLoading && !error && (
          <div className="my-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                {/* Nome do Aluno */}
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Nome do Aluno
                    </Label>
                    <p className="font-semibold text-foreground truncate" title={data.name}>
                      {data.name}
                    </p>
                  </div>
                </div>

                {/* Série Anterior */}
                <div className="flex items-start gap-3">
                  <GraduationCap className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Série Anterior
                    </Label>
                    <p className="font-semibold text-foreground truncate" title={data.series}>
                      {data.series}
                    </p>
                  </div>
                </div>

                {/* Responsável Primário */}
                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Responsável Primário
                    </Label>
                    <p className="font-semibold text-foreground truncate" title={data.guardian}>
                      {data.guardian}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Rodapé com botões de ação */}
        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          {/* Botão Cancelar - sempre visível */}
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="w-full sm:w-auto"
            disabled={false} // Nunca desabilitado - sempre permite cancelar
          >
            Cancelar
          </Button>
          
          {/* Botão Confirmar - varia conforme estado */}
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="w-full sm:w-auto"
            variant={error ? "secondary" : "default"}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : error ? (
              'Prosseguir Mesmo Assim'
            ) : (
              'Confirmar e Continuar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}