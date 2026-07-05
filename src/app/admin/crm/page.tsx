import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLojaIdAtiva } from '@/lib/getLojaIdAtiva'
import type { Lead, UsuarioPerfil, Loja } from '@/types'
import CrmClient from './CrmClient'

interface SearchParams {
  status?: string
  origem?: string
}

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuarios_perfil')
    .select('*, loja:lojas(*)')
    .eq('id', user.id)
    .single()

  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil & { loja: Loja | null }

  const lojaId = await getLojaIdAtiva(perfil)

  const [{ data: leadsData }, { data: vendedoresData }] = await Promise.all([
    supabase
      .from('leads')
      .select('*, veiculo:veiculos(marca, modelo, ano)')
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false }),
    supabase
      .from('usuarios_perfil')
      .select('id, nome')
      .eq('loja_id', lojaId)
      // Sócio não é vendedor — não deve aparecer como opção de responsável pelo lead
      .neq('perfil', 'socio'),
  ])

  const leads = (leadsData ?? []) as Lead[]
  const vendedores = (vendedoresData ?? []) as { id: string; nome: string }[]

  return (
    <CrmClient
      leads={leads}
      vendedores={vendedores}
      lojaId={lojaId}
      userId={user.id}
      statusFilter={params.status ?? ''}
      origemFilter={params.origem ?? ''}
    />
  )
}
