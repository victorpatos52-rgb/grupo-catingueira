import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
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
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = adminClient()

  try {
    // ── Perfil do usuário logado ─────────────────────────────────────────────
    const { data: perfilData, error: perfilError } = await admin
      .from('usuarios_perfil')
      .select(PERFIL_SELECT)
      .eq('id', user.id)
      .single()

    if (perfilError) {
      console.error('[UsuariosPage] Erro ao buscar perfil:', perfilError.message, perfilError.details)
      redirect('/login')
    }
    if (!perfilData) redirect('/login')

    const perfil: UsuarioPerfil = {
      ...(perfilData as UsuarioPerfil),
      modulos_permitidos: (perfilData as UsuarioPerfil).modulos_permitidos ?? [],
    }

    if (!['diretor', 'admin'].includes(perfil.perfil)) redirect('/admin/dashboard')

    // ── Lojas (admin vê todas) ───────────────────────────────────────────────
    const { data: lojasData, error: lojasError } = await admin
      .from('lojas')
      .select('*')
      .order('nome')

    if (lojasError) {
      console.error('[UsuariosPage] Erro ao buscar lojas:', lojasError.message)
    }
    const lojas = (lojasData ?? []) as Loja[]

    // ── Usuários de todas as lojas ───────────────────────────────────────────
    const lojaIds = lojas.map(l => l.id)
    let usuariosPerfil: (UsuarioPerfil & { loja: Loja | null })[] = []

    if (lojaIds.length > 0) {
      const { data, error } = await admin
        .from('usuarios_perfil')
        .select(`${PERFIL_SELECT}, loja:lojas(*)`)
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

    // ── Emails do Auth ───────────────────────────────────────────────────────
    const { data: authData, error: authError } = await admin.auth.admin.listUsers({ perPage: 1000 })

    if (authError) {
      console.error('[UsuariosPage] Erro ao listar auth users:', authError.message)
    }

    const emailMap: Record<string, string> = {}
    for (const u of authData?.users ?? []) {
      emailMap[u.id] = u.email ?? ''
    }

    const usuarios = usuariosPerfil.map(u => ({
      ...u,
      email: emailMap[u.id] ?? '',
    }))

    return <UsuariosClient perfil={perfil} usuarios={usuarios} lojas={lojas} />

  } catch (err) {
    // Loga o erro real antes de propagar — no Vercel aparece em Functions logs
    console.error('[UsuariosPage] Erro não tratado:', err)
    throw err
  }
}
