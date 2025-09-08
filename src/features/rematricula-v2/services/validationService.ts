/**
 * Serviço de validação para rematrícula
 * Comunicação com Edge Functions do Supabase
 */

import { supabase } from '@/lib/supabase'
import { ValidationResponse, StudentType } from '../types'

export class ValidationService {
  /**
   * Valida CPF e retorna o tipo de estudante
   */
  static async validateCPF(cpf: string): Promise<ValidationResponse> {
    try {
      // Remove formatação do CPF
      const cpfDigits = cpf.replace(/\D/g, '')
      
      // Validação básica
      if (cpfDigits.length !== 11) {
        return {
          status: 'unknown',
          error: 'CPF inválido'
        }
      }

      // Chama Edge Function
      const { data, error } = await supabase.functions.invoke('validate_cpf', {
        body: { cpf: cpfDigits }
      })

      if (error) {
        console.error('Erro na validação:', error)
        return {
          status: 'unknown',
          error: error.message
        }
      }

      return {
        status: data.status as StudentType,
        message: data.message
      }

    } catch (error) {
      console.error('Erro ao validar CPF:', error)
      return {
        status: 'unknown',
        error: 'Erro ao validar CPF'
      }
    }
  }

  /**
   * Valida formato de email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Valida formato de telefone
   */
  static validatePhone(phone: string): boolean {
    const phoneDigits = phone.replace(/\D/g, '')
    return phoneDigits.length === 10 || phoneDigits.length === 11
  }

  /**
   * Valida CEP
   */
  static validateCEP(cep: string): boolean {
    const cepDigits = cep.replace(/\D/g, '')
    return cepDigits.length === 8
  }

  /**
   * Valida data de nascimento
   */
  static validateBirthDate(date: string): boolean {
    const birthDate = new Date(date)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    // Verifica se a data é válida e se a idade está entre 3 e 25 anos
    return !isNaN(birthDate.getTime()) && age >= 3 && age <= 25
  }
}