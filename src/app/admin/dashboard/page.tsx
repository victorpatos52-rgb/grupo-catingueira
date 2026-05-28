import { redirect } from 'next/navigation'
import { createServerSupabase, adminSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { Veiculo, Lead, UsuarioPerfil, Lembrete } from '@/types'
import DashboardClient, { type UltimaVenda, type TopVendedor } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil').select('*').eq('id', user.id).single()
  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')

  const lojaId = await getLojaIdAtiva(perfil)
  const admin = adminSupabase()

  const agora = new Date()
  const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`
  const hoje = agora.toISOString().split('T')[0]

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
  ] = await Promise.all([
    admin.from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId).eq('status', 'disponivel'),
    admin.from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId).eq('status', 'reservado'),
    admin.from('veiculos')
      .select('preco')
      .eq('loja_id', lojaId).eq('status', 'disponivel'),
    admin.from('leads')
      .select('status')
      .eq('loja_id', lojaId),
    admin.from('veiculos')
      .select('*')
      .eq('loja_id', lojaId)
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
      lembretes={(lembretesData ?? []) as Lembrete[]}
    />
  )
}
