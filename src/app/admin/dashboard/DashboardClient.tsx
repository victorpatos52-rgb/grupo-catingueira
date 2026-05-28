'use client'

import Image from 'next/image'
import Link from 'next/link'
import LembretesCard from './LembretesCard'
import type { Veiculo, Lead, Lembrete } from '@/types'

// ── Tipos exportados ──────────────────────────────────────────────────────────

export interface UltimaVenda {
  id: string
  comprador_nome: string
  valor_liquido: number
  data_venda: string
  veiculo: { marca: string; modelo: string; ano: number } | null
}

export interface TopVendedor {
  nome: string
  count: number
  total: number
}

interface Props {
  totalEstoque: number
  vendidosMes: number
  receitaMes: number
  leadsNovos: number
  reservados: number
  totalEstoqueValor: number
  leadsPorStatus: Record<string, number>
  totalLeads: number
  topVendedores: TopVendedor[]
  ultimasVendas: UltimaVenda[]
  ultimosVeiculos: Veiculo[]
  ultimosLeads: Lead[]
  lembretes: Lembrete[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string) {
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, valor, sub, cor, bg,
}: {
  label: string; valor: string; sub: string; cor: string; bg: string
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
      <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className="font-bold text-2xl mt-1" style={{ color: cor }}>{valor}</p>
      <p className="text-[#9CA3AF] text-xs mt-1">{sub}</p>
    </div>
  )
}

// ── Funil config ──────────────────────────────────────────────────────────────

const FUNIL = [
  { key: 'novo',         label: 'Novo',          cor: '#3B82F6', bg: 'bg-blue-500' },
  { key: 'contato_feito',label: 'Contato feito', cor: '#D97706', bg: 'bg-amber-500' },
  { key: 'negociando',   label: 'Negociando',    cor: '#EA580C', bg: 'bg-orange-600' },
  { key: 'fechado',      label: 'Fechado',       cor: '#16A34A', bg: 'bg-green-600' },
  { key: 'perdido',      label: 'Perdido',       cor: '#DC2626', bg: 'bg-red-600' },
]

const STATUS_BADGE: Record<string, string> = {
  disponivel: 'bg-green-50 text-green-700 border-green-200',
  reservado:  'bg-amber-50 text-amber-700 border-amber-200',
  vendido:    'bg-red-50 text-red-700 border-red-200',
  manutencao: 'bg-gray-100 text-gray-600 border-gray-200',
}

const LEAD_BADGE: Record<string, string> = {
  novo:          'bg-blue-50 text-blue-700 border-blue-200',
  contato_feito: 'bg-amber-50 text-amber-700 border-amber-200',
  negociando:    'bg-orange-50 text-orange-700 border-orange-200',
  fechado:       'bg-green-50 text-green-700 border-green-200',
  perdido:       'bg-red-50 text-red-700 border-red-200',
}

const BADGE_RANK = [
  'bg-[#F5C842] text-[#111]',
  'bg-[#C0C0C0] text-[#111]',
  'bg-[#CD7F32] text-white',
]

// ── Main ──────────────────────────────────────────────────────────────────────

export default function DashboardClient({
  totalEstoque, vendidosMes, receitaMes, leadsNovos, reservados, totalEstoqueValor,
  leadsPorStatus, totalLeads,
  topVendedores, ultimasVendas,
  ultimosVeiculos, ultimosLeads,
  lembretes,
}: Props) {
  const fechados = leadsPorStatus['fechado'] ?? 0
  const taxaConversao = totalLeads > 0 ? ((fechados / totalLeads) * 100).toFixed(1) : '0.0'

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8 space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111827]">
          Dashboard
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">Visão geral da sua loja</p>
      </div>

      {/* ── SEÇÃO 1 — KPIs ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="Em estoque"       valor={String(totalEstoque)}   sub="veículos disponíveis"      cor="#3B82F6" bg="#EFF6FF" />
        <KpiCard label="Vendidos no mês"  valor={String(vendidosMes)}    sub="este mês"                  cor="#16A34A" bg="#F0FDF4" />
        <KpiCard label="Receita do mês"   valor={fmt(receitaMes)}        sub="valor líquido das vendas"  cor="#059669" bg="#ECFDF5" />
        <KpiCard label="Leads novos"      valor={String(leadsNovos)}     sub="aguardando contato"        cor="#D97706" bg="#FFFBEB" />
        <KpiCard label="Reservados"       valor={String(reservados)}     sub="veículos reservados"       cor="#7C3AED" bg="#F5F3FF" />
        <KpiCard label="Total em estoque" valor={fmt(totalEstoqueValor)} sub="valor total do estoque"    cor="#475569" bg="#F8FAFC" />
      </div>

      {/* ── SEÇÃO 2 — Funil de vendas ──────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#111827] text-sm">Funil de Vendas</h2>
          <div className="text-right">
            <p className="text-xs text-[#9CA3AF]">Taxa de conversão</p>
            <p className="text-lg font-bold text-green-600">{taxaConversao}%</p>
          </div>
        </div>

        {totalLeads === 0 ? (
          <p className="text-[#9CA3AF] text-sm text-center py-4">Nenhum lead cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {FUNIL.map(({ key, label, cor, bg }) => {
              const count = leadsPorStatus[key] ?? 0
              const pct   = totalLeads > 0 ? (count / totalLeads) * 100 : 0
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[#374151] font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#9CA3AF]">{pct.toFixed(1)}%</span>
                      <span className="text-sm font-bold" style={{ color: cor }}>{count}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bg}`}
                      style={{ width: `${pct}%`, transition: 'width 0.5s ease' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── SEÇÃO 3 — Rankings ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Top 3 Vendedores */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E7EB]">
            <h2 className="font-bold text-[#111827] text-sm">Top 3 Vendedores do Mês</h2>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {topVendedores.length === 0 ? (
              <p className="px-5 py-8 text-[#9CA3AF] text-sm text-center">Nenhuma venda este mês.</p>
            ) : (
              topVendedores.map((v, i) => (
                <div key={v.nome} className="px-5 py-4 flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${BADGE_RANK[i] ?? 'bg-gray-100 text-gray-600'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111827] text-sm font-semibold truncate">{v.nome}</p>
                    <p className="text-[#9CA3AF] text-xs">{v.count} venda{v.count !== 1 ? 's' : ''}</p>
                  </div>
                  <p className="text-[#111827] font-bold text-sm shrink-0">{fmt(v.total)}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Últimas Vendas */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="font-bold text-[#111827] text-sm">Últimas Vendas</h2>
            <Link href="/admin/vendas" className="text-xs text-[#F59E0B] hover:underline">Ver todas</Link>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {ultimasVendas.length === 0 ? (
              <p className="px-5 py-8 text-[#9CA3AF] text-sm text-center">Nenhuma venda finalizada.</p>
            ) : (
              ultimasVendas.map(v => (
                <div key={v.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111827] text-sm font-medium truncate">{v.comprador_nome}</p>
                    <p className="text-[#9CA3AF] text-xs truncate">
                      {v.veiculo ? `${v.veiculo.marca} ${v.veiculo.modelo} ${v.veiculo.ano}` : '—'}
                      {' · '}{fmtData(v.data_venda)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-[#111827] font-bold text-sm">{fmt(v.valor_liquido)}</p>
                    <Link
                      href={`/admin/vendas/${v.id}`}
                      className="text-xs text-[#F59E0B] hover:underline"
                    >
                      Ver
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 4 — Últimos Veículos + Leads ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Últimos Veículos */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="font-bold text-[#111827] text-sm">Últimos Veículos</h2>
            <Link href="/admin/veiculos" className="text-xs text-[#F59E0B] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {ultimosVeiculos.length === 0 ? (
              <p className="px-5 py-8 text-[#9CA3AF] text-sm text-center">Nenhum veículo cadastrado.</p>
            ) : (
              ultimosVeiculos.map(v => (
                <Link key={v.id} href={`/admin/veiculos/${v.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-[#FAFAFA] transition-colors block">
                  <div className="w-12 h-9 rounded-lg overflow-hidden bg-[#F3F4F6] shrink-0">
                    {v.fotos[0] ? (
                      <Image src={v.fotos[0]} alt="" width={48} height={36} className="object-cover w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[#111827] text-sm font-medium truncate">{v.marca} {v.modelo} {v.ano}</p>
                    <p className="text-[#9CA3AF] text-xs">{fmt(v.preco)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_BADGE[v.status] ?? ''}`}>
                    {v.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Últimos Leads */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h2 className="font-bold text-[#111827] text-sm">Últimos Leads</h2>
            <Link href="/admin/crm" className="text-xs text-[#F59E0B] hover:underline">Ver todos</Link>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {ultimosLeads.length === 0 ? (
              <p className="px-5 py-8 text-[#9CA3AF] text-sm text-center">Nenhum lead registrado.</p>
            ) : (
              ultimosLeads.map(l => (
                <Link key={l.id} href={`/admin/leads/${l.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-[#FAFAFA] transition-colors block">
                  <div className="min-w-0">
                    <p className="text-[#111827] text-sm font-medium truncate">{l.nome}</p>
                    <p className="text-[#9CA3AF] text-xs">{l.telefone}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ml-2 ${LEAD_BADGE[l.status] ?? ''}`}>
                    {l.status.replace('_', ' ')}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 5 — Lembretes ────────────────────────────────────────────── */}
      {lembretes.length > 0 && <LembretesCard lembretes={lembretes} />}

    </div>
  )
}
