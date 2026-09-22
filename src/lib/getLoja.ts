import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import type { Loja } from '@/types'

/**
 * Resolve a loja (tenant). Se a env var LOJA_SLUG estiver definida, resolve
 * por `lojas.slug` e ignora o Host — útil em dev local (ou qualquer
 * ambiente onde o domínio não é confiável/configurado). Sem LOJA_SLUG, cai
 * na resolução por Host (`lojas.dominio`), como sempre foi.
 *
 * Não existe fallback para "qualquer loja" — se nada bater, é um estado de
 * erro real (slug/domínio mal configurado na Vercel ou no banco) e deve ser
 * tratado como tal por quem chama, nunca mascarado servindo outra loja.
 */
export async function getLoja(): Promise<Loja | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const lojaSlug = process.env.LOJA_SLUG?.trim()

  if (lojaSlug) {
    try {
      const { data: loja, error } = await supabase
        .from('lojas')
        .select('*')
        .eq('slug', lojaSlug)
        .single()

      if (error || !loja) {
        console.error(
          `[getLoja] LOJA_SLUG="${lojaSlug}" definida mas nenhuma loja encontrada`,
          error ? `erro supabase: ${error.message} (code=${error.code})` : 'nenhuma linha correspondente em lojas.slug'
        )
        return null
      }

      return loja
    } catch (err) {
      console.error(`[getLoja] falha inesperada resolvendo tenant por LOJA_SLUG="${lojaSlug}":`, err)
      return null
    }
  }

  let host = 'localhost'

  try {
    const headersList = await headers()
    host =
      headersList.get('x-forwarded-host') ||
      headersList.get('host') ||
      'localhost'
    const dominio = host.replace('www.', '').split(':')[0].trim()

    const { data: loja, error } = await supabase
      .from('lojas')
      .select('*')
      .eq('dominio', dominio)
      .single()

    if (error || !loja) {
      console.error(
        `[getLoja] nenhuma loja encontrada para host="${host}" dominio="${dominio}"`,
        error ? `erro supabase: ${error.message} (code=${error.code})` : 'nenhuma linha correspondente em lojas.dominio'
      )
      return null
    }

    return loja
  } catch (err) {
    console.error(`[getLoja] falha inesperada resolvendo tenant para host="${host}":`, err)
    return null
  }
}
