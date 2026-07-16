// Script de geração dos ícones PWA a partir das logos de cada loja.
// Rodar com: node scripts/gerar-icones-pwa.js
// Não faz parte do build/app — é uma utilidade de desenvolvimento para
// regenerar public/icons/*.png sempre que as logos mudarem.

const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const publicDir = path.join(__dirname, '..', 'public')
const iconsDir = path.join(publicDir, 'icons')

const LOJAS = [
  // Catingueira: a logo já tem uma placa escura embutida atrás do texto,
  // então contrasta bem com o amarelo da marca (cor_primaria).
  { slug: 'catingueira', logo: 'logo-catingueira.png', bg: '#F5C842' },
  // Felizardo: a logo é um wordmark azul-marinho sem placa própria, feita
  // pra fundo claro — usar a cor_primaria (#1B3A6B, também azul-marinho)
  // deixaria a logo quase invisível. Usei a cor_secundaria (#C8D0DC, clara)
  // em vez da primária só pro PNG do ícone; o manifest continua usando a
  // cor_primaria de verdade pro theme_color/background_color.
  { slug: 'felizardo', logo: 'logo-felizardo.png', bg: '#C8D0DC' },
]

async function gerarIcone(loja, size, logoScale, sufixo) {
  const logoPath = path.join(publicDir, loja.logo)
  const logoMaxDim = Math.round(size * logoScale)

  const logoBuffer = await sharp(logoPath)
    .resize(logoMaxDim, logoMaxDim, { fit: 'inside', withoutEnlargement: true })
    .toBuffer()

  const logoMeta = await sharp(logoBuffer).metadata()
  const left = Math.round((size - (logoMeta.width ?? logoMaxDim)) / 2)
  const top = Math.round((size - (logoMeta.height ?? logoMaxDim)) / 2)

  const outPath = path.join(iconsDir, `${loja.slug}-${sufixo}.png`)
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: loja.bg,
    },
  })
    .composite([{ input: logoBuffer, left, top }])
    .png()
    .toFile(outPath)

  console.log('gerado:', path.relative(path.join(__dirname, '..'), outPath))
}

async function main() {
  fs.mkdirSync(iconsDir, { recursive: true })
  for (const loja of LOJAS) {
    // Ícones normais: logo ocupa ~70% do canvas, margem confortável.
    await gerarIcone(loja, 192, 0.7, '192')
    await gerarIcone(loja, 512, 0.7, '512')
    // Maskable: logo ocupa ~60% do canvas -> pelo menos 20% de padding
    // em cada lado, pra não cortar em ícones adaptativos do Android.
    await gerarIcone(loja, 512, 0.6, 'maskable')
  }
  console.log('OK — ícones PWA gerados em public/icons/')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
