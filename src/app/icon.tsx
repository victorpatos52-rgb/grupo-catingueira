import { readFile } from 'fs/promises'
import path from 'path'
import { getLoja } from '@/lib/getLoja'
import { getTenantFaviconUrl } from '@/lib/tenant-assets'

const EXT_CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
}

function contentTypeFromUrl(url: string): string {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase() ?? ''
  return EXT_CONTENT_TYPE[ext] ?? 'image/png'
}

async function lerAssetLocal(urlRelativa: string): Promise<Response> {
  const buffer = await readFile(path.join(process.cwd(), 'public', urlRelativa))
  return new Response(new Uint8Array(buffer), {
    headers: { 'Content-Type': contentTypeFromUrl(urlRelativa) },
  })
}

// Substitui o favicon.ico estático (compartilhado por todas as lojas) por um
// favicon por tenant, lido de `lojas.favicon_url` (com fallback em cascata
// pra logo_url e por fim pro logo padrão — ver getTenantFaviconUrl).
export default async function Icon() {
  const loja = await getLoja()
  const url = getTenantFaviconUrl(loja)

  if (url.startsWith('/')) {
    return lerAssetLocal(url)
  }

  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const buffer = await res.arrayBuffer()
    return new Response(buffer, {
      headers: { 'Content-Type': res.headers.get('content-type') ?? contentTypeFromUrl(url) },
    })
  } catch (err) {
    console.error(`[icon] falha ao buscar favicon em "${url}", usando fallback local:`, err)
    return lerAssetLocal('/logo-catingueira.png')
  }
}
