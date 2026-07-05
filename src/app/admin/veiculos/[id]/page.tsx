import { notFound, redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import MarcaVendidoButton from '@/components/admin/MarcaVendidoButton'
import ExcluirVeiculoButton from '@/components/admin/ExcluirVeiculoButton'
import VeiculoTabs from './VeiculoTabs'
import type { Veiculo, UsuarioPerfil, FinanceiroVeiculo, CustoManutencao } from '@/types'

export default async function EditarVeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase.from('usuarios_perfil').select('*').eq('id', user.id).single()
  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  const lojaId = await getLojaIdAtiva(perfil)

  const admin = adminSupabase()
  const [{ data }, { data: finData }, { data: custosData }] = await Promise.all([
    admin.from('veiculos').select('*').eq('id', id).eq('loja_id', lojaId).single(),
    admin
      .from('financeiro_veiculos')
      .select('*')
      .eq('veiculo_id', id)
      .eq('loja_id', lojaId)
      .maybeSingle(),
    admin
      .from('custos_manutencao')
      .select('*')
      .eq('veiculo_id', id)
      .order('data', { ascending: false }),
  ])

  if (!data) notFound()
  const veiculo = data as Veiculo
  const financeiro = finData as FinanceiroVeiculo | null
  const custos = (custosData ?? []) as CustoManutencao[]

  const podeVerFinanceiro = ['gerente', 'diretor', 'admin'].includes(perfil.perfil)

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <a
          href="/admin/veiculos"
          className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
              Editar Veículo
            </h1>
            <p className="text-[#6B7280] text-sm mt-1">
              {veiculo.marca} {veiculo.modelo} {veiculo.ano}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/pdf/ficha/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5E5E5] text-[#6B7280] text-xs font-medium hover:text-[#111] hover:border-[#D0D0D0] transition-colors"
            >
              📄 Ficha
            </a>
            {veiculo.status !== 'vendido' && (
              <MarcaVendidoButton veiculoId={id} />
            )}
            {!veiculo.excluido && <ExcluirVeiculoButton veiculoId={id} />}
          </div>
        </div>
        {veiculo.excluido && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
            <p className="text-amber-700 text-sm">
              Este veículo foi excluído (soft delete) — o registro foi mantido para preservar histórico financeiro/vendas.
            </p>
          </div>
        )}
      </div>

      <VeiculoTabs
        veiculo={veiculo}
        financeiro={financeiro}
        custos={custos}
        lojaId={lojaId}
        podeVerFinanceiro={podeVerFinanceiro}
      />
    </div>
  )
}
