import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import { formatarPreco } from '@/lib/utils'
import type { Veiculo, Lead, UsuarioPerfil } from '@/types'

export default async function DashboardPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: perfilData } = await supabase
    .from('usuario_perfis')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/admin/login')

  const lojaId = perfil.loja_id

  const agora = new Date()
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1).toISOString()

  const [
    { count: totalEstoque },
    { data: vendidosMes },
    { data: financeiros },
    { count: leadsNovos },
    { data: ultimosVeiculos },
    { data: ultimosLeads },
  ] = await Promise.all([
    supabase
      .from('veiculos')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId)
      .eq('status', 'disponivel'),
    supabase
      .from('veiculos')
      .select('id')
      .eq('loja_id', lojaId)
      .eq('status', 'vendido')
      .gte('created_at', inicioMes),
    supabase
      .from('financeiro_veiculos')
      .select('custo_aquisicao, custos_adicionais, preco_venda')
      .eq('loja_id', lojaId)
      .not('preco_venda', 'is', null),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('loja_id', lojaId)
      .eq('status', 'novo'),
    supabase
      .from('veiculos')
      .select('*')
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('leads')
      .select('*')
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const lucroMedio =
    financeiros && financeiros.length > 0
      ? financeiros.reduce((acc, f) => {
          const extras = (f.custos_adicionais as { valor: number }[]).reduce(
            (s, c) => s + c.valor,
            0
          )
          return acc + (f.preco_venda! - f.custo_aquisicao - extras)
        }, 0) / financeiros.length
      : 0

  const metricas = [
    {
      label: 'Em estoque',
      valor: String(totalEstoque ?? 0),
      sub: 'veículos disponíveis',
      cor: '#3B82F6',
    },
    {
      label: 'Vendidos no mês',
      valor: String(vendidosMes?.length ?? 0),
      sub: 'este mês',
      cor: '#22C55E',
    },
    {
      label: 'Lucro médio',
      valor: formatarPreco(lucroMedio),
      sub: 'por veículo vendido',
      cor: 'var(--cor-primaria)',
    },
    {
      label: 'Leads novos',
      valor: String(leadsNovos ?? 0),
      sub: 'aguardando contato',
      cor: '#F59E0B',
    },
  ]

  const veiculos = (ultimosVeiculos ?? []) as Veiculo[]
  const leads = (ultimosLeads ?? []) as Lead[]

  const statusBadge: Record<string, string> = {
    disponivel: 'bg-green-600/20 text-green-400',
    reservado: 'bg-yellow-500/20 text-yellow-400',
    vendido: 'bg-red-600/20 text-red-400',
    manutencao: 'bg-gray-500/20 text-gray-400',
  }

  const leadStatusBadge: Record<string, string> = {
    novo: 'bg-blue-500/20 text-blue-400',
    contato_feito: 'bg-yellow-500/20 text-yellow-400',
    negociando: 'bg-orange-500/20 text-orange-400',
    fechado: 'bg-green-600/20 text-green-400',
    perdido: 'bg-red-600/20 text-red-400',
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
          Dashboard
        </h1>
        <p className="text-[#555] text-sm mt-1">Visão geral da sua loja</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metricas.map(m => (
          <div
            key={m.label}
            className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5"
          >
            <p className="text-[#555] text-xs uppercase tracking-wider mb-2">{m.label}</p>
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black"
              style={{ color: m.cor }}
            >
              {m.valor}
            </p>
            <p className="text-[#444] text-xs mt-1">{m.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Últimos veículos */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Últimos veículos</h2>
            <Link
              href="/admin/veiculos"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--cor-primaria)' }}
            >
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-[#222]">
            {veiculos.length === 0 ? (
              <p className="px-5 py-6 text-[#555] text-sm text-center">Nenhum veículo cadastrado.</p>
            ) : (
              veiculos.map((v, i) => (
                <div
                  key={v.id}
                  className={`px-5 py-3 flex items-center justify-between ${i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}`}
                >
                  <div>
                    <p className="text-white text-sm font-medium">
                      {v.marca} {v.modelo} {v.ano}
                    </p>
                    <p className="text-[#555] text-xs">{formatarPreco(v.preco)}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[v.status]}`}
                  >
                    {v.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimos leads */}
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[#2A2A2A] flex items-center justify-between">
            <h2 className="text-white font-semibold text-sm">Últimos leads</h2>
            <Link
              href="/admin/crm"
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: 'var(--cor-primaria)' }}
            >
              Ver todos
            </Link>
          </div>
          <div className="divide-y divide-[#222]">
            {leads.length === 0 ? (
              <p className="px-5 py-6 text-[#555] text-sm text-center">Nenhum lead registrado.</p>
            ) : (
              leads.map((l, i) => (
                <div
                  key={l.id}
                  className={`px-5 py-3 flex items-center justify-between ${i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}`}
                >
                  <div>
                    <p className="text-white text-sm font-medium">{l.nome}</p>
                    <p className="text-[#555] text-xs">{l.telefone}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${leadStatusBadge[l.status]}`}
                  >
                    {l.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
