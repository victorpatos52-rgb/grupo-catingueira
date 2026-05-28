import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { UsuarioPerfil, Veiculo } from '@/types'
import NovaVendaClient from './NovaVendaClient'

interface Props {
  searchParams: Promise<{ veiculo_id?: string }>
}

export default async function NovaVendaPage({ searchParams }: Props) {
  const { veiculo_id } = await searchParams

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

  const [{ data: veiculosData }, { data: usuariosData }] = await Promise.all([
    admin
      .from('veiculos')
      .select('id,marca,modelo,versao,ano,cor,km,cambio,combustivel,preco,placa,fotos,status')
      .eq('loja_id', lojaId)
      .in('status', ['disponivel', 'reservado'])
      .order('created_at', { ascending: false }),
    admin
      .from('usuarios_perfil')
      .select('id,nome,perfil')
      .eq('loja_id', lojaId)
      .eq('ativo', true),
  ])

  const veiculos = (veiculosData ?? []) as Veiculo[]
  const usuarios = (usuariosData ?? []) as UsuarioPerfil[]

  return (
    <NovaVendaClient
      perfil={perfil}
      veiculos={veiculos}
      usuarios={usuarios}
      lojaId={lojaId}
      vendedorId={user.id}
      veiculoIdInicial={veiculo_id ?? null}
    />
  )
}
