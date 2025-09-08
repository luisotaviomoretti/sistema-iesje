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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, accept, accept-language, cache-control, dnt, pragma, user-agent, x-requested-with',
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
  // Expect only digits
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
  // Supabase sets X-Forwarded-For with comma-separated list
  const xf = req.headers.get('x-forwarded-for') || ''
  if (xf) return xf.split(',')[0].trim()
  // Fallback to CF-Connecting-IP or similar
  return req.headers.get('cf-connecting-ip') || '0.0.0.0'
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

  // Parse JSON body safely
  let body: any
  try {
    const raw = await req.text()
    body = raw ? JSON.parse(raw) : {}
  } catch (_e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: corsHeaders })
  }

  const rawCpf: string = String(body?.cpf ?? '')
  const cpf = sanitizeCpf(rawCpf)
  const ip = getClientIp(req)
  const ua = req.headers.get('user-agent') || ''

  // Basic input validation
  if (!cpf || cpf.length !== 11 || isInvalidSequence(cpf) || !cpfCheckDigitsValid(cpf)) {
    // Audit invalid attempt without leaking PII
    try {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'invalid', ip, user_agent: ua })
    } catch (_e) {
      // ignore audit failures
    }
    return new Response(JSON.stringify({ error: 'Invalid CPF' }), { status: 400, headers: corsHeaders })
  }

  // Rate limiting by IP (window: 5 minutes, max 15)
  const now = Date.now()
  const windowMs = 5 * 60 * 1000
  const sinceIso = new Date(now - windowMs).toISOString()
  try {
    const { count, error: rlErr } = await admin
      .from('validation_audit')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', sinceIso)
    if (!rlErr && typeof count === 'number' && count >= 15) {
      const cpf_hash = await sha256Hex(cpf)
      await admin.from('validation_audit').insert({ cpf_hash, result: 'rate_limited', ip, user_agent: ua })
      return new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: corsHeaders })
    }
  } catch (_e) {
    // If rate limit check fails, proceed but do not block
  }

  // Determine years dynamically
  const currentYear = new Date().getUTCFullYear()
  const prevYear = currentYear - 1
  const startOfCurrent = new Date(Date.UTC(currentYear, 0, 1)).toISOString()
  const startOfNext = new Date(Date.UTC(currentYear + 1, 0, 1)).toISOString()

  let status: 'not_found' | 'previous_year' | 'current_year' = 'not_found'
  try {
    // 1) Latest enrollment by digits, then classify by year
    const { data: enrLatest, error: enrLatestErr } = await admin
      .from('enrollments')
      .select('id, created_at')
      .eq('student_cpf_digits', cpf)
      .order('created_at', { ascending: false })
      .limit(1)
    if (enrLatestErr) throw enrLatestErr
    if (enrLatest && enrLatest.length > 0) {
      const created = new Date(enrLatest[0].created_at as string).toISOString()
      status = created >= startOfCurrent && created < startOfNext ? 'current_year' : 'previous_year'
    } else {
      // 2) Dedicated previous_year_students table by digits
      const { data: pys, error: pysErr } = await admin
        .from('previous_year_students')
        .select('id')
        .eq('student_cpf_digits', cpf)
        .eq('academic_year', String(prevYear))
        .limit(1)
      if (pysErr) throw pysErr
      if (pys && pys.length > 0) status = 'previous_year'
    }
  } catch (_e) {
    const cpf_hash = await sha256Hex(cpf)
    await admin.from('validation_audit').insert({ cpf_hash, result: 'error', ip, user_agent: ua })
    return new Response(JSON.stringify({ error: 'Validation failed' }), { status: 500, headers: corsHeaders })
  }

  // Audit successful classification
  try {
    const cpf_hash = await sha256Hex(cpf)
    await admin.from('validation_audit').insert({ cpf_hash, result: status, ip, user_agent: ua })
  } catch (_e) { /* ignore */ }

  return new Response(JSON.stringify({ status }), { status: 200, headers: corsHeaders })
})
