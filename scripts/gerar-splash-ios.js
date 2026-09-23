// Gera as telas de abertura (apple-touch-startup-image) do PWA no iOS, uma
// por loja/tamanho de dispositivo — evita o flash branco entre tocar no
// ícone e o app carregar (iOS não usa o `background_color` do manifest.ts
// pra isso como o Android faz; precisa desses PNGs estáticos ligados via
// <link rel="apple-touch-startup-image"> com media query por dispositivo).
// Rodar com: node scripts/gerar-splash-ios.js
// Não faz parte do build/app — utilidade de dev para regenerar
// public/splash/*.png sempre que as logos/cores mudarem.

const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const publicDir = path.join(__dirname, '..', 'public')
const splashDir = path.join(publicDir, 'splash')

// Mesma lógica de contraste por loja do gerar-icones-pwa.js: Catingueira usa
// a cor_primaria (a logo já tem placa escura embutida, contrasta bem);
// Felizardo usa a cor_secundaria clara (a logo é wordmark azul-marinho sem
// fundo próprio — a cor_primaria escura deixaria o texto quase invisível).
const LOJAS = [
  { slug: 'catingueira', logo: 'logo-catingueira.png', bg: '#F5C842' },
  { slug: 'felizardo', logo: 'logo-felizardo.png', bg: '#C8D0DC' },
]

// Cobre os buckets de aspect-ratio/DPR mais comuns entre os iPhones em uso
// hoje (não é exaustivo pra cada geração de iPad/iPhone — como o fundo é uma
// cor sólida de ponta a ponta, um leve mismatch de proporção em modelos não
// listados ainda assim evita o flash branco, só sem ser pixel-perfect).
// device-width/height em CSS px (o que a media query do Safari usa):
const TAMANHOS = [
  { cssW: 375, cssH: 667, dpr: 2 },  // SE (2ª/3ª ger.), 6/7/8
  { cssW: 375, cssH: 812, dpr: 3 },  // X/XS/11 Pro, 12/13 mini
  { cssW: 414, cssH: 896, dpr: 2 },  // XR, 11
  { cssW: 414, cssH: 896, dpr: 3 },  // XS Max, 11 Pro Max
  { cssW: 390, cssH: 844, dpr: 3 },  // 12/13/14
  { cssW: 428, cssH: 926, dpr: 3 },  // 12/13 Pro Max, 14 Plus
]

async function gerarSplash(loja, tamanho) {
  const { cssW, cssH, dpr } = tamanho
  const width = cssW * dpr
  const height = cssH * dpr

  const logoPath = path.join(publicDir, loja.logo)
  // Logo ocupa ~45% da largura — proporção confortável de splash screen
  // (bem mais folga que um ícone, que usa ~70%).
  const logoMaxDim = Math.round(width * 0.45)

  const logoBuffer = await sharp(logoPath)
    .resize(logoMaxDim, logoMaxDim, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()

  const logoMeta = await sharp(logoBuffer).metadata()
  const left = Math.round((width - (logoMeta.width ?? logoMaxDim)) / 2)
  const top = Math.round((height - (logoMeta.height ?? logoMaxDim)) / 2)

  const outPath = path.join(splashDir, `${loja.slug}-${width}x${height}.png`)
  await sharp({
    create: { width, height, channels: 4, background: loja.bg },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png()
    .toFile(outPath)

  console.log('gerado:', path.relative(path.join(__dirname, '..'), outPath))
}

async function main() {
  fs.mkdirSync(splashDir, { recursive: true })
  for (const loja of LOJAS) {
    for (const tamanho of TAMANHOS) {
      await gerarSplash(loja, tamanho)
    }
  }
  console.log('OK — splash screens iOS geradas em public/splash/')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
