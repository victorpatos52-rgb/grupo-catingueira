import { adminSupabase, createServerSupabase } from '@/lib/supabase-server'
import type { Perfil } from '@/types'

// Checagens de acesso compartilhadas entre Server Actions (actions.ts) e Route
// Handlers (/api/pdf/*) — ambos usam service role (bypassa RLS), então quem
// garante que o usuário só mexe/vê dados da própria loja é este código, não o
// banco. Quem chama é responsável por já ter validado a sessão (getUser) e
// passar o id do usuário autenticado.

export type PerfilAcesso = {
  id: string
  perfil: Perfil
  loja_id: string
  ativo: boolean
  modulos_permitidos: string[]
}

// Usuário sem linha em usuarios_perfil ou desativado é tratado como sem acesso.
export async function obterPerfilAtivo(userId: string): Promise<PerfilAcesso | null> {
  const { data } = await adminSupabase()
    .from('usuarios_perfil')
    .select('id, perfil, loja_id, ativo, modulos_permitidos')
    .eq('id', userId)
    .single()
  if (!data || data.ativo !== true) return null
  return { ...(data as PerfilAcesso), modulos_permitidos: data.modulos_permitidos ?? [] }
}

// Para Route Handlers (/api/pdf/*): valida a sessão dos cookies no servidor
// (getUser verifica o JWT no Supabase Auth) e devolve o perfil ativo. A
// renovação do token fica com o src/proxy.ts, cujo matcher cobre /api/pdf.
export async function obterPerfilDaSessao(): Promise<PerfilAcesso | null> {
  const supabase = await createServerSupabase()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return obterPerfilAtivo(user.id)
}

// Admin/diretor enxergam todas as lojas (mesma regra do admin/layout.tsx);
// demais perfis só a própria.
export function temAcessoLoja(perfil: PerfilAcesso, lojaId: string | null | undefined): boolean {
  if (!lojaId) return false
  if (perfil.perfil === 'admin' || perfil.perfil === 'diretor') return true
  return perfil.loja_id === lojaId
}

// Mesma regra de canSee('vendas') em AdminSidebar: sócio nunca; admin/diretor
// sempre; vendedor/gerente conforme modulos_permitidos.
export function podeAcessarVendas(perfil: PerfilAcesso): boolean {
  if (perfil.perfil === 'socio') return false
  if (perfil.perfil === 'admin' || perfil.perfil === 'diretor') return true
  return perfil.modulos_permitidos.includes('vendas')
}
