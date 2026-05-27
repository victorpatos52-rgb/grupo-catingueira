import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerSupabase } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { AdminProvider } from '@/contexts/AdminContext'
import type { Loja, UsuarioPerfil } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = adminClient()

  // Admin client garante que RLS não bloqueie perfil nem modulos_permitidos
  const { data: perfilData } = await admin
    .from('usuarios_perfil')
    .select('id, nome, perfil, loja_id, ativo, modulos_permitidos, created_at')
    .eq('id', user.id)
    .single()

  if (!perfilData) redirect('/login')

  const perfil: UsuarioPerfil = {
    ...(perfilData as UsuarioPerfil),
    modulos_permitidos: (perfilData as UsuarioPerfil).modulos_permitidos ?? [],
  }

  // Admin client garante que todas as lojas são retornadas, sem depender de RLS
  const { data: lojasData } = await admin.from('lojas').select('*').order('nome')
  const todasLojas = (lojasData ?? []) as Loja[]

  // Vendedor/gerente só enxerga a própria loja; admin/diretor enxerga todas
  const lojas: Loja[] =
    perfil.perfil === 'admin' || perfil.perfil === 'diretor'
      ? todasLojas
      : todasLojas.filter(l => l.id === perfil.loja_id)

  // lojaAtiva começa como lojas[0] — nunca null quando há lojas
  let lojaAtiva: Loja | null = lojas[0] ?? null

  if ((perfil.perfil === 'admin' || perfil.perfil === 'diretor') && lojas.length > 0) {
    const cookieStore = await cookies()
    const lojaAtivaCookie = cookieStore.get('loja_ativa')?.value
    const lojaOverride = lojaAtivaCookie
      ? lojas.find(l => l.id === lojaAtivaCookie)
      : undefined
    lojaAtiva = lojaOverride ?? lojas[0]
  }

  const perfilComLoja: UsuarioPerfil & { loja: Loja | null } = {
    ...perfil,
    loja: lojaAtiva,
  }

  return (
    <AdminProvider value={{ perfil, loja: lojaAtiva, lojas }}>
      <div className="min-h-screen bg-[#F8F8F8] flex">
        <AdminSidebar perfil={perfilComLoja} loja={lojaAtiva} lojas={lojas} />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </AdminProvider>
  )
}
