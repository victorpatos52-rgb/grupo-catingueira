import { readFile } from 'fs/promises'
import path from 'path'
import { getLoja } from '@/lib/getLoja'
import { DEFAULT_LOGO_URL, getTenantFaviconFallbackUrl, getTenantFaviconUrl } from '@/lib/tenant-assets'

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
// favicon por tenant: `lojas.favicon_url` → ícone estático da loja em
// public/icons/ → `lojas.logo_url` → logo padrão (ver getTenantFaviconUrl).
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
    const fallback = getTenantFaviconFallbackUrl(loja)
    console.error(`[icon] falha ao buscar favicon em "${url}", usando fallback "${fallback}":`, err)
    return lerAssetLocal(fallback.startsWith('/') ? fallback : DEFAULT_LOGO_URL)
  }
}
