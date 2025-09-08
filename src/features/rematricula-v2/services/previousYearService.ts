/**
 * Serviço para buscar dados do ano anterior
 * Comunicação com Edge Functions e banco de dados
 */

import { supabase } from '@/lib/supabase'
import { RematriculaData, PreviousYearResponse } from '../types'

export class PreviousYearService {
  /**
   * Busca dados do aluno do ano anterior
   */
  static async fetchPreviousYearData(
    cpf: string,
    birthDateHint?: string
  ): Promise<PreviousYearResponse> {
    try {
      // Remove formatação do CPF
      const cpfDigits = cpf.replace(/\D/g, '')

      // Chama Edge Function
      const { data, error } = await supabase.functions.invoke('get_previous_year_student', {
        body: { 
          cpf: cpfDigits,
          birth_date_hint: birthDateHint 
        }
      })

      if (error) {
        console.error('Erro ao buscar dados:', error)
        return {
          success: false,
          error: error.message
        }
      }

      // Mapeia dados para o formato da aplicação
      const mappedData = this.mapResponseToRematriculaData(data)

      return {
        success: true,
        data: mappedData
      }

    } catch (error) {
      console.error('Erro ao buscar dados do ano anterior:', error)
      return {
        success: false,
        error: 'Erro ao buscar dados do ano anterior'
      }
    }
  }

  /**
   * Mapeia resposta da API para o formato interno
   */
  private static mapResponseToRematriculaData(apiData: any): RematriculaData {
    return {
      student: {
        id: apiData.student?.id,
        name: apiData.student?.name || '',
        cpf: apiData.student?.cpf || '',
        rg: apiData.student?.rg,
        birth_date: apiData.student?.birth_date || '',
        gender: apiData.student?.gender || 'M',
        escola: apiData.student?.escola || 'pelicano'
      },
      guardians: {
        guardian1: {
          name: apiData.guardians?.guardian1?.name || '',
          cpf: apiData.guardians?.guardian1?.cpf || '',
          phone: apiData.guardians?.guardian1?.phone || '',
          email: apiData.guardians?.guardian1?.email || '',
          relationship: apiData.guardians?.guardian1?.relationship || 'mother',
          is_financial_responsible: apiData.guardians?.guardian1?.is_financial_responsible
        },
        guardian2: apiData.guardians?.guardian2 ? {
          name: apiData.guardians.guardian2.name,
          cpf: apiData.guardians.guardian2.cpf,
          phone: apiData.guardians.guardian2.phone,
          email: apiData.guardians.guardian2.email,
          relationship: apiData.guardians.guardian2.relationship,
          is_financial_responsible: apiData.guardians.guardian2.is_financial_responsible
        } : undefined
      },
      address: {
        cep: apiData.address?.cep || '',
        street: apiData.address?.street || '',
        number: apiData.address?.number || '',
        complement: apiData.address?.complement,
        district: apiData.address?.district || '',
        city: apiData.address?.city || '',
        state: apiData.address?.state || 'BA'
      },
      academic: {
        series_id: apiData.academic?.series_id || '',
        series_name: apiData.academic?.series_name,
        track_id: apiData.academic?.track_id || '',
        track_name: apiData.academic?.track_name,
        shift: apiData.academic?.shift || 'morning',
        previous_series_id: apiData.academic?.series_id
      },
      financial: {
        base_value: apiData.finance?.base_value || 0,
        total_discount_percentage: apiData.finance?.total_discount_percentage || 0,
        final_monthly_value: apiData.finance?.final_monthly_value || 0,
        applied_discounts: apiData.finance?.previous_applied_discounts || [],
        previous_discounts: apiData.finance?.previous_applied_discounts || []
      },
      metadata: {
        academic_year: new Date().getFullYear(),
        created_at: apiData.created_at,
        updated_at: apiData.updated_at
      }
    }
  }

  /**
   * Sugere progressão de série baseado no ano anterior
   */
  static suggestSeriesProgression(previousSeriesId: string, seriesList: any[]): string {
    // Encontra a série anterior
    const previousSeries = seriesList.find(s => s.id === previousSeriesId)
    if (!previousSeries) return previousSeriesId

    // Extrai número da série (ex: "1º Ano" -> 1)
    const match = previousSeries.name.match(/(\d+)/)
    if (!match) return previousSeriesId

    const currentNumber = parseInt(match[1])
    const nextNumber = currentNumber + 1

    // Busca próxima série
    const nextSeries = seriesList.find(s => 
      s.name.includes(nextNumber.toString()) &&
      s.escola === previousSeries.escola
    )

    return nextSeries?.id || previousSeriesId
  }
}