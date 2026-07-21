import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { UsuarioPerfil, Veiculo, Venda, VendaPagamento } from '@/types'
import NovaVendaClient from './NovaVendaClient'

interface Props {
  searchParams: Promise<{ veiculo_id?: string; venda_id?: string }>
}

export default async function NovaVendaPage({ searchParams }: Props) {
  const { veiculo_id, venda_id } = await searchParams

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

  // Retomar um rascunho pelo assistente (?venda_id=) — só faz sentido pra
  // venda ainda não finalizada; se já foi finalizada (link antigo, favorito),
  // manda pra tela de detalhe, que é read-only pros dados da negociação.
  // Id inválido/de outra loja é ignorado silenciosamente (cai no fluxo de
  // venda nova em branco, sem 404 pra um caso tão marginal).
  let vendaInicial: Venda | null = null
  let pagamentosIniciais: VendaPagamento[] = []
  if (venda_id) {
    const { data: vendaData } = await admin
      .from('vendas')
      .select('*')
      .eq('id', venda_id)
      .eq('loja_id', lojaId)
      .maybeSingle()
    if (vendaData) {
      if (vendaData.status !== 'rascunho') {
        redirect('/admin/vendas/' + venda_id)
      }
      vendaInicial = vendaData as Venda
      const { data: pagamentosData } = await admin
        .from('venda_pagamentos')
        .select('*')
        .eq('venda_id', venda_id)
        .order('criado_em', { ascending: true })
      pagamentosIniciais = (pagamentosData ?? []) as VendaPagamento[]
    }
  }

  const [{ data: veiculosData }, { data: usuariosData }] = await Promise.all([
    admin
      .from('veiculos')
      .select('id,marca,modelo,versao,ano,cor,km,cambio,combustivel,preco,placa,fotos,status')
      .eq('loja_id', lojaId)
      .eq('excluido', false)
      .in('status', ['disponivel', 'reservado'])
      .order('created_at', { ascending: false }),
    admin
      .from('usuarios_perfil')
      .select('id,nome,perfil')
      .eq('loja_id', lojaId)
      .eq('ativo', true)
      // Sócio não é vendedor — não deve aparecer como opção de "vendedor responsável"
      .neq('perfil', 'socio'),
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
      vendaInicial={vendaInicial}
      pagamentosIniciais={pagamentosIniciais}
    />
  )
}
