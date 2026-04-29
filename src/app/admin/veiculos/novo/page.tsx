import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import VeiculoForm from '@/components/admin/VeiculoForm'
import type { UsuarioPerfil } from '@/types'

export default async function NovoVeiculoPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: perfil } = await supabase
    .from('usuario_perfis')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!perfil) redirect('/admin/login')

  const p = perfil as UsuarioPerfil

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="mb-8">
        <a
          href="/admin/veiculos"
          className="text-[#555] hover:text-white text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </a>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
          Novo Veículo
        </h1>
      </div>
      <VeiculoForm lojaId={p.loja_id} />
    </div>
  )
}
