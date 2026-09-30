import { Skeleton } from '@/components/ui/Skeleton'

/** Espelha o layout real de /veiculo/[id]: galeria (4/3 + thumbnails) + título/preço/specs. */
export default function VeiculoLoading() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 items-start">
        {/* Galeria */}
        <div className="space-y-3 w-full">
          <Skeleton className="aspect-[4/3] w-full rounded-xl" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square w-16 shrink-0 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Informações */}
        <div className="flex flex-col gap-6">
          <Skeleton className="h-3 w-24" />

          <div className="space-y-2">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-32" />
          </div>

          <Skeleton className="h-12 w-48" />

          <Skeleton className="h-14 w-full rounded-xl" />

          <div className="bg-[#F8F8F8] rounded-xl p-6">
            <Skeleton className="h-3 w-32 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-14" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
