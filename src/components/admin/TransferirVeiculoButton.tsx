'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { transferirVeiculo } from '@/app/actions'

interface Props {
  veiculoId: string
  outrasLojas: { id: string; nome: string }[]
}

export default function TransferirVeiculoButton({ veiculoId, outrasLojas }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [lojaDestinoId, setLojaDestinoId] = useState(outrasLojas[0]?.id ?? '')
  const [observacoes, setObservacoes] = useState('')

  if (outrasLojas.length === 0) return null

  async function confirmar() {
    setCarregando(true)
    setErro('')
    try {
      await transferirVeiculo(veiculoId, lojaDestinoId, observacoes.trim() || null)
      router.push('/admin/veiculos')
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao transferir veículo.')
      setCarregando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-[#E5E5E5] text-[#6B7280] hover:text-[#111] hover:border-[#D0D0D0] transition-colors"
      >
        Transferir para outra loja
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !carregando && setAberto(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-xl font-bold uppercase text-[#111] mb-2">
              Transferir veículo
            </h2>
            <p className="text-[#6B7280] text-sm mb-4">
              O veículo passará a pertencer à loja escolhida — vendas, financeiro e anexos
              já registrados continuam vinculados a ele normalmente.
            </p>

            <div className="mb-4">
              <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Loja de destino
              </label>
              <select
                value={lojaDestinoId}
                onChange={e => setLojaDestinoId(e.target.value)}
                disabled={carregando}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all"
              >
                {outrasLojas.map(loja => (
                  <option key={loja.id} value={loja.id}>
                    {loja.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5">
                Observações (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                disabled={carregando}
                rows={3}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all resize-y"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
                <p className="text-red-600 text-sm">{erro}</p>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setAberto(false)}
                disabled={carregando}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[#6B7280] hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmar}
                disabled={carregando}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F5C842] text-[#111827] hover:brightness-90 transition-colors disabled:opacity-50"
              >
                {carregando ? 'Transferindo...' : 'Confirmar transferência'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
