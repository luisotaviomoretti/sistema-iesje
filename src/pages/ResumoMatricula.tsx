import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { DiscountSummary } from "@/features/enrollment/components/DiscountSummary";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
import type { Desconto } from "@/features/enrollment/types";
import { Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ResumoMatricula: React.FC = () => {
  const { flow, selectedStudent, matricula, descontos, enderecoAluno } = useEnrollment();
  const { toast } = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  // SEO basics
  useEffect(() => {
    const mainKeyword = flow === "rematricula" ? "Resumo Rematrícula IESJE" : "Resumo Nova Matrícula IESJE";
    document.title = `${mainKeyword} - Confirmação Final`;
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Resumo final com dados do aluno, acadêmicos e descontos antes do registro da matrícula no IESJE.");
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, [flow, location.pathname]);

  const baseMensal = Number(matricula?.valor_mensalidade_base || 0);
  const descontosList = useMemo(() => (descontos as Desconto[]) || [], [descontos]);
  const hasComExtra = descontosList.some((d) => d.codigo_desconto === "COM_EXTRA");

  const disabled = !selectedStudent || !matricula?.serie_ano || !matricula?.turno || baseMensal <= 0;

  const onDownload = () => {
    generateProposalPdf({
      flow: flow === "rematricula" ? "rematricula" : "nova",
      student: selectedStudent as any,
      matricula: matricula as any,
      descontos: descontosList as any,
      baseMensal,
    });
  };

  const onRegister = () => {
    toast({
      title: "Matrícula registrada",
      description: "Dados salvos localmente. Conecte ao Supabase para persistir no banco.",
    });
    // Voltar para início após confirmação
    navigate("/");
  };

  return (
    <main className="container py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{flow === "rematricula" ? "Resumo da Rematrícula" : "Resumo da Nova Matrícula"}</h1>
          <p className="text-sm text-muted-foreground">Confira os dados antes de registrar no sistema.</p>
        </div>
        <Badge variant="secondary">CONFIRMAÇÃO FINAL</Badge>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aluno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Nome: </span>{selectedStudent?.nome_completo || "—"}</div>
            <div><span className="text-muted-foreground">CPF: </span>{selectedStudent?.cpf || "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acadêmicos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">Série/Ano: </span>{matricula?.serie_ano || "—"}</div>
            <div><span className="text-muted-foreground">Turno: </span>{matricula?.turno || "—"}</div>
            <div><span className="text-muted-foreground">Mensalidade base: </span>{baseMensal > 0 ? `R$ ${baseMensal.toFixed(2)}` : "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div><span className="text-muted-foreground">CEP: </span>{enderecoAluno?.cep || "—"}</div>
            <div><span className="text-muted-foreground">Logradouro: </span>{enderecoAluno?.logradouro || "—"}{enderecoAluno?.numero ? `, ${enderecoAluno.numero}` : ""}</div>
            <div><span className="text-muted-foreground">Bairro: </span>{enderecoAluno?.bairro || "—"}</div>
            <div><span className="text-muted-foreground">Cidade/UF: </span>{enderecoAluno ? `${enderecoAluno.cidade} - ${enderecoAluno.uf}` : "—"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Financeiro e Descontos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <DiscountSummary baseMensal={baseMensal} descontos={descontosList} />
            {hasComExtra && (
              <p className="text-xs text-muted-foreground">
                Nota: Há um desconto comercial extra (negociação). A Diretoria Administrativa avaliará de forma mais contundente este desconto.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onDownload} disabled={disabled}>
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
          <Button type="button" onClick={onRegister} disabled={disabled}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Registrar Matrícula
          </Button>
        </div>
      </section>
    </main>
  );
};

export default ResumoMatricula;
