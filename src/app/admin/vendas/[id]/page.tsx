import { redirect, notFound } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { AnexoComUrl } from '@/components/admin/AnexosClient'
import type { UsuarioPerfil, Venda, Loja, Anexo } from '@/types'
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
  const podeVerDocumentacao = ['gerente', 'diretor', 'admin'].includes(perfil.perfil)

  const admin = adminSupabase()

  const [{ data: vendaData }, { data: lojaData }, { data: anexosData }] = await Promise.all([
    admin
      .from('vendas')
      .select('*, veiculo:veiculos(id,marca,modelo,versao,ano,cor,km,cambio,combustivel,preco,placa,fotos), vendedor:usuarios_perfil(nome)')
      .eq('id', id)
      .eq('loja_id', lojaId)
      .single(),
    admin.from('lojas').select('*').eq('id', lojaId).single(),
    // Anexos de venda são tão sensíveis quanto os de veículo — só busca
    // (e só gera signed URLs) se o perfil tiver permissão de vê-los.
    podeVerDocumentacao
      ? admin
          .from('anexos')
          .select('*, usuario:usuarios_perfil(nome)')
          .eq('entidade_tipo', 'venda')
          .eq('entidade_id', id)
          .order('criado_em', { ascending: false })
      : Promise.resolve({ data: [] as Anexo[] }),
  ])

  if (!vendaData) notFound()

  const anexos: AnexoComUrl[] = await Promise.all(
    ((anexosData ?? []) as Anexo[]).map(async a => {
      const { data: signed } = await admin.storage.from('veiculos-documentos').createSignedUrl(a.url, 3600)
      return { ...a, urlAssinada: signed?.signedUrl ?? null }
    })
  )

  return (
    <VendaDetalheClient
      venda={vendaData as Venda}
      loja={lojaData as Loja}
      perfil={perfil}
      anexos={anexos}
      podeVerDocumentacao={podeVerDocumentacao}
    />
  )
}
