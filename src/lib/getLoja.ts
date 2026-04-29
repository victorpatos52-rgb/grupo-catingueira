import { headers } from 'next/headers'
import { createServerSupabase } from './supabase-server'

export async function getLoja() {
  const headersList = await headers()

  // Tenta x-forwarded-host primeiro (Vercel), depois host
  const host = headersList.get('x-forwarded-host') ||
               headersList.get('host') ||
               'localhost'

  // Remove porta e www
  const dominio = host.replace('www.', '').split(':')[0]

  console.log('Domínio detectado:', dominio)

  const supabase = await createServerSupabase()

  const { data: loja } = await supabase
    .from('lojas')
    .select('*')
    .eq('dominio', dominio)
    .single()

  if (!loja) {
    // Fallback: busca localhost
    const { data: fallback } = await supabase
      .from('lojas')
      .select('*')
      .eq('dominio', 'localhost')
      .single()
    return fallback
  }

  return loja
}
