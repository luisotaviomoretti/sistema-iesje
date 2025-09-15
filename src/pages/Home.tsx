import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import RematriculaValidation from '@/features/rematricula-v2/pages/RematriculaValidation'
import { getRematriculaHomeConfig, RematriculaHomeConfig } from '@/lib/config/config.service'

function ActionsGrid({ cfg }: { cfg: RematriculaHomeConfig }) {
  const advancedEnabled = !!cfg.advancedSearchEnabled

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Portal de Matrículas</h1>
        <p className="text-muted-foreground text-sm">Escolha uma ação para continuar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Realizar Rematrícula */}
        <Card>
          <CardHeader>
            <CardTitle>Realizar Rematrícula</CardTitle>
            <CardDescription>Iniciar rematrícula por nome do aluno ou responsável.</CardDescription>
          </CardHeader>
          <CardContent>
            {advancedEnabled ? (
              <Button asChild className="w-full">
                <Link to="/rematricula/busca">Abrir busca avançada</Link>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="w-full" disabled>Aguardando ativação</Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ative "Busca Avançada" em Admin &gt; Configurações para liberar.</p>
                </TooltipContent>
              </Tooltip>
            )}
          </CardContent>
        </Card>

        {/* Nova Matrícula */}
        <Card>
          <CardHeader>
            <CardTitle>Nova Matrícula</CardTitle>
            <CardDescription>Iniciar matrícula para novo aluno.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/nova-matricula">Abrir Nova Matrícula</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Matrículas Recentes */}
        <Card>
          <CardHeader>
            <CardTitle>Matrículas Recentes</CardTitle>
            <CardDescription>Consultar matrículas realizadas recentemente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/matriculas-recentes">Ver Recentes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />
      <p className="text-xs text-muted-foreground">Dica: Estes botões só aparecem quando habilitado em Configurações (dark launch).</p>
    </div>
  )
}

export default function HomePage() {
  const [cfg, setCfg] = useState<RematriculaHomeConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const c = await getRematriculaHomeConfig()
        if (!mounted) return
        setCfg(c)
      } catch (e: any) {
        if (!mounted) return
        setError(e?.message || 'Falha ao carregar configurações')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  // Fallback ultra seguro: enquanto carrega ou se falhar, manter comportamento atual
  if (loading) return <RematriculaValidation />
  if (error || !cfg) return <RematriculaValidation />

  // Se flag global de ações estiver OFF, manter comportamento atual (sem mudanças)
  if (!cfg.actionsEnabled) return <RematriculaValidation />

  // Caso contrário, exibir os 3 botões (com Realizar Rematrícula condicionado à flag advanced)
  return <ActionsGrid cfg={cfg} />
}
