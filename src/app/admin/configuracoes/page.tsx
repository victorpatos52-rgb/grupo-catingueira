import { redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { telaInicial } from '@/lib/tela-inicial'
import { adminSupabase } from '@/lib/supabase-server'
import { getLoja } from '@/lib/getLoja'
import type { UsuarioPerfil } from '@/types'
import ConfiguracoesClient from './ConfiguracoesClient'
import IntegracoesSection from './IntegracoesSection'

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ olx?: string; motivo?: string }>
}) {
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()

  if (!['admin', 'diretor'].includes(perfil.perfil)) redirect(telaInicial(perfil))

  const { olx, motivo } = await searchParams

  // Integração OLX é da loja do domínio (é para ele que o redirect_uri aponta),
  // não da loja selecionada no painel. Lê só a data — nunca o token.
  const lojaDominio = await getLoja()
  let olxAutorizadoEm: string | null = null
  if (lojaDominio) {
    const { data } = await adminSupabase()
      .from('olx_integracoes')
      .select('autorizado_em')
      .eq('loja_id', lojaDominio.id)
      .maybeSingle()
    olxAutorizadoEm = data?.autorizado_em ?? null
  }

  return (
    <div className="space-y-6">
      <ConfiguracoesClient />
      <IntegracoesSection
        lojaDominio={lojaDominio ? { id: lojaDominio.id, nome: lojaDominio.nome } : null}
        olxAutorizadoEm={olxAutorizadoEm}
        resultado={olx ?? null}
        motivo={motivo ?? null}
      />
    </div>
  )
}
