import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { obterPerfilAtivo } from '@/lib/acesso'

// Encerra a sessão de quem foi DESATIVADO (ou ficou sem usuarios_perfil) e
// manda para o /login. O admin/layout.tsx redireciona para cá porque Server
// Component não pode gravar cookie (signOut precisa apagá-los).
//
// Só desloga se o usuário realmente estiver sem acesso: assim um link/imagem
// apontando para cá (é GET) não consegue derrubar a sessão de usuário ativo.
export async function GET(request: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const perfil = await obterPerfilAtivo(user.id)
  if (perfil) return NextResponse.redirect(new URL('/admin/veiculos', request.url))

  await supabase.auth.signOut()
  const url = new URL('/login', request.url)
  url.searchParams.set('motivo', 'desativado')
  return NextResponse.redirect(url)
}
