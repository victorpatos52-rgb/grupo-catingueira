import { NextResponse, type NextRequest } from 'next/server'
import { getLoja } from '@/lib/getLoja'
import { OLX_AUTHORIZE_URL, OLX_SCOPE, criarState, olxRedirectUri, usuarioPodeGerenciarOlx } from '@/lib/olx'

function voltarComErro(request: NextRequest, motivo: string) {
  const url = new URL('/admin/configuracoes', request.url)
  url.searchParams.set('olx', 'erro')
  url.searchParams.set('motivo', motivo)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const loja = await getLoja()
  if (!loja) return voltarComErro(request, 'loja')

  if (!(await usuarioPodeGerenciarOlx(loja.id))) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const clientId = process.env.OLX_CLIENT_ID
  if (!clientId || !process.env.OLX_CLIENT_SECRET || !process.env.OLX_STATE_SECRET) {
    console.error('[olx/connect] variáveis OLX_CLIENT_ID/OLX_CLIENT_SECRET/OLX_STATE_SECRET não configuradas')
    return voltarComErro(request, 'config')
  }

  const url = new URL(OLX_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', olxRedirectUri(loja))
  url.searchParams.set('scope', OLX_SCOPE)
  url.searchParams.set('state', criarState(loja.id))

  return NextResponse.redirect(url)
}
