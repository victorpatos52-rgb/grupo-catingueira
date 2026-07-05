'use client'

import { useState } from 'react'
import VeiculoForm from '@/components/admin/VeiculoForm'
import FotosVeiculoClient from './FotosVeiculoClient'
import CustosVeiculoClient from './CustosVeiculoClient'
import DocumentacaoVeiculoClient, { type AnexoComUrl } from './DocumentacaoVeiculoClient'
import VistoriaClient from './vistoria/VistoriaClient'
import { ITENS_VISTORIA } from '@/lib/vistoriaItens'
import type { Veiculo, FinanceiroVeiculo, CustoManutencao, VeiculoAquisicao, VistoriaVeiculo } from '@/types'

type Aba = 'dados' | 'fotos' | 'financeiro' | 'checklist' | 'documentacao' | 'vistoria'

interface Props {
  veiculo: Veiculo
  financeiro: FinanceiroVeiculo | null
  custos: CustoManutencao[]
  lojaId: string
  podeVerFinanceiro: boolean
  aquisicao: VeiculoAquisicao | null
  anexos: AnexoComUrl[]
  vistoria: VistoriaVeiculo | null
}

export default function VeiculoTabs({ veiculo, financeiro, custos, lojaId, podeVerFinanceiro, aquisicao, anexos, vistoria }: Props) {
  const [aba, setAba] = useState<Aba>('dados')

  const abas: { id: Aba; label: string }[] = [
    { id: 'dados', label: 'Dados' },
    { id: 'fotos', label: 'Fotos' },
    ...(podeVerFinanceiro ? [{ id: 'financeiro' as Aba, label: 'Financeiro' }] : []),
    { id: 'checklist', label: 'Checklist de Serviços' },
    { id: 'vistoria', label: 'Vistoria' },
    ...(podeVerFinanceiro ? [{ id: 'documentacao' as Aba, label: 'Documentação' }] : []),
  ]

  return (
    <div>
      <div className="flex border-b border-[#E5E7EB] mb-6 gap-1 flex-wrap">
        {abas.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-5 py-2.5 text-sm rounded-t-lg transition-all -mb-px border-b-2 ${
              aba === a.id
                ? 'font-semibold text-[#111827] border-[#F5C842] bg-[#FEF9C3]'
                : 'font-medium text-[#6B7280] border-transparent hover:text-[#111827] hover:bg-[#F9FAFB]'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'dados' && (
        <VeiculoForm veiculo={veiculo} lojaId={lojaId} hideFotos noRedirect />
      )}

      {aba === 'fotos' && (
        <FotosVeiculoClient
          veiculoId={veiculo.id}
          lojaId={lojaId}
          fotosIniciais={veiculo.fotos}
        />
      )}

      {aba === 'financeiro' && (
        <CustosVeiculoClient
          veiculo={veiculo}
          financeiro={financeiro}
          custos={custos}
          lojaId={lojaId}
          secao="financeiro"
        />
      )}

      {aba === 'checklist' && (
        <CustosVeiculoClient
          veiculo={veiculo}
          financeiro={financeiro}
          custos={custos}
          lojaId={lojaId}
          secao="checklist"
        />
      )}

      {aba === 'vistoria' && (
        <VistoriaClient
          veiculoId={veiculo.id}
          lojaId={lojaId}
          itensConfig={ITENS_VISTORIA}
          vistoria={vistoria}
        />
      )}

      {aba === 'documentacao' && podeVerFinanceiro && (
        <DocumentacaoVeiculoClient veiculoId={veiculo.id} aquisicao={aquisicao} anexos={anexos} />
      )}
    </div>
  )
}
