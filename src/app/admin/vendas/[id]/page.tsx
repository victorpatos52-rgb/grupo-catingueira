import { redirect, notFound } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { adminSupabase } from '@/lib/supabase-server'
import { conferirLojaDoRegistro, obterLojaAtivaId } from '@/lib/loja-ativa'
import AvisoOutraLoja from '@/components/admin/AvisoOutraLoja'
import type { AnexoComUrl } from '@/components/admin/AnexosClient'
import type { UsuarioPerfil, Venda, Loja, Anexo, VendaPagamento, VendaPromissoria } from '@/types'
import VendaDetalheClient from './VendaDetalheClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VendaDetalhePage({ params }: Props) {
  const { id } = await params

  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()
  const lojaId = await obterLojaAtivaId(perfil)
  // "Lançar despesa neste veículo" e Promissórias são financeiro completo —
  // admin apenas. Anexos de venda (abaixo) não usam nenhuma dessas duas
  // flags — continuam abertos a qualquer perfil da loja, como já eram.
  const podeVerFinanceiroCompleto = perfil.perfil === 'admin'

  const admin = adminSupabase()

  // Venda de outra loja: aviso para trocar o seletor (admin/diretor) ou 404.
  const { data: alvo } = await admin.from('vendas').select('loja_id').eq('id', id).maybeSingle()
  if (!alvo) notFound()
  const conferencia = await conferirLojaDoRegistro(perfil, alvo.loja_id)
  if (conferencia.status === 'outra-loja') {
    return (
      <AvisoOutraLoja
        lojaId={conferencia.loja.id}
        lojaNome={conferencia.loja.nome}
        voltarHref="/admin/vendas"
        voltarTexto="Voltar para as vendas"
      />
    )
  }
  if (conferencia.status === 'negado') notFound()

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
    // tinham (sempre aberta, diferente de anexos/aquisição do veículo).
    admin
      .from('venda_pagamentos')
      .select('*')
      .eq('venda_id', id)
      .order('criado_em', { ascending: true }),
    // Promissórias são financeiro completo (mesmo nível de despesas/
    // lançamentos) — admin apenas, só busca se o perfil tiver permissão.
    podeVerFinanceiroCompleto
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
      podeVerFinanceiroCompleto={podeVerFinanceiroCompleto}
    />
  )
}
