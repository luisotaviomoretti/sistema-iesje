import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStudentSearch } from "@/features/enrollment/hooks/useStudentSearch";
import { cpfIsValid } from "@/features/enrollment/utils/validation";
import { useEnrollment } from "@/features/enrollment/context/EnrollmentContext";
import { useNavigate } from "react-router-dom";
import type { Student } from "@/features/enrollment/types";
import { useToast } from "@/hooks/use-toast";

const formatCpf = (value: string) => {
  const v = value.replace(/\D/g, "").slice(0, 11);
  const parts = [] as string[];
  if (v.length > 0) parts.push(v.substring(0, 3));
  if (v.length >= 4) parts.push(v.substring(3, 6));
  if (v.length >= 7) parts.push(v.substring(6, 9));
  const end = v.length >= 10 ? `-${v.substring(9, 11)}` : v.length > 9 ? `-${v.substring(9)}` : "";
  return parts.length ? parts.join(".") + end : v;
};

const unmask = (v: string) => v.replace(/\D/g, "");

const IdentificacaoAluno = () => {
  const { data, loading, error, search, searchDebounced } = useStudentSearch();
  const { setFlow, setSelectedStudent } = useEnrollment();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (error) {
      toast({ title: "Erro na busca", description: error });
    }
  }, [error, toast]);

  const onChange = (v: string) => {
    const masked = /\d/.test(v) ? formatCpf(v) : v;
    setQuery(masked);
    const plain = v.trim();
    if (plain.length >= 3) {
      searchDebounced(masked);
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const onBuscar = async () => {
    setTouched(true);
    await search(query);
    setOpen(true);
  };

  const selecionarAluno = (aluno: Student) => {
    setSelectedStudent(aluno);
    setFlow("rematricula");
    navigate(`/rematricula/${aluno.id}`);
  };

  const notFound = useMemo(() => !loading && query.trim().length >= 3 && data.length === 0, [loading, query, data]);

  const cpfInvalid = useMemo(() => {
    const digits = unmask(query);
    return touched && digits.length > 0 && !cpfIsValid(digits);
  }, [touched, query]);

  return (
    <main className="container py-12">
      <header className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Identificação do Aluno</h1>
        <p className="text-muted-foreground">Digite CPF ou nome completo para localizar o aluno.</p>
      </header>

      <section className="max-w-2xl mx-auto">
        <Card className="p-0">
          <CardHeader>
            <CardTitle className="text-lg">Busca de Aluno</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input
                aria-label="Buscar por CPF ou nome do aluno"
                placeholder="Digite o CPF ou nome completo do aluno"
                value={query}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => setTouched(true)}
                onFocus={() => query.trim().length >= 3 && setOpen(true)}
              />

              {open && (data.length > 0 || loading || notFound) && (
                <div
                  ref={listRef}
                  role="listbox"
                  className="absolute z-50 mt-2 w-full rounded-md border bg-popover shadow-elevated"
                >
                  {loading && (
                    <div className="px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ring border-t-transparent" />
                      Buscando...
                    </div>
                  )}
                  {!loading && data.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      role="option"
                      className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-smooth"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selecionarAluno(s)}
                    >
                      <div className="font-medium">{s.nome_completo}</div>
                      <div className="text-xs text-muted-foreground">CPF: {s.cpf}</div>
                    </button>
                  ))}
                  {!loading && notFound && (
                    <div className="px-4 py-3 text-sm text-muted-foreground">Nenhum aluno encontrado.</div>
                  )}
                </div>
              )}
            </div>

            {cpfInvalid && (
              <p className="mt-2 text-sm text-destructive">CPF inválido. Verifique os 11 dígitos.</p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => { setQuery(""); setTouched(false); setOpen(false); }}>Limpar</Button>
              <Button variant="default" onClick={onBuscar} disabled={query.trim().length < 3}>
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-ring border-t-transparent" />
                    Buscando
                  </span>
                ) : (
                  "Buscar"
                )}
              </Button>
              <Button variant="hero" onClick={() => { setFlow("nova"); navigate("/nova-matricula"); }}>
                Novo Cadastro Manual
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
};

export default IdentificacaoAluno;
