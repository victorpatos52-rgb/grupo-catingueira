import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function getLoja() {
  const headersList = await headers()

  const host = headersList.get('x-forwarded-host') ||
               headersList.get('host') ||
               'localhost'

  const dominio = host.replace('www.', '').split(':')[0].trim()

  console.log('Domínio detectado:', dominio)

  // Usar service role para bypass do RLS na consulta pública de lojas
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: loja, error } = await supabase
    .from('lojas')
    .select('*')
    .eq('dominio', dominio)
    .single()

  if (error || !loja) {
    // Fallback: localhost
    const { data: fallback } = await supabase
      .from('lojas')
      .select('*')
      .eq('dominio', 'localhost')
      .single()
    return fallback
  }

  return loja
}
