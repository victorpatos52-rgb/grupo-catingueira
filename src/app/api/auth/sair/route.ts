import { NextResponse, type NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { obterSessao } from '@/lib/sessao'
import { telaInicial } from '@/lib/tela-inicial'

// Encerra a sessão de quem foi DESATIVADO (ou ficou sem usuarios_perfil) e
// manda para o /login. O admin/layout.tsx redireciona para cá porque Server
// Component não pode gravar cookie (signOut precisa apagá-los).
//
// A sessão já foi validada pelo src/proxy.ts (matcher cobre /api/auth); aqui
// só lemos o resultado (lib/sessao.ts). Só desloga se o usuário realmente
// estiver sem acesso: um link/imagem apontando para cá (é GET) não derruba a
// sessão de usuário ativo.
export async function GET(request: NextRequest) {
  const sessao = await obterSessao()

  if (sessao.status === 'sem-sessao') return NextResponse.redirect(new URL('/login', request.url))
  if (sessao.status === 'ok') return NextResponse.redirect(new URL(telaInicial(sessao.perfil), request.url))
  if (sessao.status === 'erro') {
    // Instabilidade ao ler o perfil: não desloga ninguém por isso.
    return new NextResponse('Instabilidade ao verificar seu acesso. Volte e tente de novo.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Retry-After': '5' },
    })
  }

  // Inativo: encerra a sessão (Route Handler pode apagar cookies).
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
  await supabase.auth.signOut()
  const url = new URL('/login', request.url)
  url.searchParams.set('motivo', 'desativado')
  return NextResponse.redirect(url)
}
