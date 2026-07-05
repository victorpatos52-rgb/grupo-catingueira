'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { excluirVeiculo } from '@/app/actions'

export default function ExcluirVeiculoButton({ veiculoId }: { veiculoId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  async function confirmar() {
    setCarregando(true)
    setErro('')
    try {
      const { tipo } = await excluirVeiculo(veiculoId)
      router.push('/admin/veiculos')
      router.refresh()
      if (tipo === 'soft') {
        // eslint-disable-next-line no-console
        console.info('Veículo excluído (soft delete) — histórico preservado.')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao excluir veículo.')
      setCarregando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
      >
        Excluir
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !carregando && setAberto(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-xl font-bold uppercase text-[#111] mb-2">
              Excluir veículo
            </h2>
            <p className="text-[#6B7280] text-sm mb-4">
              Tem certeza que deseja excluir este veículo? Se ele já tiver vendas, custos,
              vistorias ou anexos registrados, ele será apenas marcado como excluído
              (histórico preservado). Caso contrário, será removido definitivamente.
            </p>

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
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {carregando ? 'Excluindo...' : 'Confirmar exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
