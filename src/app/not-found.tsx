export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-black uppercase text-[#1A1A1A] mb-3">
        Página não encontrada
      </h1>
      <p className="text-[#888] text-sm max-w-md">
        Não foi possível carregar esta página. Se você chegou aqui por um domínio da loja,
        verifique se o endereço está correto.
      </p>
    </main>
  )
}
