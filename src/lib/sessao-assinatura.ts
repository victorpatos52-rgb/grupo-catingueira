// Cabeçalho interno com o usuário validado pelo proxy (src/proxy.ts).
//
// O proxy é o ÚNICO lugar que fala com o Supabase Auth (getUser): valida a
// sessão, renova o token quando precisa e devolve os cookies ao navegador.
// Depois repassa o id do usuário para o resto do servidor (layout, páginas,
// Server Actions, rotas /api) neste cabeçalho.
//
// Por que ASSINADO (HMAC) e não só o id:
//   - O proxy sempre apaga/sobrescreve o cabeçalho, mas uma Server Action pode
//     ser chamada por POST em qualquer caminho de página — inclusive caminhos
//     que o matcher do proxy não cobre (ex.: /veiculo/x.y). Sem assinatura,
//     bastaria mandar o cabeçalho com o id de um admin.
//   - Com HMAC, só o servidor (que conhece o segredo) consegue gerar um valor
//     válido. Validade curta (5 min) — o cabeçalho nunca sai do servidor.
//
// Por que não auth.getClaims() nas páginas: getClaims lê a sessão pelo mesmo
// caminho do getUser (__loadSession), que RENOVA o token quando faltam < 90 s
// — no servidor de páginas o cookie novo não pode ser gravado e o refresh
// token antigo fica "gasto" no navegador (o Supabase revoga a sessão no reuso).
// Era exatamente a causa das quedas de login.
//
// Web Crypto (crypto.subtle): funciona no proxy e nas rotas Node.

export const CABECALHO_SESSAO = 'x-sessao-usuario'

const VALIDADE_S = 300
const encoder = new TextEncoder()

function segredo(): string {
  const s = process.env.SESSAO_HEADER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('Sem segredo para assinar a sessão (SESSAO_HEADER_SECRET ou SUPABASE_SERVICE_ROLE_KEY).')
  return s
}

let chaveCache: Promise<CryptoKey> | null = null
function chave(): Promise<CryptoKey> {
  chaveCache ??= crypto.subtle.importKey('raw', encoder.encode(segredo()), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ])
  return chaveCache
}

function base64url(bytes: ArrayBuffer): string {
  let bin = ''
  for (const b of new Uint8Array(bytes)) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function deBase64url(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((texto.length + 3) % 4)
    const bin = atob(b64)
    const bytes = new Uint8Array(new ArrayBuffer(bin.length))
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/** Gera o valor do cabeçalho para o usuário (usado só pelo proxy). */
export async function assinarSessao(userId: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + VALIDADE_S
  const carga = `${userId}.${exp}`
  const assinatura = await crypto.subtle.sign('HMAC', await chave(), encoder.encode(carga))
  return `${carga}.${base64url(assinatura)}`
}

/** Valida o cabeçalho e devolve o id do usuário, ou null (ausente, forjado ou vencido). */
export async function verificarSessao(valor: string | null | undefined): Promise<string | null> {
  if (!valor) return null
  const partes = valor.split('.')
  if (partes.length !== 3) return null
  const [userId, expTexto, assinaturaTexto] = partes
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null
  const exp = Number(expTexto)
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null
  const assinatura = deBase64url(assinaturaTexto)
  if (!assinatura) return null
  const ok = await crypto.subtle.verify('HMAC', await chave(), assinatura, encoder.encode(`${userId}.${expTexto}`))
  return ok ? userId : null
}
