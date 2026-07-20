import { redirect, notFound } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { AnexoComUrl } from '@/components/admin/AnexosClient'
import type { UsuarioPerfil, Venda, Loja, Anexo, VendaPagamento, VendaPromissoria } from '@/types'
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

  const [{ data: vendaData }, { data: lojaData }, { data: anexosData }, { data: pagamentosData }, { data: promissoriasData }] = await Promise.all([
    admin
      .from('vendas')
      .select('*, veiculo:veiculos(id,marca,modelo,versao,ano,cor,km,cambio,combustivel,preco,placa,fotos), vendedor:usuarios_perfil(nome)')
      .eq('id', id)
      .eq('loja_id', lojaId)
      .single(),
    admin.from('lojas').select('*').eq('id', lojaId).single(),
    // Anexos de venda (contrato assinado etc.) são uso do dia a dia do
    // vendedor — diferente dos anexos de veículo (documentação/aquisição),
    // não ficam atrás do gate de gerente/diretor/admin.
    admin
      .from('anexos')
      .select('*, usuario:usuarios_perfil(nome)')
      .eq('entidade_tipo', 'venda')
      .eq('entidade_id', id)
      .order('criado_em', { ascending: false }),
    // Lista de pagamentos — mesma visibilidade que os campos fixos antigos
    // tinham (não restrita a podeVerDocumentacao, diferente de anexos/aquisição).
    admin
      .from('venda_pagamentos')
      .select('*')
      .eq('venda_id', id)
      .order('criado_em', { ascending: true }),
    // Promissórias são dado financeiro (mesmo nível de despesas/lançamentos) —
    // só busca se o perfil tiver permissão de vê-las.
    podeVerDocumentacao
      ? admin
          .from('venda_promissorias')
          .select('*')
          .eq('venda_id', id)
          .order('numero_parcela', { ascending: true })
      : Promise.resolve({ data: [] as VendaPromissoria[] }),
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
      pagamentos={(pagamentosData ?? []) as VendaPagamento[]}
      promissorias={(promissoriasData ?? []) as VendaPromissoria[]}
      podeVerDocumentacao={podeVerDocumentacao}
    />
  )
}
