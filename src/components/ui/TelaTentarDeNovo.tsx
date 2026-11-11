'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

// Usado pelos error.tsx: falha ao carregar dados (timeout, Supabase fora do ar)
// NÃO é motivo para mandar ao /login — mostra a mensagem e "Tentar de novo".
// O botão refaz a renderização no servidor (router.refresh + reset).
export default function TelaTentarDeNovo({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const [tentando, iniciar] = useTransition()
  const [tentativas, setTentativas] = useState(0)

  useEffect(() => {
    console.error('[TelaTentarDeNovo]', error)
  }, [error])

  function tentar() {
    setTentativas(t => t + 1)
    iniciar(() => {
      router.refresh()
      reset()
    })
  }

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto">
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 shadow-sm text-center mt-10">
        <p className="text-[#111827] font-semibold">Não foi possível carregar esta tela agora.</p>
        <p className="text-[#6B7280] text-sm mt-1">
          Pode ser uma instabilidade passageira. Você continua logado.
        </p>
        <button
          type="button"
          onClick={tentar}
          disabled={tentando}
          className="mt-5 min-h-[44px] px-6 rounded-xl font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-95 disabled:opacity-50"
        >
          {tentando ? 'Tentando...' : 'Tentar de novo'}
        </button>
        {tentativas >= 2 && (
          <p className="text-[#9CA3AF] text-xs mt-3">
            Se continuar, recarregue a página ou tente em alguns minutos.
          </p>
        )}
        {error.digest && <p className="text-[#D1D5DB] text-[11px] mt-3">Código: {error.digest}</p>}
      </div>
    </div>
  )
}
