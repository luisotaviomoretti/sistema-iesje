import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import type { Desconto, Matricula, Student } from "../types";

interface EnrollmentState {
  flow?: "rematricula" | "nova";
  step: number;
  selectedStudent?: Student | null;
  matricula?: Partial<Matricula>;
  descontos: Partial<Desconto>[];
}

interface EnrollmentActions {
  setFlow: (f: EnrollmentState["flow"]) => void;
  setSelectedStudent: (s: Student | null) => void;
  setMatricula: (m: Partial<Matricula>) => void;
  addDesconto: (d: Partial<Desconto>) => void;
  removeDesconto: (codigo: string) => void;
  removeDescontoById: (id: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

const EnrollmentContext = createContext<(EnrollmentState & EnrollmentActions) | undefined>(
  undefined
);

export const EnrollmentProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, setState] = useState<EnrollmentState>({ step: 0, descontos: [] });

  const setFlow = useCallback<EnrollmentActions["setFlow"]>((f) => {
    setState((s) => (s.flow === f ? s : { ...s, flow: f }));
  }, []);

  const setSelectedStudent = useCallback<EnrollmentActions["setSelectedStudent"]>((selectedStudent) => {
    setState((s) => ({ ...s, selectedStudent }));
  }, []);

  const setMatricula = useCallback<EnrollmentActions["setMatricula"]>((m) => {
    setState((s) => ({ ...s, matricula: { ...s.matricula, ...m } }));
  }, []);

  const addDesconto = useCallback<EnrollmentActions["addDesconto"]>((d) => {
    setState((s) => ({ ...s, descontos: [...s.descontos, d] }));
  }, []);

  const removeDesconto = useCallback<EnrollmentActions["removeDesconto"]>((codigo) => {
    setState((s) => ({ ...s, descontos: s.descontos.filter((x) => x.codigo_desconto !== codigo) }));
  }, []);

  const removeDescontoById = useCallback<EnrollmentActions["removeDescontoById"]>((id) => {
    setState((s) => ({ ...s, descontos: s.descontos.filter((x) => x.id !== id) }));
  }, []);

  const nextStep = useCallback<EnrollmentActions["nextStep"]>(() => {
    setState((s) => ({ ...s, step: s.step + 1 }));
  }, []);

  const prevStep = useCallback<EnrollmentActions["prevStep"]>(() => {
    setState((s) => ({ ...s, step: Math.max(0, s.step - 1) }));
  }, []);

  const reset = useCallback<EnrollmentActions["reset"]>(() => {
    setState({ step: 0, descontos: [] });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setFlow,
      setSelectedStudent,
      setMatricula,
      addDesconto,
      removeDesconto,
      removeDescontoById,
      nextStep,
      prevStep,
      reset,
    }),
    [state, setFlow, setSelectedStudent, setMatricula, addDesconto, removeDesconto, removeDescontoById, nextStep, prevStep, reset]
  );
  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
};

export const useEnrollment = () => {
  const ctx = useContext(EnrollmentContext);
  if (!ctx) throw new Error("useEnrollment deve ser usado dentro de EnrollmentProvider");
  return ctx;
};
