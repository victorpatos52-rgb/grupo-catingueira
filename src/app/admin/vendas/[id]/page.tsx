import { redirect, notFound } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { UsuarioPerfil, Venda, Loja } from '@/types'
import VendaDetalheClient from './VendaDetalheClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VendaDetalhePage({ params }: Props) {
  const { id } = await params

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

  const [{ data: vendaData }, { data: lojaData }] = await Promise.all([
    admin
      .from('vendas')
      .select('*, veiculo:veiculos(id,marca,modelo,versao,ano,cor,km,cambio,combustivel,preco,placa,fotos), vendedor:usuarios_perfil(nome)')
      .eq('id', id)
      .eq('loja_id', lojaId)
      .single(),
    admin.from('lojas').select('*').eq('id', lojaId).single(),
  ])

  if (!vendaData) notFound()

  return (
    <VendaDetalheClient
      venda={vendaData as Venda}
      loja={lojaData as Loja}
      perfil={perfil}
    />
  )
}
