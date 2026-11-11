import { notFound, redirect } from 'next/navigation'
import { exigirPerfilPagina } from '@/lib/sessao'
import { adminSupabase } from '@/lib/supabase-server'
import { listarUsuariosDaLoja } from '@/lib/acesso'
import { conferirLojaDoRegistro, obterLojaAtivaId } from '@/lib/loja-ativa'
import AvisoOutraLoja from '@/components/admin/AvisoOutraLoja'
import type { Lead, LeadInteracao, MensagemPadrao, UsuarioPerfil } from '@/types'
import LeadDetailClient from './LeadDetailClient'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // Sessão validada pelo proxy e perfil lido uma vez por requisição
  // (lib/sessao.ts) — esta página não fala com o Supabase Auth.
  const perfil = await exigirPerfilPagina()

  const lojaId = await obterLojaAtivaId(perfil)
  const admin = adminSupabase()

  // Lead de outra loja: aviso para trocar o seletor (admin/diretor) ou 404.
  const { data: alvo } = await admin.from('leads').select('loja_id').eq('id', id).maybeSingle()
  if (!alvo) notFound()
  const conferencia = await conferirLojaDoRegistro(perfil, alvo.loja_id)
  if (conferencia.status === 'outra-loja') {
    return (
      <AvisoOutraLoja
        lojaId={conferencia.loja.id}
        lojaNome={conferencia.loja.nome}
        voltarHref="/admin/crm"
        voltarTexto="Voltar para o CRM"
      />
    )
  }
  if (conferencia.status === 'negado') notFound()

  // Tudo pela service role com filtro explícito da loja ativa: a RLS de
  // leads/mensagens usa perfil.loja_id e esconderia os dados da loja do
  // seletor para admin/diretor; a de usuarios_perfil só libera o próprio
  // perfil (migration 023).
  const [{ data: leadData }, { data: interacoesData }, vendedoresLoja, { data: templatesData }] =
    await Promise.all([
      admin
        .from('leads')
        .select('*, veiculo:veiculos(id, marca, modelo, ano)')
        .eq('id', id)
        .eq('loja_id', lojaId)
        .single(),
      admin
        .from('lead_interacoes')
        .select('*, usuario:usuarios_perfil(nome)')
        .eq('lead_id', id)
        .eq('loja_id', lojaId)
        .order('created_at', { ascending: false }),
      // Usuários da loja ativa (padrão ou com acesso marcado em usuarios_lojas).
      listarUsuariosDaLoja(lojaId),
      admin
        .from('mensagens_padrao')
        .select('*')
        .eq('loja_id', lojaId)
        .order('titulo'),
    ])

  if (!leadData) notFound()

  const lead = leadData as Lead
  const interacoes = (interacoesData ?? []) as LeadInteracao[]
  const vendedores = vendedoresLoja.map(({ id, nome }) => ({ id, nome }))
  const templates = (templatesData ?? []) as MensagemPadrao[]

  // Quem criou pode ser de fora da lista (admin de outra loja padrão, usuário inativo).
  let criadorNome: string | null = null
  if (lead.criado_por) {
    criadorNome = vendedores.find(v => v.id === lead.criado_por)?.nome ?? null
    if (!criadorNome) {
      const { data: criador } = await admin.from('usuarios_perfil').select('nome').eq('id', lead.criado_por).maybeSingle()
      criadorNome = criador?.nome ?? null
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <a
        href="/admin/crm"
        className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1 mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar ao CRM
      </a>

      <LeadDetailClient
        lead={lead}
        interacoes={interacoes}
        vendedores={vendedores}
        templates={templates}
        lojaId={lojaId}
        userId={perfil.id}
        criadorNome={criadorNome}
      />
    </div>
  )
}
