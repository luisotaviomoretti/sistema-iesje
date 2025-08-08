import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WizardProgress from "@/features/enrollment/wizard/WizardProgress";
import StepAluno from "@/features/enrollment/wizard/steps/StepAluno";
import StepResponsaveis from "@/features/enrollment/wizard/steps/StepResponsaveis";
import StepAcademicos from "@/features/enrollment/wizard/steps/StepAcademicos";
import StepDescontos from "@/features/enrollment/wizard/steps/StepDescontos";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { useLocalDraft } from "@/features/enrollment/wizard/useLocalDraft";
import { useToast } from "@/hooks/use-toast";

const steps = ["Dados do Aluno", "Responsáveis", "Acadêmicos", "Descontos"];

const NovaMatriculaPage = () => {
  const { step, setFlow, nextStep, prevStep, setMatricula, matricula, selectedStudent } = useEnrollment();
  const [current, setCurrent] = useState(0);
  const { toast } = useToast();

  // SEO basics
  useEffect(() => {
    document.title = "Nova Matrícula IESJE - Wizard";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Wizard de nova matrícula IESJE com validação, autosave e descontos");
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, []);

  useEffect(() => setFlow("nova"), [setFlow]);

  const draftData = useMemo(() => ({ step: current, matricula, selectedStudent }), [current, matricula, selectedStudent]);
  useLocalDraft("nova-matricula", draftData, (loaded) => {
    if (typeof loaded.step === "number") setCurrent(loaded.step);
    if (loaded.matricula) setMatricula(loaded.matricula as any);
  });

  const goNext = useCallback(() => { setCurrent((s) => Math.min(steps.length - 1, s + 1)); nextStep(); }, [nextStep]);
  const goPrev = useCallback(() => { setCurrent((s) => Math.max(0, s - 1)); prevStep(); }, [prevStep]);

  const onSaveAcademics = (v: any) => setMatricula(v);

  const baseMensal = Number(matricula?.valor_mensalidade_base || 0);

  const finish = () => {
    toast({ title: "Matrícula concluída (rascunho)", description: "Dados salvos localmente. Conecte ao Supabase para persistir." });
  };

  return (
    <main className="container py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Nova Matrícula</h1>
        <p className="text-sm text-muted-foreground">Preencha as etapas. O progresso é salvo automaticamente.</p>
      </header>

      <WizardProgress steps={steps} current={current} />

      <Card>
        <CardHeader>
          <CardTitle>Etapa {current + 1}: {steps[current]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {current === 0 && <StepAluno onNext={goNext} />}
          {current === 1 && <StepResponsaveis onPrev={goPrev} onNext={goNext} />}
          {current === 2 && <StepAcademicos onPrev={goPrev} onNext={goNext} onSave={onSaveAcademics} />}
          {current === 3 && <StepDescontos onPrev={goPrev} onFinish={finish} baseMensal={baseMensal} />}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={goPrev} disabled={current === 0}>Voltar</Button>
            {current < steps.length - 1 ? (
              <Button onClick={goNext}>Próximo</Button>
            ) : (
              <Button onClick={finish}>Concluir</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default NovaMatriculaPage;
