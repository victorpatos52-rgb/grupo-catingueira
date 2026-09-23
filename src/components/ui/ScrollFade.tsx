import type { ReactNode } from 'react'

/**
 * Envolve uma barra de itens (abas, etc.) com scroll horizontal + uma
 * sombra/gradiente fixa na borda direita, sinalizando que há mais conteúdo
 * fora da tela — usado onde antes as abas quebravam em várias linhas
 * (flex-wrap) e agora rolam em uma linha só.
 */
export default function ScrollFade({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </div>
  )
}
