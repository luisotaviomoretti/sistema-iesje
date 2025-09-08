import { cpfIsValid } from '../../utils/validation'

describe('cpfIsValid', () => {
  test('valid CPF returns true', () => {
    expect(cpfIsValid('11144477735')).toBe(true)
    expect(cpfIsValid('111.444.777-35')).toBe(true)
  })

  test('empty or wrong length returns false', () => {
    expect(cpfIsValid('')).toBe(false)
    expect(cpfIsValid('123')).toBe(false)
    expect(cpfIsValid('123456789012')).toBe(false)
  })

  test('repeated sequences return false', () => {
    expect(cpfIsValid('00000000000')).toBe(false)
    expect(cpfIsValid('11111111111')).toBe(false)
    expect(cpfIsValid('99999999999')).toBe(false)
  })

  test('invalid check digits return false', () => {
    expect(cpfIsValid('12345678900')).toBe(false)
    expect(cpfIsValid('11144477734')).toBe(false)
  })
})

