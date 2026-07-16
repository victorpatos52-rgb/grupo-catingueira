import type { MetadataRoute } from 'next'
import { getLoja } from '@/lib/getLoja'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const loja = await getLoja()

  const isFelizardo = (loja?.dominio ?? loja?.nome ?? '').toLowerCase().includes('felizardo')
  const slug = isFelizardo ? 'felizardo' : 'catingueira'
  const nome = loja?.nome ?? (isFelizardo ? 'Felizardo Veículos' : 'Catingueira Multimarcas')
  const corPrimaria = loja?.cor_primaria ?? '#F5C842'

  return {
    name: nome,
    short_name: nome.split(' ')[0],
    description: loja?.descricao ?? loja?.sobre ?? `Veículos seminovos — ${nome}`,
    start_url: '/',
    display: 'standalone',
    background_color: corPrimaria,
    theme_color: corPrimaria,
    icons: [
      { src: `/icons/${slug}-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `/icons/${slug}-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `/icons/${slug}-maskable.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
