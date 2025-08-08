import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <article className="w-full container py-16 text-center space-y-8">
        <header className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Sistema de Matrículas e Descontos IESJE</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Rematrícula e novas matrículas com gestão inteligente de descontos, validação documental e trilhas de aprovação.
          </p>
        </header>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button asChild variant="hero">
            <Link to="/rematricula">Iniciar Rematrícula</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/nova-matricula">Nova Matrícula</Link>
          </Button>
        </div>

        <section className="grid md:grid-cols-3 gap-6 pt-6">
          <div className="rounded-xl border p-6 hero-surface">
            <h2 className="font-semibold mb-2">Descontos Oficiais</h2>
            <p className="text-sm text-muted-foreground">Códigos IIR, RES, PASS, PBS, COL, SAE, LEC, FBM, MAC, NEC, ABI, ABP, PAV com rastreabilidade.</p>
          </div>
          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-2">Validação de Documentos</h2>
            <p className="text-sm text-muted-foreground">Checklist dinâmico por tipo de desconto e níveis de aprovação.</p>
          </div>
          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-2">Limite de Desconto</h2>
            <p className="text-sm text-muted-foreground">Até 60% cumulativo (exceto bolsas integrais) com cálculo automático.</p>
          </div>
        </section>
      </article>
    </main>
  );
};

export default Index;
