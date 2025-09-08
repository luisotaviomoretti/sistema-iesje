import React, { useEffect, useMemo } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// Removed invalid context import; page will need future refactor if used
import { DiscountSummary } from "@/features/enrollment/components/DiscountSummary";
import { generateProposalPdf } from "@/features/enrollment/utils/proposal-pdf";
import type { Desconto } from "@/features/enrollment/types";
import { Download, CheckCircle2, Calculator, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockResponsaveis, mockEnderecos, mockDescontos } from "@/data/mock";
import { addRecent } from "@/features/enrollment/utils/recent-enrollments";
const ResumoMatricula: React.FC = () => {
  // ============================================================================
  // SISTEMA UNIFICADO: Dados do contexto refatorado
  // ============================================================================
  const { 
    // Dados básicos
    flow, selectedStudent, matricula, enderecoAluno, responsaveis, setEnderecoAluno,
    
    // Dados do novo sistema unificado
    selectedTrackId,
    selectedDiscountIds,
    calculatedTotals,
    trackData,
    discountsData,
    isLoading,
    calculationValid,
    
    // Dados antigos para compatibilidade
    descontos,
    trilhos
  } = useEnrollment();
  
  // DEBUG: Verificar dados do sistema unificado
  console.log('🔍 RESUMO MATRÍCULA DEBUG:', {
    selectedTrackId,
    selectedDiscountIds,
    calculatedTotals,
    trackData,
    discountsData,
    isLoading,
    calculationValid,
    legacyDescontos: descontos,
    legacyTrilhos: trilhos
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();

  const respList = useMemo(() => {
    if (flow === "rematricula") {
      const sid = (params as any)?.id || selectedStudent?.id;
      return mockResponsaveis
        .filter((r) => r.student_id === sid)
        .map((r) => ({ nome_completo: r.nome_completo, cpf: r.cpf, tipo: r.tipo }));
    }
    const list: Array<{ nome_completo: string; cpf: string; tipo: string }> = [];
    if (responsaveis?.principal?.nome_completo || responsaveis?.principal?.cpf) {
      list.push({ nome_completo: responsaveis?.principal?.nome_completo || "", cpf: responsaveis?.principal?.cpf || "", tipo: "principal" });
    }
    if (responsaveis?.secundario?.nome_completo || responsaveis?.secundario?.cpf) {
      list.push({ nome_completo: responsaveis?.secundario?.nome_completo || "", cpf: responsaveis?.secundario?.cpf || "", tipo: "secundario" });
    }
    return list;
  }, [flow, (params as any)?.id, selectedStudent?.id, responsaveis]);

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

  // Fallback de endereço em Rematrícula (se o contexto vier vazio)
  useEffect(() => {
    if (flow === "rematricula") {
      const sid = (params as any)?.id || selectedStudent?.id;
      const isEmpty = !enderecoAluno?.cep && !enderecoAluno?.logradouro && !enderecoAluno?.bairro && !enderecoAluno?.cidade && !enderecoAluno?.uf;
      if (sid && isEmpty) {
        const addr = mockEnderecos.find((e) => e.student_id === sid);
        if (addr) {
          setEnderecoAluno({
            cep: addr.cep,
            logradouro: addr.logradouro,
            numero: addr.numero || "",
            complemento: addr.complemento || "",
            bairro: addr.bairro,
            cidade: addr.cidade,
            uf: addr.uf,
          });
        }
      }
    }
  }, [flow, (params as any)?.id, selectedStudent?.id, enderecoAluno?.cep, enderecoAluno?.logradouro, enderecoAluno?.bairro, enderecoAluno?.cidade, enderecoAluno?.uf, setEnderecoAluno]);

  const baseMensal = Number(matricula?.valor_mensalidade_base || 0);
  const descontosCtx = useMemo(() => (descontos as Desconto[]) || [], [descontos]);
  const descontosFromMock = useMemo(() => {
    if (flow !== "rematricula") return [] as Desconto[];
    const sid = (params as any)?.id || selectedStudent?.id;
    if (!sid) return [] as Desconto[];
    return mockDescontos.filter((d) => d.student_id === sid);
  }, [flow, (params as any)?.id, selectedStudent?.id]);
  const descontosMerged = useMemo(() => {
    if (flow !== "rematricula") return descontosCtx;
    const map = new Map<string, Desconto>();
    descontosFromMock.forEach((d) => map.set(d.codigo_desconto, d));
    descontosCtx.forEach((d) => map.set(d.codigo_desconto, d));
    return Array.from(map.values());
  }, [flow, descontosCtx, descontosFromMock]);
  const hasComExtra = descontosMerged.some((d) => d.codigo_desconto === "COM_EXTRA");
  const disabled = !selectedStudent || !matricula?.serie_ano || !matricula?.turno || baseMensal <= 0;

  const onDownload = () => {
    generateProposalPdf({
      flow: flow === "rematricula" ? "rematricula" : "nova",
      student: selectedStudent as any,
      matricula: matricula as any,
      descontos: descontosMerged as any,
      baseMensal,
      responsaveis: respList as any,
    });
  };

  const onRegister = () => {
    // Salvar no histórico local (últimas 20)
    try {
      addRecent({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        flow: flow === "rematricula" ? "rematricula" : "nova",
        student: {
          id: selectedStudent?.id || "",
          nome_completo: selectedStudent?.nome_completo || "",
          cpf: selectedStudent?.cpf || "",
        },
        matricula: {
          serie_ano: matricula?.serie_ano,
          turno: matricula?.turno,
          valor_mensalidade_base: baseMensal,
        },
        descontos: (descontosMerged || []).map((d: any) => ({
          id: d.id || crypto.randomUUID(),
          tipo_desconto_id: d.tipo_desconto_id,
          codigo_desconto: d.codigo_desconto,
          percentual_aplicado: Number(d.percentual_aplicado ?? 0),
          observacoes: d.observacoes,
        })),
        responsaveis: respList as any,
        enderecoAluno: enderecoAluno as any,
      });
    } catch {}

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
            <CardTitle>Responsáveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {respList.length === 0 && <div className="text-muted-foreground">Nenhum responsável informado.</div>}
            {respList.map((r, idx) => (
              <div key={`${r.tipo}-${idx}`}>
                <span className="text-muted-foreground capitalize">{r.tipo}:</span> {r.nome_completo || "—"} {r.cpf ? `• CPF: ${r.cpf}` : ""}
              </div>
            ))}
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
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumo Financeiro da Matrícula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* ============================================================================ */}
            {/* INFORMAÇÕES DO TRILHO E DESCONTOS SELECIONADOS */}
            {/* ============================================================================ */}
            <div className="space-y-3">
              {/* Trilho selecionado */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trilho:</span>
                {selectedTrackId ? (
                  <Badge variant="default" className="bg-blue-600">
                    Trilho {selectedTrackId} - {trackData?.nome || 'Carregando...'}
                  </Badge>
                ) : trilhos?.trilho_escolhido ? (
                  <Badge variant="outline">
                    {trilhos.trilho_escolhido === 'especial' ? 'Trilho A - Especial' :
                     trilhos.trilho_escolhido === 'combinado' ? 'Trilho B - Combinado' :
                     'Trilho C - Normal'}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Nenhum trilho selecionado</Badge>
                )}
              </div>

              {/* Descontos selecionados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Descontos selecionados:</span>
                  <Badge variant="secondary">
                    {selectedDiscountIds?.length || descontosMerged.length || 0}
                  </Badge>
                </div>
                
                {/* SISTEMA UNIFICADO: Mostrar descontos dos hooks */}
                {discountsData && discountsData.length > 0 ? (
                  <div className="space-y-1">
                    {discountsData.map((discount) => (
                      <div key={discount.id} className="flex items-center justify-between text-xs bg-green-50 p-2 rounded border-l-2 border-green-400">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {discount.codigo}
                          </Badge>
                          <span>{discount.nome}</span>
                        </div>
                        <span className="font-medium text-green-700">
                          -{discount.percentual_efetivo}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : descontosMerged.length > 0 ? (
                  /* SISTEMA ANTIGO: Fallback */
                  <div className="space-y-1">
                    {descontosMerged.map((desconto) => (
                      <div key={desconto.id} className="flex items-center justify-between text-xs bg-orange-50 p-2 rounded border-l-2 border-orange-400">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs border-orange-300">
                            {desconto.codigo_desconto}
                          </Badge>
                          <span>Desconto {desconto.codigo_desconto}</span>
                        </div>
                        <span className="font-medium text-orange-700">
                          -{desconto.percentual_aplicado}%
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                    Nenhum desconto selecionado
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================================ */}
            {/* SISTEMA UNIFICADO: Mostrar cálculos centralizados */}
            {/* ============================================================================ */}
            {calculatedTotals && calculationValid ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="default" className="bg-green-600">
                    ✅ Cálculos Unificados
                  </Badge>
                  {isLoading && (
                    <Badge variant="outline" className="animate-pulse">
                      Atualizando...
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Subtotal descontos:</span>
                    <p className="font-medium">{calculatedTotals.subtotal_percentual}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Desconto aplicado:</span>
                    <p className="font-medium text-green-700">{calculatedTotals.percentual_aplicado}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor base:</span>
                    <p className="font-mono">R$ {calculatedTotals.valor_base.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor final:</span>
                    <p className="font-mono font-bold text-green-600">R$ {calculatedTotals.valor_final.toFixed(2)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Economia total:</span>
                    <p className="font-medium text-green-600">
                      R$ {calculatedTotals.valor_desconto.toFixed(2)} (mensal) • 
                      R$ {calculatedTotals.economia_anual.toFixed(2)} (anual)
                    </p>
                  </div>
                </div>
                
                {/* Informações do CAP aplicado */}
                {calculatedTotals.trilho_info?.cap_aplicado && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    CAP de {calculatedTotals.trilho_info.cap}% aplicado pelo trilho {calculatedTotals.trilho_info.id}
                  </div>
                )}
              </div>
            ) : (
              /* FALLBACK: Sistema antigo */
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-orange-300 text-orange-700">
                    ⚠️ Sistema Antigo
                  </Badge>
                </div>
                <DiscountSummary baseMensal={baseMensal} descontos={descontosMerged} />
              </div>
            )}
            
            {hasComExtra && (
              <p className="text-xs text-muted-foreground bg-amber-50 p-2 rounded border-l-2 border-amber-400">
                <strong>Nota:</strong> Há um desconto comercial extra (negociação). A Diretoria Administrativa avaliará de forma mais contundente este desconto.
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
