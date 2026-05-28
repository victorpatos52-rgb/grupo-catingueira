import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { DespesaLoja, UsuarioPerfil } from '@/types'
import FinanceiroClient, {
  type VendaResumo,
  type FinVeiculoSimples,
  type CustoManutSimples,
  type DadosMensais,
} from './FinanceiroClient'

interface SearchParams {
  mes?: string
  ano?: string
  periodo_inicio?: string
  periodo_fim?: string
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil').select('*').eq('id', user.id).single()
  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const lojaId = await getLojaIdAtiva(perfil)
  const admin = adminSupabase()

  const agora = new Date()
  const anoAtual = agora.getFullYear()
  const mesAtual = agora.getMonth() + 1

  const personalizado = !!(params.periodo_inicio && params.periodo_fim)
  const ano = parseInt(params.ano ?? String(anoAtual))
  const mes = parseInt(params.mes ?? String(mesAtual))

  let periodoInicio: string
  let periodoFim: string

  if (personalizado) {
    periodoInicio = params.periodo_inicio!
    periodoFim = params.periodo_fim!
  } else {
    periodoInicio = `${ano}-${String(mes).padStart(2, '0')}-01`
    const ultimoDia = new Date(ano, mes, 0).getDate()
    periodoFim = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
  }

  const [
    { data: vendasData },
    { data: despesasData },
    { data: financeiroData },
    { data: custosData },
    { data: vendasAnuaisData },
    { data: despesasAnuaisData },
  ] = await Promise.all([
    admin.from('vendas')
      .select('id, valor_venda, desconto, valor_liquido, data_venda, veiculo_id, veiculo:veiculos(marca,modelo,ano)')
      .eq('loja_id', lojaId)
      .eq('status', 'finalizada')
      .gte('data_venda', periodoInicio)
      .lte('data_venda', periodoFim)
      .order('data_venda', { ascending: false }),
    admin.from('despesas_loja')
      .select('*')
      .eq('loja_id', lojaId)
      .gte('data', periodoInicio)
      .lte('data', periodoFim)
      .order('data', { ascending: false }),
    admin.from('financeiro_veiculos')
      .select('veiculo_id, custo_aquisicao')
      .eq('loja_id', lojaId),
    admin.from('custos_manutencao')
      .select('veiculo_id, valor')
      .eq('loja_id', lojaId),
    admin.from('vendas')
      .select('valor_liquido, data_venda')
      .eq('loja_id', lojaId)
      .eq('status', 'finalizada')
      .gte('data_venda', `${ano}-01-01`)
      .lte('data_venda', `${ano}-12-31`),
    admin.from('despesas_loja')
      .select('valor, data')
      .eq('loja_id', lojaId)
      .gte('data', `${ano}-01-01`)
      .lte('data', `${ano}-12-31`),
  ])

  const dadosAnuais: DadosMensais[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mStr = String(m).padStart(2, '0')
    const prefix = `${ano}-${mStr}`
    const vendasMes = (vendasAnuaisData ?? []).filter(v => v.data_venda?.startsWith(prefix))
    const despMes = (despesasAnuaisData ?? []).filter(d => d.data?.startsWith(prefix))
    return {
      mes: m,
      receitas: vendasMes.reduce((a, v) => a + (v.valor_liquido ?? 0), 0),
      despesas: despMes.reduce((a, d) => a + (d.valor ?? 0), 0),
      vendidos: vendasMes.length,
    }
  })

  return (
    <FinanceiroClient
      perfil={perfil}
      lojaId={lojaId}
      vendas={(vendasData ?? []) as unknown as VendaResumo[]}
      despesas={(despesasData ?? []) as unknown as DespesaLoja[]}
      financeiroVeiculos={(financeiroData ?? []) as unknown as FinVeiculoSimples[]}
      custosManut={(custosData ?? []) as unknown as CustoManutSimples[]}
      dadosAnuais={dadosAnuais}
      ano={ano}
      mes={mes}
      periodoInicio={periodoInicio}
      periodoFim={periodoFim}
      personalizado={personalizado}
    />
  )
}
