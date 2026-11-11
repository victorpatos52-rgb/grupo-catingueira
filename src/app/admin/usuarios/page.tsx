import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { exigirPerfilPagina } from '@/lib/sessao'
import { telaInicial } from '@/lib/tela-inicial'
import type { UsuarioPerfil, Loja } from '@/types'
import UsuariosClient from './UsuariosClient'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

const PERFIL_SELECT = 'id, nome, perfil, loja_id, ativo, modulos_permitidos, created_at'

export default async function UsuariosPage() {
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts). Antes, erro ao ler o perfil mandava para /login.
  const perfil: UsuarioPerfil = await exigirPerfilPagina()

  const admin = adminClient()

  try {
    if (!['diretor', 'admin'].includes(perfil.perfil)) redirect(telaInicial(perfil))

    // ── Lojas e usuários do Auth não dependem um do outro — roda em paralelo.
    const [
      { data: lojasData, error: lojasError },
      { data: authData, error: authError },
    ] = await Promise.all([
      admin.from('lojas').select('*').order('nome'),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ])

    if (lojasError) {
      console.error('[UsuariosPage] Erro ao buscar lojas:', lojasError.message)
    }
    if (authError) {
      console.error('[UsuariosPage] Erro ao listar auth users:', authError.message)
    }
    // Diretor só gerencia a própria loja (mesma regra de exigirAlcance em
    // actions.ts) — lista só ela e seus usuários; admin vê todas.
    const todasLojas = (lojasData ?? []) as Loja[]
    const lojas = perfil.perfil === 'admin' ? todasLojas : todasLojas.filter(l => l.id === perfil.loja_id)

    // ── Usuários de todas as lojas (depende dos lojaIds acima, sequencial mesmo) ──
    const lojaIds = lojas.map(l => l.id)
    let usuariosPerfil: (UsuarioPerfil & { loja: Loja | null })[] = []

    if (lojaIds.length > 0) {
      const { data, error } = await admin
        .from('usuarios_perfil')
        // FK explícita (loja padrão): depois da 024 há dois caminhos
        // usuarios_perfil → lojas (loja_id e usuarios_lojas).
        .select(`${PERFIL_SELECT}, loja:lojas!usuarios_perfil_loja_id_fkey(*)`)
        .in('loja_id', lojaIds)
        .order('nome')

      if (error) {
        console.error('[UsuariosPage] Erro ao buscar usuarios_perfil:', error.message, error.details)
        throw new Error(`Falha ao carregar lista de usuários: ${error.message}`)
      }

      // Cast via unknown: PostgREST tipifica loja como any[] no tipo inferido
      usuariosPerfil = ((data ?? []) as unknown as (UsuarioPerfil & { loja: Loja | null })[]).map(u => ({
        ...u,
        modulos_permitidos: u.modulos_permitidos ?? [],
      }))
    }

    const emailMap: Record<string, string> = {}
    for (const u of authData?.users ?? []) {
      emailMap[u.id] = u.email ?? ''
    }

    // Lojas com acesso de cada usuário (usuarios_lojas, migration 024). Sem
    // linhas (ou tabela ainda não criada) → só a loja padrão, como antes.
    const lojasPorUsuario: Record<string, string[]> = {}
    if (usuariosPerfil.length > 0) {
      const { data: vinculos, error: vinculosError } = await admin
        .from('usuarios_lojas')
        .select('usuario_id, loja_id')
        .in('usuario_id', usuariosPerfil.map(u => u.id))
      if (vinculosError) console.error('[UsuariosPage] Erro ao buscar usuarios_lojas:', vinculosError.message)
      for (const v of (vinculos ?? []) as { usuario_id: string; loja_id: string }[]) {
        ;(lojasPorUsuario[v.usuario_id] ??= []).push(v.loja_id)
      }
    }

    const usuarios = usuariosPerfil.map(u => {
      const marcadas = lojasPorUsuario[u.id] ?? []
      return {
        ...u,
        email: emailMap[u.id] ?? '',
        lojas_acesso: marcadas.includes(u.loja_id) ? marcadas : [u.loja_id, ...marcadas],
      }
    })

    // Opções de "Lojas com acesso": todas as lojas (admin e diretor têm acesso
    // a todas). A lista de usuários continua no escopo de cada gestor (acima).
    return <UsuariosClient perfil={perfil} usuarios={usuarios} lojas={todasLojas} />

  } catch (err) {
    // Loga o erro real antes de propagar — no Vercel aparece em Functions logs
    console.error('[UsuariosPage] Erro não tratado:', err)
    throw err
  }
}
