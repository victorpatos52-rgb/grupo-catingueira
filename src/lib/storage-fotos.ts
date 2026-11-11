// Caminhos no bucket público `veiculos-fotos`. Sem dependência de navegador
// ou servidor — usado pelo upload (client) e pelas Server Actions que apagam
// arquivos.
//
// Padrões de caminho (confirmados no histórico do git):
//   {loja_id}/{timestamp}-{aleatorio}.jpg               — fotos de veículo (desde abr/2026)
//   configuracoes/{loja_id}/{chave}-{timestamp}.{ext}   — imagens da home (atual)
//   configuracoes/{loja_id}/galeria/{timestamp}.{ext}   — galeria da home (atual)
//   landing/{loja_id}/{chave}-{timestamp}.{ext}         — imagens da home (set/2026, legado)

export const BUCKET_FOTOS = 'veiculos-fotos'

const PREFIXO_PUBLICO = `/storage/v1/object/public/${BUCKET_FOTOS}/`
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Extrai o caminho do objeto a partir da URL pública do Supabase Storage.
 * Retorna null se a URL não for do bucket de fotos deste projeto.
 */
export function caminhoDaUrlPublicaFoto(url: string): string | null {
  try {
    const u = new URL(url)
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (base && u.host !== new URL(base).host) return null
    if (!u.pathname.startsWith(PREFIXO_PUBLICO)) return null
    const caminho = decodeURIComponent(u.pathname.slice(PREFIXO_PUBLICO.length))
    if (!caminho || caminho.includes('..') || caminho.startsWith('/')) return null
    return caminho
  } catch {
    return null
  }
}

/** Loja dona do arquivo pelo caminho (mesma regra das policies de Storage da migration 021). */
export function lojaDoCaminhoFoto(caminho: string): string | null {
  const partes = caminho.split('/')
  const pasta = partes[0] === 'configuracoes' || partes[0] === 'landing' ? partes[1] : partes[0]
  return pasta && UUID.test(pasta) ? pasta.toLowerCase() : null
}

/** Foto de veículo: caminho `{loja_id}/arquivo` (não pasta de configurações). */
export function ehCaminhoFotoVeiculo(caminho: string): boolean {
  const partes = caminho.split('/')
  return partes.length === 2 && UUID.test(partes[0]) && partes[1].length > 0
}

// ─── Miniaturas ───────────────────────────────────────────────────────────────
//
// Cada foto tem uma miniatura no MESMO lugar, com o mesmo nome-base:
//   {base}.jpg | {base}.jpeg | {base}.png | {base}.webp | {base}.v2.jpg
//     → {base}.thumb.webp
// (`.v2` é o sufixo das fotos recomprimidas pelo scripts/fotos-recomprimir.mjs:
// a miniatura é a mesma da foto original.) Nenhuma coluna nova no banco: a URL
// da miniatura é derivada da URL da foto. Onde a miniatura ainda não existir
// (fotos antigas antes do script), as telas caem para a original
// (components/ui/ImagemMiniatura.tsx).

const RE_EXTENSAO = /(\.v2)?\.(jpe?g|png|webp|gif)$/i

/** Caminho da miniatura de um caminho de foto no bucket. */
export function caminhoMiniatura(caminho: string): string {
  if (caminho.endsWith('.thumb.webp')) return caminho
  return RE_EXTENSAO.test(caminho) ? caminho.replace(RE_EXTENSAO, '.thumb.webp') : `${caminho}.thumb.webp`
}

/**
 * URL da miniatura de uma foto do bucket. URLs de fora do bucket (ex.:
 * Unsplash) voltam iguais.
 */
export function urlMiniatura(url: string | null | undefined): string {
  if (!url) return ''
  const caminho = caminhoDaUrlPublicaFoto(url)
  if (!caminho) return url
  const u = new URL(url)
  const miniatura = caminhoMiniatura(caminho)
  u.pathname = PREFIXO_PUBLICO + miniatura.split('/').map(encodeURIComponent).join('/')
  u.search = ''
  return u.toString()
}
