'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { DespesaLoja, Perfil, TipoInteracao, TipoLancamento, Venda, Veiculo } from '@/types'

function adminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function userSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

function gerarSenhaAleatoria() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── AUTH / USERS ─────────────────────────────────────────────────────────────

export async function setLojaAtiva(lojaId: string) {
  const cookieStore = await cookies()
  cookieStore.set('loja_ativa', lojaId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export async function criarUsuario(data: {
  email: string
  senha: string
  nome: string
  perfil: Perfil
  loja_id: string
  modulos_permitidos: string[]
}) {
  const supabase = adminSupabase()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.senha,
    email_confirm: true,
    user_metadata: { nome: data.nome },
  })
  if (authError) throw new Error(`Erro ao criar usuário no Auth: ${authError.message}`)
  if (!authData?.user) throw new Error('Usuário não foi criado (auth retornou vazio)')

  const { error: perfilError } = await supabase.from('usuarios_perfil').insert({
    id: authData.user.id,
    loja_id: data.loja_id,
    nome: data.nome,
    perfil: data.perfil,
    ativo: true,
    modulos_permitidos: data.modulos_permitidos,
  })
  if (perfilError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    throw new Error(`Erro ao salvar perfil (auth revertido): ${perfilError.message} | code: ${perfilError.code} | details: ${perfilError.details}`)
  }

  revalidatePath('/admin/usuarios')
  return { userId: authData.user.id }
}

export async function resetarSenha(userId: string) {
  const supabase = adminSupabase()
  const novaSenha = gerarSenhaAleatoria()
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: novaSenha })
  if (error) throw new Error(error.message)
  return { novaSenha }
}

export async function atualizarUsuario(
  id: string,
  data: { nome: string; perfil: Perfil; loja_id: string; ativo: boolean; modulos_permitidos: string[] }
) {
  const supabase = adminSupabase()
  const { error } = await supabase.from('usuarios_perfil').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function updateUserRole(perfilId: string, novoPerfil: Perfil) {
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('usuarios_perfil')
    .update({ perfil: novoPerfil })
    .eq('id', perfilId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function inviteUser(
  email: string,
  lojaId: string,
  perfil: Perfil,
  nome: string
) {
  const supabase = adminSupabase()
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(email)
  if (inviteError || !inviteData.user) {
    throw new Error(inviteError?.message ?? 'Falha ao convidar usuário')
  }
  const { error } = await supabase.from('usuarios_perfil').insert({
    id: inviteData.user.id,
    loja_id: lojaId,
    perfil,
    nome,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/usuarios')
}

export async function deleteUser(id: string) {
  const supabase = adminSupabase()
  await supabase.from('usuarios_perfil').delete().eq('id', id)
  await supabase.auth.admin.deleteUser(id)
  revalidatePath('/admin/usuarios')
}

// ─── LOJA SETTINGS ────────────────────────────────────────────────────────────

export async function updateLojaSettings(
  lojaId: string,
  data: {
    nome: string
    whatsapp: string
    cor_primaria: string
    cor_secundaria: string
    endereco: string | null
    cidade: string | null
    estado: string | null
    horario: string | null
    sobre: string | null
    missao: string | null
    visao: string | null
    instagram: string | null
    maps_url: string | null
  }
) {
  const supabase = await userSupabase()
  const { error } = await supabase.from('lojas').update(data).eq('id', lojaId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/configuracoes')
  revalidatePath('/', 'layout')
}

// ─── LEADS ────────────────────────────────────────────────────────────────────

export async function updateLead(
  leadId: string,
  updates: {
    status?: string
    observacoes?: string | null
    responsavel_id?: string | null
    data_contato?: string | null
    nome?: string
    telefone?: string
    email?: string | null
    veiculo_interesse?: string | null
    proximo_atendimento?: string | null
    cpf?: string | null
    data_nascimento?: string | null
    profissao?: string | null
    endereco?: string | null
  }
) {
  const supabase = adminSupabase()
  const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/leads/' + leadId)
  revalidatePath('/admin/crm')
}

export async function criarLead(data: {
  loja_id: string
  nome: string
  telefone: string
  email?: string | null
  origem: string
  observacoes?: string | null
  veiculo_interesse?: string | null
  responsavel_id?: string | null
  proximo_atendimento?: string | null
  status: string
  tags: string[]
}): Promise<void> {
  const supabase = adminSupabase()
  // Campos base garantidamente existentes na tabela
  const payload: Record<string, unknown> = {
    loja_id: data.loja_id,
    nome: data.nome,
    telefone: data.telefone,
    email: data.email ?? null,
    origem: data.origem,
    observacoes: data.observacoes ?? null,
    veiculo_interesse: data.veiculo_interesse ?? null,
    responsavel_id: data.responsavel_id ?? null,
    status: data.status,
    tags: data.tags ?? [],
  }
  // Campos novos — só incluídos se tiverem valor (seguro caso migration ainda não rodou)
  if (data.proximo_atendimento) payload.proximo_atendimento = data.proximo_atendimento

  const { error } = await supabase.from('leads').insert(payload)
  if (error) throw new Error(`criarLead falhou: ${error.message} | code: ${error.code} | details: ${error.details}`)
  revalidatePath('/admin/crm')
}

export async function addLeadInteracao(
  leadId: string,
  lojaId: string,
  tipo: TipoInteracao,
  descricao: string,
  userId?: string | null
) {
  const supabase = adminSupabase()
  const { error } = await supabase.from('lead_interacoes').insert({
    lead_id: leadId,
    loja_id: lojaId,
    usuario_id: userId ?? null,
    tipo,
    descricao,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/leads/' + leadId)
}

export async function saveMensagemPadrao(
  lojaId: string,
  titulo: string,
  mensagem: string,
  id?: string
) {
  const supabase = await userSupabase()
  if (id) {
    const { error } = await supabase.from('mensagens_padrao').update({ titulo, mensagem }).eq('id', id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('mensagens_padrao').insert({ loja_id: lojaId, titulo, mensagem })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/configuracoes')
}

export async function deleteMensagemPadrao(id: string) {
  const supabase = await userSupabase()
  const { error } = await supabase.from('mensagens_padrao').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/configuracoes')
}

// ─── LEMBRETES ────────────────────────────────────────────────────────────────

export async function concluirLembrete(id: string) {
  const supabase = await userSupabase()
  const { error } = await supabase.from('lembretes').update({ concluido: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/dashboard')
}

// ─── VEÍCULOS ─────────────────────────────────────────────────────────────────

export async function marcarVeiculoVendido(veiculoId: string) {
  const supabase = adminSupabase()
  const { data: veiculo } = await supabase.from('veiculos').select('loja_id').eq('id', veiculoId).single()
  if (!veiculo) throw new Error('Veículo não encontrado')

  const { error } = await supabase.from('veiculos').update({ status: 'vendido' }).eq('id', veiculoId)
  if (error) throw new Error(error.message)

  const hoje = new Date()
  const dataPosvenda = new Date(hoje)
  dataPosvenda.setDate(dataPosvenda.getDate() + 7)
  const dataAniversario = new Date(hoje)
  dataAniversario.setFullYear(dataAniversario.getFullYear() + 1)

  await supabase.from('lembretes').insert([
    {
      loja_id: veiculo.loja_id,
      veiculo_id: veiculoId,
      tipo: 'pos_venda',
      data_lembrete: dataPosvenda.toISOString().split('T')[0],
      mensagem: 'Lembrete de pós-venda — entre em contato com o cliente.',
    },
    {
      loja_id: veiculo.loja_id,
      veiculo_id: veiculoId,
      tipo: 'aniversario_compra',
      data_lembrete: dataAniversario.toISOString().split('T')[0],
      mensagem: 'Aniversário de compra — ligue para o cliente!',
    },
  ])

  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/dashboard')
}

// ─── FINANCEIRO / CUSTOS ──────────────────────────────────────────────────────

export async function saveAquisicao(
  veiculoId: string,
  lojaId: string,
  custoAquisicao: number,
  financeiroId?: string
) {
  const supabase = adminSupabase()
  if (financeiroId) {
    const { error } = await supabase
      .from('financeiro_veiculos')
      .update({ custo_aquisicao: custoAquisicao })
      .eq('id', financeiroId)
    if (error) throw new Error(error.message)
  } else {
    const { data: existing } = await supabase
      .from('financeiro_veiculos')
      .select('id')
      .eq('veiculo_id', veiculoId)
      .maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('financeiro_veiculos')
        .update({ custo_aquisicao: custoAquisicao })
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('financeiro_veiculos').insert({
        veiculo_id: veiculoId,
        loja_id: lojaId,
        custo_aquisicao: custoAquisicao,
      })
      if (error) throw new Error(error.message)
    }
  }
  revalidatePath('/admin/veiculos/' + veiculoId)
}

export async function saveCustoManutencao(data: {
  id?: string
  veiculo_id: string
  loja_id: string
  categoria: string
  descricao: string
  valor: number
  data: string | null
}) {
  const supabase = adminSupabase()
  if (data.id) {
    const { error } = await supabase
      .from('custos_manutencao')
      .update({ categoria: data.categoria, descricao: data.descricao, valor: data.valor, data: data.data })
      .eq('id', data.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('custos_manutencao').insert({
      veiculo_id: data.veiculo_id,
      loja_id: data.loja_id,
      categoria: data.categoria,
      descricao: data.descricao,
      valor: data.valor,
      data: data.data,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/veiculos/' + data.veiculo_id)
}

export async function deleteCustoManutencao(id: string, veiculoId: string) {
  const supabase = adminSupabase()
  const { error } = await supabase.from('custos_manutencao').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos/' + veiculoId)
}

export async function saveValorVenda(
  veiculoId: string,
  lojaId: string,
  valor: number,
  financeiroId?: string
) {
  const supabase = adminSupabase()
  const hoje = new Date().toISOString().split('T')[0]
  if (financeiroId) {
    const { error } = await supabase
      .from('financeiro_veiculos')
      .update({ preco_venda: valor, data_venda: hoje })
      .eq('id', financeiroId)
    if (error) throw new Error(error.message)
  } else {
    const { data: existing } = await supabase
      .from('financeiro_veiculos')
      .select('id')
      .eq('veiculo_id', veiculoId)
      .maybeSingle()
    if (existing) {
      const { error } = await supabase
        .from('financeiro_veiculos')
        .update({ preco_venda: valor, data_venda: hoje })
        .eq('id', existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await supabase.from('financeiro_veiculos').insert({
        veiculo_id: veiculoId,
        loja_id: lojaId,
        custo_aquisicao: 0,
        preco_venda: valor,
        data_venda: hoje,
      })
      if (error) throw new Error(error.message)
    }
  }
  revalidatePath('/admin/veiculos/' + veiculoId)
}

// ─── CONTATO PÚBLICO ─────────────────────────────────────────────────────────

export async function submitContatoLead(
  lojaId: string,
  data: {
    nome: string
    telefone: string
    email: string
    mensagem: string
    veiculoInteresse: string
  }
) {
  const supabase = adminSupabase()
  const obs = [
    data.email ? `E-mail: ${data.email}` : null,
    data.veiculoInteresse ? `Veículo de interesse: ${data.veiculoInteresse}` : null,
    data.mensagem ? `Mensagem: ${data.mensagem}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      loja_id: lojaId,
      nome: data.nome,
      telefone: data.telefone,
      email: data.email || null,
      origem: 'site',
      status: 'novo',
      observacoes: obs || null,
      veiculo_interesse: data.veiculoInteresse || null,
      tags: [],
    })
    .select()
    .single()
  if (error) throw new Error(error.message)

  await supabase.from('lead_interacoes').insert({
    lead_id: lead.id,
    loja_id: lojaId,
    usuario_id: null,
    tipo: 'site',
    descricao: 'Lead gerado pelo formulário de contato do site.',
  })
}

// ─── VEÍCULO CRUD (bypassa RLS via service role) ──────────────────────────────

export async function criarVeiculo(payload: Omit<Veiculo, 'id' | 'created_at'>) {
  const supabase = adminSupabase()
  const { data, error } = await supabase
    .from('veiculos')
    .insert(payload)
    .select('id')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos')
  return { id: (data as { id: string }).id }
}

export async function atualizarVeiculo(
  veiculoId: string,
  payload: Omit<Veiculo, 'id' | 'created_at'>
) {
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('veiculos')
    .update(payload)
    .eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/veiculos/' + veiculoId)
}

export async function atualizarDadosVeiculo(
  veiculoId: string,
  payload: Omit<Veiculo, 'id' | 'created_at' | 'fotos'>
) {
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('veiculos')
    .update(payload)
    .eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/veiculos/' + veiculoId)
}

export async function atualizarFotosVeiculo(veiculoId: string, fotos: string[]) {
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('veiculos')
    .update({ fotos })
    .eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos/' + veiculoId)
}

// ─── DESPESAS ─────────────────────────────────────────────────────────────────

export async function salvarDespesa(
  data: Omit<DespesaLoja, 'id' | 'created_at'> & { id?: string }
): Promise<void> {
  await exigirPerfilFinanceiro()
  const supabase = adminSupabase()
  if (data.id) {
    const { error } = await supabase.from('despesas_loja').update(data).eq('id', data.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('despesas_loja').insert(data)
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/financeiro')
}

export async function deletarDespesa(id: string): Promise<void> {
  await exigirPerfilFinanceiro()
  const supabase = adminSupabase()
  const { error } = await supabase.from('despesas_loja').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/financeiro')
}

// ─── LANÇAMENTOS FINANCEIROS MANUAIS ────────────────────────────────────────────

export async function salvarLancamentoFinanceiro(
  data: {
    loja_id: string
    tipo: TipoLancamento
    categoria: string
    descricao: string | null
    valor: number
    valor_retornado_banco?: number | null
    data: string
    recorrente?: boolean
    venda_id?: string | null
  },
  lancamentoId?: string
): Promise<void> {
  const { userId } = await exigirPerfilFinanceiro()
  const supabase = adminSupabase()

  if (lancamentoId) {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .update(data)
      .eq('id', lancamentoId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase
      .from('lancamentos_financeiros')
      .insert({ ...data, criado_por: userId })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/financeiro')
}

export async function deletarLancamentoFinanceiro(id: string): Promise<void> {
  await exigirPerfilFinanceiro()
  const supabase = adminSupabase()
  const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/financeiro')
}

// ─── VENDAS ───────────────────────────────────────────────────────────────────

export async function salvarVenda(
  data: Partial<Venda> & { loja_id: string; veiculo_id: string; comprador_nome: string }
): Promise<{ id: string }> {
  const supabase = adminSupabase()
  if (data.id) {
    const { id, veiculo, vendedor, ...rest } = data as Venda & { veiculo?: unknown; vendedor?: unknown }
    const { error } = await supabase.from('vendas').update(rest).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/vendas')
    return { id }
  } else {
    const { veiculo, vendedor, ...rest } = data as Venda & { veiculo?: unknown; vendedor?: unknown }

    const { data: numeroVenda, error: numeroError } = await supabase.rpc('gerar_numero_venda', {
      p_loja_id: data.loja_id,
    })
    if (numeroError) throw new Error(`Erro ao gerar número da venda: ${numeroError.message}`)

    const { data: nova, error } = await supabase
      .from('vendas')
      .insert({ ...rest, numero_venda: numeroVenda })
      .select('id')
      .single()
    if (error) throw new Error(error.message)
    revalidatePath('/admin/vendas')
    return { id: (nova as { id: string }).id }
  }
}

export async function finalizarVenda(vendaId: string, veiculoId: string): Promise<void> {
  const supabase = adminSupabase()
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase.from('vendas').update({ status: 'finalizada' }).eq('id', vendaId),
    supabase.from('veiculos').update({ status: 'vendido' }).eq('id', veiculoId),
  ])
  if (e1) throw new Error(e1.message)
  if (e2) throw new Error(e2.message)
  revalidatePath('/admin/vendas')
  revalidatePath('/admin/veiculos')
}

export async function deletarVenda(vendaId: string): Promise<void> {
  const supabase = adminSupabase()
  const { error } = await supabase.from('vendas').delete().eq('id', vendaId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/vendas')
}

// ─── CONTROLE DE ACESSO POR PERFIL ─────────────────────────────────────────────

const PERFIS_GERENCIA: Perfil[] = ['gerente', 'diretor', 'admin']

// Checa o perfil do usuário logado (via sessão/cookies) direto no servidor —
// usado por Server Actions que não podem depender só da UI esconder um botão/aba.
async function exigirPerfil(permitido: Perfil[], mensagemErro: string): Promise<{ userId: string }> {
  const userClient = await userSupabase()
  const { data: { session } } = await userClient.auth.getSession()
  if (!session) throw new Error('Não autenticado.')

  const admin = adminSupabase()
  const { data: perfilData } = await admin
    .from('usuarios_perfil')
    .select('perfil')
    .eq('id', session.user.id)
    .single()

  if (!perfilData || !permitido.includes(perfilData.perfil as Perfil)) {
    throw new Error(mensagemErro)
  }
  return { userId: session.user.id }
}

function exigirPerfilDocumentacao() {
  return exigirPerfil(PERFIS_GERENCIA, 'Você não tem permissão para acessar a documentação deste veículo.')
}

function exigirPerfilFinanceiro() {
  return exigirPerfil(PERFIS_GERENCIA, 'Você não tem permissão para acessar o financeiro desta loja.')
}

// ─── DOCUMENTAÇÃO DO VEÍCULO (AQUISIÇÃO + ANEXOS) ──────────────────────────────

export async function saveVeiculoAquisicao(
  veiculoId: string,
  data: {
    nome_vendedor: string | null
    documento_vendedor: string | null
    telefone_vendedor: string | null
    forma_pagamento_compra: string | null
    data_compra: string | null
    hora_compra: string | null
    valor_compra: number | null
    observacoes: string | null
  },
  aquisicaoId?: string
) {
  await exigirPerfilDocumentacao()
  const supabase = adminSupabase()
  if (aquisicaoId) {
    const { error } = await supabase.from('veiculo_aquisicao').update(data).eq('id', aquisicaoId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('veiculo_aquisicao').insert({ veiculo_id: veiculoId, ...data })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/veiculos/' + veiculoId)
}

export async function criarAnexo(data: {
  entidadeTipo: 'veiculo' | 'venda'
  entidadeId: string
  nomeArquivo: string
  path: string
  tipoArquivo: string | null
}) {
  const { userId } = await exigirPerfilDocumentacao()
  const supabase = adminSupabase()

  const { error } = await supabase.from('anexos').insert({
    entidade_tipo: data.entidadeTipo,
    entidade_id: data.entidadeId,
    nome_arquivo: data.nomeArquivo,
    url: data.path,
    tipo_arquivo: data.tipoArquivo,
    criado_por: userId,
  })
  if (error) throw new Error(error.message)

  if (data.entidadeTipo === 'veiculo') revalidatePath('/admin/veiculos/' + data.entidadeId)
}

export async function deletarAnexo(anexoId: string, path: string, entidadeId: string) {
  await exigirPerfilDocumentacao()
  const supabase = adminSupabase()
  await supabase.storage.from('veiculos-documentos').remove([path])
  const { error } = await supabase.from('anexos').delete().eq('id', anexoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos/' + entidadeId)
}

// ─── EXCLUSÃO DE VEÍCULO ───────────────────────────────────────────────────────

export async function excluirVeiculo(veiculoId: string): Promise<{ tipo: 'soft' | 'hard' }> {
  const supabase = adminSupabase()

  const [
    { count: vendasCount },
    { count: financeiroCount },
    { count: custosCount },
    { count: vistoriaCount },
    anexosResult,
  ] = await Promise.all([
    supabase.from('vendas').select('id', { count: 'exact', head: true }).eq('veiculo_id', veiculoId),
    supabase.from('financeiro_veiculos').select('id', { count: 'exact', head: true }).eq('veiculo_id', veiculoId),
    supabase.from('custos_manutencao').select('id', { count: 'exact', head: true }).eq('veiculo_id', veiculoId),
    supabase.from('vistoria_veiculo').select('id', { count: 'exact', head: true }).eq('veiculo_id', veiculoId),
    // tabela `anexos` só existe após a migration 001 — tolera erro caso ainda não tenha rodado
    supabase.from('anexos').select('id', { count: 'exact', head: true }).eq('entidade_tipo', 'veiculo').eq('entidade_id', veiculoId),
  ])

  const anexosCount = anexosResult.error ? 0 : (anexosResult.count ?? 0)

  const temHistorico =
    (vendasCount ?? 0) > 0 ||
    (financeiroCount ?? 0) > 0 ||
    (custosCount ?? 0) > 0 ||
    (vistoriaCount ?? 0) > 0 ||
    anexosCount > 0

  if (temHistorico) {
    const { error } = await supabase.from('veiculos').update({ excluido: true }).eq('id', veiculoId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/veiculos')
    revalidatePath('/admin/veiculos/' + veiculoId)
    revalidatePath('/admin/dashboard')
    return { tipo: 'soft' }
  }

  const { error } = await supabase.from('veiculos').delete().eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/dashboard')
  return { tipo: 'hard' }
}

// ─── VISTORIA ─────────────────────────────────────────────────────────────────

export async function saveVistoria(
  veiculoId: string,
  lojaId: string,
  itens: Record<string, 'ok' | 'nok' | 'na'>,
  observacoes: string,
  aprovado: boolean,
  vistoriaId?: string
) {
  const userClient = await userSupabase()
  const { data: { session } } = await userClient.auth.getSession()
  const supabase = adminSupabase()

  if (vistoriaId) {
    const { error } = await supabase
      .from('vistoria_veiculo')
      .update({ itens, observacoes: observacoes || null, aprovado })
      .eq('id', vistoriaId)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('vistoria_veiculo').insert({
      veiculo_id: veiculoId,
      loja_id: lojaId,
      inspetor_id: session?.user.id,
      itens,
      observacoes: observacoes || null,
      aprovado,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/veiculos/' + veiculoId)
  revalidatePath('/admin/veiculos/' + veiculoId + '/vistoria')
}
