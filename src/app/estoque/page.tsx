import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { getLoja } from '@/lib/getLoja'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import VeiculoFiltros from '@/components/veiculo/VeiculoFiltros'
import type { Veiculo } from '@/types'

interface SearchParams {
  busca?: string
  marca?: string
  cambio?: string
  combustivel?: string
  ano_min?: string
  ano_max?: string
  preco_min?: string
  preco_max?: string
}

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const loja = await getLoja()
  const supabase = await createClient()

  let query = supabase
    .from('veiculos')
    .select('*')
    .eq('status', 'disponivel')
    .order('created_at', { ascending: false })

  if (loja) {
    query = query.eq('loja_id', loja.id)
  }

  if (params.marca) {
    query = query.ilike('marca', `%${params.marca}%`)
  }
  if (params.busca) {
    query = query.or(
      `marca.ilike.%${params.busca}%,modelo.ilike.%${params.busca}%,versao.ilike.%${params.busca}%`
    )
  }
  if (params.cambio) {
    query = query.eq('cambio', params.cambio)
  }
  if (params.combustivel) {
    query = query.eq('combustivel', params.combustivel)
  }
  if (params.ano_min) {
    query = query.gte('ano', parseInt(params.ano_min))
  }
  if (params.ano_max) {
    query = query.lte('ano', parseInt(params.ano_max))
  }
  if (params.preco_min) {
    query = query.gte('preco', parseFloat(params.preco_min))
  }
  if (params.preco_max) {
    query = query.lte('preco', parseFloat(params.preco_max))
  }

  const { data } = await query
  const veiculos = (data ?? []) as Veiculo[]

  const nomeLoja = loja?.nome ?? 'Grupo Catingueira'

  return (
    <main className="min-h-screen bg-[#0D0D0D]">
      <div className="border-b border-[#1A1A1A] px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <a
            href="/"
            className="text-[#666] hover:text-white text-sm transition-colors mb-4 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Início
          </a>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-black uppercase text-white mt-2">
            Estoque{' '}
            <span style={{ color: 'var(--cor-primaria)' }}>{nomeLoja}</span>
          </h1>
          <p className="text-[#666] mt-2 text-sm">
            {veiculos.length} {veiculos.length === 1 ? 'veículo disponível' : 'veículos disponíveis'}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Suspense>
          <VeiculoFiltros />
        </Suspense>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16">
        {veiculos.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-16 h-16 text-[#333] mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-[#666] text-lg">Nenhum veículo encontrado com esses filtros.</p>
            <a
              href="/estoque"
              className="mt-4 inline-flex text-sm underline underline-offset-2 transition-opacity hover:opacity-70"
              style={{ color: 'var(--cor-primaria)' }}
            >
              Limpar filtros
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {veiculos.map(v =>
              loja ? (
                <VeiculoCard key={v.id} veiculo={v} loja={loja} />
              ) : null
            )}
          </div>
        )}
      </div>
    </main>
  )
}
