import type { MetadataRoute } from 'next'
import { getLoja } from '@/lib/getLoja'
import { getTenantIconSet } from '@/lib/tenant-assets'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const loja = await getLoja()

  const nome = loja?.nome ?? 'Catingueira Multimarcas'
  const corPrimaria = loja?.cor_primaria ?? '#F5C842'
  const icones = getTenantIconSet(loja)

  return {
    name: nome,
    short_name: nome.split(' ')[0],
    description: loja?.descricao ?? loja?.sobre ?? `Veículos seminovos — ${nome}`,
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: corPrimaria,
    theme_color: corPrimaria,
    icons: [
      { src: icones.icon192, sizes: '192x192', type: 'image/png' },
      { src: icones.icon512, sizes: '512x512', type: 'image/png' },
      { src: icones.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
