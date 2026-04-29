import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import VeiculoForm from '@/components/admin/VeiculoForm'
import type { Veiculo, UsuarioPerfil } from '@/types'

export default async function EditarVeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuario_perfis')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  const { data } = await supabase
    .from('veiculos')
    .select('*')
    .eq('id', id)
    .eq('loja_id', perfil.loja_id)
    .single()

  if (!data) notFound()
  const veiculo = data as Veiculo

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
          Editar Veículo
        </h1>
        <p className="text-[#555] text-sm mt-1">
          {veiculo.marca} {veiculo.modelo} {veiculo.ano}
        </p>
      </div>
      <VeiculoForm veiculo={veiculo} lojaId={perfil.loja_id} />
    </div>
  )
}
