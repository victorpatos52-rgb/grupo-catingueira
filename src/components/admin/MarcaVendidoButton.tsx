'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function MarcaVendidoButton({ veiculoId }: { veiculoId: string }) {
  const router = useRouter()
  const [carregando, setCarregando] = useState(false)

  async function marcarVendido() {
    if (!confirm('Marcar este veículo como vendido?')) return
    setCarregando(true)
    const supabase = createClient()
    await supabase.from('veiculos').update({ status: 'vendido' }).eq('id', veiculoId)
    router.refresh()
    setCarregando(false)
  }

  return (
    <button
      onClick={marcarVendido}
      disabled={carregando}
      className="text-xs text-[#666] hover:text-green-400 px-2.5 py-1.5 rounded-md border border-[#2A2A2A] hover:border-green-400/30 transition-colors disabled:opacity-50"
    >
      {carregando ? '...' : 'Vendido'}
    </button>
  )
}
