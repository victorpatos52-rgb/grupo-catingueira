import { redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { adminSupabase } from '@/lib/supabase-server'
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
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()

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
      userId={perfil.id}
      statusFilter={params.status ?? ''}
      origemFilter={params.origem ?? ''}
    />
  )
}
