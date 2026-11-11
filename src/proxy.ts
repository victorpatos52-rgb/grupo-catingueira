import { createServerClient } from '@supabase/ssr'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { CABECALHO_SESSAO, assinarSessao } from '@/lib/sessao-assinatura'
import { telaInicial } from '@/lib/tela-inicial'

// ─── Proxy: ÚNICO ponto que fala com o Supabase Auth ───────────────────────────
//
// Rotas com sessão (/admin, /api/pdf, /api/auth, /api/integrations, /login):
//   1. getUser() valida a sessão no Auth e, se o access token estiver vencendo,
//      RENOVA — os cookies novos vão no request (para o servidor) e na
//      response (para o navegador). Padrão oficial do @supabase/ssr.
//   2. Repassa o id do usuário num cabeçalho ASSINADO (lib/sessao-assinatura.ts)
//      para layout, páginas, actions e rotas — nenhum deles chama o Auth.
//   3. Todo redirecionamento leva junto os cookies renovados (antes eram
//      perdidos e o refresh token gasto ficava no navegador → sessão revogada).
//   4. Sessão inválida → /login. Falha passageira do Auth (rede/5xx) → página
//      "Tentar de novo" (antes também ia para /login).
//
// Demais rotas: só grava x-pathname (tag do Google Ads no layout raiz) e
// apaga o cabeçalho de sessão vindo do navegador.

function ehRotaComSessao(pathname: string): boolean {
  return (
    pathname === '/admin' || pathname.startsWith('/admin/') ||
    pathname.startsWith('/api/pdf/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/integrations/') ||
    pathname === '/login'
  )
}

// Copia os cookies que o Supabase gravou na response "base" para outra response
// (redirect, erro). Sem isso a renovação do token se perde.
function comCookies(destino: NextResponse, origem: NextResponse): NextResponse {
  for (const cookie of origem.cookies.getAll()) destino.cookies.set(cookie)
  return destino
}

function paginaTentarDeNovo(): NextResponse {
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><title>Instabilidade</title>
<style>body{font-family:Arial,sans-serif;background:#F8F8F8;margin:0;padding:24px;color:#111}
.box{max-width:480px;margin:60px auto;background:#fff;border:1px solid #E5E7EB;border-radius:12px;padding:24px;text-align:center}
button{margin-top:16px;min-height:44px;padding:0 20px;border:0;border-radius:12px;background:#F5C842;font-weight:700;font-size:15px;cursor:pointer}</style>
</head><body><div class="box"><p><strong>Não foi possível confirmar seu login agora.</strong></p>
<p>Pode ser uma instabilidade passageira. Sua sessão continua válida.</p>
<button onclick="location.reload()">Tentar de novo</button></div></body></html>`
  return new NextResponse(html, {
    status: 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '5', 'Cache-Control': 'no-store' },
  })
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (!ehRotaComSessao(pathname)) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)
    requestHeaders.delete(CABECALHO_SESSAO)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // O cabeçalho de sessão que segue para o servidor é SEMPRE o assinado aqui
  // embaixo (set sobrescreve qualquer valor vindo do navegador); nas respostas
  // de redirect/erro ele nem chega ao servidor.
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
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  const ehApi = pathname.startsWith('/api/')
  const redirecionar = (destino: string) => {
    const url = request.nextUrl.clone()
    url.pathname = destino
    url.search = ''
    return comCookies(NextResponse.redirect(url), supabaseResponse)
  }

  // Falha passageira (rede, Auth fora do ar): não desloga.
  if (!user && error && (isAuthRetryableFetchError(error) || (error.status ?? 0) >= 500)) {
    console.error('[proxy] falha passageira no Auth:', error.message)
    if (pathname === '/login') return supabaseResponse
    if (ehApi) {
      return comCookies(NextResponse.json({ error: 'Instabilidade ao validar a sessão. Tente de novo.' }, { status: 503 }), supabaseResponse)
    }
    return comCookies(paginaTentarDeNovo(), supabaseResponse)
  }

  // Perfil só quando precisa decidir rota (consulta pelo client do proxy, que
  // pode gravar cookie; RLS libera a leitura do próprio perfil).
  const lerPerfil = async () => {
    if (!user) return null
    const { data } = await supabase
      .from('usuarios_perfil')
      .select('perfil, modulos_permitidos, ativo')
      .eq('id', user.id)
      .maybeSingle()
    return data as { perfil: string; modulos_permitidos: string[] | null; ativo: boolean } | null
  }

  // /login: com sessão válida vai direto para o painel.
  if (pathname === '/login') {
    if (!user) return supabaseResponse
    const perfil = await lerPerfil()
    if (perfil?.ativo) return redirecionar(telaInicial(perfil))
    return supabaseResponse
  }

  if (!user) {
    // /api/auth/sair sem sessão também vai para o /login.
    if (ehApi && !pathname.startsWith('/api/auth/')) {
      return comCookies(NextResponse.json({ error: 'Não autenticado' }, { status: 401 }), supabaseResponse)
    }
    return redirecionar('/login')
  }

  // Regras de rota por perfil (mesmas de antes).
  const rotaSoDashboard = pathname.startsWith('/admin/dashboard')
  const rotaSoAdminFinanceiro = pathname.startsWith('/admin/financeiro')
  const rotaBloqueadaParaSocio =
    pathname.startsWith('/admin/crm') || pathname.startsWith('/admin/vendas') || pathname.startsWith('/admin/usuarios')
  const rotaRaizAdmin = pathname === '/admin'

  if (rotaRaizAdmin || rotaSoDashboard || rotaSoAdminFinanceiro || rotaBloqueadaParaSocio) {
    const perfil = await lerPerfil()
    const perfilAtual = perfil?.perfil
    if (perfil && rotaRaizAdmin) return redirecionar(telaInicial(perfil))
    if (perfil && rotaSoDashboard && perfilAtual !== 'admin') return redirecionar(telaInicial(perfil))
    if (perfil && rotaSoAdminFinanceiro && perfilAtual !== 'admin' && perfilAtual !== 'socio') {
      return redirecionar(telaInicial(perfil))
    }
    if (perfilAtual === 'socio' && rotaBloqueadaParaSocio) return redirecionar('/admin/veiculos')
  }

  // Repassa o usuário validado (cabeçalho assinado) mantendo os cookies.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(CABECALHO_SESSAO, await assinarSessao(user.id))
  return comCookies(NextResponse.next({ request: { headers: requestHeaders } }), supabaseResponse)
}

export const config = {
  // Com sessão: /admin, /login e as rotas /api que dependem do usuário.
  // Demais páginas: só para gravar x-pathname e apagar o cabeçalho de sessão.
  // Fora: outras rotas /api, assets do Next e arquivos com extensão.
  matcher: [
    '/admin/:path*',
    '/api/pdf/:path*',
    '/api/auth/:path*',
    '/api/integrations/:path*',
    '/((?!api|_next/static|_next/image|.*\\..*).*)',
  ],
}
