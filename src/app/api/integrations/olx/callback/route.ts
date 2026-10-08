import { NextResponse, type NextRequest } from 'next/server'
import { getLoja } from '@/lib/getLoja'
import { adminSupabase } from '@/lib/supabase-server'
import { OLX_TOKEN_URL, olxRedirectUri, verificarState } from '@/lib/olx'

// Nunca logar `code`, `access_token`, `refresh_token` nem o corpo da resposta
// da OLX — só códigos de erro e status HTTP.

function voltar(request: NextRequest, resultado: 'conectado' | 'erro', motivo?: string) {
  const url = new URL('/admin/configuracoes', request.url)
  url.searchParams.set('olx', resultado)
  if (motivo) url.searchParams.set('motivo', motivo)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const erroOlx = params.get('error')
  const code = params.get('code')

  // State é validado antes de tudo, inclusive no caminho de erro/negação:
  // sem state válido não há como saber que a requisição veio do nosso /connect.
  let lojaIdState: string | null
  try {
    lojaIdState = verificarState(params.get('state'))
  } catch {
    console.error('[olx/callback] OLX_STATE_SECRET não configurado')
    return voltar(request, 'erro', 'config')
  }
  if (!lojaIdState) return voltar(request, 'erro', 'state')

  const loja = await getLoja()
  if (!loja) return voltar(request, 'erro', 'loja')
  if (loja.id !== lojaIdState) return voltar(request, 'erro', 'loja_divergente')

  if (erroOlx) {
    if (erroOlx === 'access_denied') return voltar(request, 'erro', 'negado')
    console.error(`[olx/callback] OLX retornou error=${erroOlx.slice(0, 64)} loja=${loja.id}`)
    return voltar(request, 'erro', 'olx')
  }
  if (!code) return voltar(request, 'erro', 'olx')

  const clientId = process.env.OLX_CLIENT_ID
  const clientSecret = process.env.OLX_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('[olx/callback] OLX_CLIENT_ID/OLX_CLIENT_SECRET não configurados')
    return voltar(request, 'erro', 'config')
  }

  let tokenResp: Response
  try {
    tokenResp = await fetch(OLX_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: olxRedirectUri(loja),
        grant_type: 'authorization_code',
      }),
      cache: 'no-store',
    })
  } catch {
    console.error(`[olx/callback] falha de rede na troca do code loja=${loja.id}`)
    return voltar(request, 'erro', 'troca')
  }

  let corpo: Record<string, unknown> = {}
  try {
    corpo = (await tokenResp.json()) as Record<string, unknown>
  } catch {
    // corpo não-JSON — tratado abaixo como falha
  }

  const accessToken = typeof corpo.access_token === 'string' ? corpo.access_token : null
  if (!tokenResp.ok || !accessToken) {
    const codigoErro = typeof corpo.error === 'string' ? corpo.error.slice(0, 64) : 'sem_error'
    console.error(`[olx/callback] troca do code falhou status=${tokenResp.status} error=${codigoErro} loja=${loja.id}`)
    return voltar(request, 'erro', 'troca')
  }

  // A doc da OLX só documenta access_token + token_type. Se um dia vierem
  // refresh_token / expires_in (nomes padrão RFC 6749), guardamos; senão null.
  const refreshToken = typeof corpo.refresh_token === 'string' ? corpo.refresh_token : null
  const expiresIn = typeof corpo.expires_in === 'number' && corpo.expires_in > 0 ? corpo.expires_in : null
  const agora = new Date()

  const { error } = await adminSupabase()
    .from('olx_integracoes')
    .upsert(
      {
        loja_id: loja.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresIn ? new Date(agora.getTime() + expiresIn * 1000).toISOString() : null,
        autorizado_em: agora.toISOString(),
        atualizado_em: agora.toISOString(),
      },
      { onConflict: 'loja_id' }
    )

  if (error) {
    console.error(`[olx/callback] erro ao gravar olx_integracoes loja=${loja.id} code=${error.code}`)
    return voltar(request, 'erro', 'banco')
  }

  return voltar(request, 'conectado')
}
