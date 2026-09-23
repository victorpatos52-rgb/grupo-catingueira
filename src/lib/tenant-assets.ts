// Resolução centralizada do logo/ícone de cada loja. Substitui as antigas
// detecções por substring (`nome.includes('felizardo')` etc.) espalhadas em
// Header, Footer, layout.tsx, manifest.ts e nas rotas de PDF: a fonte da
// verdade passa a ser sempre `lojas.logo_url`.

/** Logo usado quando `lojas.logo_url` está vazio — fallback explícito, nunca silencioso (ver avisarLogoAusente). */
export const DEFAULT_LOGO_URL = '/logo-catingueira.png'

interface LojaComLogoObj {
  id?: string | null
  nome?: string | null
  slug?: string | null
  logo_url?: string | null
}

type LojaComLogo = LojaComLogoObj | null | undefined

/**
 * Ícones estáticos pré-gerados em `public/icons/` por loja (ver migration
 * 015 pra origem dos slugs). Servem de fallback intermediário — entre
 * `favicon_url`/`logo_url` vazios no banco e o logo genérico padrão — sem
 * depender de upload manual em /admin/configuracoes.
 */
const ICONES_ESTATICOS: Record<string, { icon192: string; icon512: string; maskable512: string }> = {
  catingueira: {
    icon192: '/icons/catingueira-192.png',
    icon512: '/icons/catingueira-512.png',
    maskable512: '/icons/catingueira-maskable.png',
  },
  felizardo: {
    icon192: '/icons/felizardo-192.png',
    icon512: '/icons/felizardo-512.png',
    maskable512: '/icons/felizardo-maskable.png',
  },
}

function iconeEstatico(loja: LojaComLogo) {
  const slug = loja?.slug
  return slug ? ICONES_ESTATICOS[slug] : undefined
}

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
    `[tenant-assets] loja "${loja?.nome ?? chave}" está sem lojas.favicon_url no banco e sem ícone estático em public/icons/ — caindo para logo_url em app/icon.tsx. Faça upload do favicon em /admin/configuracoes.`
  )
}

/**
 * Favicon dinâmico (ver src/app/icon.tsx). Cascata: `favicon_url` do banco →
 * ícone estático da loja em `public/icons/` (sem depender de upload manual)
 * → `logo_url` → `DEFAULT_LOGO_URL`.
 */
export function getTenantFaviconUrl(loja: LojaComFavicon): string {
  if (loja?.favicon_url) return loja.favicon_url
  const estatico = iconeEstatico(loja)
  if (estatico) return estatico.icon512
  avisarFaviconAusente(loja)
  return getTenantLogoUrl(loja)
}

/** Fallback usado quando a busca por `getTenantFaviconUrl(loja)` falha em runtime (ex.: favicon_url do banco aponta pra uma URL quebrada). */
export function getTenantFaviconFallbackUrl(loja: LojaComFavicon): string {
  const estatico = iconeEstatico(loja)
  if (estatico) return estatico.icon512
  return getTenantLogoUrl(loja)
}

export interface TenantIconSet {
  icon192: string
  icon512: string
  maskable512: string
}

/**
 * Conjunto de ícones do manifest.ts (192/512/maskable). Prioriza os
 * arquivos estáticos por loja em `public/icons/` — já no tamanho certo e,
 * no caso do maskable, com safe zone — antes de cair pro `logo_url` cru
 * (mesmo arquivo repetido nos três tamanhos).
 */
export function getTenantIconSet(loja: LojaComFavicon): TenantIconSet {
  const estatico = iconeEstatico(loja)
  if (estatico) return estatico
  const logo = getTenantLogoUrl(loja)
  return { icon192: logo, icon512: logo, maskable512: logo }
}

export interface AppleStartupImage {
  url: string
  media?: string
}

// Mesmos buckets de device-width/height/DPR do scripts/gerar-splash-ios.js —
// mudar um lado exige mudar o outro (e regerar os PNGs).
const SPLASH_SIZES: { cssW: number; cssH: number; dpr: number; width: number; height: number }[] = [
  { cssW: 375, cssH: 667, dpr: 2, width: 750, height: 1334 },
  { cssW: 375, cssH: 812, dpr: 3, width: 1125, height: 2436 },
  { cssW: 414, cssH: 896, dpr: 2, width: 828, height: 1792 },
  { cssW: 414, cssH: 896, dpr: 3, width: 1242, height: 2688 },
  { cssW: 390, cssH: 844, dpr: 3, width: 1170, height: 2532 },
  { cssW: 428, cssH: 926, dpr: 3, width: 1284, height: 2778 },
]

/**
 * Telas de abertura do PWA no iOS (apple-touch-startup-image), por loja —
 * evita o flash branco entre tocar no ícone e o app carregar. Usa sempre os
 * PNGs estáticos gerados por scripts/gerar-splash-ios.js (public/splash/),
 * sem depender de upload em /admin/configuracoes. Loja sem slug conhecido
 * cai no conjunto da Catingueira (mesmo critério do DEFAULT_LOGO_URL).
 */
export function getTenantStartupImages(loja: LojaComLogo): AppleStartupImage[] {
  const slug = loja?.slug && ICONES_ESTATICOS[loja.slug] ? loja.slug : 'catingueira'
  const imagens: AppleStartupImage[] = SPLASH_SIZES.map(({ cssW, cssH, dpr, width, height }) => ({
    url: `/splash/${slug}-${width}x${height}.png`,
    media: `(device-width: ${cssW}px) and (device-height: ${cssH}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
  }))
  // Fallback sem media query (precisa vir por último — o Safari usa a
  // primeira que casar) — cobre iPad e qualquer iPhone fora da lista acima.
  // Como o fundo é cor sólida de ponta a ponta, ainda evita o flash branco
  // mesmo sem ser pixel-perfect pra esses tamanhos.
  imagens.push({ url: `/splash/${slug}-1284x2778.png` })
  return imagens
}
