import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

const Index = () => {
  const location = useLocation() as any
  const successState = location?.state?.enrollmentSuccess
  const [showSuccess, setShowSuccess] = useState(!!successState)

  useEffect(() => {
    if (successState) setShowSuccess(true)
    const timer = setTimeout(() => setShowSuccess(false), 6000)
    return () => clearTimeout(timer)
  }, [successState])

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <article className="w-full container py-16 text-center space-y-8">
        {showSuccess && (
          <div className="max-w-2xl mx-auto">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle>Matrícula enviada com sucesso!</AlertTitle>
              <AlertDescription>
                {successState?.studentName ? `Aluno: ${successState.studentName}. ` : ''}
                Você pode iniciar outra matrícula ou voltar mais tarde.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <header className="space-y-4">
          <img
            src="/lovable-uploads/814e5eba-7015-4421-bfe7-7094b96ef294.png"
            alt="Logo Instituto São João da Escócia (IESJE)"
            className="mx-auto h-20 w-20 sm:h-24 sm:w-24 object-contain"
            loading="lazy"
            width={96}
            height={96}
          />
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Sistema de Matrículas e Descontos IESJE</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Rematrícula e novas matrículas com gestão inteligente de descontos, validação documental e trilhas de aprovação.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="hero">
            <Link to="/identificacao">Identificar Aluno</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/rematricula">Iniciar Rematrícula</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/nova-matricula">Nova Matrícula</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/matriculas-recentes">Últimas Matrículas</Link>
          </Button>
        </div>
      </article>
    </main>
  );
};

export default Index;
