/**
 * Spinner genérico pro site público, na cor do tenant (`var(--cor-primaria)`).
 * Usado apenas como "escudo" em rotas que já faziam fetch bloqueante mas
 * ficaram fora do escopo do skeleton (contato/sobre/localização) — sem isso,
 * o novo `src/app/loading.tsx` (raiz) passaria a cobri-las também, já que
 * loading.tsx cobre toda a subárvore de rotas que não tem um loading.tsx
 * mais específico.
 */
export default function PublicLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div
        className="w-8 h-8 rounded-full border-4 border-[#F0F0F0] animate-spin"
        style={{ borderTopColor: 'var(--cor-primaria)' }}
        role="status"
        aria-label="Carregando"
      />
    </div>
  )
}
