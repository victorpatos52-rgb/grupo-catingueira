// Resolução centralizada do logo/ícone de cada loja. Substitui as antigas
// detecções por substring (`nome.includes('felizardo')` etc.) espalhadas em
// Header, Footer, layout.tsx, manifest.ts e nas rotas de PDF: a fonte da
// verdade passa a ser sempre `lojas.logo_url`.

/** Logo usado quando `lojas.logo_url` está vazio — fallback explícito, nunca silencioso (ver avisarLogoAusente). */
export const DEFAULT_LOGO_URL = '/logo-catingueira.png'

type LojaComLogo = {
  id?: string | null
  nome?: string | null
  logo_url?: string | null
} | null | undefined

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
