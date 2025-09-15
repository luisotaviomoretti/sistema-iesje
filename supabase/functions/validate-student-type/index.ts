import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { cpf } = await req.json()
    
    if (!cpf) {
      return new Response(
        JSON.stringify({ 
          error: 'CPF é obrigatório',
          status: 'error'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Limpar CPF (remover formatação)
    const cleanCPF = cpf.replace(/\D/g, '')
    
    console.log(`Validando CPF: ${cleanCPF}`)
    
    // PRIMEIRA VERIFICAÇÃO: Está em enrollments (ano atual 2026)?
    const currentYear = new Date().getFullYear()
    const { data: enrollmentData, error: enrollmentError } = await supabaseClient
      .from('enrollments')
      .select('id, student_name, status, created_at')
      .eq('student_cpf', cleanCPF)
      .gte('created_at', `${currentYear}-01-01`)
      .lte('created_at', `${currentYear}-12-31`)
      .maybeSingle()
    
    if (enrollmentError) {
      console.error('Erro ao buscar em enrollments:', enrollmentError)
    }
    
    // Se encontrou em enrollments do ano atual, já está matriculado
    if (enrollmentData) {
      console.log(`CPF ${cleanCPF} já matriculado em ${currentYear}`)
      return new Response(
        JSON.stringify({
          status: 'idle',
          studentType: 'already_enrolled',
          hasData: true,
          message: `Aluno já matriculado em ${currentYear}`,
          enrollmentInfo: {
            id: enrollmentData.id,
            name: enrollmentData.student_name,
            status: enrollmentData.status,
            year: currentYear
          },
          errors: ['CPF já possui matrícula ativa para o ano atual']
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // SEGUNDA VERIFICAÇÃO: Está em previous_year_students (ano anterior)?
    const { data: previousYearData, error: previousYearError } = await supabaseClient
      .from('previous_year_students')
      .select(`
        id,
        student_name,
        student_cpf,
        student_birth_date,
        student_escola,
        academic_year,
        series_name,
        track_name,
        shift,
        guardian1_name,
        guardian1_cpf,
        guardian1_phone,
        guardian1_email,
        address_cep,
        address_street,
        address_city,
        final_monthly_value,
        total_discount_percentage,
        status
      `)
      .eq('student_cpf', cleanCPF)
      .eq('academic_year', String(currentYear - 1))
      .maybeSingle()
    
    if (previousYearError) {
      console.error('Erro ao buscar em previous_year_students:', previousYearError)
    }
    
    // Se encontrou no ano anterior, é rematrícula
    if (previousYearData) {
      console.log(`CPF ${cleanCPF} encontrado no ano anterior, elegível para rematrícula`)
      return new Response(
        JSON.stringify({
          status: 'idle',
          studentType: 'previous_year',
          hasData: true,
          message: 'Aluno do ano anterior - Elegível para rematrícula',
          studentData: {
            id: previousYearData.id,
            name: previousYearData.student_name,
            cpf: previousYearData.student_cpf,
            birthDate: previousYearData.student_birth_date,
            escola: previousYearData.student_escola,
            previousSeries: previousYearData.series_name,
            previousTrack: previousYearData.track_name,
            previousShift: previousYearData.shift,
            academicYear: previousYearData.academic_year
          },
          errors: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    // TERCEIRA SITUAÇÃO: Não encontrado em nenhum lugar - novo aluno
    console.log(`CPF ${cleanCPF} não encontrado - novo aluno`)
    return new Response(
      JSON.stringify({
        status: 'idle',
        studentType: 'new',
        hasData: false,
        message: 'CPF não encontrado - Novo aluno',
        errors: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Erro na função:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: 'error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})