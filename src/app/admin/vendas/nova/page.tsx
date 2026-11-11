import { redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { adminSupabase } from '@/lib/supabase-server'
import { conferirLojaDoRegistro, obterLojaAtivaId } from '@/lib/loja-ativa'
import { listarUsuariosDaLoja } from '@/lib/acesso'
import AvisoOutraLoja from '@/components/admin/AvisoOutraLoja'
import type { UsuarioPerfil, Veiculo, Venda, VendaPagamento } from '@/types'
import NovaVendaClient from './NovaVendaClient'

interface Props {
  searchParams: Promise<{ veiculo_id?: string; venda_id?: string }>
}

export default async function NovaVendaPage({ searchParams }: Props) {
  const { veiculo_id, venda_id } = await searchParams

  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()
  const lojaId = await obterLojaAtivaId(perfil)

  const admin = adminSupabase()

  // Rascunho (?venda_id=) ou veículo pré-selecionado (?veiculo_id=) de OUTRA
  // loja: antes era ignorado em silêncio e o usuário começava uma venda nova
  // na loja errada sem perceber. Agora mostra o aviso para trocar o seletor
  // (admin/diretor); para os demais perfis continua ignorado.
  for (const [tabela, registroId] of [['vendas', venda_id], ['veiculos', veiculo_id]] as const) {
    if (!registroId) continue
    const { data: alvo } = await admin.from(tabela).select('loja_id').eq('id', registroId).maybeSingle()
    if (!alvo) continue
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
  }

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

  const [{ data: veiculosData }, usuariosLoja] = await Promise.all([
    admin
      .from('veiculos')
      .select('id,marca,modelo,versao,ano,cor,km,cambio,combustivel,preco,placa,fotos,status')
      .eq('loja_id', lojaId)
      .eq('excluido', false)
      .in('status', ['disponivel', 'reservado'])
      .order('created_at', { ascending: false }),
    // Usuários da loja ativa (padrão ou com acesso marcado). Sócio não é
    // vendedor — não aparece como opção de "vendedor responsável".
    listarUsuariosDaLoja(lojaId, { semSocio: true }),
  ])

  const veiculos = (veiculosData ?? []) as Veiculo[]
  const usuarios = usuariosLoja as unknown as UsuarioPerfil[]

  return (
    <NovaVendaClient
      perfil={perfil}
      veiculos={veiculos}
      usuarios={usuarios}
      lojaId={lojaId}
      vendedorId={perfil.id}
      veiculoIdInicial={veiculo_id ?? null}
      vendaInicial={vendaInicial}
      pagamentosIniciais={pagamentosIniciais}
    />
  )
}
