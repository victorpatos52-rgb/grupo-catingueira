import { notFound, redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import VeiculoForm from '@/components/admin/VeiculoForm'
import MarcaVendidoButton from '@/components/admin/MarcaVendidoButton'
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
    .from('usuarios_perfil')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil

  const lojaId = await getLojaIdAtiva(perfil)

  const [{ data }, { data: vistoriaData }] = await Promise.all([
    supabase.from('veiculos').select('*').eq('id', id).eq('loja_id', lojaId).single(),
    supabase
      .from('vistoria_veiculo')
      .select('aprovado')
      .eq('veiculo_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  if (!data) notFound()
  const veiculo = data as Veiculo
  const vistoria = vistoriaData as { aprovado: boolean } | null

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
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
              Editar Veículo
            </h1>
            <p className="text-[#555] text-sm mt-1">
              {veiculo.marca} {veiculo.modelo} {veiculo.ano}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Vistoria badge */}
            <a
              href={`/admin/veiculos/${id}/vistoria`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                vistoria === null
                  ? 'border-[#333] text-[#666] hover:border-[#444] hover:text-[#888]'
                  : vistoria.aprovado
                  ? 'border-green-600/40 text-green-400 bg-green-600/10'
                  : 'border-yellow-600/40 text-yellow-400 bg-yellow-600/10'
              }`}
            >
              {vistoria === null ? '⚠️ Vistoria pendente' : vistoria.aprovado ? '✅ Vistoria aprovada' : '❌ Vistoria reprovada'}
            </a>
            {/* PDF buttons */}
            <a
              href={`/api/pdf/ficha/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] text-xs font-medium hover:text-white hover:border-[#333] transition-colors"
            >
              📄 Ficha
            </a>
            <a
              href={`/api/pdf/etiqueta/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] text-xs font-medium hover:text-white hover:border-[#333] transition-colors"
            >
              🏷️ Etiqueta
            </a>
            <a
              href={`/api/pdf/contrato/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#888] text-xs font-medium hover:text-white hover:border-[#333] transition-colors"
            >
              📋 Contrato
            </a>
            {veiculo.status !== 'vendido' && (
              <MarcaVendidoButton veiculoId={id} />
            )}
          </div>
        </div>
      </div>
      <VeiculoForm veiculo={veiculo} lojaId={lojaId} />
    </div>
  )
}
