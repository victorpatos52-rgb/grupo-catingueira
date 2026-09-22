import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import type { UsuarioPerfil } from '@/types'
import ConfiguracoesClient from './ConfiguracoesClient'

export default async function ConfiguracoesPage() {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil').select('*').eq('id', user.id).single()
  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')

  if (!['admin', 'diretor'].includes(perfil.perfil)) redirect('/admin/dashboard')

  return <ConfiguracoesClient />
}
