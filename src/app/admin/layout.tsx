import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import { AdminProvider } from '@/contexts/AdminContext'
import type { Loja, UsuarioPerfil } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: perfilData } = await supabase
    .from('usuario_perfis')
    .select('*, loja:lojas(*)')
    .eq('user_id', user.id)
    .single()

  const perfil = perfilData as (UsuarioPerfil & { loja: Loja | null }) | null
  const loja = perfil?.loja ?? null

  let lojas: Loja[] = []
  if (perfil?.perfil === 'diretor' || perfil?.perfil === 'admin') {
    const { data } = await supabase.from('lojas').select('*').order('nome')
    lojas = (data ?? []) as Loja[]
  } else if (loja) {
    lojas = [loja]
  }

  return (
    <AdminProvider value={{ perfil, loja, lojas }}>
      <div className="min-h-screen bg-[#111111] flex">
        <AdminSidebar perfil={perfil} loja={loja} lojas={lojas} />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </AdminProvider>
  )
}
