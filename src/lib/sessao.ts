import { cache } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { adminSupabase } from '@/lib/supabase-server'
import { carregarLojasAcesso, type PerfilAcesso } from '@/lib/acesso'
import { CABECALHO_SESSAO, verificarSessao } from '@/lib/sessao-assinatura'
import type { UsuarioPerfil } from '@/types'

// ─── Sessão no servidor — FONTE ÚNICA ─────────────────────────────────────────
//
// Layout, páginas, Server Actions e rotas /api usam SÓ esta função. Ela não
// fala com o Supabase Auth: lê o usuário que o proxy já validou (cabeçalho
// assinado, ver lib/sessao-assinatura.ts) e busca o perfil UMA vez por
// requisição (React.cache — layout + página + actions compartilham).
//
// Resultado:
//   ok         → usuário logado, ativo, com perfil
//   sem-sessao → não há sessão válida (vai para /login)
//   inativo    → logado mas desativado ou sem usuarios_perfil (vai para /api/auth/sair)
//   erro       → falha ao consultar o perfil (timeout, Supabase fora): NÃO é
//                motivo para mandar ao /login — a tela mostra "Tentar de novo"

export type PerfilSessao = UsuarioPerfil & PerfilAcesso

export type ResultadoSessao =
  | { status: 'ok'; perfil: PerfilSessao }
  | { status: 'sem-sessao' }
  | { status: 'inativo'; userId: string }
  | { status: 'erro'; mensagem: string }

export const obterSessao = cache(async (): Promise<ResultadoSessao> => {
  const userId = await verificarSessao((await headers()).get(CABECALHO_SESSAO))
  if (!userId) return { status: 'sem-sessao' }

  const { data, error } = await adminSupabase()
    .from('usuarios_perfil')
    .select('id, nome, perfil, loja_id, ativo, modulos_permitidos, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[obterSessao] falha ao buscar perfil:', error.message)
    return { status: 'erro', mensagem: 'Não foi possível carregar seus dados agora.' }
  }
  if (!data || data.ativo !== true) return { status: 'inativo', userId }

  const lojas_acesso = await carregarLojasAcesso(data.id, data.loja_id)
  return {
    status: 'ok',
    perfil: {
      ...(data as UsuarioPerfil),
      modulos_permitidos: data.modulos_permitidos ?? [],
      lojas_acesso,
    },
  }
})

/** Erro de carregamento (não de sessão) — mostrado pelo error.tsx com "Tentar de novo". */
export class ErroCarregamentoSessao extends Error {
  constructor(mensagem: string) {
    super(mensagem)
    this.name = 'ErroCarregamentoSessao'
  }
}

/**
 * Para Server Components (layout e páginas do admin). Só sessão inválida leva
 * ao /login; desativado vai para /api/auth/sair (que encerra a sessão); falha
 * de consulta lança erro (tela "Tentar de novo").
 */
export async function exigirPerfilPagina(): Promise<PerfilSessao> {
  const sessao = await obterSessao()
  if (sessao.status === 'ok') return sessao.perfil
  if (sessao.status === 'sem-sessao') redirect('/login')
  if (sessao.status === 'inativo') redirect('/api/auth/sair')
  throw new ErroCarregamentoSessao(sessao.mensagem)
}

/**
 * Para rotas /api/pdf e actions de integração: perfil ativo ou null.
 * Falha de consulta lança erro (a rota responde 500 em vez de "não autenticado").
 */
export async function obterPerfilDaSessao(): Promise<PerfilSessao | null> {
  const sessao = await obterSessao()
  if (sessao.status === 'ok') return sessao.perfil
  if (sessao.status === 'erro') throw new ErroCarregamentoSessao(sessao.mensagem)
  return null
}
