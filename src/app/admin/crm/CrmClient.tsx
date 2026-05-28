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
  novo: 'bg-blue-50 text-blue-700 border-blue-200',
  contato_feito: 'bg-amber-50 text-amber-700 border-amber-200',
  negociando: 'bg-orange-50 text-orange-700 border-orange-200',
  fechado: 'bg-green-50 text-green-700 border-green-200',
  perdido: 'bg-red-50 text-red-700 border-red-200',
}

const origemBadge: Record<string, string> = {
  site: 'bg-purple-50 text-purple-700',
  whatsapp: 'bg-green-50 text-green-700',
  instagram: 'bg-pink-50 text-pink-700',
  indicacao: 'bg-blue-50 text-blue-700',
  outros: 'bg-gray-100 text-gray-600',
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

export default function CrmClient({ leads, vendedores, lojaId, statusFilter, origemFilter }: Props) {
  const [view, setView] = useState<'lista' | 'kanban'>('lista')

  const filteredLeads = leads.filter(l => {
    if (statusFilter && l.status !== statusFilter) return false
    if (origemFilter && l.origem !== origemFilter) return false
    return true
  })

  const vendedorMap = Object.fromEntries(vendedores.map(v => [v.id, v.nome]))

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            CRM — Leads
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{leads.length} lead(s)</p>
        </div>
        <div className="flex items-center gap-2">
          {(['lista', 'kanban'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                view === v
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)] bg-white'
                  : 'border-[#E5E5E5] text-[#6B7280] hover:text-[#111] bg-white'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors bg-white ${
                statusFilter === opt.value || (!statusFilter && opt.value === '')
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                  : 'border-[#E5E5E5] text-[#6B7280] hover:border-[#D0D0D0] hover:text-[#374151]'
              }`}
            >
              {opt.label}
            </a>
          ))}
          <div className="w-px bg-[#E5E5E5] mx-1" />
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
                  ? 'border-[var(--cor-primaria)] text-[var(--cor-primaria)]'
                  : 'border-[#E5E5E5] text-[#6B7280] hover:border-[#D0D0D0] hover:text-[#374151]'
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
        <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-[#F8F8F8]">
                  {['Nome', 'Telefone', 'Veículo', 'Origem', 'Status', 'Responsável', 'Data', 'Ação'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-medium text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
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
                          <span className={`text-xs px-2 py-0.5 rounded-full ${origemBadge[l.origem]}`}>
                            {l.origem}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusBadge[l.status]}`}>
                            {l.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] text-xs">
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
