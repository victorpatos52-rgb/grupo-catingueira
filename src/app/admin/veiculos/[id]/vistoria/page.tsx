import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import { ITENS_VISTORIA } from '@/lib/vistoriaItens'
import type { Veiculo, VistoriaVeiculo, UsuarioPerfil } from '@/types'
import VistoriaClient from './VistoriaClient'

export default async function VistoriaPage({
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
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  const [{ data: veiculoData }, { data: vistoriaData }] = await Promise.all([
    supabase
      .from('veiculos')
      .select('*')
      .eq('id', id)
      .eq('loja_id', perfil.loja_id)
      .single(),
    supabase
      .from('vistoria_veiculo')
      .select('*')
      .eq('veiculo_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!veiculoData) notFound()

  return (
    <div className="p-6 md:p-8 max-w-3xl">
      <div className="mb-8">
        <Link
          href={`/admin/veiculos/${id}`}
          className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao veículo
        </Link>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Vistoria
        </h1>
        <p className="text-[#6B7280] text-sm mt-1">
          {veiculoData.marca} {veiculoData.modelo} {veiculoData.ano}
        </p>
      </div>

      <VistoriaClient
        veiculoId={id}
        lojaId={perfil.loja_id}
        itensConfig={ITENS_VISTORIA}
        vistoria={vistoriaData as VistoriaVeiculo | null}
      />
    </div>
  )
}
