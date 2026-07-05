'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { deletarVenda } from '@/app/actions'
import type { UsuarioPerfil, Venda } from '@/types'

interface Props {
  perfil: UsuarioPerfil
  vendas: Venda[]
  lojaId: string
}

type FiltroStatus = 'todas' | 'rascunho' | 'finalizada'

function formatarPreco(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function VendasClient({ vendas }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState<FiltroStatus>('todas')
  const [deletandoId, setDeletandoId] = useState<string | null>(null)

  const filtradas = filtro === 'todas' ? vendas : vendas.filter(v => v.status === filtro)

  async function handleDeletar(venda: Venda) {
    if (!confirm(`Deletar a venda de "${venda.comprador_nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletandoId(venda.id)
    try {
      await deletarVenda(venda.id)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar venda')
    } finally {
      setDeletandoId(null)
    }
  }

  return (
    <div className="p-6 md:p-8 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Vendas
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{vendas.length} venda(s)</p>
        </div>
        <Link
          href="/admin/vendas/nova"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Venda
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {(['todas', 'rascunho', 'finalizada'] as FiltroStatus[]).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filtro === f
                ? 'bg-[#F5C842] text-[#111] font-semibold'
                : 'bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]'
            }`}
          >
            {f === 'todas' ? 'Todas' : f === 'rascunho' ? 'Rascunho' : 'Finalizada'}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        {filtradas.length === 0 ? (
          <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">
            {vendas.length === 0 ? 'Nenhuma venda registrada.' : 'Nenhuma venda encontrada com esse filtro.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Nº', 'Veículo', 'Comprador', 'Valor', 'Vendedor', 'Data', 'Status', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {filtradas.map(venda => (
                  <tr key={venda.id} className="hover:bg-[#FAFAFA] transition-colors">

                    {/* Número */}
                    <td className="px-4 py-3 text-[#6B7280] text-xs font-medium whitespace-nowrap">
                      {venda.numero_venda ?? '—'}
                    </td>

                    {/* Veículo */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {venda.veiculo?.fotos?.[0] ? (
                          <Image
                            src={venda.veiculo.fotos[0]}
                            alt=""
                            width={48}
                            height={36}
                            className="object-cover rounded-lg shrink-0 bg-[#F3F4F6]"
                          />
                        ) : (
                          <div className="w-12 h-9 rounded-lg bg-[#F3F4F6] shrink-0 flex items-center justify-center">
                            <svg className="w-5 h-5 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[#111] font-semibold text-sm truncate max-w-[140px]">
                            {venda.veiculo ? `${venda.veiculo.marca} ${venda.veiculo.modelo}` : '—'}
                          </p>
                          <p className="text-[#9CA3AF] text-xs">{venda.veiculo?.ano ?? ''}</p>
                        </div>
                      </div>
                    </td>

                    {/* Comprador */}
                    <td className="px-4 py-3">
                      <p className="text-[#111] font-medium text-sm whitespace-nowrap">{venda.comprador_nome}</p>
                      {venda.comprador_cpf && (
                        <p className="text-[#9CA3AF] text-xs">{venda.comprador_cpf}</p>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-[#111] font-semibold whitespace-nowrap">
                      {formatarPreco(venda.valor_venda)}
                    </td>

                    {/* Vendedor */}
                    <td className="px-4 py-3 text-[#6B7280] text-sm whitespace-nowrap">
                      {venda.vendedor?.nome ?? '—'}
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3 text-[#6B7280] text-sm whitespace-nowrap">
                      {formatarData(venda.data_venda)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      {venda.status === 'finalizada' ? (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200">
                          Finalizada
                        </span>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Rascunho
                        </span>
                      )}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/admin/vendas/${venda.id}`}
                          className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors bg-white whitespace-nowrap"
                        >
                          {venda.status === 'rascunho' ? 'Continuar' : 'Ver'}
                        </Link>
                        <a
                          href={`/api/pdf/venda/${venda.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors bg-white whitespace-nowrap"
                        >
                          Imprimir
                        </a>
                        <button
                          onClick={() => handleDeletar(venda)}
                          disabled={deletandoId === venda.id}
                          className="text-xs text-[#6B7280] hover:text-red-600 px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {deletandoId === venda.id ? '...' : 'Deletar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
