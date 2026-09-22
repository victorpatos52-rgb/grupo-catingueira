import type { MetadataRoute } from 'next'
import { getLoja } from '@/lib/getLoja'
import { getTenantLogoUrl } from '@/lib/tenant-assets'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const loja = await getLoja()

  const nome = loja?.nome ?? 'Catingueira Multimarcas'
  const corPrimaria = loja?.cor_primaria ?? '#F5C842'
  const logoUrl = getTenantLogoUrl(loja)

  return {
    name: nome,
    short_name: nome.split(' ')[0],
    description: loja?.descricao ?? loja?.sobre ?? `Veículos seminovos — ${nome}`,
    start_url: '/',
    display: 'standalone',
    background_color: corPrimaria,
    theme_color: corPrimaria,
    icons: [
      { src: logoUrl, sizes: '192x192', type: 'image/png' },
      { src: logoUrl, sizes: '512x512', type: 'image/png' },
      { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
