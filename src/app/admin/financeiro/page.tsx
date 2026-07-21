import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { LancamentoFinanceiro, UsuarioPerfil } from '@/types'
import FinanceiroClient, {
  type VendaResumo,
  type FinVeiculoSimples,
  type CustoManutSimples,
  type DadosMensais,
  type VendaFinanciadaSimples,
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

  // Financeiro completo agora é admin apenas — gerente/diretor perderam acesso
  // (antes tinham igual admin). 'socio' continua com a versão restrita de
  // sempre (só DRE dos veículos divididos, escalado pelo percentual),
  // inalterada por essa reorganização.
  if (!['admin', 'socio'].includes(perfil.perfil)) redirect('/admin/crm')

  const lojaId = await getLojaIdAtiva(perfil)
  const admin = adminSupabase()
  const isSocio = perfil.perfil === 'socio'

  // Sócio: resolve primeiro quais veículos são divididos e o percentual de
  // cada um — as queries de vendas do próximo passo dependem disso.
  let dividedVeiculoIds: string[] = []
  let percentualPorVeiculo: Record<string, number> = {}
  if (isSocio) {
    const { data: divididos } = await admin
      .from('veiculos')
      .select('id, percentual_socio')
      .eq('loja_id', lojaId)
      .eq('proprietario_tipo', 'dividido')
    for (const v of (divididos ?? []) as { id: string; percentual_socio: number | null }[]) {
      dividedVeiculoIds.push(v.id)
      percentualPorVeiculo[v.id] = (v.percentual_socio ?? 0) / 100
    }
  }
  const socioSemVeiculos = isSocio && dividedVeiculoIds.length === 0

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

  const vendasPeriodoQuery = admin.from('vendas')
    .select('id, valor_venda, desconto, valor_liquido, data_venda, veiculo_id, veiculo:veiculos(marca,modelo,ano)')
    .eq('loja_id', lojaId)
    .eq('status', 'finalizada')
    .gte('data_venda', periodoInicio)
    .lte('data_venda', periodoFim)
    .order('data_venda', { ascending: false })

  const vendasAnuaisQuery = admin.from('vendas')
    .select('valor_liquido, data_venda, veiculo_id')
    .eq('loja_id', lojaId)
    .eq('status', 'finalizada')
    .gte('data_venda', `${ano}-01-01`)
    .lte('data_venda', `${ano}-12-31`)

  // Passo 1 — dados que não dependem dos veiculo_ids
  // despesas_loja não é mais lida aqui — desde a migration 007, seus dados
  // (histórico) vivem migrados em lancamentos_financeiros (tipo='saida').
  // Sócio nunca vê lancamentos_financeiros (Movimentações/despesas gerais) —
  // fica restrito a gerente/diretor/admin, como já era antes desta mudança.
  const [
    { data: vendasDataRaw },
    { data: vendasAnuaisDataRaw },
    { data: lancamentosData },
    { data: lancamentosAnuaisData },
    { data: vendasFinanciadasData },
  ] = await Promise.all([
    socioSemVeiculos
      ? Promise.resolve({ data: [] as unknown[] })
      : isSocio
        ? vendasPeriodoQuery.in('veiculo_id', dividedVeiculoIds)
        : vendasPeriodoQuery,
    socioSemVeiculos
      ? Promise.resolve({ data: [] as unknown[] })
      : isSocio
        ? vendasAnuaisQuery.in('veiculo_id', dividedVeiculoIds)
        : vendasAnuaisQuery,
    isSocio
      ? Promise.resolve({ data: [] as unknown[] })
      : admin.from('lancamentos_financeiros')
          .select('*, venda:vendas(id, numero_venda, comprador_nome)')
          .eq('loja_id', lojaId)
          .gte('data', periodoInicio)
          .lte('data', periodoFim)
          .order('data', { ascending: false }),
    isSocio
      ? Promise.resolve({ data: [] as unknown[] })
      : admin.from('lancamentos_financeiros')
          .select('tipo, valor, data')
          .eq('loja_id', lojaId)
          .gte('data', `${ano}-01-01`)
          .lte('data', `${ano}-12-31`),
    // "Vendas financiadas" — lê da lista de pagamentos (venda_pagamentos,
    // tipo='financeira') em vez dos antigos campos fixos pagamento_financeira_*
    // de vendas. Filtra loja/status na tabela de vendas embutida (!inner).
    isSocio
      ? Promise.resolve({ data: [] as unknown[] })
      : admin.from('venda_pagamentos')
          .select('valor, detalhes, venda:vendas!inner(id, numero_venda, comprador_nome, data_venda, loja_id, status)')
          .eq('tipo', 'financeira')
          .eq('venda.loja_id', lojaId)
          .eq('venda.status', 'finalizada')
          .order('criado_em', { ascending: false }),
  ])

  // Sócio vê receita já multiplicada pelo percentual do veículo dividido.
  type VendaPeriodoRow = { id: string; valor_venda: number; desconto: number; valor_liquido: number; data_venda: string; veiculo_id: string; veiculo: unknown }
  const vendasData = isSocio
    ? ((vendasDataRaw ?? []) as VendaPeriodoRow[]).map(v => {
        const pct = percentualPorVeiculo[v.veiculo_id] ?? 0
        return { ...v, valor_venda: v.valor_venda * pct, desconto: v.desconto * pct, valor_liquido: v.valor_liquido * pct }
      })
    : ((vendasDataRaw ?? []) as VendaPeriodoRow[])

  type VendaAnualRow = { valor_liquido: number; data_venda: string; veiculo_id: string }
  const vendasAnuaisData = isSocio
    ? ((vendasAnuaisDataRaw ?? []) as VendaAnualRow[]).map(v => ({
        ...v,
        valor_liquido: v.valor_liquido * (percentualPorVeiculo[v.veiculo_id] ?? 0),
      }))
    : ((vendasAnuaisDataRaw ?? []) as VendaAnualRow[])

  // Passo 2 — custos filtrados pelos veiculo_ids das vendas do período
  // (para sócio, vendasData já só contém os veículos divididos — o filtro
  // se propaga automaticamente pra cá)
  const veiculoIds = (vendasData ?? [])
    .map((v: Record<string, unknown>) => v.veiculo_id as string)
    .filter(Boolean)

  const [{ data: financeiroDataRaw }, { data: custosDataRaw }] = await Promise.all([
    veiculoIds.length > 0
      ? admin.from('financeiro_veiculos')
          .select('veiculo_id, custo_aquisicao')
          .eq('loja_id', lojaId)
          .in('veiculo_id', veiculoIds)
      : Promise.resolve({ data: [] as { veiculo_id: string; custo_aquisicao: number }[] }),
    veiculoIds.length > 0
      ? admin.from('custos_manutencao')
          .select('veiculo_id, valor')
          .eq('loja_id', lojaId)
          .in('veiculo_id', veiculoIds)
      : Promise.resolve({ data: [] as { veiculo_id: string; valor: number }[] }),
  ])

  // Sócio: custos também escalados pelo percentual — receita e custo usam o
  // mesmo fator, então o lucro por veículo (receita - custo) já sai correto.
  const financeiroData = isSocio
    ? (financeiroDataRaw ?? []).map(f => ({
        ...f,
        custo_aquisicao: f.custo_aquisicao * (percentualPorVeiculo[f.veiculo_id] ?? 0),
      }))
    : (financeiroDataRaw ?? [])

  const custosData = isSocio
    ? (custosDataRaw ?? []).map(c => ({
        ...c,
        valor: c.valor * (percentualPorVeiculo[c.veiculo_id] ?? 0),
      }))
    : (custosDataRaw ?? [])

  const dadosAnuais: DadosMensais[] = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const mStr = String(m).padStart(2, '0')
    const prefix = `${ano}-${mStr}`
    const vendasMes = (vendasAnuaisData ?? []).filter(v => v.data_venda?.startsWith(prefix))
    const lancMes = ((lancamentosAnuaisData ?? []) as { tipo: string; valor: number; data: string }[])
      .filter(l => l.data?.startsWith(prefix))
    const entradasLancMes = lancMes.filter(l => l.tipo === 'entrada').reduce((a, l) => a + (l.valor ?? 0), 0)
    const saidasLancMes = lancMes.filter(l => l.tipo === 'saida').reduce((a, l) => a + (l.valor ?? 0), 0)
    return {
      mes: m,
      receitas: vendasMes.reduce((a, v) => a + (v.valor_liquido ?? 0), 0) + entradasLancMes,
      despesas: saidasLancMes,
      vendidos: vendasMes.length,
    }
  })

  type PagamentoFinanceiraRow = {
    valor: number
    detalhes: { nome?: string | null } | null
    venda: { id: string; numero_venda: string | null; comprador_nome: string; data_venda: string } | null
  }
  const vendasFinanciadas: VendaFinanciadaSimples[] = ((vendasFinanciadasData ?? []) as unknown as PagamentoFinanceiraRow[])
    .filter((r): r is PagamentoFinanceiraRow & { venda: NonNullable<PagamentoFinanceiraRow['venda']> } => !!r.venda)
    .map(r => ({
      id: r.venda.id,
      numero_venda: r.venda.numero_venda,
      comprador_nome: r.venda.comprador_nome,
      data_venda: r.venda.data_venda,
      pagamento_financeira_nome: r.detalhes?.nome ?? null,
      pagamento_financeira_valor: r.valor,
    }))

  return (
    <FinanceiroClient
      perfil={perfil}
      lojaId={lojaId}
      vendas={(vendasData ?? []) as unknown as VendaResumo[]}
      financeiroVeiculos={financeiroData as unknown as FinVeiculoSimples[]}
      custosManut={custosData as unknown as CustoManutSimples[]}
      dadosAnuais={dadosAnuais}
      lancamentos={(lancamentosData ?? []) as unknown as LancamentoFinanceiro[]}
      vendasFinanciadas={vendasFinanciadas}
      ano={ano}
      mes={mes}
      periodoInicio={periodoInicio}
      periodoFim={periodoFim}
      personalizado={personalizado}
    />
  )
}
