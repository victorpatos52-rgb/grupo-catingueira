import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { Loja, UsuarioPerfil } from '@/types'
import ConfiguracoesForm from './ConfiguracoesForm'

export default async function ConfiguracoesPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()

  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')
  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const lojaId = await getLojaIdAtiva(perfil)

  const { data } = await supabase.from('lojas').select('*').eq('id', lojaId).single()
  if (!data) redirect('/admin/dashboard')

  const loja = data as Loja

  return <ConfiguracoesForm loja={loja} />
}
