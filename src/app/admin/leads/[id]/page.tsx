import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import type { Lead, UsuarioPerfil } from '@/types'
import LeadDetailClient from './LeadDetailClient'

export default async function LeadDetailPage({
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

  const { data } = await supabase
    .from('leads')
    .select('*, veiculo:veiculos(id, marca, modelo, ano)')
    .eq('id', id)
    .eq('loja_id', perfil.loja_id)
    .single()

  if (!data) notFound()
  const lead = data as Lead

  const dataFmt = new Date(lead.created_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="p-6 md:p-8 max-w-2xl">
      <div className="mb-8">
        <Link
          href="/admin/crm"
          className="text-[#555] hover:text-white text-sm transition-colors inline-flex items-center gap-1 mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao CRM
        </Link>
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
          {lead.nome}
        </h1>
        <p className="text-[#555] text-sm mt-1">{dataFmt}</p>
      </div>

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6 mb-6 grid grid-cols-2 gap-5">
        <div>
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Telefone</p>
          <a
            href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white text-sm font-medium hover:text-[var(--cor-primaria)] transition-colors"
          >
            {lead.telefone}
          </a>
        </div>
        <div>
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Origem</p>
          <p className="text-white text-sm font-medium capitalize">{lead.origem}</p>
        </div>
        <div>
          <p className="text-[#555] text-xs uppercase tracking-wider mb-1">Veículo de interesse</p>
          <p className="text-white text-sm font-medium">
            {lead.veiculo
              ? `${lead.veiculo.marca} ${lead.veiculo.modelo} ${lead.veiculo.ano}`
              : '—'}
          </p>
        </div>
      </div>

      <LeadDetailClient lead={lead} />
    </div>
  )
}
