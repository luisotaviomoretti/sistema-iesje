import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const DRAFT_KEY = "nova-matricula";

type Draft = {
  step?: number;
  selectedStudent?: { nome_completo?: string } | null;
  matricula?: { serie_ano?: string; turno?: string; valor_mensalidade_base?: number } | null;
};

const AdminDashboard = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setDrafts([JSON.parse(raw)]);
    } catch {}
  }, []);

  const metrics = useMemo(() => ({ total: drafts.length, pendentes: drafts.length }), [drafts]);

  useEffect(() => {
    document.title = "Admin IESJE - Matrículas";
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Dashboard básico de matrículas pendentes IESJE");
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, []);

  return (
    <main className="container py-8 space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold">Admin - Matrículas</h1>
        <p className="text-sm text-muted-foreground">Visão simplificada com dados locais.</p>
      </header>

      <section className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Total de matrículas</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{metrics.total}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pendências</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{metrics.pendentes}</CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader><CardTitle>Matrículas pendentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {drafts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum rascunho encontrado.</p>}
            {drafts.map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border p-3">
                <div className="text-sm">
                  <div className="font-medium">{d.selectedStudent?.nome_completo || "Aluno"}</div>
                  <div className="text-muted-foreground">{d.matricula?.serie_ano || "—"} • {d.matricula?.turno || "—"}</div>
                </div>
                <Button size="sm" variant="secondary" onClick={() => (window.location.href = "/nova-matricula")}>Abrir</Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default AdminDashboard;
