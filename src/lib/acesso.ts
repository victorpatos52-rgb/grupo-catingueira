import { adminSupabase } from '@/lib/supabase-server'
import type { Perfil } from '@/types'

// Checagens de acesso compartilhadas entre Server Actions (actions.ts) e Route
// Handlers (/api/pdf/*) — ambos usam service role (bypassa RLS), então quem
// garante que o usuário só mexe/vê dados das lojas a que tem acesso é este
// código, não o banco. A sessão vem de lib/sessao.ts (validada pelo proxy).

export type PerfilAcesso = {
  id: string
  perfil: Perfil
  /** Loja padrão do usuário (sempre está entre as lojas com acesso). */
  loja_id: string
  ativo: boolean
  modulos_permitidos: string[]
  /**
   * Lojas a que o usuário tem acesso (tabela usuarios_lojas, migration 024).
   * Admin/diretor têm todas automaticamente — a lista deles não é usada.
   */
  lojas_acesso: string[]
}

export function ehPerfilTodasLojas(perfil: Perfil): boolean {
  return perfil === 'admin' || perfil === 'diretor'
}

/**
 * Lojas marcadas para o usuário em usuarios_lojas. Sem linhas (ou tabela
 * ainda não criada — migration 024 pendente) → só a loja padrão, que é o
 * comportamento de antes da 024.
 */
export async function carregarLojasAcesso(userId: string, lojaPadrao: string): Promise<string[]> {
  const { data, error } = await adminSupabase()
    .from('usuarios_lojas')
    .select('loja_id')
    .eq('usuario_id', userId)
  const ids = error ? [] : ((data ?? []) as { loja_id: string }[]).map(r => r.loja_id)
  if (ids.length === 0) return lojaPadrao ? [lojaPadrao] : []
  return ids.includes(lojaPadrao) ? ids : [lojaPadrao, ...ids]
}

/**
 * Usuários ativos que trabalham numa loja: loja padrão = lojaId OU marcada em
 * usuarios_lojas. Usado nas listas de responsável/vendedor (CRM, lead, nova
 * venda, dashboard) — assim um gerente com acesso às duas lojas aparece nas
 * duas. Admin/diretor aparecem só na loja padrão deles (como antes).
 */
export async function listarUsuariosDaLoja(
  lojaId: string,
  opcoes: { semSocio?: boolean } = {}
): Promise<{ id: string; nome: string; perfil: Perfil }[]> {
  const admin = adminSupabase()
  const { data: vinculos } = await admin.from('usuarios_lojas').select('usuario_id').eq('loja_id', lojaId)
  const idsVinculados = ((vinculos ?? []) as { usuario_id: string }[]).map(v => v.usuario_id)

  let query = admin.from('usuarios_perfil').select('id, nome, perfil, loja_id').eq('ativo', true)
  query = idsVinculados.length > 0
    ? query.or(`loja_id.eq.${lojaId},id.in.(${idsVinculados.join(',')})`)
    : query.eq('loja_id', lojaId)
  if (opcoes.semSocio) query = query.neq('perfil', 'socio')
  const { data } = await query.order('nome')

  return ((data ?? []) as { id: string; nome: string; perfil: Perfil; loja_id: string }[])
    // admin/diretor só na loja padrão (têm acesso a todas, mas não "trabalham" em todas)
    .filter(u => !ehPerfilTodasLojas(u.perfil) || u.loja_id === lojaId)
    .map(({ id, nome, perfil }) => ({ id, nome, perfil }))
}

/** Usuário ativo com acesso à loja (para validar responsável/vendedor escolhido). */
export async function usuarioTrabalhaNaLoja(userId: string, lojaId: string): Promise<boolean> {
  const perfil = await obterPerfilAtivo(userId)
  return !!perfil && temAcessoLoja(perfil, lojaId)
}

// Usuário sem linha em usuarios_perfil ou desativado é tratado como sem acesso.
export async function obterPerfilAtivo(userId: string): Promise<PerfilAcesso | null> {
  const { data } = await adminSupabase()
    .from('usuarios_perfil')
    .select('id, perfil, loja_id, ativo, modulos_permitidos')
    .eq('id', userId)
    .single()
  if (!data || data.ativo !== true) return null
  const lojas_acesso = await carregarLojasAcesso(data.id, data.loja_id)
  return { ...(data as Omit<PerfilAcesso, 'lojas_acesso'>), modulos_permitidos: data.modulos_permitidos ?? [], lojas_acesso }
}

// A leitura da sessão no servidor mora em lib/sessao.ts (obterSessao /
// obterPerfilDaSessao) — o proxy é o único que fala com o Supabase Auth.

// Admin/diretor: todas as lojas. Demais perfis: as lojas marcadas no cadastro
// (usuarios_lojas). Isto é PERMISSÃO; qual loja está em uso no painel é a
// loja ativa (lib/loja-ativa.ts), que as actions também conferem.
export function temAcessoLoja(perfil: PerfilAcesso, lojaId: string | null | undefined): boolean {
  if (!lojaId) return false
  if (ehPerfilTodasLojas(perfil.perfil)) return true
  return perfil.lojas_acesso.includes(lojaId)
}

// Mesma regra de canSee('vendas') em AdminSidebar: sócio nunca; admin/diretor
// sempre; vendedor/gerente conforme modulos_permitidos.
export function podeAcessarVendas(perfil: PerfilAcesso): boolean {
  if (perfil.perfil === 'socio') return false
  if (perfil.perfil === 'admin' || perfil.perfil === 'diretor') return true
  return perfil.modulos_permitidos.includes('vendas')
}
