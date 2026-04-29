'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Sliders } from 'lucide-react'

const MARCAS = [
  'Chevrolet', 'Fiat', 'Ford', 'Honda', 'Hyundai', 'Jeep',
  'Nissan', 'Renault', 'Toyota', 'Volkswagen', 'Outros',
]

const inputClass =
  'w-full bg-white border border-[#E5E5E5] rounded-lg px-3 py-2.5 text-sm text-[#1A1A1A] placeholder-[#AAA] focus:outline-none focus:border-[#F5C200] transition-colors'

const labelClass =
  'block text-[10px] font-bold uppercase tracking-[0.15em] text-[#888] mb-1.5'

export default function VeiculoFiltros() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [aberto, setAberto] = useState(false)

  function get(key: string) {
    return searchParams.get(key) ?? ''
  }

  function atualizar(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('pagina')
    router.push(`${pathname}?${params.toString()}`)
  }

  function limpar() {
    router.push(pathname)
  }

  const temFiltros = searchParams.toString().length > 0

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setAberto(!aberto)}
        className="md:hidden w-full flex items-center justify-between px-4 py-3 rounded-lg bg-white shadow-sm border border-[#E5E5E5] mb-3"
      >
        <span className="flex items-center gap-2 font-semibold text-sm text-[#1A1A1A]">
          <Sliders className="w-4 h-4" style={{ color: '#F5C200' }} />
          Filtros
          {temFiltros && (
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: '#F5C200' }} />
          )}
        </span>
        <svg
          className={`w-4 h-4 text-[#888] transition-transform ${aberto ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Sidebar panel */}
      <div
        className={`${aberto ? 'block' : 'hidden'} md:block bg-white rounded-xl shadow-md p-5 flex flex-col gap-5`}
        style={{ borderTop: '3px solid #F5C200' }}
      >
        <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-bold uppercase tracking-[0.15em] text-[#1A1A1A] flex items-center gap-2">
          <Sliders className="w-4 h-4" style={{ color: '#F5C200' }} />
          Filtros
        </p>

        <div>
          <label className={labelClass}>Buscar</label>
          <input
            type="text"
            placeholder="Marca, modelo..."
            value={get('busca')}
            onChange={e => atualizar('busca', e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Marca</label>
          <select
            value={get('marca')}
            onChange={e => atualizar('marca', e.target.value)}
            className={inputClass}
          >
            <option value="">Todas as marcas</option>
            {MARCAS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Câmbio</label>
          <select
            value={get('cambio')}
            onChange={e => atualizar('cambio', e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            <option value="Manual">Manual</option>
            <option value="Automático">Automático</option>
            <option value="CVT">CVT</option>
            <option value="Automatizado">Automatizado</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Combustível</label>
          <select
            value={get('combustivel')}
            onChange={e => atualizar('combustivel', e.target.value)}
            className={inputClass}
          >
            <option value="">Todos</option>
            <option value="Flex">Flex</option>
            <option value="Gasolina">Gasolina</option>
            <option value="Etanol">Etanol</option>
            <option value="Diesel">Diesel</option>
            <option value="Elétrico">Elétrico</option>
            <option value="Híbrido">Híbrido</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Ano</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Mín."
              value={get('ano_min')}
              onChange={e => atualizar('ano_min', e.target.value)}
              className={inputClass}
            />
            <span className="text-[#CCC] text-xs shrink-0">—</span>
            <input
              type="number"
              placeholder="Máx."
              value={get('ano_max')}
              onChange={e => atualizar('ano_max', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Preço (R$)</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              placeholder="Mín."
              value={get('preco_min')}
              onChange={e => atualizar('preco_min', e.target.value)}
              className={inputClass}
            />
            <span className="text-[#CCC] text-xs shrink-0">—</span>
            <input
              type="number"
              placeholder="Máx."
              value={get('preco_max')}
              onChange={e => atualizar('preco_max', e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {temFiltros && (
          <button
            onClick={limpar}
            className="w-full py-2.5 rounded-lg border border-[#E5E5E5] text-xs font-bold uppercase tracking-widest text-[#888] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </>
  )
}
