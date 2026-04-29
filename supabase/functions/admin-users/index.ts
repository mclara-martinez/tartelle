import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function mapUser(u: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at: string; last_sign_in_at?: string; banned_until?: string }) {
  return {
    id: u.id,
    email: u.email ?? '',
    role: (u.user_metadata?.role as string) ?? 'kitchen',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    banned_until: u.banned_until ?? null,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify caller is an authenticated admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'No autorizado' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token)
  if (authErr || !caller) return json({ error: 'No autorizado' }, 401)
  if (caller.user_metadata?.role !== 'admin') return json({ error: 'Acceso denegado' }, 403)

  const url = new URL(req.url)
  // Extract optional :id from path — e.g. /admin-users/abc-123
  const segments = url.pathname.split('/').filter(Boolean)
  const userId = segments[segments.length - 1] !== 'admin-users' ? segments[segments.length - 1] : undefined

  // GET — list all users
  if (req.method === 'GET') {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (error) return json({ error: error.message }, 500)
    return json(users.map(mapUser))
  }

  // POST — create user
  if (req.method === 'POST') {
    const { email, password, role } = await req.json()
    if (!email || !password || !role) return json({ error: 'Faltan campos requeridos' }, 400)

    const { data: { user }, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { role },
      email_confirm: true,
    })
    if (error) return json({ error: error.message }, 400)
    return json(mapUser(user!), 201)
  }

  // PATCH /:id — update role
  if (req.method === 'PATCH' && userId) {
    const { role } = await req.json()
    if (!role) return json({ error: 'Falta el rol' }, 400)

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { role },
    })
    if (error) return json({ error: error.message }, 400)
    return json(mapUser(user!))
  }

  // DELETE /:id — soft deactivate (10-year ban)
  if (req.method === 'DELETE' && userId) {
    if (userId === caller.id) return json({ error: 'No puedes desactivar tu propia cuenta' }, 400)

    const { data: { user }, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: '87600h',
    })
    if (error) return json({ error: error.message }, 400)
    return json(mapUser(user!))
  }

  return json({ error: 'Ruta no encontrada' }, 404)
})
