'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  valorInicial: string
  status: string
}

export default function VeiculosBuscaClient({ valorInicial, status }: Props) {
  const router = useRouter()
  const [termo, setTermo] = useState(valorInicial)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (termo.trim()) params.set('q', termo.trim())
      const qs = params.toString()
      router.push(`/admin/veiculos${qs ? `?${qs}` : ''}`)
    }, 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [termo, status, router])

  return (
    <div className="relative mb-4">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
      </svg>
      <input
        type="text"
        value={termo}
        onChange={e => setTermo(e.target.value)}
        placeholder="Buscar por marca, modelo ou placa..."
        className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all"
      />
      {termo && (
        <button
          onClick={() => setTermo('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
