import { useCallback, useEffect, useRef, useState } from "react";
import type { Student } from "@/features/enrollment/types";
import { mockStudents } from "@/data/mock";

interface Result {
  data: Student[];
  loading: boolean;
  error?: string;
}

export function useStudentSearch() {
  const [result, setResult] = useState<Result>({ data: [], loading: false });
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    const term = q.trim();
    if (term.length < 3) {
      setResult({ data: [], loading: false });
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setResult((r) => ({ ...r, loading: true, error: undefined }));

    try {
      const isCpf = /\d{3}\.\d{3}\.\d{3}-\d{2}|\d{11}/.test(term);
      const cpfDigits = term.replace(/\D/g, "");
      const qLower = term.toLowerCase();

      // Fallback local search (substituir por Supabase quando integrado)
      const filtered = mockStudents.filter(
        (s) =>
          (isCpf && s.cpf.includes(cpfDigits)) ||
          s.nome_completo.toLowerCase().includes(qLower)
      );

      // Simula latência
      await new Promise((res) => setTimeout(res, 250));

      setResult({ data: filtered.slice(0, 10), loading: false });
    } catch (e: any) {
      setResult({ data: [], loading: false, error: e?.message || "Erro ao buscar" });
    }
  }, []);

  const debouncedSearch = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchDebounced = useCallback(
    (q: string, delay = 250) => {
      if (debouncedSearch.current) clearTimeout(debouncedSearch.current);
      debouncedSearch.current = setTimeout(() => search(q), delay);
    },
    [search]
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...result, search, searchDebounced };
}

