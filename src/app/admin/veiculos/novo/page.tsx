import { redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { obterLojaAtivaId } from '@/lib/loja-ativa'
import VeiculoForm from '@/components/admin/VeiculoForm'
import type { UsuarioPerfil } from '@/types'

export default async function NovoVeiculoPage() {
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const p = await exigirPerfilPagina()
  const lojaId = await obterLojaAtivaId(p)

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <a
          href="/admin/veiculos"
          className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Novo Veículo
        </h1>
      </div>
      <VeiculoForm lojaId={lojaId} />
    </div>
  )
}
