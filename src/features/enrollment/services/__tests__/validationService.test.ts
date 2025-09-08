import { ValidationService } from '../validationService'

// Mock supabase client
const invokeMock = jest.fn()
jest.mock('@/lib/supabase', () => {
  return {
    supabase: {
      functions: {
        invoke: (...args: any[]) => invokeMock(...args)
      }
    }
  }
})

describe('ValidationService.validateCpf', () => {
  beforeEach(() => {
    invokeMock.mockReset()
  })

  test('calls edge function with sanitized cpf and returns status', async () => {
    invokeMock.mockResolvedValueOnce({ data: { status: 'previous_year' }, error: null })
    const res = await ValidationService.validateCpf('111.444.777-35')
    expect(invokeMock).toHaveBeenCalledTimes(1)
    const callArgs = invokeMock.mock.calls[0]
    expect(callArgs[0]).toBe('validate_cpf')
    expect(callArgs[1].body).toEqual({ cpf: '11144477735' })
    expect(res.status).toBe('previous_year')
  })

  test('maps missing data to not_found', async () => {
    invokeMock.mockResolvedValueOnce({ data: {}, error: null })
    const res = await ValidationService.validateCpf('11144477735')
    expect(res.status).toBe('not_found')
  })

  test('throws on error from edge', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: { message: 'Too many requests' } })
    await expect(ValidationService.validateCpf('11144477735')).rejects.toThrow('Too many requests')
  })
})

