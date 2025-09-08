// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '*'
  
  // Be more permissive for localhost development
  const allowedOrigin = origin.includes('localhost') || origin.includes('127.0.0.1') 
    ? origin 
    : (origin || '*')
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, accept, accept-language, cache-control, dnt, pragma, user-agent, x-requested-with',
    'Access-Control-Expose-Headers': 'content-length, content-type',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    'Content-Type': 'application/json',
  }
}

function sanitizeCpf(input: string): string {
  return (input || '').replace(/\D/g, '')
}

function formatCpfMask(digits: string): string {
  if (!digits || digits.length !== 11) return digits
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
}

function isInvalidSequence(cpf: string): boolean {
  return /^([0-9])\1{10}$/.test(cpf)
}

function cpfCheckDigitsValid(cpf: string): boolean {
  if (cpf.length !== 11) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i)
  let rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  if (rev !== parseInt(cpf.charAt(9))) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i)
  rev = 11 - (sum % 11)
  if (rev === 10 || rev === 11) rev = 0
  return rev === parseInt(cpf.charAt(10))
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder()
  const data = enc.encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function getClientIp(req: Request): string {
  const xf = req.headers.get('x-forwarded-for') || ''
  if (xf) return xf.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') || '0.0.0.0'
}

function parseBirthDateHint(hint?: string | null): { day: number; month: number } | null {
  if (!hint) return null
  const m = hint.trim().match(/^(\d{1,2})\/(\d{1,2})$/)
  if (!m) return null
  const day = parseInt(m[1], 10)
  const month = parseInt(m[2], 10)
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return { day, month }
}

serve(async (req) => {
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing environment configuration' }), { status: 500, headers: corsHeaders })
  }
  const admin = createClient(supabaseUrl, serviceRoleKey)

  // Parse body
  let body: any
  try {
    const raw = await req.text()
    body = raw ? JSON.parse(raw) : {}
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const rawCpf: string = String(body?.cpf ?? '')
  const birthDateHint: string | undefined = body?.birth_date_hint
  const cpf = sanitizeCpf(rawCpf)
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') || ''

  // Validate input
  if (!cpf || cpf.length !== 11 || isInvalidSequence(cpf) || !cpfCheckDigitsValid(cpf)) {
    try {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'invalid', ip, user_agent: ua })
    } catch {}
    return new Response(JSON.stringify({ error: 'Invalid CPF' }), { status: 400, headers: corsHeaders })
  }

  // Rate limiting: 10 requests per 5 minutes per IP
  const windowMs = 5 * 60 * 1000
  const sinceIso = new Date(Date.now() - windowMs).toISOString()
  try {
    const { count } = await admin
      .from('validation_audit')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', sinceIso)
    if (typeof count === 'number' && count >= 10) {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'rate_limited', ip, user_agent: ua })
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: corsHeaders })
    }
  } catch {}

  // Identity check: require birth_date_hint for full prefill
  const prevYear = String(new Date().getUTCFullYear() - 1)
  try {
    const { data: row, error } = await admin
      .from('previous_year_students')
      .select(
        [
          'student_name',
          'student_cpf',
          'student_rg',
          'student_birth_date',
          'student_gender',
          'student_escola',
          'series_id',
          'series_name',
          'track_id',
          'track_name',
          'shift',
          'guardian1_name',
          'guardian1_cpf',
          'guardian1_phone',
          'guardian1_email',
          'guardian1_relationship',
          'guardian2_name',
          'guardian2_cpf',
          'guardian2_phone',
          'guardian2_email',
          'guardian2_relationship',
          'address_cep',
          'address_street',
          'address_number',
          'address_complement',
          'address_district',
          'address_city',
          'address_state',
          'base_value',
          'total_discount_percentage',
          'final_monthly_value',
          'applied_discounts',
          'academic_year'
        ].join(',')
      )
      .eq('student_cpf_digits', cpf)
      .eq('academic_year', prevYear)
      .maybeSingle()

    if (error) throw error
    if (!row) {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'not_found', ip, user_agent: ua })
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders })
    }

    // Require birth_date_hint match (DD/MM)
    const hint = parseBirthDateHint(birthDateHint)
    if (!hint) {
      return new Response(JSON.stringify({ error: 'Identity verification required' }), { status: 403, headers: corsHeaders })
    }
    const birth = new Date(row.student_birth_date as string)
    const day = birth.getUTCDate()
    const month = birth.getUTCMonth() + 1
    if (hint.day !== day || hint.month !== month) {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'error', ip, user_agent: ua })
      return new Response(JSON.stringify({ error: 'Identity verification failed' }), { status: 403, headers: corsHeaders })
    }

    // Audit success
    try {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'previous_year', ip, user_agent: ua })
    } catch {}

    // Return prefill payload (omit academic_year)
    const payload = {
      student: {
        name: row.student_name,
        cpf: row.student_cpf,
        rg: row.student_rg,
        birth_date: row.student_birth_date,
        gender: row.student_gender,
        escola: row.student_escola,
      },
      academic: {
        series_id: row.series_id,
        series_name: row.series_name,
        track_id: row.track_id,
        track_name: row.track_name,
        shift: row.shift,
      },
      guardians: {
        guardian1: {
          name: row.guardian1_name,
          cpf: row.guardian1_cpf,
          phone: row.guardian1_phone,
          email: row.guardian1_email,
          relationship: row.guardian1_relationship,
        },
        guardian2: row.guardian2_name ? {
          name: row.guardian2_name,
          cpf: row.guardian2_cpf,
          phone: row.guardian2_phone,
          email: row.guardian2_email,
          relationship: row.guardian2_relationship,
        } : null,
      },
      address: {
        cep: row.address_cep,
        street: row.address_street,
        number: row.address_number,
        complement: row.address_complement,
        district: row.address_district,
        city: row.address_city,
        state: row.address_state,
      },
      finance: {
        base_value: row.base_value,
        total_discount_percentage: row.total_discount_percentage,
        final_monthly_value: row.final_monthly_value,
        previous_applied_discounts: row.applied_discounts || [],
      }
    }

    return new Response(JSON.stringify(payload), { status: 200, headers: corsHeaders })
  } catch (_e) {
    try {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'error', ip, user_agent: ua })
    } catch {}
    return new Response(JSON.stringify({ error: 'Failed to fetch prefill data' }), { status: 500, headers: corsHeaders })
  }
})
