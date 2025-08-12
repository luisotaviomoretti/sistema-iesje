import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { calculateTotals } from "@/features/enrollment/utils/discounts";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
import { readRecent, clearRecent, type StoredEnrollment } from "@/features/enrollment/utils/recent-enrollments";
import { Download, Trash2, ArrowLeft } from "lucide-react";

const BRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MatriculasRecentes: React.FC = () => {
  const [items, setItems] = useState<StoredEnrollment[]>([]);
  const location = useLocation();

  useEffect(() => {
    setItems(readRecent());
  }, []);

  // SEO
  useEffect(() => {
    const mainKeyword = "Últimas Matrículas IESJE";
    document.title = `${mainKeyword} - Histórico de 20 Registros`;
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Lista das 20 últimas matrículas com opção de baixar o PDF da proposta.");
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, [location.pathname]);

  const onClear = () => {
    if (confirm("Deseja limpar o histórico local de matrículas?")) {
      clearRecent();
      setItems([]);
    }
  };

  const onDownload = (row: StoredEnrollment) => {
    const base = Number(row.matricula?.valor_mensalidade_base || 0);
    generateProposalPdf({
      flow: row.flow,
      student: row.student as any,
      matricula: row.matricula as any,
      descontos: row.descontos as any,
      baseMensal: base,
      responsaveis: row.responsaveis as any,
    });
  };

  return (
    <main className="container py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Últimas Matrículas</h1>
          <p className="text-sm text-muted-foreground">Histórico local das 20 matrículas mais recentes.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
            </Link>
          </Button>
          <Button variant="destructive" onClick={onClear} disabled={items.length === 0}>
            <Trash2 className="mr-2 h-4 w-4" /> Limpar histórico
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>20 registros mais recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Nenhuma matrícula registrada ainda. <Link to="/nova-matricula" className="underline">Inicie uma nova matrícula</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Fluxo</TableHead>
                    <TableHead>Série/Turno</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">% Desc.</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => {
                    const base = Number(it.matricula?.valor_mensalidade_base || 0);
                    const totals = calculateTotals(base, it.descontos as any);
                    const serieTurno = `${it.matricula?.serie_ano || "—"} / ${it.matricula?.turno || "—"}`;

                    return (
                      <TableRow key={it.id}>
                        <TableCell>{new Date(it.createdAt).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{it.student?.nome_completo || "—"}</TableCell>
                        <TableCell className="capitalize">{it.flow}</TableCell>
                        <TableCell>{serieTurno}</TableCell>
                        <TableCell className="text-right">{BRL(base)}</TableCell>
                        <TableCell className="text-right">{totals.cappedPercent}%</TableCell>
                        <TableCell className="text-right">{BRL(totals.finalValue)}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="secondary" onClick={() => onDownload(it)} disabled={base <= 0} aria-label={`Baixar PDF de ${it.student?.nome_completo}`}>
                            <Download className="mr-2 h-4 w-4" /> PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default MatriculasRecentes;
