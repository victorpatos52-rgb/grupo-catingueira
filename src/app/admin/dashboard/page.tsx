import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { Veiculo, Lead, UsuarioPerfil, Lembrete } from '@/types'
import DashboardClient, { type UltimaVenda, type TopVendedor } from './DashboardClient'

// Quantos dias de antecedência uma promissória a vencer aparece como lembrete
// (parcelas já vencidas e ainda pendentes aparecem sempre, sem limite).
const DIAS_ANTECEDENCIA_PROMISSORIA = 3

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDataBR(s: string) {
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil').select('*').eq('id', user.id).single()
  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')

  const lojaId = await getLojaIdAtiva(perfil)
  // Promissória é financeiro completo (mesmo padrão do resto do financeiro
  // reorganizado) — admin apenas. Na prática esta página já é 100% admin-only
  // via proxy.ts ("Dashboard: só admin"), então isso é defesa em profundidade
  // explícita, não uma mudança de comportamento observável hoje.
  const podeVerFinanceiroCompleto = perfil.perfil === 'admin'
  const admin = adminSupabase()

  const agora = new Date()
  const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  const hoje = agora.toISOString().split('T')[0]
  const cutoffPromissoria = new Date(agora)
  cutoffPromissoria.setDate(cutoffPromissoria.getDate() + DIAS_ANTECEDENCIA_PROMISSORIA)
  const cutoffPromissoriaStr = cutoffPromissoria.toISOString().split('T')[0]

  const [
    { count: totalEstoque },
    { count: reservados },
    { data: valorEstoqueData },
    { data: leadsData },
    { data: ultimosVeiculosData },
    { data: ultimosLeadsData },
    { data: lembretesData },
    { data: vendasMesData },
    { data: ultimasVendasData },
    { data: vendedoresData },
    { data: promissoriasData },
  ] = await Promise.all([
    admin.from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId).eq('status', 'disponivel').eq('excluido', false),
    admin.from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId).eq('status', 'reservado').eq('excluido', false),
    admin.from('veiculos')
      .select('preco')
      .eq('loja_id', lojaId).eq('status', 'disponivel').eq('excluido', false),
    admin.from('leads')
      .select('status')
      .eq('loja_id', lojaId),
    admin.from('veiculos')
      .select('*')
      .eq('loja_id', lojaId)
      .eq('excluido', false)
      .order('created_at', { ascending: false }).limit(5),
    admin.from('leads')
      .select('*')
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false }).limit(5),
    admin.from('lembretes')
      .select('*, lead:leads(nome, telefone), veiculo:veiculos(marca, modelo, ano)')
      .eq('loja_id', lojaId)
      .eq('concluido', false)
      .lte('data_lembrete', hoje)
      .order('data_lembrete'),
    admin.from('vendas')
      .select('id, valor_liquido, vendedor_id, veiculo_id')
      .eq('loja_id', lojaId)
      .eq('status', 'finalizada')
      .gte('data_venda', inicioMes),
    admin.from('vendas')
      .select('id, comprador_nome, valor_liquido, data_venda, veiculo:veiculos(marca,modelo,ano)')
      .eq('loja_id', lojaId)
      .eq('status', 'finalizada')
      .order('created_at', { ascending: false })
      .limit(5),
    admin.from('usuarios_perfil')
      .select('id, nome')
      .eq('loja_id', lojaId),
    // Promissórias pendentes vencendo em breve (ou já vencidas) — viram
    // lembretes "virtuais" abaixo, nunca são gravadas na tabela lembretes.
    // Financeiro completo — admin apenas.
    podeVerFinanceiroCompleto
      ? admin.from('venda_promissorias')
          .select('id, numero_parcela, valor, vencimento, venda:vendas!inner(id, comprador_nome, comprador_telefone, loja_id)')
          .eq('pago', false)
          .eq('venda.loja_id', lojaId)
          .lte('vencimento', cutoffPromissoriaStr)
          .order('vencimento')
      : Promise.resolve({ data: [] as unknown[] }),
  ])

  // ── Agregações em JS ────────────────────────────────────────────────────────

  const totalEstoqueValor = (valorEstoqueData ?? []).reduce(
    (a, v) => a + ((v as { preco: number }).preco ?? 0), 0
  )

  const receitaMes = (vendasMesData ?? []).reduce(
    (a, v) => a + ((v as { valor_liquido: number }).valor_liquido ?? 0), 0
  )

  const leadsPorStatus: Record<string, number> = {}
  for (const l of leadsData ?? []) {
    const s = (l as { status: string }).status
    leadsPorStatus[s] = (leadsPorStatus[s] ?? 0) + 1
  }
  const leadsNovos  = leadsPorStatus['novo'] ?? 0
  const totalLeads  = leadsData?.length ?? 0
  const vendidosMes = vendasMesData?.length ?? 0

  const vendedorMap: Record<string, string> = {}
  for (const v of vendedoresData ?? []) {
    const u = v as { id: string; nome: string }
    vendedorMap[u.id] = u.nome
  }

  type VendaMesRow = { vendedor_id: string | null; valor_liquido: number }
  const vendasPorVendedor: Record<string, { count: number; total: number }> = {}
  for (const v of (vendasMesData ?? []) as VendaMesRow[]) {
    const vid = v.vendedor_id ?? '__sem__'
    vendasPorVendedor[vid] = {
      count: (vendasPorVendedor[vid]?.count ?? 0) + 1,
      total: (vendasPorVendedor[vid]?.total ?? 0) + (v.valor_liquido ?? 0),
    }
  }
  const topVendedores: TopVendedor[] = Object.entries(vendasPorVendedor)
    .filter(([vid]) => vid !== '__sem__')
    .map(([vid, stats]) => ({
      nome: vendedorMap[vid] ?? 'Desconhecido',
      count: stats.count,
      total: stats.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  // Promissórias pendentes viram lembretes "virtuais" (nunca persistidos em
  // `lembretes`) — somem sozinhos quando a parcela é marcada como paga, já
  // que a query acima só busca pago=false a cada carregamento da página.
  type PromissoriaLembreteRow = {
    id: string
    numero_parcela: number
    valor: number
    vencimento: string
    venda: { id: string; comprador_nome: string; comprador_telefone: string | null } | null
  }
  const lembretesPromissorias: Lembrete[] = ((promissoriasData ?? []) as unknown as PromissoriaLembreteRow[])
    .filter((p): p is PromissoriaLembreteRow & { venda: NonNullable<PromissoriaLembreteRow['venda']> } => !!p.venda)
    .map(p => {
      const vencida = p.vencimento < hoje
      return {
        id: `promissoria-${p.id}`,
        loja_id: lojaId,
        lead_id: null,
        veiculo_id: null,
        tipo: 'promissoria',
        data_lembrete: p.vencimento,
        mensagem: `Parcela ${p.numero_parcela} — ${fmtMoeda(p.valor)} — ${vencida ? 'venceu em' : 'vence em'} ${fmtDataBR(p.vencimento)}`,
        concluido: false,
        created_at: p.vencimento,
        venda: { id: p.venda.id, comprador_nome: p.venda.comprador_nome, comprador_telefone: p.venda.comprador_telefone },
      }
    })

  const lembretes: Lembrete[] = [...((lembretesData ?? []) as Lembrete[]), ...lembretesPromissorias]
    .sort((a, b) => a.data_lembrete.localeCompare(b.data_lembrete))

  return (
    <DashboardClient
      totalEstoque={totalEstoque ?? 0}
      vendidosMes={vendidosMes}
      receitaMes={receitaMes}
      leadsNovos={leadsNovos}
      reservados={reservados ?? 0}
      totalEstoqueValor={totalEstoqueValor}
      leadsPorStatus={leadsPorStatus}
      totalLeads={totalLeads}
      topVendedores={topVendedores}
      ultimasVendas={(ultimasVendasData ?? []) as unknown as UltimaVenda[]}
      ultimosVeiculos={(ultimosVeiculosData ?? []) as Veiculo[]}
      ultimosLeads={(ultimosLeadsData ?? []) as Lead[]}
      lembretes={lembretes}
    />
  )
}
