import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockStudents } from "@/data/mock";
import { cpfIsValid } from "@/features/enrollment/utils/validation";
// Removed invalid context import; using direct navigation instead

const Rematricula = () => {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  // const { setFlow, setSelectedStudent } = useEnrollment();

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return mockStudents.filter((s) =>
      s.nome_completo.toLowerCase().includes(term) || s.cpf.includes(term.replace(/\D/g, ""))
    );
  }, [q]);

  return (
    <main className="container py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Rematrícula IESJE</h1>
        <p className="text-muted-foreground">Busque por CPF ou nome para iniciar a rematrícula.</p>
      </header>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Input
            placeholder="Digite CPF (apenas números) ou nome do aluno"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="secondary" onClick={() => setQ("")}>Limpar</Button>
        </div>
        {q && !cpfIsValid(q) && q.replace(/\D/g, "").length > 0 && (
          <p className="text-sm text-muted-foreground">Dica: verifique se o CPF possui 11 dígitos.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {results.map((s) => (
            <Card key={s.id} className="hover:shadow-elevated transition-smooth">
              <CardHeader>
                <CardTitle className="text-lg">{s.nome_completo}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CPF: {s.cpf}</span>
                <Button
                  variant="hero"
                  onClick={() => {
                    navigate('/rematricula', { state: { cpf: s.cpf } });
                  }}
                >
                  Iniciar
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-2">Wizard de Rematrícula</h2>
        <p className="text-muted-foreground">Selecione um aluno para avançar pelas etapas.</p>
      </section>
    </main>
  );
};

export default Rematricula;
