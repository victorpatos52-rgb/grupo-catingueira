'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { publicarVeiculo } from '@/app/actions'

interface Props {
  veiculoId: string
  temFoto: boolean
  temPreco: boolean
}

export default function PublicarVeiculoButton({ veiculoId, temFoto, temPreco }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')

  const pronto = temFoto && temPreco

  async function confirmar() {
    setCarregando(true)
    setErro('')
    try {
      await publicarVeiculo(veiculoId)
      setAberto(false)
      router.refresh()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao publicar veículo.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5C842] text-[#111827] hover:brightness-90 transition-colors"
      >
        Publicar
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => !carregando && setAberto(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-xl font-bold uppercase text-[#111] mb-2">
              Publicar veículo
            </h2>
            <p className="text-[#6B7280] text-sm mb-4">
              O veículo sai do estado de rascunho e passa a aparecer no site público e nas listagens normais.
            </p>

            {!pronto && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4">
                <p className="text-amber-700 text-sm font-medium mb-1">Faltam dados essenciais:</p>
                <ul className="text-amber-700 text-xs list-disc pl-4 space-y-0.5">
                  {!temFoto && <li>Pelo menos 1 foto</li>}
                  {!temPreco && <li>Preço de venda</li>}
                </ul>
              </div>
            )}

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
                disabled={carregando || !pronto}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#F5C842] text-[#111827] hover:brightness-90 transition-colors disabled:opacity-50"
              >
                {carregando ? 'Publicando...' : 'Confirmar publicação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
