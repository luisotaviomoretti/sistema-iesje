import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WizardProgress from "@/features/enrollment/wizard/WizardProgress";
import StepAluno from "@/features/enrollment/wizard/steps/StepAluno";
import StepResponsaveis from "@/features/enrollment/wizard/steps/StepResponsaveis";
import StepAcademicos from "@/features/enrollment/wizard/steps/StepAcademicos";
import StepDescontos from "@/features/enrollment/wizard/steps/StepDescontos";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { useLocalDraft, clearDraft } from "@/features/enrollment/wizard/useLocalDraft";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
const steps = ["Dados do Aluno", "Responsáveis", "Acadêmicos", "Descontos"];

const NovaMatriculaPage = () => {
  const { step, setFlow, nextStep, prevStep, setMatricula, matricula, selectedStudent, reset, setSelectedStudent } = useEnrollment();
  const [current, setCurrent] = useState(0);
  const { toast } = useToast();
  const [resumeOpen, setResumeOpen] = useState(false);
  const [resumeData, setResumeData] = useState<any>(null);

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
    if (loaded && (typeof (loaded as any).step === "number" || (loaded as any).matricula || (loaded as any).selectedStudent)) {
      setResumeData(loaded);
      setResumeOpen(true);
    }
  });

  const goNext = useCallback(() => { setCurrent((s) => Math.min(steps.length - 1, s + 1)); nextStep(); }, [nextStep]);
  const goPrev = useCallback(() => { setCurrent((s) => Math.max(0, s - 1)); prevStep(); }, [prevStep]);

  const onSaveAcademics = (v: any) => setMatricula(v);

  const baseMensal = Number(matricula?.valor_mensalidade_base || 0);

  const handleStartFresh = () => {
    clearDraft("nova-matricula");
    reset();
    setSelectedStudent(null);
    setCurrent(0);
    setResumeOpen(false);
    toast({ title: "Wizard reiniciado", description: "Rascunho limpo e começando do zero." });
  };

  const handleResume = () => {
    const stepTo = Math.min(steps.length - 1, Math.max(0, Number(resumeData?.step ?? 0)));
    if (resumeData?.selectedStudent) setSelectedStudent(resumeData.selectedStudent as any);
    if (resumeData?.matricula) setMatricula(resumeData.matricula as any);
    setCurrent(stepTo);
    setResumeOpen(false);
    toast({ title: "Rascunho retomado", description: `Voltamos para a etapa ${stepTo + 1}.` });
  };

  const finish = () => {
    toast({ title: "Matrícula concluída (rascunho)", description: "Dados salvos localmente. Conecte ao Supabase para persistir." });
  };
  return (
    <main className="container py-8 space-y-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nova Matrícula</h1>
            <p className="text-sm text-muted-foreground">Preencha as etapas. O progresso é salvo automaticamente.</p>
          </div>
          <Button variant="outline" onClick={handleStartFresh}>Reiniciar do zero</Button>
        </div>
      </header>

      <AlertDialog open={resumeOpen} onOpenChange={setResumeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retomar rascunho?</AlertDialogTitle>
            <AlertDialogDescription>
              Encontramos um rascunho salvo desta matrícula. Você deseja retomar de onde parou ou começar do zero?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleStartFresh}>Começar do zero</AlertDialogCancel>
            <AlertDialogAction onClick={handleResume}>Retomar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
