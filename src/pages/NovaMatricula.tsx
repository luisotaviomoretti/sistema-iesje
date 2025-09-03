import { useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WizardProgress from "@/features/enrollment/wizard/WizardProgress";
import StepAluno from "@/features/enrollment/wizard/steps/StepAluno";
import StepResponsaveis from "@/features/enrollment/wizard/steps/StepResponsaveis";
import StepAcademicos from "@/features/enrollment/wizard/steps/StepAcademicos";
import StepDescontos from "@/features/enrollment/wizard/steps/StepDescontos";
import StepEndereco from "@/features/enrollment/wizard/steps/StepEndereco";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
const steps = ["Dados do Aluno", "Responsáveis", "Endereço do Aluno", "Acadêmicos", "Descontos"];

const NovaMatriculaPage = () => {
  const navigate = useNavigate();
  const { step, setFlow, nextStep, prevStep, setMatricula, matricula, selectedStudent, reset, setSelectedStudent, setEnderecoAluno, enderecoAluno } = useEnrollment();
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

  const goNext = useCallback(() => { setCurrent((s) => Math.min(steps.length - 1, s + 1)); nextStep(); }, [nextStep]);
  const goPrev = useCallback(() => { setCurrent((s) => Math.max(0, s - 1)); prevStep(); }, [prevStep]);

  const onSaveAcademics = (v: any) => setMatricula(v);

  // Valores detalhados da série selecionada
  const serieValues = useMemo(() => {
    const valorComMaterial = Number(matricula?.valor_mensalidade_base || 0);
    // Para compatibilidade com dados existentes, assumir 15% como valor típico do material
    const valorMaterial = valorComMaterial * 0.15;
    const valorSemMaterial = valorComMaterial - valorMaterial;
    
    return {
      valorComMaterial,
      valorMaterial,
      valorSemMaterial
    };
  }, [matricula?.valor_mensalidade_base]);

  const handleStartFresh = () => {
    reset();
    setSelectedStudent(null);
    setCurrent(0);
    toast({ title: "Wizard reiniciado", description: "Começando do zero." });
  };

const finish = () => {
    toast({ title: "Matrícula concluída", description: "Redirecionando para a página inicial..." });
    reset();
    setSelectedStudent(null);
    setCurrent(0);
    navigate("/");
  };
  return (
    <main className="container py-8 space-y-8">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Nova Matrícula</h1>
            <p className="text-sm text-muted-foreground">Preencha as etapas do wizard de matrícula.</p>
          </div>
          <Button variant="outline" onClick={handleStartFresh}>Reiniciar</Button>
        </div>
      </header>

      <WizardProgress steps={steps} current={current} />
      <Card>
        <CardHeader>
          <CardTitle>Etapa {current + 1}: {steps[current]}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {current === 0 && <StepAluno onNext={goNext} />}
          {current === 1 && <StepResponsaveis onPrev={goPrev} onNext={goNext} />}
          {current === 2 && <StepEndereco onPrev={goPrev} onNext={goNext} />}
          {current === 3 && <StepAcademicos onPrev={goPrev} onNext={goNext} onSave={onSaveAcademics} />}
          {current === 4 && <StepDescontos onPrev={goPrev} onFinish={() => navigate("/nova-matricula/resumo")} baseMensal={serieValues?.valor_mensal_sem_material || 0} />}
        </CardContent>
      </Card>
    </main>
  );
};

export default NovaMatriculaPage;
