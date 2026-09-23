import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function createServerSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // autoRefreshToken: false — mesma razão de src/app/actions.ts
      // (userSupabase): renovar sessão é responsabilidade única do
      // src/proxy.ts, que já roda antes deste client em toda rota
      // /admin/:path*. Ter mais de um client tentando renovar o mesmo
      // refresh token rotativo causava corrida (o segundo a chegar recebia
      // um token já invalidado pelo primeiro).
      auth: { autoRefreshToken: false },
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch (err) {
            console.error('[createServerSupabase] falha ao persistir cookie de sessão:', err)
          }
        },
      },
    }
  )
}
