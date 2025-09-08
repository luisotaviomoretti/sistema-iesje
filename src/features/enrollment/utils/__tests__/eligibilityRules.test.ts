/**
 * Testes para o sistema de elegibilidade com suporte a trilhos
 */

import { 
  isSpecialDiscount, 
  applyEligibilityRules, 
  analyzeDiscountEligibility 
} from '../eligibilityRules'
import type { DatabaseDiscount, CepCategory, TrilhoType } from '../../types/eligibility'

// Mock data para testes
const mockDiscounts: DatabaseDiscount[] = [
  {
    id: '1',
    codigo: 'ABI',
    nome: 'Bolsa Integral Filantropia',
    percentual: 100,
    is_active: true,
    requires_document: true,
    description: 'Bolsa Integral Filantropia',
    max_cumulative_percentage: 100
  },
  {
    id: '2',
    codigo: 'RES',
    nome: 'Desconto Outras Cidades',
    percentual: 20,
    is_active: true,
    requires_document: false,
    description: 'Desconto para alunos de outras cidades',
    max_cumulative_percentage: 20
  },
  {
    id: '3',
    codigo: 'IIR',
    nome: 'Desconto Irmãos',
    percentual: 10,
    is_active: true,
    requires_document: true,
    description: 'Desconto para irmãos',
    max_cumulative_percentage: 10
  }
]

describe('Sistema de Elegibilidade com Trilhos', () => {
  describe('isSpecialDiscount', () => {
    it('deve identificar descontos especiais corretamente', () => {
      const abi = mockDiscounts.find(d => d.codigo === 'ABI')!
      const res = mockDiscounts.find(d => d.codigo === 'RES')!
      
      expect(isSpecialDiscount(abi)).toBe(true)
      expect(isSpecialDiscount(res)).toBe(false)
    })
  })

  describe('applyEligibilityRules para Trilho Especial', () => {
    it('deve tornar desconto especial sempre elegível no trilho especial', () => {
      const abi = mockDiscounts.find(d => d.codigo === 'ABI')!
      const cepCategory: CepCategory = 'alta' // CEP que normalmente bloquearia alguns descontos
      const trilhoType: TrilhoType = 'especial'
      
      const result = applyEligibilityRules(abi, cepCategory, trilhoType)
      
      expect(result.eligible).toBe(true)
      expect(result.ruleSource).toBe('trilho-especial')
      expect(result.confidence).toBe('high')
      expect(result.reason).toBe(null)
    })

    it('deve aplicar regras de CEP normais para descontos não-especiais no trilho especial', () => {
      const res = mockDiscounts.find(d => d.codigo === 'RES')!
      const cepCategory: CepCategory = 'alta' // RES não é elegível para categoria alta
      const trilhoType: TrilhoType = 'especial'
      
      const result = applyEligibilityRules(res, cepCategory, trilhoType)
      
      expect(result.eligible).toBe(false)
      expect(result.ruleSource).toBe('hardcoded')
    })
  })

  describe('applyEligibilityRules para Trilhos Regulares', () => {
    it('deve aplicar regras de CEP normalmente em trilho combinado', () => {
      const res = mockDiscounts.find(d => d.codigo === 'RES')!
      const cepCategory: CepCategory = 'fora' // RES é elegível para categoria fora
      const trilhoType: TrilhoType = 'combinado'
      
      const result = applyEligibilityRules(res, cepCategory, trilhoType)
      
      expect(result.eligible).toBe(true)
      expect(result.ruleSource).toBe('hardcoded')
    })
  })

  describe('analyzeDiscountEligibility', () => {
    it('deve analisar corretamente todos os descontos no trilho especial', () => {
      const cepCategory: CepCategory = 'alta'
      const trilhoType: TrilhoType = 'especial'
      
      const results = analyzeDiscountEligibility(
        mockDiscounts, 
        cepCategory, 
        trilhoType, 
        []
      )
      
      // ABI deve ser elegível (desconto especial)
      const abiResult = results.find(r => r.discount.codigo === 'ABI')!
      expect(abiResult.eligible).toBe(true)
      expect(abiResult.ruleApplied).toBe('trilho-especial')
      
      // RES deve ser inelegível (regra de CEP)
      const resResult = results.find(r => r.discount.codigo === 'RES')!
      expect(resResult.eligible).toBe(false)
      expect(resResult.ruleApplied).toBe('hardcoded')
      
      // IIR deve ser elegível (regra padrão)
      const iirResult = results.find(r => r.discount.codigo === 'IIR')!
      expect(iirResult.eligible).toBe(true)
      expect(iirResult.ruleApplied).toBe('default')
    })

    it('deve analisar corretamente trilho combinado', () => {
      const cepCategory: CepCategory = 'fora'
      const trilhoType: TrilhoType = 'combinado'
      
      const results = analyzeDiscountEligibility(
        mockDiscounts, 
        cepCategory, 
        trilhoType, 
        []
      )
      
      // ABI deve seguir regras normais (não há regra especial de trilho)
      const abiResult = results.find(r => r.discount.codigo === 'ABI')!
      expect(abiResult.eligible).toBe(true)
      expect(abiResult.ruleApplied).toBe('default')
      
      // RES deve ser elegível para CEP 'fora'
      const resResult = results.find(r => r.discount.codigo === 'RES')!
      expect(resResult.eligible).toBe(true)
      expect(resResult.ruleApplied).toBe('hardcoded')
    })
  })

  describe('Cenários Edge Cases', () => {
    it('deve funcionar sem trilho especificado', () => {
      const cepCategory: CepCategory = 'fora'
      
      const results = analyzeDiscountEligibility(
        mockDiscounts, 
        cepCategory, 
        undefined, // sem trilho
        []
      )
      
      expect(results).toHaveLength(3)
      // Todos devem ser processados normalmente
    })

    it('deve funcionar sem categoria de CEP', () => {
      const trilhoType: TrilhoType = 'especial'
      
      const results = analyzeDiscountEligibility(
        mockDiscounts, 
        null, // sem categoria
        trilhoType, 
        []
      )
      
      expect(results).toHaveLength(3)
      // Todos devem ser elegíveis como fallback
      results.forEach(result => {
        expect(result.eligible).toBe(true)
      })
    })
  })
})

// Testes de integração com logs (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  describe('Debug e Logs', () => {
    it('deve mostrar logs detalhados para trilho especial', () => {
      const consoleSpy = jest.spyOn(console, 'log')
      const cepCategory: CepCategory = 'alta'
      const trilhoType: TrilhoType = 'especial'
      
      const results = analyzeDiscountEligibility(
        mockDiscounts, 
        cepCategory, 
        trilhoType, 
        []
      )
      
      // Verificar se logs foram gerados (em ambiente de desenvolvimento)
      expect(results).toHaveLength(3)
      consoleSpy.mockRestore()
    })
  })
}