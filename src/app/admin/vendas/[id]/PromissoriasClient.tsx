'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarPromissoria, marcarPromissoriaPaga, desmarcarPromissoriaPaga } from '@/app/actions'
import type { VendaPromissoria } from '@/types'

interface Props {
  vendaId: string
  promissorias: VendaPromissoria[]
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

const inputCls =
  'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all placeholder-[#D1D5DB]'
const labelCls = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'

export default function PromissoriasClient({ vendaId, promissorias: iniciais }: Props) {
  const router = useRouter()
  const [promissorias, setPromissorias] = useState<VendaPromissoria[]>(iniciais)
  const [adicionando, setAdicionando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const totalPago = promissorias.filter(p => p.pago).reduce((a, p) => a + p.valor, 0)
  const totalPendente = promissorias.filter(p => !p.pago).reduce((a, p) => a + p.valor, 0)

  async function handleAdicionar(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0 || !vencimento) return
    setSalvando(true)
    setErro('')
    try {
      await criarPromissoria(vendaId, { valor: valorNum, vencimento, observacoes: observacoes.trim() || null })
      setValor('')
      setVencimento('')
      setObservacoes('')
      setAdicionando(false)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao adicionar parcela')
    } finally {
      setSalvando(false)
    }
  }

  async function handleTogglePago(p: VendaPromissoria) {
    setAtualizandoId(p.id)
    setErro('')
    try {
      if (p.pago) {
        await desmarcarPromissoriaPaga(p.id, vendaId)
        setPromissorias(prev => prev.map(x => (x.id === p.id ? { ...x, pago: false, data_pagamento: null } : x)))
      } else {
        await marcarPromissoriaPaga(p.id, vendaId)
        const hoje = new Date().toISOString().split('T')[0]
        setPromissorias(prev => prev.map(x => (x.id === p.id ? { ...x, pago: true, data_pagamento: hoje } : x)))
      }
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar parcela')
    } finally {
      setAtualizandoId(null)
    }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider">Promissórias</h2>
        <button
          onClick={() => setAdicionando(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D0D0D0] transition-colors bg-white"
        >
          + Adicionar parcela
        </button>
      </div>

      {adicionando && (
        <form onSubmit={handleAdicionar} className="px-5 py-4 bg-[#FFFBEB] border-b border-[#E5E7EB]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                required
                type="number"
                min={0}
                step={0.01}
                value={valor}
                onChange={e => setValor(e.target.value)}
                className={inputCls}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className={labelCls}>Vencimento</label>
              <input
                required
                type="date"
                value={vencimento}
                onChange={e => setVencimento(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Observações</label>
              <input
                type="text"
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                className={inputCls}
                placeholder="Opcional"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setAdicionando(false)}
              className="px-4 py-2 rounded-xl text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] hover:border-[#D0D0D0] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {erro && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-200">
          <p className="text-red-600 text-xs">{erro}</p>
        </div>
      )}

      {promissorias.length === 0 ? (
        <p className="px-5 py-8 text-center text-[#9CA3AF] text-sm">Nenhuma parcela lançada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {['Parcela', 'Valor', 'Vencimento', 'Status', 'Pago em', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {promissorias.map(p => (
                <tr key={p.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3 text-[#111827]">{p.numero_parcela}</td>
                  <td className="px-4 py-3 text-[#111827] font-semibold">{formatarMoeda(p.valor)}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{formatarData(p.vencimento)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full border font-medium ${
                        p.pago
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {p.pago ? 'Pago' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">{formatarData(p.data_pagamento)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleTogglePago(p)}
                      disabled={atualizandoId === p.id}
                      className={`text-xs px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-50 whitespace-nowrap ${
                        p.pago
                          ? 'text-[#6B7280] border-[#E5E7EB] hover:border-[#D0D0D0] bg-white'
                          : 'text-[#92400E] border-[#F5C842] bg-[#FEF9C3] hover:bg-[#FEF08A]'
                      }`}
                    >
                      {atualizandoId === p.id ? '...' : p.pago ? 'Desmarcar' : 'Marcar como pago'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <td colSpan={2} className="px-4 py-2.5 text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">
                  Total pago / pendente
                </td>
                <td colSpan={4} className="px-4 py-2.5 text-right">
                  <span className="text-green-700 font-bold mr-3">{formatarMoeda(totalPago)}</span>
                  <span className="text-amber-700 font-bold">{formatarMoeda(totalPendente)}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
