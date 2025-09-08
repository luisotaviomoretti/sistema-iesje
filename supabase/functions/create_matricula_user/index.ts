// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

function buildCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '*'
  const reqMethod = req.headers.get('Access-Control-Request-Method') || 'POST'
  const reqHeaders = req.headers.get('Access-Control-Request-Headers') || 'authorization, x-client-info, apikey, content-type'
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth, accept, accept-language, cache-control, dnt, pragma, user-agent',
    'Access-Control-Expose-Headers': 'content-length, content-type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
    'Content-Type': 'application/json',
  }
}

serve(async (req) => {
  // Declarar corsHeaders globalmente no início
  const corsHeaders = buildCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    console.log('[EF] Preflight CORS request', {
      origin: req.headers.get('Origin'),
      method: req.headers.get('Access-Control-Request-Method'),
      headers: req.headers.get('Access-Control-Request-Headers'),
      userAgent: req.headers.get('User-Agent'),
    })
    return new Response(null, { 
      status: 200,  // SEMPRE 200, nunca 204
      headers: corsHeaders 
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders,
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return new Response(JSON.stringify({ error: 'Missing environment configuration' }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  const authHeader = req.headers.get('Authorization') || ''
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

  try {
    console.log('[EF] Request received', {
      method: req.method,
      origin: req.headers.get('Origin') || null,
      contentType: req.headers.get('Content-Type') || null,
    })
    // Autoriza: apenas coordenador ou super_admin
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      console.warn('[EF] Unauthorized: no user in auth.getUser()')
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const callerEmail = (user.email || '').toLowerCase()
    const { data: adminRec, error: adminErr } = await supabase
      .from('admin_users')
      .select('role, ativo')
      .eq('email', callerEmail)
      .maybeSingle()

    if (adminErr || !adminRec || !adminRec.ativo || !['coordenador', 'super_admin'].includes(adminRec.role)) {
      console.warn('[EF] Forbidden: caller is not coordinator/super_admin or inactive', { callerEmail })
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: corsHeaders,
      })
    }

    // Parse JSON com tratamento de erro
    let body: any
    try {
      const rawBody = await req.text()
      console.log('[EF] Raw request body:', rawBody)
      body = JSON.parse(rawBody)
    } catch (parseError: any) {
      console.error('[EF] Failed to parse JSON:', parseError.message)
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    console.log('[EF] Parsed body:', body)
    
    const email: string = String(body?.email || '').trim().toLowerCase()
    const password: string = String(body?.password || '')
    const nome: string = String(body?.nome || '').trim()
    const escola: string = String(body?.escola || '').trim()
    const ativo: boolean = Boolean(body?.ativo ?? true)

    if (!email || !password || !nome || !escola) {
      console.warn('[EF] Missing required fields', { emailProvided: !!email, nomeProvided: !!nome, escola, hasPassword: !!password })
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    if (!['Pelicano', 'Sete de Setembro'].includes(escola)) {
      console.warn('[EF] Invalid escola', { escola })
      return new Response(JSON.stringify({ error: 'Escola inválida' }), {
        status: 400,
        headers: corsHeaders,
      })
    }

    // Cria usuário no Auth
    console.log('[EF] Creating auth user...')
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome, tipo: 'matricula' },
    })

    if (createErr || !created?.user) {
      console.error('[EF] Auth user creation failed', { message: createErr?.message })
      return new Response(JSON.stringify({ error: createErr?.message || 'Falha ao criar usuário Auth' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    // Cria registro em matricula_users vinculado ao auth_user_id
    console.log('[EF] Inserting matricula_user row...', { auth_user_id: created.user.id })
    const { data: mu, error: muErr } = await supabaseAdmin
      .from('matricula_users')
      .insert({
        email,
        nome,
        escola,
        ativo,
        auth_user_id: created.user.id,
      })
      .select('*')
      .single()

    if (muErr) {
      console.error('[EF] matricula_users insert failed, rolling back auth user', { message: muErr.message })
      // rollback: remove usuário criado no Auth
      await supabaseAdmin.auth.admin.deleteUser(created.user.id)
      return new Response(JSON.stringify({ error: muErr.message || 'Falha ao criar registro de matrícula' }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    console.log('[EF] Success', { auth_user_id: created.user.id, matricula_user_id: mu?.id })
    return new Response(JSON.stringify({ user: created.user, matricula_user: mu }), {
      status: 200,
      headers: corsHeaders,
    })
  } catch (e: any) {
    console.error('[EF] Uncaught error', { message: e?.message || e })
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
