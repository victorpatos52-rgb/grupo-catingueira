'use client'

import { useState } from 'react'
import Link from 'next/link'
import CrmKanban from './CrmKanban'
import NovoLeadForm from '@/components/admin/NovoLeadForm'
import type { Lead } from '@/types'

interface Props {
  leads: Lead[]
  vendedores: { id: string; nome: string }[]
  lojaId: string
  userId: string
  statusFilter: string
  origemFilter: string
}

const statusBadge: Record<string, string> = {
  novo:          'bg-blue-50 text-blue-700 border-blue-200',
  contato_feito: 'bg-amber-50 text-amber-700 border-amber-200',
  negociando:    'bg-orange-50 text-orange-700 border-orange-200',
  fechado:       'bg-green-50 text-green-700 border-green-200',
  perdido:       'bg-red-50 text-red-700 border-red-200',
}

const origemBadge: Record<string, string> = {
  site:      'bg-purple-50 text-purple-700',
  whatsapp:  'bg-green-50 text-green-700',
  instagram: 'bg-pink-50 text-pink-700',
  indicacao: 'bg-blue-50 text-blue-700',
  outros:    'bg-gray-100 text-gray-600',
}

const statusOpts = [
  { value: '', label: 'Todos' },
  { value: 'novo', label: 'Novo' },
  { value: 'contato_feito', label: 'Contato feito' },
  { value: 'negociando', label: 'Negociando' },
  { value: 'fechado', label: 'Fechado' },
  { value: 'perdido', label: 'Perdido' },
]

const origemOpts = [
  { value: '', label: 'Todas origens' },
  { value: 'site', label: 'Site' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'outros', label: 'Outros' },
]

export default function CrmClient({ leads, vendedores, lojaId, userId, statusFilter, origemFilter }: Props) {
  const [view, setView] = useState<'lista' | 'kanban'>('lista')
  const [meusLeads, setMeusLeads] = useState(false)

  // ── Mini dashboard ────────────────────────────────────────────────────────
  const hoje = new Date().toISOString().split('T')[0]
  const agora = new Date()
  const inicioMes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  const totalLeads     = leads.length
  const leadsHoje      = leads.filter(l => l.created_at.split('T')[0] === hoje).length
  const emNegociacao   = leads.filter(l => l.status === 'negociando').length
  const convertidosMes = leads.filter(l =>
    l.status === 'fechado' && l.created_at.startsWith(inicioMes)
  ).length

  // ── Filtros ───────────────────────────────────────────────────────────────
  const filteredLeads = leads.filter(l => {
    if (meusLeads && l.responsavel_id !== userId) return false
    if (statusFilter && l.status !== statusFilter) return false
    if (origemFilter && l.origem !== origemFilter) return false
    return true
  })

  const vendedorMap = Object.fromEntries(vendedores.map(v => [v.id, v.nome]))

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            CRM — Leads
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{leads.length} lead(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {(['lista', 'kanban'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                view === v
                  ? 'bg-[#FEF9C3] border-[#F5C842] text-[#92400E]'
                  : 'border-[#E5E7EB] text-[#6B7280] hover:text-[#111] bg-white'
              }`}
            >
              {v}
            </button>
          ))}
          <button
            onClick={() => setMeusLeads(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              meusLeads
                ? 'bg-[#FEF9C3] border-[#F5C842] text-[#92400E]'
                : 'border-[#E5E7EB] text-[#6B7280] hover:text-[#111] bg-white'
            }`}
          >
            {meusLeads ? '★ Meus leads' : '☆ Meus leads'}
          </button>
        </div>
      </div>

      {/* ── Mini dashboard ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de leads',      valor: totalLeads,     cor: '#3B82F6' },
          { label: 'Leads hoje',          valor: leadsHoje,      cor: '#8B5CF6' },
          { label: 'Em negociação',       valor: emNegociacao,   cor: '#EA580C' },
          { label: 'Convertidos no mês',  valor: convertidosMes, cor: '#16A34A' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
            <p className="font-bold text-2xl" style={{ color: cor }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros de status e origem ─────────────────────────────────────── */}
      {view === 'lista' && (
        <div className="flex gap-2 mb-5 flex-wrap">
          {statusOpts.map(opt => (
            <a
              key={opt.value}
              href={
                opt.value
                  ? `/admin/crm?status=${opt.value}${origemFilter ? `&origem=${origemFilter}` : ''}`
                  : `/admin/crm${origemFilter ? `?origem=${origemFilter}` : ''}`
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-white ${
                statusFilter === opt.value || (!statusFilter && opt.value === '')
                  ? 'border-[#F5C842] text-[#92400E] bg-[#FEF9C3]'
                  : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#374151]'
              }`}
            >
              {opt.label}
            </a>
          ))}
          <div className="w-px bg-[#E5E7EB] mx-1" />
          {origemOpts.map(opt => (
            <a
              key={opt.value}
              href={
                opt.value
                  ? `/admin/crm${statusFilter ? `?status=${statusFilter}&` : '?'}origem=${opt.value}`
                  : `/admin/crm${statusFilter ? `?status=${statusFilter}` : ''}`
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-white ${
                origemFilter === opt.value || (!origemFilter && opt.value === '')
                  ? 'border-[#F5C842] text-[#92400E] bg-[#FEF9C3]'
                  : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#374151]'
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      )}

      {/* ── Novo lead ──────────────────────────────────────────────────────── */}
      <div className="mb-5">
        <NovoLeadForm lojaId={lojaId} vendedores={vendedores} />
      </div>

      {/* ── Vista kanban / lista ───────────────────────────────────────────── */}
      {view === 'kanban' ? (
        <CrmKanban leads={filteredLeads} vendedorMap={vendedorMap} />
      ) : (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Nome', 'Telefone', 'Veículo', 'Origem', 'Status', 'Responsável', 'Data', 'Ação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#9CA3AF] text-sm">
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(l => {
                    const whatsappLink = `https://wa.me/55${l.telefone.replace(/\D/g, '')}`
                    const dataFmt = new Date(l.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                    })
                    return (
                      <tr key={l.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3 text-[#111] font-medium">
                          <Link href={`/admin/leads/${l.id}`} className="hover:underline underline-offset-2">
                            {l.nome}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">{l.telefone}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                          {l.veiculo
                            ? `${l.veiculo.marca} ${l.veiculo.modelo} ${l.veiculo.ano}`
                            : l.veiculo_interesse || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${origemBadge[l.origem] ?? 'bg-gray-100 text-gray-600'}`}>
                            {l.origem}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[l.status] ?? ''}`}>
                            {l.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs whitespace-nowrap">
                          {l.responsavel_id ? vendedorMap[l.responsavel_id] ?? '—' : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#9CA3AF] whitespace-nowrap">{dataFmt}</td>
                        <td className="px-4 py-3">
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#16A34A] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
                          >
                            WhatsApp
                          </a>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
