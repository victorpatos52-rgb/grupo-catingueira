import { notFound, redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import Link from 'next/link'
import { adminSupabase } from '@/lib/supabase-server'
import { conferirLojaDoRegistro } from '@/lib/loja-ativa'
import AvisoOutraLoja from '@/components/admin/AvisoOutraLoja'
import { TABELA_VISTORIA, ehTabelaInexistente } from '@/lib/tabelas-opcionais'
import { ITENS_VISTORIA } from '@/lib/vistoriaItens'
import type { VistoriaVeiculo, UsuarioPerfil } from '@/types'
import VistoriaClient from './VistoriaClient'

export default async function VistoriaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()

  // Antes filtrava por perfil.loja_id (ignorava o seletor). Agora: loja do
  // veículo conferida contra a loja ativa, lendo com service role.
  const admin = adminSupabase()
  const { data: veiculoData } = await admin
    .from('veiculos')
    .select('id, loja_id, marca, modelo, ano')
    .eq('id', id)
    .maybeSingle()
  if (!veiculoData) notFound()

  const conferencia = await conferirLojaDoRegistro(perfil, veiculoData.loja_id)
  if (conferencia.status === 'outra-loja') {
    return (
      <AvisoOutraLoja
        lojaId={conferencia.loja.id}
        lojaNome={conferencia.loja.nome}
        voltarHref="/admin/veiculos"
        voltarTexto="Voltar para os veículos"
      />
    )
  }
  if (conferencia.status === 'negado') notFound()

  const { data: vistoriaData, error: vistoriaErro } = await admin
    .from(TABELA_VISTORIA)
    .select('*')
    .eq('veiculo_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/admin/veiculos/${id}`}
          className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao veículo
        </Link>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Vistoria
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          {veiculoData.marca} {veiculoData.modelo} {veiculoData.ano}
        </p>
      </div>

      <VistoriaClient
        veiculoId={id}
        lojaId={veiculoData.loja_id}
        itensConfig={ITENS_VISTORIA}
        vistoria={vistoriaData as VistoriaVeiculo | null}
        disponivel={!ehTabelaInexistente(vistoriaErro)}
      />
    </div>
  )
}
