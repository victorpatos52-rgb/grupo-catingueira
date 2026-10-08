import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { adminSupabase } from '@/lib/supabase-server'
import type { Loja, Perfil } from '@/types'

// Só servidor: usa OLX_CLIENT_SECRET / OLX_STATE_SECRET e o service role.
// Nunca importar de um Client Component.
//
// Fluxo conforme https://developers.olx.com.br/anuncio/api/oauth.html
// (Sequência de Autorização):
//   1. GET https://auth.olx.com.br/oauth?response_type=code&client_id&redirect_uri&scope&state
//   2. OLX redireciona pro redirect_uri com ?code&state (code expira em 10 min,
//      uso único) ou ?error&state (ex: access_denied).
//   3. POST https://auth.olx.com.br/oauth/token (x-www-form-urlencoded) com
//      code, client_id, client_secret, redirect_uri, grant_type=authorization_code
//      → 200 { access_token, token_type: "Bearer" } ou 400 { error }.

export const OLX_AUTHORIZE_URL = 'https://auth.olx.com.br/oauth'
export const OLX_TOKEN_URL = 'https://auth.olx.com.br/oauth/token'
export const OLX_SCOPE = 'autoupload'

// Mesma janela de validade do code da OLX — não faz sentido o state durar mais.
const STATE_TTL_MS = 10 * 60 * 1000

const PERFIS_INTEGRACAO: Perfil[] = ['gerente', 'diretor', 'admin']

/** redirect_uri idêntico ao cadastrado na OLX: https://<dominio sem www>/api/integrations/olx/callback */
export function olxRedirectUri(loja: Pick<Loja, 'dominio'>): string {
  const dominio = loja.dominio.trim().replace(/^www\./, '')
  return `https://${dominio}/api/integrations/olx/callback`
}

function stateSecret(): string {
  const s = process.env.OLX_STATE_SECRET
  if (!s || s.length < 32) throw new Error('OLX_STATE_SECRET ausente ou curto demais (mínimo 32 caracteres)')
  return s
}

function assinar(payload: string): string {
  return createHmac('sha256', stateSecret()).update(payload).digest('base64url')
}

/**
 * State auto-contido (payload.assinatura), validado só por HMAC — não
 * depende de cookie, porque o apex pode redirecionar para www no meio do
 * fluxo e o cookie se perderia.
 */
export function criarState(lojaId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ l: lojaId, e: Date.now() + STATE_TTL_MS, n: randomBytes(8).toString('base64url') })
  ).toString('base64url')
  return `${payload}.${assinar(payload)}`
}

/** Retorna o loja_id do state se assinatura e expiração forem válidas; senão null. */
export function verificarState(state: string | null): string | null {
  if (!state) return null
  const [payload, assinatura, ...resto] = state.split('.')
  if (!payload || !assinatura || resto.length > 0) return null

  const esperado = Buffer.from(assinar(payload))
  const recebido = Buffer.from(assinatura)
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { l?: unknown; e?: unknown }
    if (typeof dados.l !== 'string' || typeof dados.e !== 'number') return null
    if (Date.now() > dados.e) return null
    return dados.l
  } catch {
    return null
  }
}

/**
 * Usuário logado, ativo, com perfil gerente/diretor/admin e acesso à loja
 * resolvida pelo domínio. Gerente só na própria loja; diretor/admin podem
 * operar qualquer loja (mesma regra do seletor de loja em admin/layout.tsx).
 *
 * /api/* não passa pelo src/proxy.ts (matcher só /admin), então este client
 * pode precisar renovar a sessão — por isso setAll grava de verdade.
 */
export async function usuarioPodeGerenciarOlx(lojaId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Server Component: leitura só — sessão já renovada pelo proxy.
          }
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: perfil } = await adminSupabase()
    .from('usuarios_perfil')
    .select('perfil, loja_id, ativo')
    .eq('id', user.id)
    .single()

  if (!perfil || perfil.ativo === false) return false
  if (!PERFIS_INTEGRACAO.includes(perfil.perfil as Perfil)) return false
  if (perfil.perfil === 'gerente' && perfil.loja_id !== lojaId) return false
  return true
}
