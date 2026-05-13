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
  statusFilter: string
  origemFilter: string
}

const statusBadge: Record<string, string> = {
  novo: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  contato_feito: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  negociando: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fechado: 'bg-green-600/20 text-green-400 border-green-600/30',
  perdido: 'bg-red-600/20 text-red-400 border-red-600/30',
}

const origemBadge: Record<string, string> = {
  site: 'bg-purple-500/20 text-purple-400',
  whatsapp: 'bg-green-500/20 text-green-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  indicacao: 'bg-blue-400/20 text-blue-300',
  outros: 'bg-gray-500/20 text-gray-400',
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

export default function CrmClient({
  leads,
  vendedores,
  lojaId,
  statusFilter,
  origemFilter,
}: Props) {
  const [view, setView] = useState<'lista' | 'kanban'>('lista')

  const filteredLeads = leads.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false
    if (origemFilter && l.origem !== origemFilter) return false
    return true
  })

  const vendedorMap = Object.fromEntries(vendedores.map(v => [v.id, v.nome]))

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
            CRM — Leads
          </h1>
          <p className="text-[#555] text-sm mt-1">{leads.length} lead(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {(['lista', 'kanban'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                view === v
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                  : 'border-[#2A2A2A] text-[#555] hover:text-[#888]'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === opt.value || (!statusFilter && opt.value === '')
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                  : 'border-[#2A2A2A] text-[#666] hover:border-[#333] hover:text-[#888]'
              }`}
            >
              {opt.label}
            </a>
          ))}
          <div className="w-px bg-[#2A2A2A] mx-1" />
          {origemOpts.map(opt => (
            <a
              key={opt.value}
              href={
                opt.value
                  ? `/admin/crm${statusFilter ? `?status=${statusFilter}&` : '?'}origem=${opt.value}`
                  : `/admin/crm${statusFilter ? `?status=${statusFilter}` : ''}`
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                origemFilter === opt.value || (!origemFilter && opt.value === '')
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                  : 'border-[#2A2A2A] text-[#666] hover:border-[#333] hover:text-[#888]'
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      )}

      <div className="mb-5">
        <NovoLeadForm lojaId={lojaId} />
      </div>

      {view === 'kanban' ? (
        <CrmKanban leads={leads} vendedorMap={vendedorMap} />
      ) : (
        <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Nome', 'Telefone', 'Veículo', 'Origem', 'Status', 'Responsável', 'Data', 'Ação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-[#555] text-sm">
                      Nenhum lead encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((l, i) => {
                    const whatsappLink = `https://wa.me/55${l.telefone.replace(/\D/g, '')}`
                    const dataFmt = new Date(l.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: '2-digit',
                    })
                    return (
                      <tr key={l.id} className={i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}>
                        <td className="px-4 py-3 text-white font-medium">
                          <Link href={`/admin/leads/${l.id}`} className="hover:underline underline-offset-2">
                            {l.nome}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-[#888]">{l.telefone}</td>
                        <td className="px-4 py-3 text-[#888] whitespace-nowrap">
                          {l.veiculo
                            ? `${l.veiculo.marca} ${l.veiculo.modelo} ${l.veiculo.ano}`
                            : l.veiculo_interesse || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${origemBadge[l.origem]}`}>
                            {l.origem}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[l.status]}`}>
                            {l.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#666] text-xs">
                          {l.responsavel_id ? vendedorMap[l.responsavel_id] ?? '—' : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#555] whitespace-nowrap">{dataFmt}</td>
                        <td className="px-4 py-3">
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
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
