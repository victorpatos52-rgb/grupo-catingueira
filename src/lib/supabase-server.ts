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
        // setAll é sempre no-op aqui: createServerSupabase() só é chamado
        // de Server Components (page.tsx/layout.tsx), onde cookies().set()
        // é proibido pelo Next.js em qualquer circunstância — não é uma
        // falha a tentar/logar, é o comportamento esperado sempre que o
        // GoTrueClient tentar reescrever cookie (ex: normalização interna
        // de sessão, mesmo com autoRefreshToken desligado). Ler a sessão já
        // renovada pelo proxy.ts é a única responsabilidade deste client;
        // nunca escreve. Se algum dia este helper passar a ser usado num
        // Server Action/Route Handler, mover pra implementação com
        // cookieStore.set() de verdade (igual userSupabase() em actions.ts).
        setAll() {},
      },
    }
  )
}
