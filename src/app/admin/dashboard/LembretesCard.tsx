'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { concluirLembrete } from '@/app/actions'
import type { Lembrete } from '@/types'

function buildWaHref(telefone: string | undefined, msg: string) {
  if (!telefone) return '#'
  const d = telefone.replace(/\D/g, '')
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent(msg)}`
}

const tipoBadge: Record<string, string> = {
  pos_venda: 'bg-blue-50 text-blue-700',
  aniversario_compra: 'bg-purple-50 text-purple-700',
  aniversario_cliente: 'bg-pink-50 text-pink-700',
  financiamento: 'bg-amber-50 text-amber-700',
  visita: 'bg-green-50 text-green-700',
  personalizado: 'bg-gray-100 text-gray-600',
  promissoria: 'bg-red-50 text-red-700',
}

const tipoLabel: Record<string, string> = {
  pos_venda: 'Pós-venda',
  aniversario_compra: 'Aniversário',
  aniversario_cliente: 'Aniversário cliente',
  financiamento: 'Financiamento',
  visita: 'Visita',
  personalizado: 'Personalizado',
  promissoria: 'Parcela',
}

export default function LembretesCard({ lembretes }: { lembretes: Lembrete[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function handleConcluir(id: string) {
    setLoading(id)
    try {
      await concluirLembrete(id)
      router.refresh()
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center gap-2">
        <span className="text-sm font-semibold text-[#111]">Lembretes de hoje</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
          {lembretes.length}
        </span>
      </div>
      <div className="divide-y divide-[#F0F0F0]">
        {lembretes.map(l => {
          // Lembrete de promissória é "virtual" (nunca gravado em `lembretes`)
          // — nome/telefone vêm da venda, não de um lead, e não tem como
          // "concluir" (a linha nem existe pra atualizar); some sozinho da
          // lista quando a parcela é marcada como paga na tela da venda.
          const ehPromissoria = l.tipo === 'promissoria'
          const telefone = l.lead?.telefone ?? l.venda?.comprador_telefone ?? undefined
          const nomeRef =
            l.lead?.nome ??
            l.venda?.comprador_nome ??
            (l.veiculo ? `${l.veiculo.marca} ${l.veiculo.modelo} ${l.veiculo.ano}` : 'Lembrete')
          const waMsg = `Olá${nomeRef !== 'Lembrete' ? ` ${nomeRef}` : ''}, ${l.mensagem ?? 'entrando em contato conforme combinado.'}`
          const waHref = buildWaHref(telefone, waMsg)
          return (
            <div key={l.id} className="px-5 py-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${tipoBadge[l.tipo] ?? 'bg-gray-100 text-gray-600'}`}>
                    {tipoLabel[l.tipo] ?? l.tipo}
                  </span>
                </div>
                <p className="text-[#111] text-sm font-medium truncate">{nomeRef}</p>
                {l.mensagem && (
                  <p className="text-[#6B7280] text-xs mt-0.5 line-clamp-1">{l.mensagem}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {telefone && (
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#25D366]/10 text-[#25D366] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
                  >
                    WhatsApp
                  </a>
                )}
                {ehPromissoria ? (
                  l.venda?.id && (
                    <a
                      href={`/admin/vendas/${l.venda.id}`}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F0F0F0] text-[#6B7280] text-xs font-medium hover:bg-[#E5E5E5] transition-colors"
                    >
                      Ver venda
                    </a>
                  )
                ) : (
                  <button
                    onClick={() => handleConcluir(l.id)}
                    disabled={loading === l.id}
                    className="px-2.5 py-1.5 rounded-lg bg-[#F0F0F0] text-[#6B7280] text-xs font-medium hover:bg-[#E5E5E5] transition-colors disabled:opacity-50"
                  >
                    {loading === l.id ? '...' : 'Concluir'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
