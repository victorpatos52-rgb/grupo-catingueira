'use client'

import { useRouter } from 'next/navigation'

export default function MarcaVendidoButton({ veiculoId }: { veiculoId: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(`/admin/vendas/nova?veiculo_id=${veiculoId}`)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F5C842] text-[#111827] hover:bg-[#F59E0B] transition-colors"
    >
      Registrar Venda
    </button>
  )
}
