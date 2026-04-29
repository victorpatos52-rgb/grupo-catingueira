import { headers } from 'next/headers'
import { createServerSupabase } from './supabase-server'
import type { Loja } from '@/types'

export async function getLoja(): Promise<Loja | null> {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''

  const dominio = host.replace(/^www\./, '').replace(/:\d+$/, '')

  const supabase = await createServerSupabase()

  if (dominio === 'localhost' || dominio === '127.0.0.1') {
    const { data } = await supabase
      .from('lojas')
      .select('*')
      .eq('dominio', 'catingueira.com.br')
      .single()
    return data as Loja | null
  }

  const { data } = await supabase
    .from('lojas')
    .select('*')
    .eq('dominio', dominio)
    .single()

  return data as Loja | null
}
