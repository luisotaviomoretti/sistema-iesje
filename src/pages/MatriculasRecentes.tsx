import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Download, Trash2, ArrowLeft, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useMyRecentEnrollments } from "@/features/matricula-nova/hooks/useMyRecentEnrollments";
import { EnrollmentApiService } from "@/features/matricula-nova/services/api/enrollment";
import type { EnrollmentRecord } from "@/types/database";
import { useCurrentUser } from "@/features/enrollment/hooks/useCurrentUser";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

const BRL = (v: number) => (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const MatriculasRecentes: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const currentUser = useCurrentUser();

  const { data: enrollments, isLoading, error, refetch, isFetching } = useMyRecentEnrollments(50);
  
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    // Filtra por termo (se houver)
    const list = (enrollments || []).filter(e => {
      if (!term) return true
      return (
        e.student_name?.toLowerCase().includes(term) ||
        e.student_cpf?.includes(term)
      )
    })
    // Ordena do mais recente para o mais antigo
    return list.sort((a, b) => {
      const aTime = new Date(a.created_at).getTime() || 0
      const bTime = new Date(b.created_at).getTime() || 0
      return bTime - aTime
    })
  }, [enrollments, search])

  // SEO
  useEffect(() => {
    const mainKeyword = "Minhas Matrículas IESJE";
    document.title = `${mainKeyword} - Histórico Pessoal`;
    const metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
    metaDesc.setAttribute("name", "description");
    metaDesc.setAttribute("content", "Histórico das suas matrículas realizadas com opção de baixar o PDF da proposta.");
    document.head.appendChild(metaDesc);
    const canonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    canonical.setAttribute("href", window.location.href);
    document.head.appendChild(canonical);
  }, [location.pathname]);

  // Auto-refresh quando voltar de nova matrícula
  useEffect(() => {
    // Se veio da página de nova matrícula, fazer refresh
    if (location.state?.from === 'nova-matricula') {
      queryClient.invalidateQueries({ 
        queryKey: ['my-recent-enrollments'] 
      })
      refetch()
    }
  }, [location.state, queryClient, refetch]);

  const onSoftDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta matrícula?")) return
    try {
      await EnrollmentApiService.softDeleteEnrollment(id)
      toast.success("Matrícula excluída com sucesso")
      
      // Invalidar cache e refetch para garantir sincronização
      await queryClient.invalidateQueries({ 
        queryKey: ['my-recent-enrollments', currentUser.id] 
      })
      refetch()
    } catch (err) {
      toast.error("Erro ao excluir matrícula")
      console.error(err)
    }
  }

  const onDownload = (e: EnrollmentRecord) => {
    if (!e.pdf_url) {
      toast.warning("PDF não disponível para esta matrícula")
      return
    }
    const link = document.createElement('a')
    link.href = e.pdf_url
    link.download = `proposta-${(e.student_name || 'aluno').replace(/\s+/g, '-')}.pdf`
    link.click()
  }

  // Estado: Usuário sem sessão
  if (!currentUser?.id) {
    return (
      <main className="container py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <h2 className="text-2xl font-semibold">Acesso Necessário</h2>
          <p className="text-muted-foreground max-w-md">
            Entre em sua conta para visualizar suas matrículas recentes.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Início
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="container py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Minhas Matrículas</h1>
          <p className="text-sm text-muted-foreground">Histórico das matrículas que você realizou.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
            </Link>
          </Button>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>Matrículas mais recentes</CardTitle>
            <div className="w-full max-w-xs">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por aluno ou CPF"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Carregando suas matrículas...</div>
          ) : error ? (
            <div className="space-y-4">
              {/* Erro de permissão (401/403) */}
              {(error as any)?.status === 401 || (error as any)?.status === 403 ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Acesso Negado</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Você não tem permissão para visualizar estas matrículas.
                  </p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Tentar Novamente
                  </Button>
                </div>
              ) : (
                /* Erro genérico */
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-red-600 mb-2">Erro ao Carregar</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ocorreu um erro ao carregar suas matrículas. Tente novamente.
                  </p>
                  <Button variant="outline" onClick={() => refetch()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Recarregar
                  </Button>
                </div>
              )}
            </div>
          ) : filtered.length === 0 ? (
            /* Lista vazia - diferencia se tem enrollments mas busca não encontrou */
            <div className="text-center py-8">
              {enrollments && enrollments.length > 0 ? (
                /* Tem matrículas mas busca não encontrou */
                <div>
                  <h3 className="text-lg font-semibold mb-2">Nenhum Resultado</h3>
                  <p className="text-sm text-muted-foreground">
                    Nenhuma matrícula encontrada para "{search}".
                  </p>
                </div>
              ) : (
                /* Não tem matrículas ainda */
                <div>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma Matrícula Realizada</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Você ainda não realizou nenhuma matrícula no sistema.
                  </p>
                  <Button asChild>
                    <Link to="/nova-matricula">
                      Realizar Nova Matrícula
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Escola</TableHead>
                    <TableHead>Série</TableHead>
                    <TableHead className="text-right">Base</TableHead>
                    <TableHead className="text-right">% Desc.</TableHead>
                    <TableHead className="text-right">Valor Final</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                      <TableCell>{e.student_name}</TableCell>
                      <TableCell className="capitalize">{e.student_escola}</TableCell>
                      <TableCell>{e.series_name}</TableCell>
                      <TableCell className="text-right">{BRL(Number(e.base_value))}</TableCell>
                      <TableCell className="text-right">{Number(e.total_discount_percentage || 0)}%</TableCell>
                      <TableCell className="text-right">{BRL(Number(e.final_monthly_value))}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="secondary" onClick={() => onDownload(e)} disabled={!e.pdf_url} aria-label={`Baixar PDF de ${e.student_name}`}>
                          <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onSoftDelete(e.id)} aria-label={`Excluir matrícula de ${e.student_name}`}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
