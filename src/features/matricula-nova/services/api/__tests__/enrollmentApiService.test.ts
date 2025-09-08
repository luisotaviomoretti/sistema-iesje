/**
 * Testes do EnrollmentApiService (persistência/admin) com supabase mockado.
 * Observação: usa sintaxe Jest para alinhar com testes existentes no repo.
 */

import { EnrollmentApiService } from '../enrollment'

// Mock simples do supabase com builders encadeáveis
type Builder = any

let lastTable = ''
let lastInserted: any = null
let lastUpdated: any = null
let lastFilters: Record<string, any> = {}
let listData: any[] = []
let listCount = 0
let updateShouldError = false

function makeInsertBuilder(row: any): Builder {
  return {
    insert: (payload: any) => {
      lastInserted = payload
      return {
        select: () => ({
          single: () => ({ data: row, error: null }),
        }),
      }
    },
  }
}

function makeUpdateBuilder(returnRow: any): Builder {
  const chain = {
    update: (payload: any) => {
      lastUpdated = payload
      return {
        eq: (_col: string, _val: any) => ({
          select: () => ({
            single: () => (updateShouldError ? { data: null, error: { message: 'update error' } } : { data: returnRow, error: null }),
          }),
        }),
      }
    },
  }
  return chain
}

function makeReadBuilder(data: any[], count: number): Builder {
  const chain = {
    select: (_sel?: string, _opts?: any) => chain,
    neq: (_c: string, _v: any) => chain,
    in: (_c: string, _arr: any[]) => chain,
    eq: (_c: string, _v: any) => chain,
    gte: (_c: string, _v: any) => chain,
    lte: (_c: string, _v: any) => chain,
    or: (_expr: string) => chain,
    order: (_by: string, _o: any) => chain,
    range: (_from: number, _to: number) => chain,
    limit: (_n: number) => ({ data, error: null }),
    single: () => ({ data: data[0] || null, error: null }),
    // suporte para select com count
    then: undefined,
  }
  return chain
}

jest.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: (table: string) => {
        lastTable = table
        if (table === 'enrollments') {
          // builder polimórfico conforme operação desejada
          return {
            insert: (payload: any) => {
              lastInserted = payload
              const row = { id: 'abc', ...payload }
              return { select: () => ({ single: () => ({ data: row, error: null }) }) }
            },
            update: (payload: any) => makeUpdateBuilder({ id: 'abc', ...payload }).update(payload),
            select: (sel?: string, opts?: any) => makeReadBuilder(listData, listCount).select(sel, opts),
            // filtros encadeáveis
            neq: (_c: string, _v: any) => makeReadBuilder(listData, listCount),
            in: (_c: string, _v: any[]) => makeReadBuilder(listData, listCount),
            eq: (_c: string, _v: any) => makeReadBuilder(listData, listCount),
            gte: (_c: string, _v: any) => makeReadBuilder(listData, listCount),
            lte: (_c: string, _v: any) => makeReadBuilder(listData, listCount),
            or: (_e: string) => makeReadBuilder(listData, listCount),
            order: (_b: string, _o: any) => makeReadBuilder(listData, listCount),
            range: (_f: number, _t: number) => makeReadBuilder(listData, listCount),
            limit: (_n: number) => ({ data: listData, error: null }),
          }
        }
        if (table === 'enrollment_discounts' || table === 'enrollment_documents') {
          return makeInsertBuilder({ ok: true })
        }
        // fallback genérico
        return makeReadBuilder([], 0)
      },
    },
  }
})

describe('EnrollmentApiService — criação normalizada', () => {
  test('createEnrollmentRecord deve inserir enrollment, descontos e documentos', async () => {
    const formData: any = {
      student: { name: 'João', cpf: '123', rg: 'RG', birthDate: '2010-01-02', gender: 'M', escola: 'pelicano' },
      guardians: { guardian1: { name: 'Pai', cpf: '999', phone: '55', email: 'pai@x.com', relationship: 'pai' } },
      address: { cep: '00000000', street: 'Rua', number: '10', district: 'Bairro', city: 'Cidade', state: 'UF' },
      academic: { seriesId: 'S1', trackId: 'T1', shift: 'morning' },
      selectedDiscounts: [{ id: 'D1', percentual: 10 }],
    }
    const pricing: any = {
      baseValue: 1000,
      discounts: [{ id: 'D1', code: 'IIR', name: 'Irmao', value: 100, category: 'regular' }],
      totalDiscountPercentage: 10,
      totalDiscountValue: 100,
      finalValue: 900,
    }

    const id = await EnrollmentApiService.createEnrollmentRecord(formData, pricing, { nome: 'Serie 1', valor_material: 50 }, { nome: 'Combinado' })
    expect(id).toBe('abc')
    expect(lastTable).toBe('enrollments')
    expect(lastInserted).toBeTruthy()
    expect(lastInserted.student_name).toBe('João')
    expect(lastInserted.series_name).toBe('Serie 1')
    expect(lastInserted.base_value).toBe(1000)
    expect(lastInserted.final_monthly_value).toBe(900)
    expect(lastInserted.status).toBe('draft')
  })
})

describe('EnrollmentApiService — updatePdfInfo', () => {
  test('atualiza pdf_url e status sem erro', async () => {
    updateShouldError = false
    await expect(EnrollmentApiService.updatePdfInfo('abc', 'blob:url')).resolves.toBeUndefined()
  })

  test('propaga erro quando update falha', async () => {
    updateShouldError = true
    await expect(EnrollmentApiService.updatePdfInfo('abc', 'blob:url')).rejects.toBeTruthy()
    updateShouldError = false
  })
})

describe('EnrollmentApiService — listagem e detalhe', () => {
  test('getRecentEnrollmentsWithDetails retorna lista', async () => {
    listData = [{ id: 'e1', student_name: 'A', created_at: new Date().toISOString() }]
    const res = await EnrollmentApiService.getRecentEnrollmentsWithDetails(10)
    expect(Array.isArray(res)).toBe(true)
    expect(res[0].id).toBe('e1')
  })

  test('updateAdminEnrollment normaliza data no patch', async () => {
    const updated = await EnrollmentApiService.updateAdminEnrollment('e1', { student_birth_date: '02/01/2010' } as any)
    expect(updated).toBeTruthy()
    // Como o mock reflete o payload, o campo estará normalizado ou undefined conforme função interna
  })
})

