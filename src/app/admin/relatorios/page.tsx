import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import { formatarPreco } from '@/lib/utils'
import type { UsuarioPerfil } from '@/types'

interface FinanceiroRow {
  preco_venda: number | null
  custo_aquisicao: number
  custos_adicionais: { valor: number }[]
  created_at: string
}

interface LeadRow {
  status: string
}

interface MesData {
  label: string
  faturamento: number
  lucro: number
  count: number
}

export default async function RelatoriosPage() {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()

  const perfil = perfilData as UsuarioPerfil | null
  if (!perfil) redirect('/login')
  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

  const lojaId = await getLojaIdAtiva(perfil)

  const dozeAtras = new Date()
  dozeAtras.setMonth(dozeAtras.getMonth() - 11)
  dozeAtras.setDate(1)

  const [{ data: finData }, { data: leadsData }] = await Promise.all([
    supabase
      .from('financeiro_veiculos')
      .select('preco_venda, custo_aquisicao, custos_adicionais, created_at')
      .eq('loja_id', lojaId)
      .not('preco_venda', 'is', null)
      .gte('created_at', dozeAtras.toISOString())
      .order('created_at'),
    supabase.from('leads').select('status').eq('loja_id', lojaId),
  ])

  const financeiros = (finData ?? []) as FinanceiroRow[]
  const leads = (leadsData ?? []) as LeadRow[]

  const mesesMap = new Map<string, MesData>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    mesesMap.set(key, { label, faturamento: 0, lucro: 0, count: 0 })
  }

  for (const f of financeiros) {
    const d = new Date(f.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mes = mesesMap.get(key)
    if (!mes) continue
    const extras = f.custos_adicionais.reduce((a, c) => a + c.valor, 0)
    const lucro = (f.preco_venda ?? 0) - f.custo_aquisicao - extras
    mes.faturamento += f.preco_venda ?? 0
    mes.lucro += lucro
    mes.count += 1
  }

  const meses = Array.from(mesesMap.values())
  const maxFaturamento = Math.max(...meses.map(m => m.faturamento), 1)
  const maxLucro = Math.max(...meses.map(m => m.lucro), 1)

  const leadsPorStatus = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {})

  const statusLabel: Record<string, string> = {
    novo: 'Novo',
    contato_feito: 'Contato feito',
    negociando: 'Negociando',
    fechado: 'Fechado',
    perdido: 'Perdido',
  }

  const statusCor: Record<string, string> = {
    novo: '#3B82F6',
    contato_feito: '#F59E0B',
    negociando: '#F97316',
    fechado: '#22C55E',
    perdido: '#EF4444',
  }

  const totalLeads = leads.length
  const totalVendas = financeiros.length
  const totalFaturamento = financeiros.reduce((a, f) => a + (f.preco_venda ?? 0), 0)
  const totalLucro = financeiros.reduce((a, f) => {
    const extras = f.custos_adicionais.reduce((s, c) => s + c.valor, 0)
    return a + ((f.preco_venda ?? 0) - f.custo_aquisicao - extras)
  }, 0)

  return (
    <div className="p-6 md:p-8">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
          Relatórios
        </h1>
        <p className="text-[#555] text-sm mt-1">Últimos 12 meses</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total vendas', valor: String(totalVendas), cor: '#3B82F6' },
          { label: 'Faturamento', valor: formatarPreco(totalFaturamento), cor: '#22C55E' },
          { label: 'Lucro total', valor: formatarPreco(totalLucro), cor: 'var(--cor-primaria)' },
          { label: 'Total leads', valor: String(totalLeads), cor: '#F59E0B' },
        ].map(c => (
          <div key={c.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-[#555] text-xs uppercase tracking-wider mb-2">{c.label}</p>
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black"
              style={{ color: c.cor }}
            >
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">Faturamento por mês</h2>
          <div className="space-y-2.5">
            {meses.map(m => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-[#555] text-xs w-12 shrink-0 text-right">{m.label}</span>
                <div className="flex-1 bg-[#111] rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(m.faturamento / maxFaturamento) * 100}%`,
                      backgroundColor: 'var(--cor-primaria)',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span className="text-[#888] text-xs w-24 shrink-0">
                  {m.faturamento > 0 ? formatarPreco(m.faturamento) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-5">Lucro por mês</h2>
          <div className="space-y-2.5">
            {meses.map(m => (
              <div key={m.label} className="flex items-center gap-3">
                <span className="text-[#555] text-xs w-12 shrink-0 text-right">{m.label}</span>
                <div className="flex-1 bg-[#111] rounded-full h-5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max((m.lucro / maxLucro) * 100, 0)}%`,
                      backgroundColor: m.lucro >= 0 ? '#22C55E' : '#EF4444',
                      opacity: 0.8,
                    }}
                  />
                </div>
                <span
                  className={`text-xs w-24 shrink-0 ${m.lucro >= 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {m.lucro !== 0 ? formatarPreco(m.lucro) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
        <h2 className="text-white font-semibold text-sm mb-5">Funil de leads</h2>
        {totalLeads === 0 ? (
          <p className="text-[#555] text-sm">Nenhum lead registrado.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(statusLabel).map(([key, label]) => {
              const count = leadsPorStatus[key] ?? 0
              const pct = totalLeads > 0 ? (count / totalLeads) * 100 : 0
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-[#555] text-xs w-28 shrink-0">{label}</span>
                  <div className="flex-1 bg-[#111] rounded-full h-5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: statusCor[key],
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="text-[#888] text-xs w-16 shrink-0">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
