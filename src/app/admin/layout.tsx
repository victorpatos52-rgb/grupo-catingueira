import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
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
    .from('usuarios_perfil')
    .select('*, loja:lojas(*)')
    .eq('id', user.id)
    .single()

  const perfil = perfilData as (UsuarioPerfil & { loja: Loja | null }) | null

  if (!perfil) redirect('/login')

  const loja = perfil.loja ?? null

  let lojas: Loja[] = []
  if (perfil.perfil === 'diretor' || perfil.perfil === 'admin') {
    const { data } = await supabase.from('lojas').select('*').order('nome')
    lojas = (data ?? []) as Loja[]
  } else if (loja) {
    lojas = [loja]
  }

  let lojaAtiva = loja
  if ((perfil.perfil === 'diretor' || perfil.perfil === 'admin') && lojas.length > 0) {
    const cookieStore = await cookies()
    const lojaAtivaCookie = cookieStore.get('loja_ativa')?.value
    const lojaOverride = lojas.find(l => l.id === lojaAtivaCookie)
    lojaAtiva = lojaOverride ?? lojas[0]
  }

  return (
    <AdminProvider value={{ perfil, loja: lojaAtiva, lojas }}>
      <div className="min-h-screen bg-[#111111] flex">
        <AdminSidebar perfil={perfil} loja={lojaAtiva} lojas={lojas} />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </AdminProvider>
  )
}
