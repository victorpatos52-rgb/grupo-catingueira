import { Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { getLoja } from '@/lib/getLoja'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import VeiculoFiltros from '@/components/veiculo/VeiculoFiltros'
import { Car } from 'lucide-react'
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

  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      {/* ── Hero compacto ── */}
      <div className="pt-28 pb-8 px-4 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto">
          <p
            className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-2"
            style={{ color: '#F5C200' }}
          >
            CATINGUEIRA MULTIMARCAS
          </p>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-black uppercase text-[#1A1A1A] leading-none">
            NOSSO ESTOQUE
          </h1>
          <div className="w-14 h-[3px] mt-3 mb-3" style={{ backgroundColor: '#F5C200' }} />
          <p className="text-[#888] text-sm">
            {veiculos.length} {veiculos.length === 1 ? 'veículo disponível' : 'veículos disponíveis'}
          </p>
        </div>
      </div>

      {/* ── Layout sidebar + grid ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar */}
          <aside className="w-full md:w-[240px] shrink-0 md:sticky md:top-[86px]">
            <Suspense>
              <VeiculoFiltros />
            </Suspense>
          </aside>

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {veiculos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Car className="w-16 h-16 mb-4" style={{ color: '#F5C200' }} />
                <p className="text-[#1A1A1A] font-[family-name:var(--font-barlow-condensed)] text-xl font-bold uppercase mb-2">
                  Nenhum veículo encontrado
                </p>
                <p className="text-[#888] text-sm mb-6">
                  Tente ajustar os filtros para ver mais resultados.
                </p>
                <a
                  href="/estoque"
                  className="inline-flex items-center px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest text-[#1A1A1A] hover:brightness-90 transition-all"
                  style={{ backgroundColor: '#F5C200' }}
                >
                  Limpar filtros
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {veiculos.map((v, i) =>
                  loja ? (
                    <VeiculoCard key={v.id} veiculo={v} loja={loja} delay={i * 0.05} />
                  ) : null
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
