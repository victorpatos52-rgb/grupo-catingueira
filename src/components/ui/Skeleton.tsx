/**
 * Bloco de skeleton reutilizável — mesmo cinza (#F0F0F0) já usado como
 * placeholder de imagem no site público (VeiculoCard, GaleriaClient) e
 * mesmo `rounded` do resto do sistema, com `animate-pulse` (Tailwind).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-[#F0F0F0] rounded-lg ${className}`} />
}

/** Espelha a estrutura do VeiculoCard (capa 4/3, marca, modelo, preço, botões). */
export function VeiculoCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-md border-t-[3px] border-t-[#F0F0F0]">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-7 w-28 mt-auto" />
        <div className="flex gap-2 mt-1">
          <Skeleton className="flex-1 h-9 rounded-md" />
          <Skeleton className="w-24 h-9 rounded-md" />
        </div>
      </div>
    </div>
  )
}
