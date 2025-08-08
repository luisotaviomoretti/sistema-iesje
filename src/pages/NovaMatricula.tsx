import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";

const steps = ["Dados do Aluno", "Responsáveis", "Matrícula", "Descontos", "Documentos", "Revisão"] as const;

type Step = typeof steps[number];

const NovaMatricula = () => {
  const { setFlow, nextStep, prevStep, step } = useEnrollment();
  const [localStep, setLocalStep] = useState(0);

  const goNext = () => {
    setLocalStep((s) => Math.min(steps.length - 1, s + 1));
    nextStep();
  };
  const goPrev = () => {
    setLocalStep((s) => Math.max(0, s - 1));
    prevStep();
  };

  return (
    <main className="container py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Nova Matrícula IESJE</h1>
        <p className="text-muted-foreground">Preencha as etapas para concluir a matrícula.</p>
      </header>

      <nav className="flex flex-wrap gap-2">
        {steps.map((label, i) => (
          <span key={label} className={`px-3 py-1 rounded-md border ${i === localStep ? "bg-secondary" : "bg-background"}`}>
            {i + 1}. {label}
          </span>
        ))}
      </nav>

      <section className="rounded-xl border p-6 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Etapa {localStep + 1}: {steps[localStep]}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {localStep === 0 && (
              <div className="grid sm:grid-cols-2 gap-4">
                <Input placeholder="Nome completo" />
                <Input placeholder="CPF" />
                <Input placeholder="RG" />
                <Input placeholder="Data de nascimento" />
              </div>
            )}
            {localStep === 3 && (
              <p className="text-sm text-muted-foreground">Selecione tipos de desconto conforme documentação.</p>
            )}
            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => { setFlow("nova"); goPrev(); }} disabled={localStep === 0}>Voltar</Button>
              {localStep < steps.length - 1 ? (
                <Button variant="hero" onClick={goNext}>Próximo</Button>
              ) : (
                <Button variant="default">Concluir Matrícula</Button>
              )}
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">Etapa interna: {step}</p>
      </section>
    </main>
  );
};

export default NovaMatricula;
