import { Skeleton, VeiculoCardSkeleton } from '@/components/ui/Skeleton'

/**
 * Skeleton da home (`/`) — espelha o hero (headline + CTAs) e a seção de
 * estoque (grid de VeiculoCardSkeleton), já que HomeCatingueira/HomeFelizardo
 * fazem query bloqueante no Supabase antes de renderizar. Layout neutro
 * (não depende de qual tenant está carregando).
 */
export default function HomeLoading() {
  return (
    <div className="pt-[70px] min-h-screen bg-white">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-24">
        <div className="max-w-2xl space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 sm:h-16 w-full" />
          <Skeleton className="h-10 sm:h-16 w-3/4" />
          <div className="space-y-2 pt-2">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-2/3 max-w-sm" />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Skeleton className="h-14 w-full sm:w-44" />
            <Skeleton className="h-14 w-full sm:w-44" />
          </div>
        </div>
      </div>

      {/* Estoque */}
      <div className="max-w-7xl mx-auto px-5 py-16">
        <Skeleton className="h-10 w-72 mb-4" />
        <Skeleton className="h-4 w-full max-w-xl mb-10" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <VeiculoCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
