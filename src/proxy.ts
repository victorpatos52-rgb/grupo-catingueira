import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  const pathname = request.nextUrl.pathname
  const rotaSoDashboard = pathname.startsWith('/admin/dashboard')
  const rotaBloqueadaParaSocio =
    pathname.startsWith('/admin/crm') ||
    pathname.startsWith('/admin/vendas') ||
    pathname.startsWith('/admin/usuarios')

  if (rotaSoDashboard || rotaBloqueadaParaSocio) {
    const { data: perfilRow } = await supabase
      .from('usuarios_perfil')
      .select('perfil')
      .eq('id', user.id)
      .single()

    const perfilAtual = perfilRow?.perfil

    // Dashboard: só admin — comportamento já existente, inalterado para
    // vendedor/gerente/diretor (continuam indo para /admin/crm).
    if (rotaSoDashboard && perfilAtual !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = perfilAtual === 'socio' ? '/admin/veiculos' : '/admin/crm'
      return NextResponse.redirect(url)
    }

    // Sócio: sem acesso a CRM, Vendas e Usuários (Dashboard já coberto acima).
    if (perfilAtual === 'socio' && rotaBloqueadaParaSocio) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/veiculos'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*'],
}
