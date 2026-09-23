// Resolução centralizada do logo/ícone de cada loja. Substitui as antigas
// detecções por substring (`nome.includes('felizardo')` etc.) espalhadas em
// Header, Footer, layout.tsx, manifest.ts e nas rotas de PDF: a fonte da
// verdade passa a ser sempre `lojas.logo_url`.

/** Logo usado quando `lojas.logo_url` está vazio — fallback explícito, nunca silencioso (ver avisarLogoAusente). */
export const DEFAULT_LOGO_URL = '/logo-catingueira.png'

interface LojaComLogoObj {
  id?: string | null
  nome?: string | null
  logo_url?: string | null
}

type LojaComLogo = LojaComLogoObj | null | undefined

const avisadas = new Set<string>()

function avisarLogoAusente(loja: LojaComLogo) {
  const chave = loja?.id ?? loja?.nome ?? 'desconhecida'
  if (avisadas.has(chave)) return
  avisadas.add(chave)
  console.warn(
    `[tenant-assets] loja "${loja?.nome ?? chave}" está sem lojas.logo_url no banco — usando fallback padrão (${DEFAULT_LOGO_URL}). Preencha a coluna logo_url para essa loja.`
  )
}

/** Retorna o logo/ícone da loja (a partir de `logo_url`), com fallback explícito e avisado quando a coluna estiver vazia. */
export function getTenantLogoUrl(loja: LojaComLogo): string {
  if (loja?.logo_url) return loja.logo_url
  avisarLogoAusente(loja)
  return DEFAULT_LOGO_URL
}

interface LojaComFaviconObj extends LojaComLogoObj {
  favicon_url?: string | null
}

type LojaComFavicon = LojaComFaviconObj | null | undefined

const avisadasFavicon = new Set<string>()

function avisarFaviconAusente(loja: LojaComFavicon) {
  const chave = loja?.id ?? loja?.nome ?? 'desconhecida'
  if (avisadasFavicon.has(chave)) return
  avisadasFavicon.add(chave)
  console.warn(
    `[tenant-assets] loja "${loja?.nome ?? chave}" está sem lojas.favicon_url no banco — caindo para logo_url em app/icon.tsx. Faça upload do favicon em /admin/configuracoes.`
  )
}

/** Favicon dinâmico (ver src/app/icon.tsx) — cai pra logo_url e depois pro DEFAULT_LOGO_URL quando favicon_url estiver vazio. */
export function getTenantFaviconUrl(loja: LojaComFavicon): string {
  if (loja?.favicon_url) return loja.favicon_url
  avisarFaviconAusente(loja)
  return getTenantLogoUrl(loja)
}
