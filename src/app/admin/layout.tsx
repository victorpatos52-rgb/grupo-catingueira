import { adminSupabase } from '@/lib/supabase-server'
import { resolverLojaAtiva } from '@/lib/loja-ativa'
import { exigirPerfilPagina } from '@/lib/sessao'
import { AdminProvider } from '@/contexts/AdminContext'
import type { Loja, UsuarioPerfil } from '@/types'
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminBottomBar from '@/components/admin/AdminBottomBar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Sessão validada pelo proxy; perfil lido uma vez por requisição
  // (lib/sessao.ts). Sem sessão → /login; desativado → /api/auth/sair;
  // falha de consulta → error.tsx com "Tentar de novo".
  const perfil: UsuarioPerfil = await exigirPerfilPagina()
  const { data: lojasData } = await adminSupabase().from('lojas').select('*').order('nome')
  // Deduplica por id: proteção contra seeds duplicados (cada id aparece uma só vez)
  const seenIds = new Set<string>()
  const todasLojas = ((lojasData ?? []) as Loja[]).filter(l => {
    if (seenIds.has(l.id)) return false
    seenIds.add(l.id)
    return true
  })

  // Mesma regra das páginas, actions e PDFs (lib/loja-ativa.ts) — antes o
  // seletor caía em lojas[0] sem cookie e as páginas em perfil.loja_id, e o
  // rótulo mostrava uma loja com os dados da outra.
  const ativa = await resolverLojaAtiva(perfil)
  const idsPermitidos = new Set(ativa.lojasPermitidas.map(l => l.id))
  const lojas: Loja[] = todasLojas.filter(l => idsPermitidos.has(l.id))
  const lojaAtiva: Loja | null = todasLojas.find(l => l.id === ativa.loja?.id) ?? null

  const perfilComLoja: UsuarioPerfil & { loja: Loja | null } = {
    ...perfil,
    loja: lojaAtiva,
  }

  return (
    <AdminProvider value={{ perfil, loja: lojaAtiva, lojas }}>
      <div className="min-h-screen bg-[#F8F8F8] flex">
        <AdminSidebar perfil={perfilComLoja} loja={lojaAtiva} lojas={lojas} />
        <main className="flex-1 min-w-0 overflow-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <AdminBottomBar perfil={perfil} />
    </AdminProvider>
  )
}
