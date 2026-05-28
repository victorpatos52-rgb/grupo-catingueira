'use client'

import { useState } from 'react'
import VeiculoForm from '@/components/admin/VeiculoForm'
import FotosVeiculoClient from './FotosVeiculoClient'
import VistoriaClient from './vistoria/VistoriaClient'
import CustosVeiculoClient from './CustosVeiculoClient'
import type { Veiculo, FinanceiroVeiculo, CustoManutencao, VistoriaVeiculo } from '@/types'

const ITENS_VISTORIA = [
  { key: 'lataria', label: 'Lataria' },
  { key: 'pintura', label: 'Pintura' },
  { key: 'vidros', label: 'Vidros' },
  { key: 'pneus', label: 'Pneus' },
  { key: 'motor', label: 'Motor' },
  { key: 'cambio', label: 'Câmbio' },
  { key: 'freios', label: 'Freios' },
  { key: 'suspensao', label: 'Suspensão' },
  { key: 'parte_eletrica', label: 'Parte elétrica' },
  { key: 'interior', label: 'Interior' },
  { key: 'documentacao', label: 'Documentação' },
  { key: 'chave_reserva', label: 'Chave reserva' },
  { key: 'manual', label: 'Manual do proprietário' },
]

type Aba = 'dados' | 'fotos' | 'vistoria' | 'controle'

interface Props {
  veiculo: Veiculo
  financeiro: FinanceiroVeiculo | null
  custos: CustoManutencao[]
  vistoria: VistoriaVeiculo | null
  lojaId: string
  podeVerFinanceiro: boolean
}

const ABAS: { id: Aba; label: string }[] = [
  { id: 'dados', label: 'Dados' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'vistoria', label: 'Vistoria' },
  { id: 'controle', label: 'Controle' },
]

export default function VeiculoTabs({ veiculo, financeiro, custos, vistoria, lojaId, podeVerFinanceiro }: Props) {
  const [aba, setAba] = useState<Aba>('dados')

  return (
    <div>
      <div className="flex border-b border-[#E5E7EB] mb-6 gap-1">
        {ABAS.map(a => (
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

      {aba === 'vistoria' && (
        <VistoriaClient
          veiculoId={veiculo.id}
          lojaId={lojaId}
          itensConfig={ITENS_VISTORIA}
          vistoria={vistoria}
        />
      )}

      {aba === 'controle' && (
        <CustosVeiculoClient
          veiculo={veiculo}
          financeiro={financeiro}
          custos={custos}
          lojaId={lojaId}
          podeVerFinanceiro={podeVerFinanceiro}
        />
      )}
    </div>
  )
}
