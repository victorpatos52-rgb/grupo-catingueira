import { Skeleton, VeiculoCardSkeleton } from '@/components/ui/Skeleton'

/** Espelha o layout real de /estoque: hero compacto + sidebar de filtros + grid de cards. */
export default function EstoqueLoading() {
  return (
    <main className="min-h-screen bg-[#F8F8F8]">
      {/* Hero compacto */}
      <div className="pt-28 pb-8 px-4 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto space-y-3">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Sidebar + grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Sidebar de filtros */}
          <aside className="w-full md:w-[240px] shrink-0 space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </aside>

          {/* Grid — mesma proporção do grid real (1/2/3 colunas) */}
          <div className="flex-1 min-w-0 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <VeiculoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
