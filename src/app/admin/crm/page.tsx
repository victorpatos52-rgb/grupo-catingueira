import { redirect } from 'next/navigation'
import { adminSupabase, createServerSupabase } from '@/lib/supabase-server'
import { listarUsuariosDaLoja } from '@/lib/acesso'
import { obterLojaAtivaId } from '@/lib/loja-ativa'
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
    // FK explícita: depois da 024 há dois caminhos usuarios_perfil → lojas
    // (loja padrão e usuarios_lojas) e o embed sem hint dá erro.
    .select('*, loja:lojas!usuarios_perfil_loja_id_fkey(*)')
    .eq('id', user.id)
    .single()

  if (!perfilData) redirect('/login')
  const perfil = perfilData as UsuarioPerfil & { loja: Loja | null }

  const lojaId = await obterLojaAtivaId(perfil)

  // Service role + filtro explícito da loja ativa: a RLS de leads usa
  // perfil.loja_id e mostrava a lista vazia para admin/diretor com o seletor
  // na outra loja.
  const [{ data: leadsData }, vendedoresLoja] = await Promise.all([
    adminSupabase()
      .from('leads')
      .select('*, veiculo:veiculos(marca, modelo, ano)')
      .eq('loja_id', lojaId)
      .order('created_at', { ascending: false }),
    // Usuários da loja ativa (padrão ou com acesso marcado). Sócio não é
    // vendedor — não aparece como opção de responsável pelo lead.
    listarUsuariosDaLoja(lojaId, { semSocio: true }),
  ])

  const leads = (leadsData ?? []) as Lead[]
  const vendedores = vendedoresLoja.map(({ id, nome }) => ({ id, nome }))

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
