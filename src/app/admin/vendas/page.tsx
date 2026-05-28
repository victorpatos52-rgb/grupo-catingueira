import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { UsuarioPerfil, Venda } from '@/types'
import VendasClient from './VendasClient'

export default async function VendasPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!perfilData) redirect('/login')

  const perfil = perfilData as UsuarioPerfil
  const lojaId = await getLojaIdAtiva(perfil)

  const admin = adminSupabase()
  const { data } = await admin
    .from('vendas')
    .select('*, veiculo:veiculos(id,marca,modelo,ano,fotos,preco,placa,cor,km,cambio,combustivel,versao), vendedor:usuarios_perfil(nome)')
    .eq('loja_id', lojaId)
    .order('created_at', { ascending: false })

  const vendas = (data ?? []) as Venda[]

  return <VendasClient perfil={perfil} vendas={vendas} lojaId={lojaId} />
}
