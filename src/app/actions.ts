'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import type { Perfil, TipoInteracao } from '@/types'

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
  perfil: string
  loja_id: string
  modulos_permitidos: string[]
}) {
  const supabase = adminSupabase()
  const { data: userData, error } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.senha,
    email_confirm: true,
    user_metadata: { nome: data.nome },
  })
  if (error || !userData.user) throw new Error(error?.message ?? 'Falha ao criar usuário')

  const { error: perfilError } = await supabase.from('usuarios_perfil').insert({
    id: userData.user.id,
    loja_id: data.loja_id,
    nome: data.nome,
    perfil: data.perfil,
    ativo: true,
    modulos_permitidos: data.modulos_permitidos,
  })
  if (perfilError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    throw new Error(perfilError.message)
  }
  revalidatePath('/admin/usuarios')
  return { userId: userData.user.id }
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
  }
) {
  const supabase = await userSupabase()
  const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/leads/' + leadId)
  revalidatePath('/admin/crm')
}

export async function addLeadInteracao(
  leadId: string,
  lojaId: string,
  tipo: TipoInteracao,
  descricao: string
) {
  const supabase = await userSupabase()
  const { data: { session } } = await supabase.auth.getSession()
  const { error } = await supabase.from('lead_interacoes').insert({
    lead_id: leadId,
    loja_id: lojaId,
    usuario_id: session?.user.id ?? null,
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
  const supabase = await userSupabase()
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
        custos_adicionais: [],
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
  const supabase = await userSupabase()
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
  const supabase = await userSupabase()
  const { error } = await supabase.from('custos_manutencao').delete().eq('id', id)
  if (error) throw new Error(error.message)
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

// ─── VISTORIA ─────────────────────────────────────────────────────────────────

export async function saveVistoria(
  veiculoId: string,
  lojaId: string,
  itens: Record<string, 'ok' | 'nok' | 'na'>,
  observacoes: string,
  aprovado: boolean,
  vistoriaId?: string
) {
  const supabase = await userSupabase()
  const { data: { session } } = await supabase.auth.getSession()

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
