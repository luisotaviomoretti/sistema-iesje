import type { Desconto, Matricula, Responsavel, Student } from "@/features/enrollment/types";

export const mockStudents: Student[] = [
  { id: "s1", nome_completo: "Ana Silva", cpf: "12345678909" },
  { id: "s2", nome_completo: "Bruno Costa", cpf: "11144477735" },
  { id: "s3", nome_completo: "Carla Mendes", cpf: "93541134780" },
  { id: "s4", nome_completo: "Diego Santos", cpf: "39053344705" },
  { id: "s5", nome_completo: "Eduarda Lima", cpf: "75216785004" },
  { id: "s6", nome_completo: "Felipe Rocha", cpf: "23456789019" },
  { id: "s7", nome_completo: "Gabriela Nunes", cpf: "98765432100" },
  { id: "s8", nome_completo: "Henrique Alves", cpf: "07068014930" },
];

export const mockResponsaveis: Responsavel[] = [
  { id: "r1", student_id: "s1", tipo: "financeiro", nome_completo: "João Silva", cpf: "34244419888" },
  { id: "r2", student_id: "s2", tipo: "financeiro", nome_completo: "Maria Costa", cpf: "96940899072" },
];

export const mockMatriculas: Matricula[] = [
  { id: "m1", student_id: "s1", ano_letivo: 2024, serie_ano: "6º ano", turno: "Manhã", status: "ATIVA", data_matricula: "2024-01-10", valor_mensalidade_base: 1200, valor_mensalidade_final: 1080 },
  { id: "m2", student_id: "s2", ano_letivo: 2023, serie_ano: "5º ano", turno: "Tarde", status: "ATIVA", data_matricula: "2023-01-15", valor_mensalidade_base: 1100, valor_mensalidade_final: 880 },
];

export const mockDescontos: Desconto[] = [
  { id: "d1", student_id: "s1", matricula_id: "m1", tipo_desconto_id: "1", codigo_desconto: "IIR", percentual_aplicado: 10, status_aprovacao: "APROVADO", documentos_urls: [], data_solicitacao: "2024-01-05" },
  { id: "d2", student_id: "s2", matricula_id: "m2", tipo_desconto_id: "13", codigo_desconto: "PAV", percentual_aplicado: 15, status_aprovacao: "APROVADO", documentos_urls: [], data_solicitacao: "2023-01-04" },
];
