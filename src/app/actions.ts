'use server'

import { randomInt } from 'crypto'
import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { obterPerfilAtivo, podeAcessarVendas, temAcessoLoja, type PerfilAcesso } from '@/lib/acesso'
import { getLoja } from '@/lib/getLoja'
import type { Anexo, DespesaLoja, ImagensLanding, Perfil, ResultadoAcao, TipoInteracao, TipoLancamento, Venda, Veiculo, VendaPagamentoDetalhes } from '@/types'

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
      // autoRefreshToken: false — renovar sessão é responsabilidade única do
      // src/proxy.ts, que já roda em toda rota /admin/:path* (inclusive o
      // POST de Server Action) antes deste client existir. Se este client
      // também tentasse renovar, competiria com o proxy pelo mesmo refresh
      // token (uso único/rotativo): quem chegasse depois receberia um token
      // já invalidado e a sessão sumiria — foi exatamente isso que causava
      // o "Sem permissão para editar esta loja" intermitente em
      // updateLojaSettings (loja_id e perfil corretos, sessão inválida).
      auth: { autoRefreshToken: false },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch (err) {
            console.error('[userSupabase] falha ao persistir cookie de sessão:', err)
          }
        },
      },
    }
  )
}

// CSPRNG (crypto.randomInt) em vez de Math.random — senha temporária é
// credencial. randomInt já faz rejection sampling, sem viés de módulo.
function gerarSenhaAleatoria() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[randomInt(chars.length)]).join('')
}

// ─── Autenticação base das Server Actions ──────────────────────────────────────
//
// Todas as actions usam service role (bypassa RLS), então a checagem de
// usuário/loja precisa acontecer aqui. getUser() valida o JWT no Supabase
// Auth (getSession() só lê o cookie, sem validar).

// Sessão válida + usuarios_perfil existente e ativo. Desativado tem a sessão
// encerrada aqui mesmo (Server Action pode gravar cookie) — a próxima
// navegação já cai no /login.
async function exigirUsuarioAtivo(): Promise<PerfilAcesso> {
  const userClient = await userSupabase()
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) throw new Error('Sessão expirada. Atualize a página e tente novamente.')

  const perfil = await obterPerfilAtivo(user.id)
  if (!perfil) {
    await userClient.auth.signOut()
    throw new Error('Seu usuário está desativado ou sem perfil de acesso. Fale com o administrador.')
  }
  return perfil
}

async function exigirAcessoLoja(lojaId: string | null | undefined, mensagemErro = 'Você não tem permissão para acessar dados desta loja.'): Promise<PerfilAcesso> {
  const perfil = await exigirUsuarioAtivo()
  if (!temAcessoLoja(perfil, lojaId)) throw new Error(mensagemErro)
  return perfil
}

// Acesso a um veículo existente: loja do veículo no BANCO (não a que o
// navegador manda) + regra extra de sócio (só dividido da Felizardo).
async function exigirAcessoVeiculo(veiculoId: string): Promise<{ perfil: PerfilAcesso; veiculo: { loja_id: string; proprietario_tipo: string | null } }> {
  const { data: veiculo } = await adminSupabase()
    .from('veiculos')
    .select('loja_id, proprietario_tipo')
    .eq('id', veiculoId)
    .maybeSingle()
  if (!veiculo) throw new Error('Veículo não encontrado.')
  const perfil = await exigirAcessoLoja(veiculo.loja_id, 'Você não tem permissão para este veículo.')
  if (perfil.perfil === 'socio') await validarVeiculoParaSocio(veiculo.loja_id, veiculo.proprietario_tipo)
  return { perfil, veiculo }
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

// O perfil 'socio' só existe para a loja Felizardo. Validado aqui (server-side)
// além do filtro já feito na UI, porque a Server Action é o limite de segurança
// real — a UI só existe para dar feedback melhor antes de chegar até aqui.
async function validarPerfilLoja(perfil: Perfil, lojaId: string) {
  if (perfil !== 'socio') return
  const supabase = adminSupabase()
  const { data: loja } = await supabase.from('lojas').select('dominio').eq('id', lojaId).single()
  if (!loja?.dominio?.toLowerCase().includes('felizardo')) {
    throw new Error('O perfil "sócio" só pode ser atribuído a usuários da loja Felizardo.')
  }
}

// ─── Autorização da gestão de usuários ─────────────────────────────────────────
//
// As actions abaixo usam service role direto em auth.users/usuarios_perfil, então
// a autorização inteira mora aqui. Regra (a mesma da página /admin/usuarios):
// só admin e diretor gerenciam usuários; diretor só dentro da própria loja e
// nunca acima do próprio perfil; ninguém altera o próprio perfil/ativo nem se
// exclui (evita autopromoção e trancar o sistema sem admin).

// Sócio fica no nível de vendedor: acesso restrito, sem gestão.
const NIVEL_PERFIL: Record<Perfil, number> = { vendedor: 1, socio: 1, gerente: 2, diretor: 3, admin: 4 }

const PERFIS_VALIDOS = Object.keys(NIVEL_PERFIL) as Perfil[]

async function exigirGestorUsuarios(): Promise<PerfilAcesso> {
  const userClient = await userSupabase()
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) throw new Error('Sessão expirada. Atualize a página e tente novamente.')

  const gestor = await obterPerfilAtivo(user.id)
  if (!gestor || (gestor.perfil !== 'admin' && gestor.perfil !== 'diretor')) {
    throw new Error('Apenas administradores e diretores podem gerenciar usuários.')
  }
  return gestor
}

// Vale tanto para o estado atual do usuário-alvo quanto para o estado que se
// quer gravar (perfil/loja novos) — os dois precisam estar ao alcance do gestor.
function exigirAlcance(gestor: PerfilAcesso, alvo: { perfil: Perfil; loja_id: string }) {
  if (!PERFIS_VALIDOS.includes(alvo.perfil)) throw new Error('Perfil inválido.')
  if (NIVEL_PERFIL[alvo.perfil] > NIVEL_PERFIL[gestor.perfil]) {
    throw new Error('Você não pode gerenciar usuários com perfil acima do seu.')
  }
  if (gestor.perfil !== 'admin' && alvo.loja_id !== gestor.loja_id) {
    throw new Error('Você só pode gerenciar usuários da sua própria loja.')
  }
}

// Bloqueio no Supabase Auth: usuário banido não faz login nem renova sessão,
// mesmo chamando a API do Supabase direto com a anon key. O Auth não tem ban
// "permanente" — 876000h (~100 anos) faz esse papel; 'none' remove o ban.
const BAN_PERMANENTE = '876000h'

async function definirBloqueioAuth(userId: string, bloqueado: boolean): Promise<void> {
  const falha = await tentarDefinirBloqueioAuth(userId, bloqueado)
  if (falha) {
    throw new Error(`Não foi possível ${bloqueado ? 'bloquear' : 'desbloquear'} o acesso no Supabase Auth (${falha}). Nada foi alterado.`)
  }
}

// Versão que não lança — usada para desfazer o bloqueio quando o passo
// seguinte falha. Devolve a mensagem de erro, ou null se deu certo.
async function tentarDefinirBloqueioAuth(userId: string, bloqueado: boolean): Promise<string | null> {
  const { error } = await adminSupabase().auth.admin.updateUserById(userId, {
    ban_duration: bloqueado ? BAN_PERMANENTE : 'none',
  })
  if (error) {
    console.error(`[bloqueioAuth] falha ao ${bloqueado ? 'bloquear' : 'desbloquear'} user=${userId}: ${error.message}`)
    return error.message
  }
  return null
}

async function carregarAlvo(id: string): Promise<{ id: string; perfil: Perfil; loja_id: string; ativo: boolean }> {
  const { data } = await adminSupabase()
    .from('usuarios_perfil')
    .select('id, perfil, loja_id, ativo')
    .eq('id', id)
    .single()
  if (!data) throw new Error('Usuário não encontrado.')
  return data as { id: string; perfil: Perfil; loja_id: string; ativo: boolean }
}

export async function criarUsuario(data: {
  email: string
  senha: string
  nome: string
  perfil: Perfil
  loja_id: string
  modulos_permitidos: string[]
}): Promise<ResultadoAcao<{ userId: string }>> {
  try {
    const gestor = await exigirGestorUsuarios()
    exigirAlcance(gestor, { perfil: data.perfil, loja_id: data.loja_id })
    await validarPerfilLoja(data.perfil, data.loja_id)
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
    return { ok: true, userId: authData.user.id }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao criar usuário.')
  }
}

export async function resetarSenha(userId: string): Promise<ResultadoAcao<{ novaSenha: string }>> {
  try {
    const gestor = await exigirGestorUsuarios()
    exigirAlcance(gestor, await carregarAlvo(userId))

    const novaSenha = gerarSenhaAleatoria()
    const { error } = await adminSupabase().auth.admin.updateUserById(userId, { password: novaSenha })
    if (error) throw new Error(error.message)
    return { ok: true, novaSenha }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao resetar senha.')
  }
}

export async function atualizarUsuario(
  id: string,
  data: { nome: string; perfil: Perfil; loja_id: string; ativo: boolean; modulos_permitidos: string[] }
): Promise<ResultadoAcao> {
  try {
    const gestor = await exigirGestorUsuarios()
    const alvo = await carregarAlvo(id)
    exigirAlcance(gestor, alvo)
    exigirAlcance(gestor, { perfil: data.perfil, loja_id: data.loja_id })
    if (id === gestor.id && (data.perfil !== alvo.perfil || data.ativo !== alvo.ativo)) {
      throw new Error('Você não pode alterar o próprio perfil nem se desativar.')
    }
    await validarPerfilLoja(data.perfil, data.loja_id)

    // Bloqueio no Auth ANTES de gravar `ativo`: se o Auth falhar, nada muda.
    // Desativar sempre reaplica o ban (idempotente — cobre quem foi desativado
    // antes deste bloqueio existir); desbloqueia só na transição inativo→ativo.
    const desativando = !data.ativo
    const reativando = data.ativo && !alvo.ativo
    if (desativando) await definirBloqueioAuth(id, true)
    else if (reativando) await definirBloqueioAuth(id, false)

    // Campos explícitos: o tipo do parâmetro não existe em runtime, então
    // repassar `data` inteiro deixaria o chamador gravar qualquer coluna.
    const { error } = await adminSupabase()
      .from('usuarios_perfil')
      .update({
        nome: data.nome,
        perfil: data.perfil,
        loja_id: data.loja_id,
        ativo: data.ativo,
        modulos_permitidos: data.modulos_permitidos,
      })
      .eq('id', id)
    if (error) {
      // Volta o Auth ao estado anterior para não ficar bloqueado-mas-ativo
      // (ou desbloqueado-mas-inativo). Se já estava inativo, o ban fica.
      const reverter = (desativando && alvo.ativo) || reativando
      const falhaReversao = reverter ? await tentarDefinirBloqueioAuth(id, !alvo.ativo) : null
      throw new Error(
        `Erro ao salvar o usuário: ${error.message}.` +
          (falhaReversao ? ` Atenção: o bloqueio no Auth não pôde ser desfeito (${falhaReversao}) — salve de novo.` : ' Nada foi alterado.')
      )
    }
    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao atualizar usuário.')
  }
}

export async function updateUserRole(perfilId: string, novoPerfil: Perfil): Promise<ResultadoAcao> {
  try {
    const gestor = await exigirGestorUsuarios()
    const alvo = await carregarAlvo(perfilId)
    exigirAlcance(gestor, alvo)
    exigirAlcance(gestor, { perfil: novoPerfil, loja_id: alvo.loja_id })
    if (perfilId === gestor.id) throw new Error('Você não pode alterar o próprio perfil.')
    await validarPerfilLoja(novoPerfil, alvo.loja_id)

    const { error } = await adminSupabase()
      .from('usuarios_perfil')
      .update({ perfil: novoPerfil })
      .eq('id', perfilId)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao alterar o perfil do usuário.')
  }
}

export async function inviteUser(
  email: string,
  lojaId: string,
  perfil: Perfil,
  nome: string
): Promise<ResultadoAcao> {
  try {
    const gestor = await exigirGestorUsuarios()
    exigirAlcance(gestor, { perfil, loja_id: lojaId })
    await validarPerfilLoja(perfil, lojaId)
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
    return { ok: true }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao convidar usuário.')
  }
}

export async function deleteUser(id: string): Promise<ResultadoAcao> {
  try {
    const gestor = await exigirGestorUsuarios()
    if (id === gestor.id) throw new Error('Você não pode excluir a própria conta.')
    const alvo = await carregarAlvo(id)
    exigirAlcance(gestor, alvo)

    // Bloqueia primeiro: se a exclusão parar no meio, a conta que sobrar no
    // Auth não consegue mais entrar nem renovar sessão.
    await definirBloqueioAuth(id, true)

    const supabase = adminSupabase()
    const { error: perfilError } = await supabase.from('usuarios_perfil').delete().eq('id', id)
    if (perfilError) {
      const falhaReversao = alvo.ativo ? await tentarDefinirBloqueioAuth(id, false) : null
      throw new Error(
        `Erro ao excluir o usuário: ${perfilError.message}.` +
          (falhaReversao ? ` Atenção: a conta ficou bloqueada no Auth (${falhaReversao}).` : ' Nada foi alterado.')
      )
    }
    const { error: authError } = await supabase.auth.admin.deleteUser(id)
    if (authError) {
      throw new Error(
        `O perfil foi removido, mas a conta no Supabase Auth não foi excluída (${authError.message}). ` +
          'Ela continua bloqueada — remova-a pelo painel do Supabase (Authentication > Users).'
      )
    }
    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao excluir usuário.')
  }
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
    cep?: string | null
    horario: string | null
    sobre: string | null
    missao: string | null
    visao: string | null
    instagram: string | null
    maps_url: string | null
    imagens_landing?: ImagensLanding | null
    favicon_url?: string | null
  }
) {
  const supabase = await userSupabase()

  // Checagem explícita da sessão antes do update: com autoRefreshToken
  // desligado neste client (ver userSupabase), uma sessão expirada/inválida
  // não se autocorrige aqui — sem isso, o update cairia direto na RLS (que
  // exige auth.uid() != null) e voltaria com 0 linhas, indistinguível de
  // "usuário sem permissão sobre essa loja" (ver o throw abaixo).
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Sessão expirada. Atualize a página e tente novamente.')
  }

  // CEP vai para o anúncio da OLX (zipcode, string numérica): só dígitos, 8.
  if (data.cep !== undefined && data.cep !== null) {
    const cep = data.cep.replace(/\D/g, '')
    if (cep.length !== 8) throw new Error('CEP deve ter 8 dígitos.')
    data = { ...data, cep }
  }

  const { data: atualizadas, error } = await supabase.from('lojas').update(data).eq('id', lojaId).select('id')
  if (error) throw new Error(error.message)
  if (!atualizadas || atualizadas.length === 0) {
    throw new Error('Sem permissão para editar esta loja')
  }
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
  const lead = await exigirAcessoLead(leadId)
  if (updates.responsavel_id) await exigirResponsavelDaLoja(updates.responsavel_id, lead.loja_id)
  const { error } = await supabase.from('leads').update(updates).eq('id', leadId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/leads/' + leadId)
  revalidatePath('/admin/crm')
}

async function exigirAcessoLead(leadId: string): Promise<{ loja_id: string; perfil: PerfilAcesso }> {
  const { data: lead } = await adminSupabase().from('leads').select('loja_id').eq('id', leadId).maybeSingle()
  if (!lead) throw new Error('Lead não encontrado.')
  const perfil = await exigirAcessoLoja(lead.loja_id, 'Você não tem permissão para este lead.')
  return { loja_id: lead.loja_id, perfil }
}

// Responsável de um lead tem de ser usuário da mesma loja do lead — mesma
// lista que as telas oferecem (usuarios_perfil.eq('loja_id'), sem filtrar ativo).
async function exigirResponsavelDaLoja(responsavelId: string, lojaId: string) {
  const { data: responsavel } = await adminSupabase()
    .from('usuarios_perfil')
    .select('loja_id')
    .eq('id', responsavelId)
    .maybeSingle()
  if (!responsavel || responsavel.loja_id !== lojaId) {
    throw new Error('O responsável escolhido não é um usuário desta loja.')
  }
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
  await exigirAcessoLoja(data.loja_id, 'Você não tem permissão para criar leads nesta loja.')
  if (data.responsavel_id) await exigirResponsavelDaLoja(data.responsavel_id, data.loja_id)
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

// loja_id vem do lead no banco e usuario_id da sessão — nada disso é aceito
// do navegador (antes dava para registrar interação em nome de outro usuário).
export async function addLeadInteracao(
  leadId: string,
  tipo: TipoInteracao,
  descricao: string
) {
  const { loja_id, perfil } = await exigirAcessoLead(leadId)
  const supabase = adminSupabase()
  const { error } = await supabase.from('lead_interacoes').insert({
    lead_id: leadId,
    loja_id,
    usuario_id: perfil.id,
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
  const { veiculo } = await exigirAcessoVeiculo(veiculoId)
  const supabase = adminSupabase()

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
  await exigirPerfilFinanceiroCompleto()
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

// Sem exigirPerfilFinanceiroCompleto de propósito: custos_manutencao é
// compartilhado entre a aba "Financeiro" (admin) e a aba "Checklist de
// Serviços" (aberta pra todo mundo, sem relação com DRE) — restringir aqui
// bloquearia o Checklist pra gerente/vendedor, que nunca foi restrito.
export async function saveCustoManutencao(data: {
  id?: string
  veiculo_id: string
  loja_id: string
  categoria: string
  descricao: string
  valor: number
  data: string | null
}) {
  // loja_id gravado é sempre o do veículo no banco; data.loja_id do navegador
  // é ignorado (mantido na assinatura só por compatibilidade com quem chama).
  const { veiculo } = await exigirAcessoVeiculo(data.veiculo_id)
  const supabase = adminSupabase()
  if (data.id) {
    await exigirCustoDoVeiculo(data.id, data.veiculo_id)
    const { error } = await supabase
      .from('custos_manutencao')
      .update({ categoria: data.categoria, descricao: data.descricao, valor: data.valor, data: data.data })
      .eq('id', data.id)
      .eq('veiculo_id', data.veiculo_id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('custos_manutencao').insert({
      veiculo_id: data.veiculo_id,
      loja_id: veiculo.loja_id,
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
  await exigirAcessoVeiculo(veiculoId)
  await exigirCustoDoVeiculo(id, veiculoId)
  const supabase = adminSupabase()
  const { error } = await supabase.from('custos_manutencao').delete().eq('id', id).eq('veiculo_id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos/' + veiculoId)
}

// O acesso é checado pelo veículo; isto garante que o custo é mesmo dele
// (senão bastava trocar o id para mexer em custo de veículo de outra loja).
async function exigirCustoDoVeiculo(custoId: string, veiculoId: string) {
  const { data } = await adminSupabase().from('custos_manutencao').select('veiculo_id').eq('id', custoId).maybeSingle()
  if (!data || data.veiculo_id !== veiculoId) throw new Error('Custo não encontrado para este veículo.')
}

export async function saveValorVenda(
  veiculoId: string,
  lojaId: string,
  valor: number,
  financeiroId?: string
) {
  await exigirPerfilFinanceiroCompleto()
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

// Limite por IP em memória: barato e pega o grosso (bot em loop), mas é por
// instância do servidor — na Vercel cada instância tem o seu. O limite que
// vale entre instâncias é o do banco (mesmo telefone), logo abaixo.
const CONTATO_JANELA_MS = 10 * 60 * 1000
const CONTATO_MAX_POR_IP = 5
const contatoPorIp = new Map<string, number[]>()

function contatoExcedeuLimiteIp(ip: string): boolean {
  const agora = Date.now()
  const recentes = (contatoPorIp.get(ip) ?? []).filter(t => agora - t < CONTATO_JANELA_MS)
  if (recentes.length >= CONTATO_MAX_POR_IP) {
    contatoPorIp.set(ip, recentes)
    return true
  }
  recentes.push(agora)
  contatoPorIp.set(ip, recentes)
  // Evita o Map crescer sem limite numa instância de vida longa.
  if (contatoPorIp.size > 5000) contatoPorIp.clear()
  return false
}

// Formulário público (sem login). A loja vem do domínio (getLoja), nunca do
// navegador — antes dava para gravar lead em qualquer loja passando o id.
export async function submitContatoLead(data: {
  nome: string
  telefone: string
  email: string
  mensagem: string
  veiculoInteresse: string
  /** Campo-isca escondido no formulário: humano não preenche, bot costuma preencher. */
  website?: string
}): Promise<ResultadoAcao> {
  try {
    // Bot: finge sucesso para não ensinar o que foi bloqueado.
    if (data.website?.trim()) return { ok: true }

    const nome = data.nome?.trim() ?? ''
    const telefone = (data.telefone ?? '').replace(/\D/g, '')
    if (nome.length < 2 || nome.length > 120) return { ok: false, erro: 'Informe seu nome.' }
    if (telefone.length < 10 || telefone.length > 13) return { ok: false, erro: 'Informe um telefone com DDD.' }
    if ((data.mensagem ?? '').length > 2000 || (data.email ?? '').length > 200 || (data.veiculoInteresse ?? '').length > 200) {
      return { ok: false, erro: 'Mensagem muito longa.' }
    }

    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'desconhecido'
    if (contatoExcedeuLimiteIp(ip)) {
      return { ok: false, erro: 'Muitas mensagens em pouco tempo. Tente de novo em alguns minutos ou fale pelo WhatsApp.' }
    }

    const loja = await getLoja()
    if (!loja) return { ok: false, erro: 'Não foi possível identificar a loja. Fale pelo WhatsApp.' }

    const supabase = adminSupabase()
    const desde = new Date(Date.now() - CONTATO_JANELA_MS).toISOString()
    const { count: recentesMesmoTelefone } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('loja_id', loja.id)
      .eq('origem', 'site')
      .eq('telefone', data.telefone)
      .gte('created_at', desde)
    if ((recentesMesmoTelefone ?? 0) > 0) {
      return { ok: false, erro: 'Já recebemos seu contato agora há pouco — retornaremos em breve.' }
    }

    await inserirLeadContato(loja.id, { ...data, nome })
    return { ok: true }
  } catch (err) {
    console.error('[submitContatoLead] falha ao registrar contato:', err instanceof Error ? err.message : err)
    return { ok: false, erro: 'Erro ao enviar. Tente novamente ou fale pelo WhatsApp.' }
  }
}

async function inserirLeadContato(
  lojaId: string,
  data: { nome: string; telefone: string; email: string; mensagem: string; veiculoInteresse: string }
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

// Sócio só pode criar/editar veículos com proprietario_tipo='dividido' da loja
// Felizardo — valida o payload que está sendo gravado (não confia só na UI).
async function validarVeiculoParaSocio(lojaId: string, proprietarioTipo: string | null | undefined) {
  const supabase = adminSupabase()
  const { data: loja } = await supabase.from('lojas').select('dominio').eq('id', lojaId).single()
  const ehFelizardo = (loja?.dominio ?? '').toLowerCase().includes('felizardo')
  if (!ehFelizardo || proprietarioTipo !== 'dividido') {
    throw new Error('Sócio só pode criar ou editar veículos com propriedade dividida da loja Felizardo.')
  }
}

export async function criarVeiculo(payload: Omit<Veiculo, 'id' | 'created_at'>) {
  const perfil = await exigirAcessoLoja(payload.loja_id, 'Você não tem permissão para cadastrar veículos nesta loja.')
  if (perfil.perfil === 'socio') {
    await validarVeiculoParaSocio(payload.loja_id, payload.proprietario_tipo)
  }
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
  await exigirEdicaoVeiculo(veiculoId, payload)
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
  await exigirEdicaoVeiculo(veiculoId, payload)
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('veiculos')
    .update(payload)
    .eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/veiculos/' + veiculoId)
}

// Edição: acesso ao veículo como ele está no banco + o payload não pode
// mudar a loja (troca de loja só via transferirVeiculo, que registra histórico
// e move custos/financeiro/vistoria junto). O formulário sempre reenvia a
// mesma loja — a página só abre veículo da loja ativa.
async function exigirEdicaoVeiculo(veiculoId: string, payload: { loja_id: string; proprietario_tipo?: string | null }) {
  const { perfil, veiculo } = await exigirAcessoVeiculo(veiculoId)
  if (payload.loja_id !== veiculo.loja_id) {
    throw new Error('Para mudar o veículo de loja, use "Transferir veículo".')
  }
  if (perfil.perfil === 'socio') await validarVeiculoParaSocio(payload.loja_id, payload.proprietario_tipo)
}

export async function atualizarFotosVeiculo(veiculoId: string, fotos: string[]) {
  await exigirAcessoVeiculo(veiculoId)
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('veiculos')
    .update({ fotos })
    .eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos/' + veiculoId)
}

// Move o veículo para outra loja e registra o histórico em veiculo_transferencias.
// financeiro_veiculos/custos_manutencao/vistoria_veiculo têm loja_id próprio usado
// em RLS e em relatórios (ex: /admin/financeiro) filtrados pela loja ativa — sem
// atualizar esses registros junto, eles ficariam "presos" à loja de origem e
// sumiriam da visão da loja de destino. vendas e anexos não são tocados: vendas já
// finalizadas pertencem à loja onde a venda aconteceu (não deve ser retroativamente
// reatribuída) e anexos/veiculo_aquisicao não têm loja_id — seu RLS deriva de
// veiculos.loja_id dinamicamente, então já acompanham o veículo sem mudança nenhuma.
export async function transferirVeiculo(
  veiculoId: string,
  lojaDestinoId: string,
  observacoes: string | null
): Promise<void> {
  const supabase = adminSupabase()

  const { data: veiculo, error: veiculoError } = await supabase
    .from('veiculos')
    .select('loja_id')
    .eq('id', veiculoId)
    .single()
  if (veiculoError || !veiculo) throw new Error('Veículo não encontrado.')

  // Precisa ter acesso à loja de ORIGEM (gerente: só a própria). A de destino
  // não exige acesso — gerente de uma loja pode mandar o carro para a outra —,
  // mas tem de ser uma loja que existe.
  const { userId } = await exigirPerfil(
    PERFIS_GERENCIA,
    'Você não tem permissão para transferir veículos entre lojas.',
    veiculo.loja_id
  )
  if (veiculo.loja_id === lojaDestinoId) {
    throw new Error('O veículo já pertence a essa loja.')
  }
  const { data: lojaDestino } = await supabase.from('lojas').select('id').eq('id', lojaDestinoId).maybeSingle()
  if (!lojaDestino) throw new Error('Loja de destino não encontrada.')

  const { error: historicoError } = await supabase.from('veiculo_transferencias').insert({
    veiculo_id: veiculoId,
    loja_origem_id: veiculo.loja_id,
    loja_destino_id: lojaDestinoId,
    transferido_por: userId,
    observacoes,
  })
  if (historicoError) throw new Error(historicoError.message)

  const [{ error: veiculoUpdateError }, { error: financeiroError }, { error: custosError }, { error: vistoriaError }] =
    await Promise.all([
      supabase.from('veiculos').update({ loja_id: lojaDestinoId }).eq('id', veiculoId),
      supabase.from('financeiro_veiculos').update({ loja_id: lojaDestinoId }).eq('veiculo_id', veiculoId),
      supabase.from('custos_manutencao').update({ loja_id: lojaDestinoId }).eq('veiculo_id', veiculoId),
      supabase.from('vistoria_veiculo').update({ loja_id: lojaDestinoId }).eq('veiculo_id', veiculoId),
    ])
  if (veiculoUpdateError) throw new Error(veiculoUpdateError.message)
  if (financeiroError) throw new Error(financeiroError.message)
  if (custosError) throw new Error(custosError.message)
  if (vistoriaError) throw new Error(vistoriaError.message)

  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/veiculos/' + veiculoId)
}

// ─── DESPESAS ─────────────────────────────────────────────────────────────────

export async function salvarDespesa(
  data: Omit<DespesaLoja, 'id' | 'created_at'> & { id?: string }
): Promise<void> {
  await exigirPerfilFinanceiroCompleto()
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
  await exigirPerfilFinanceiroCompleto()
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
  const { userId } = await exigirPerfilFinanceiroCompleto()
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
  await exigirPerfilFinanceiroCompleto()
  const supabase = adminSupabase()
  const { error } = await supabase.from('lancamentos_financeiros').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/financeiro')
}

// ─── VENDAS ───────────────────────────────────────────────────────────────────

// Venda retroativa é permitida livremente (comum lançar vendas atrasadas) — a
// única regra é não deixar gravar uma venda "do futuro". Mesma regra já
// aplicada na tela (NovaVendaClient), reforçada aqui contra quem chamar a
// Server Action diretamente pulando a validação do formulário.
function validarDataVendaNaoFutura(dataVenda: string | null | undefined, horaVenda?: string | null) {
  if (!dataVenda) return
  const hoje = new Date().toISOString().split('T')[0]
  if (dataVenda > hoje) throw new Error('A venda não pode ser registrada com data no futuro.')
  if (dataVenda === hoje && horaVenda) {
    const agora = new Date()
    const horaAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
    if (horaVenda > horaAtual) throw new Error('A venda não pode ser registrada com hora no futuro.')
  }
}
// As actions de venda retornam { ok: false, erro } em vez de lançar: em
// produção o Next substitui a mensagem de qualquer throw de Server Action
// pelo genérico "An error occurred in the Server Components render", e o
// usuário nunca via o motivo real (ex: ano do veículo da troca faltando).
function erroDeAcao(err: unknown, fallback: string): { ok: false; erro: string } {
  return { ok: false, erro: err instanceof Error && err.message ? err.message : fallback }
}

// Todas as actions de venda gravam com service role (sem RLS), então esta é a
// única barreira entre o chamador e os dados: sessão validada no servidor
// (getUser, não getSession — getSession só lê o cookie sem verificar o JWT),
// perfil ativo com acesso ao módulo Vendas e vínculo com a loja da venda.
// lojaId deve vir do banco sempre que a venda já existe, nunca do payload.
// Lança erro — nas actions que retornam ResultadoAcao, o try/catch do
// wrapper converte em { ok: false, erro }.
async function exigirAcessoVendaLoja(lojaId: string): Promise<{ userId: string }> {
  const userClient = await userSupabase()
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) throw new Error('Sessão expirada. Atualize a página e tente novamente.')

  const perfil = await obterPerfilAtivo(user.id)
  if (!perfil || !podeAcessarVendas(perfil)) {
    throw new Error('Você não tem permissão para gerenciar vendas.')
  }
  if (!temAcessoLoja(perfil, lojaId)) {
    throw new Error('Você não tem permissão para gerenciar vendas desta loja.')
  }
  return { userId: user.id }
}

// Impede vincular a venda a um veículo de outra loja (o veículo é marcado
// como vendido em finalizarVenda).
async function exigirVeiculoDaLoja(veiculoId: string, lojaId: string) {
  const { data: veiculo } = await adminSupabase().from('veiculos').select('loja_id').eq('id', veiculoId).single()
  if (!veiculo || veiculo.loja_id !== lojaId) {
    throw new Error('O veículo selecionado não pertence à loja desta venda.')
  }
}

async function salvarVendaInterno(
  data: Partial<Venda> & { loja_id: string; veiculo_id: string; comprador_nome: string }
): Promise<{ id: string }> {
  if (data.data_venda !== undefined) {
    validarDataVendaNaoFutura(data.data_venda, data.hora_venda)
  }
  const supabase = adminSupabase()
  if (data.id) {
    const { id, veiculo, vendedor, ...rest } = data as Venda & { veiculo?: unknown; vendedor?: unknown }

    // Mesma trava de salvarPagamentosVenda: depois de finalizada, os dados da
    // negociação (veículo, comprador, forma de pagamento) ficam congelados —
    // ninguém deve conseguir reabrir e reescrever uma venda já fechada.
    // Única exceção: editar Observações (handleSalvarObs em VendaDetalheClient)
    // continua funcionando — esse formulário reenvia loja_id/veiculo_id/
    // comprador_nome junto porque o tipo desta action exige, mas com o mesmo
    // valor já salvo; a trava aqui olha se algum campo *além* de observacoes
    // está de fato mudando de valor, não só se está presente no payload.
    const { data: existente, error: statusError } = await supabase
      .from('vendas')
      .select('*')
      .eq('id', id)
      .single()
    if (statusError || !existente) throw new Error('Venda não encontrada.')
    await exigirAcessoVendaLoja(existente.loja_id)
    if (rest.loja_id !== undefined && rest.loja_id !== existente.loja_id) {
      throw new Error('Não é possível mover uma venda para outra loja.')
    }
    if (rest.veiculo_id !== undefined && rest.veiculo_id !== existente.veiculo_id) {
      await exigirVeiculoDaLoja(rest.veiculo_id, existente.loja_id)
    }
    if (existente.status === 'finalizada') {
      const existenteRecord = existente as Record<string, unknown>
      const mudaAlgoAlemDeObservacoes = Object.entries(rest).some(
        ([campo, valor]) => campo !== 'observacoes' && valor !== existenteRecord[campo]
      )
      if (mudaAlgoAlemDeObservacoes) {
        throw new Error('Esta venda já foi finalizada — não é possível alterar os dados da negociação.')
      }
    }

    const { error } = await supabase.from('vendas').update(rest).eq('id', id)
    if (error) throw new Error(error.message)
    revalidatePath('/admin/vendas')
    return { id }
  } else {
    const { veiculo, vendedor, ...rest } = data as Venda & { veiculo?: unknown; vendedor?: unknown }

    await exigirAcessoVendaLoja(data.loja_id)
    await exigirVeiculoDaLoja(data.veiculo_id, data.loja_id)

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

export async function salvarVenda(
  data: Partial<Venda> & { loja_id: string; veiculo_id: string; comprador_nome: string }
): Promise<ResultadoAcao<{ id: string }>> {
  try {
    const { id } = await salvarVendaInterno(data)
    return { ok: true, id }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao salvar a venda.')
  }
}

// Ordem importa: validações e criação do(s) veículo(s) da troca primeiro; só
// no fim marca veículo vendido + venda finalizada. Antes era o contrário — se
// a troca falhasse (ex: ano_fabricacao NOT NULL da migration 018), a venda
// ficava finalizada sem o veículo recebido e sem caminho de volta pela tela.
//
// Sem transação (PostgREST): cada passo confere se afetou linha e, se algo
// falhar, desfaz o que esta chamada gravou e a venda continua rascunho.
//
// Idempotente: venda já finalizada retorna ok sem recriar nada; cada item da
// troca é "reivindicado" atomicamente (ver processarItemTroca), então dois
// cliques/abas simultâneos não duplicam o veículo.
export async function finalizarVenda(vendaId: string): Promise<ResultadoAcao> {
  try {
    const supabase = adminSupabase()

    const { data: venda, error: vendaError } = await supabase
      .from('vendas')
      .select('status, veiculo_id, data_venda, hora_venda, loja_id, comprador_nome, comprador_telefone')
      .eq('id', vendaId)
      .maybeSingle()
    if (vendaError) return { ok: false, erro: `Erro ao carregar a venda: ${vendaError.message}` }
    if (!venda) return { ok: false, erro: 'Venda não encontrada.' }
    await exigirAcessoVendaLoja(venda.loja_id)
    if (venda.status === 'finalizada') return { ok: true }

    validarDataVendaNaoFutura(venda.data_venda, venda.hora_venda)

    const { data: veiculo, error: veiculoError } = await supabase
      .from('veiculos')
      .select('id, status')
      .eq('id', venda.veiculo_id)
      .maybeSingle()
    if (veiculoError) return { ok: false, erro: `Erro ao carregar o veículo vendido: ${veiculoError.message}` }
    if (!veiculo) return { ok: false, erro: 'O veículo desta venda não foi encontrado.' }

    const trocas = await criarTrocasPendentes(vendaId, venda)
    if (!trocas.ok) return trocas

    const { data: veiculoAtualizado, error: e2 } = await supabase
      .from('veiculos')
      .update({ status: 'vendido' })
      .eq('id', veiculo.id)
      .select('id')
    if (e2 || !veiculoAtualizado?.length) {
      await desfazerTrocas(trocas.criadas)
      return { ok: false, erro: `Não foi possível marcar o veículo como vendido${e2 ? `: ${e2.message}` : '.'} A venda continua como rascunho.` }
    }

    const { data: vendaAtualizada, error: e1 } = await supabase
      .from('vendas')
      .update({ status: 'finalizada' })
      .eq('id', vendaId)
      .eq('status', 'rascunho')
      .select('id')

    if (e1 || !vendaAtualizada?.length) {
      // 0 linhas sem erro: outra chamada concorrente finalizou primeiro — os
      // itens de troca que esta chamada criou foram reivindicados por ela, então
      // continuam válidos para a venda.
      if (!e1) {
        const { data: atual } = await supabase.from('vendas').select('status').eq('id', vendaId).maybeSingle()
        if (atual?.status === 'finalizada') {
          revalidatePath('/admin/vendas')
          revalidatePath('/admin/veiculos')
          return { ok: true }
        }
      }
      await supabase.from('veiculos').update({ status: veiculo.status }).eq('id', veiculo.id)
      await desfazerTrocas(trocas.criadas)
      return { ok: false, erro: `Não foi possível finalizar a venda${e1 ? `: ${e1.message}` : '.'} Nada foi alterado.` }
    }

    revalidatePath('/admin/vendas')
    revalidatePath('/admin/vendas/' + vendaId)
    revalidatePath('/admin/veiculos')
    return { ok: true }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao finalizar a venda.')
  }
}

// Reparo para vendas que ficaram finalizadas sem o veículo da troca (bug da
// ordem antiga de finalizarVenda + NOT NULL da migration 018). Só admin.
export async function reprocessarVeiculosTroca(vendaId: string): Promise<ResultadoAcao<{ criados: number }>> {
  try {
    await exigirPerfil(['admin'], 'Apenas administradores podem reprocessar o veículo da troca.')
  } catch (err) {
    return erroDeAcao(err, 'Sem permissão.')
  }

  try {
    const supabase = adminSupabase()
    const { data: venda, error } = await supabase
      .from('vendas')
      .select('status, data_venda, loja_id, comprador_nome, comprador_telefone')
      .eq('id', vendaId)
      .maybeSingle()
    if (error) return { ok: false, erro: `Erro ao carregar a venda: ${error.message}` }
    if (!venda) return { ok: false, erro: 'Venda não encontrada.' }
    if (venda.status !== 'finalizada') {
      return { ok: false, erro: 'Esta venda ainda é rascunho — use "Finalizar Venda", que já cria o veículo da troca.' }
    }

    const trocas = await criarTrocasPendentes(vendaId, venda)
    if (!trocas.ok) return trocas

    revalidatePath('/admin/vendas/' + vendaId)
    revalidatePath('/admin/veiculos')
    return { ok: true, criados: trocas.criadas.length }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao reprocessar o veículo da troca.')
  }
}

// ─── LISTA DE PAGAMENTOS DA VENDA ──────────────────────────────────────────────

// Lista dinâmica de itens de pagamento (dinheiro/pix/cheque/duplicata/
// financeira/veículo recebido na troca) — substitui os antigos campos fixos
// de vendas.pagamento_*. Autosave da tela de venda manda a lista inteira a
// cada vez (mesmo padrão de "reenviar o estado inteiro" já usado em
// salvarVenda); por isso aqui é replace total (apaga tudo e reinsere), não um
// diff incremental — muito mais simples que rastrear id de item novo/editado/
// removido numa lista que só existe em memória até o primeiro save.
//
// Itens tipo='veiculo' ainda não criam o veículo de verdade aqui — os dados
// (marca/modelo/ano/placa/cor/observações) ficam em `detalhes` (jsonb) até a
// venda ser finalizada (criarTrocasPendentes), senão cada autosave
// intermediário criaria um veículo novo.
async function salvarPagamentosVendaInterno(
  vendaId: string,
  itens: { tipo: string; valor: number; detalhes: Record<string, unknown> | null }[]
): Promise<void> {
  const supabase = adminSupabase()

  const { data: venda, error: vendaError } = await supabase
    .from('vendas')
    .select('status, loja_id')
    .eq('id', vendaId)
    .single()
  if (vendaError || !venda) throw new Error('Venda não encontrada.')
  await exigirAcessoVendaLoja(venda.loja_id)
  if (venda.status === 'finalizada') {
    throw new Error('Esta venda já foi finalizada — não é possível alterar a lista de pagamentos.')
  }

  const { error: deleteError } = await supabase.from('venda_pagamentos').delete().eq('venda_id', vendaId)
  if (deleteError) throw new Error(deleteError.message)

  if (itens.length === 0) return

  const { error: insertError } = await supabase.from('venda_pagamentos').insert(
    itens.map(item => ({ venda_id: vendaId, tipo: item.tipo, valor: item.valor, detalhes: item.detalhes }))
  )
  if (insertError) throw new Error(insertError.message)
}

export async function salvarPagamentosVenda(
  vendaId: string,
  itens: { tipo: string; valor: number; detalhes: Record<string, unknown> | null }[]
): Promise<ResultadoAcao> {
  try {
    await salvarPagamentosVendaInterno(vendaId, itens)
    return { ok: true }
  } catch (err) {
    return erroDeAcao(err, 'Erro ao salvar os pagamentos da venda.')
  }
}

// ─── VEÍCULO RECEBIDO NA TROCA (permuta) ───────────────────────────────────────

// Para cada item tipo='veiculo' da lista de pagamentos ainda sem
// veiculo_recebido_id: cria o veículo "rascunho" com os dados de `detalhes`,
// o registro de veiculo_recebido_venda ligando tudo e o registro de aquisição
// (valor_compra = valor do item, vendedor = comprador da venda).

type VendaParaTroca = {
  loja_id: string
  comprador_nome: string
  comprador_telefone: string | null
  data_venda: string
}

type ItemTrocaValidado = {
  id: string
  valor: number
  marca: string
  modelo: string
  ano: number
  cor: string
  placa: string | null
  observacoes: string | null
}

// O que uma chamada gravou para um item — usado para desfazer em caso de falha.
type TrocaCriada = { pagamentoId: string; recebidoId: string; veiculoId: string | null }

function validarItensTroca(
  itens: { id: string; valor: number; detalhes: VendaPagamentoDetalhes | null }[]
): { ok: true; itens: ItemTrocaValidado[] } | { ok: false; erro: string } {
  const anoMax = new Date().getFullYear() + 1
  const validados: ItemTrocaValidado[] = []

  for (const [i, item] of itens.entries()) {
    const d = item.detalhes ?? {}
    const marca = d.marca?.trim() ?? ''
    const modelo = d.modelo?.trim() ?? ''
    const nome = `Veículo recebido na troca${itens.length > 1 ? ` nº ${i + 1}` : ''}${marca ? ` (${`${marca} ${modelo}`.trim()})` : ''}`

    const faltando = [!marca && 'marca', !modelo && 'modelo', !d.cor?.trim() && 'cor'].filter(Boolean)
    if (faltando.length > 0) {
      return { ok: false, erro: `${nome}: preencha ${faltando.join(', ')} antes de finalizar.` }
    }

    const anoTexto = d.ano == null ? '' : String(d.ano).trim()
    const ano = Number(anoTexto)
    if (!anoTexto || !Number.isInteger(ano) || ano < 1900 || ano > anoMax) {
      return {
        ok: false,
        erro: `${nome}: ano ${anoTexto ? `"${anoTexto}" inválido` : 'não informado'}. Informe um ano entre 1900 e ${anoMax}.`,
      }
    }

    validados.push({
      id: item.id,
      valor: item.valor,
      marca,
      modelo,
      ano,
      cor: d.cor!.trim(),
      placa: d.placa?.trim() || null,
      observacoes: d.observacoes?.trim() || null,
    })
  }

  return { ok: true, itens: validados }
}

// Best-effort: desfaz na ordem inversa. Falha aqui só é logada (com ids, sem
// dados do comprador) — não há mais o que fazer sem transação.
async function desfazerTrocas(criadas: TrocaCriada[]): Promise<void> {
  const supabase = adminSupabase()
  for (const c of [...criadas].reverse()) {
    const passos = [
      supabase.from('venda_pagamentos').update({ veiculo_recebido_id: null })
        .eq('id', c.pagamentoId).eq('veiculo_recebido_id', c.recebidoId),
      supabase.from('veiculo_recebido_venda').delete().eq('id', c.recebidoId),
      // veiculo_aquisicao sai junto (on delete cascade em veiculo_id)
      ...(c.veiculoId ? [supabase.from('veiculos').delete().eq('id', c.veiculoId)] : []),
    ]
    for (const passo of passos) {
      const { error } = await passo
      if (error) {
        console.error(`[desfazerTrocas] falha ao desfazer troca pagamento=${c.pagamentoId} recebido=${c.recebidoId} veiculo=${c.veiculoId}: ${error.message}`)
      }
    }
  }
}

async function processarItemTroca(
  vendaId: string,
  venda: VendaParaTroca,
  item: ItemTrocaValidado,
  criadas: TrocaCriada[]
): Promise<{ ok: true } | { ok: false; erro: string }> {
  const supabase = adminSupabase()
  const nome = `${item.marca} ${item.modelo}`

  // 1. Registro de apoio primeiro (veiculo_criado_id ainda null) — o id dele é
  //    o que "reivindica" o item no passo 2.
  const { data: recebido, error: recebidoError } = await supabase
    .from('veiculo_recebido_venda')
    .insert({
      venda_id: vendaId,
      venda_pagamento_id: item.id,
      marca: item.marca,
      modelo: item.modelo,
      ano: item.ano,
      placa: item.placa,
      cor: item.cor,
      valor_entrada: item.valor,
      observacoes: item.observacoes,
    })
    .select('id')
    .single()
  if (recebidoError || !recebido) {
    return { ok: false, erro: `Erro ao registrar o veículo da troca (${nome}): ${recebidoError?.message ?? 'sem retorno'}` }
  }

  // 2. Reivindicação atômica: só uma chamada concorrente consegue trocar
  //    veiculo_recebido_id de null para o seu id. Quem perde desfaz o passo 1
  //    e segue sem criar nada — é isso que impede o veículo em dobro.
  const { data: reivindicado, error: claimError } = await supabase
    .from('venda_pagamentos')
    .update({ veiculo_recebido_id: recebido.id })
    .eq('id', item.id)
    .is('veiculo_recebido_id', null)
    .select('id')
  if (claimError || !reivindicado?.length) {
    await supabase.from('veiculo_recebido_venda').delete().eq('id', recebido.id)
    if (claimError) return { ok: false, erro: `Erro ao vincular o veículo da troca (${nome}): ${claimError.message}` }
    return { ok: true }
  }

  const criada: TrocaCriada = { pagamentoId: item.id, recebidoId: recebido.id, veiculoId: null }
  criadas.push(criada)

  // 3. Veículo em estoque como rascunho. ano_fabricacao/ano_modelo são NOT NULL
  //    desde a migration 018 — a troca só informa um ano, usado nos dois.
  const { data: novoVeiculo, error: veiculoError } = await supabase
    .from('veiculos')
    .insert({
      loja_id: venda.loja_id,
      marca: item.marca,
      modelo: item.modelo,
      ano: item.ano,
      ano_fabricacao: item.ano,
      ano_modelo: item.ano,
      condicao: 'seminovo',
      cor: item.cor,
      combustivel: '',
      cambio: '',
      preco: 0,
      placa: item.placa,
      status: 'disponivel',
      rascunho: true,
    })
    .select('id')
    .single()
  if (veiculoError || !novoVeiculo) {
    return { ok: false, erro: `Erro ao cadastrar o veículo da troca (${nome}) no estoque: ${veiculoError?.message ?? 'sem retorno'}` }
  }
  criada.veiculoId = novoVeiculo.id

  const { data: ligado, error: ligarError } = await supabase
    .from('veiculo_recebido_venda')
    .update({ veiculo_criado_id: novoVeiculo.id })
    .eq('id', recebido.id)
    .select('id')
  if (ligarError || !ligado?.length) {
    return { ok: false, erro: `Erro ao vincular o veículo da troca (${nome}) ao estoque${ligarError ? `: ${ligarError.message}` : '.'}` }
  }

  const { error: aquisicaoError } = await supabase.from('veiculo_aquisicao').insert({
    veiculo_id: novoVeiculo.id,
    nome_vendedor: venda.comprador_nome,
    telefone_vendedor: venda.comprador_telefone,
    forma_pagamento_compra: 'Veículo recebido em troca',
    data_compra: venda.data_venda,
    valor_compra: item.valor,
    observacoes: item.observacoes,
  })
  if (aquisicaoError) {
    return { ok: false, erro: `Erro ao registrar a aquisição do veículo da troca (${nome}): ${aquisicaoError.message}` }
  }

  revalidatePath('/admin/veiculos/' + novoVeiculo.id)
  return { ok: true }
}

// Valida TODOS os itens pendentes antes de gravar qualquer coisa; se um item
// falhar no meio, desfaz os que esta chamada já criou.
async function criarTrocasPendentes(
  vendaId: string,
  venda: VendaParaTroca
): Promise<{ ok: true; criadas: TrocaCriada[] } | { ok: false; erro: string }> {
  const supabase = adminSupabase()

  const { data: pendentes, error } = await supabase
    .from('venda_pagamentos')
    .select('id, valor, detalhes')
    .eq('venda_id', vendaId)
    .eq('tipo', 'veiculo')
    .is('veiculo_recebido_id', null)
    .order('criado_em', { ascending: true })
  if (error) return { ok: false, erro: `Erro ao carregar os veículos da troca: ${error.message}` }

  const validacao = validarItensTroca(
    (pendentes ?? []) as { id: string; valor: number; detalhes: VendaPagamentoDetalhes | null }[]
  )
  if (!validacao.ok) return validacao

  const criadas: TrocaCriada[] = []
  for (const item of validacao.itens) {
    const r = await processarItemTroca(vendaId, venda, item, criadas)
    if (!r.ok) {
      await desfazerTrocas(criadas)
      return r
    }
  }
  return { ok: true, criadas: criadas.filter(c => c.veiculoId) }
}


// Marca o veículo como publicado (sai do estado "rascunho") — exige o mínimo
// pra aparecer decentemente no site/listagens: pelo menos 1 foto e preço > 0.
export async function publicarVeiculo(veiculoId: string): Promise<void> {
  await exigirAcessoVeiculo(veiculoId)
  const supabase = adminSupabase()

  const { data: veiculo, error: fetchError } = await supabase
    .from('veiculos')
    .select('fotos, preco')
    .eq('id', veiculoId)
    .single()
  if (fetchError || !veiculo) throw new Error('Veículo não encontrado.')
  if (!veiculo.fotos || veiculo.fotos.length === 0) {
    throw new Error('Adicione pelo menos 1 foto antes de publicar.')
  }
  if (!veiculo.preco || veiculo.preco <= 0) {
    throw new Error('Defina o preço de venda antes de publicar.')
  }

  const { error } = await supabase.from('veiculos').update({ rascunho: false }).eq('id', veiculoId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/veiculos/' + veiculoId)
}

export async function deletarVenda(vendaId: string): Promise<void> {
  const supabase = adminSupabase()
  const { data: venda } = await supabase.from('vendas').select('loja_id').eq('id', vendaId).single()
  if (!venda) throw new Error('Venda não encontrada.')
  await exigirAcessoVendaLoja(venda.loja_id)
  const { error } = await supabase.from('vendas').delete().eq('id', vendaId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/vendas')
}

// ─── CONTROLE DE ACESSO POR PERFIL ─────────────────────────────────────────────

const PERFIS_GERENCIA: Perfil[] = ['gerente', 'diretor', 'admin']

// Checa o perfil do usuário logado direto no servidor — usado por Server
// Actions que não podem depender só da UI esconder um botão/aba. getUser()
// (via exigirUsuarioAtivo) valida o JWT e barra usuário desativado; com
// `lojaId`, exige também acesso àquela loja (admin/diretor: todas).
async function exigirPerfil(
  permitido: Perfil[],
  mensagemErro: string,
  lojaId?: string | null
): Promise<{ userId: string; perfil: PerfilAcesso }> {
  const perfil = await exigirUsuarioAtivo()
  if (!permitido.includes(perfil.perfil)) throw new Error(mensagemErro)
  if (lojaId !== undefined && !temAcessoLoja(perfil, lojaId)) throw new Error(mensagemErro)
  return { userId: perfil.id, perfil }
}

// Documentação (aquisição/anexos) de um veículo: gerente/diretor/admin com
// acesso à loja do veículo no banco.
async function exigirPerfilDocumentacao(veiculoId: string) {
  const { data: veiculo } = await adminSupabase().from('veiculos').select('loja_id').eq('id', veiculoId).maybeSingle()
  if (!veiculo) throw new Error('Veículo não encontrado.')
  return exigirPerfil(PERFIS_GERENCIA, 'Você não tem permissão para acessar a documentação deste veículo.', veiculo.loja_id)
}

// Financeiro "completo" (custo/DRE do veículo, despesas, lançamentos/Movimentações,
// retorno financeira/banco, promissórias, /admin/financeiro como um todo) —
// restrito a admin.
function exigirPerfilFinanceiroCompleto() {
  return exigirPerfil(['admin'], 'Apenas administradores podem acessar o financeiro completo.')
}

// Anexo de veículo (aquisição/Documentação) é dado sensível — continua restrito
// a gerente/diretor/admin. Anexo de venda (contrato assinado etc.) é uso do dia
// a dia do vendedor — liberado pra qualquer perfil autenticado da própria loja
// da venda (não uma restrição "financeira" como a de veículo).
async function exigirPermissaoAnexo(entidadeTipo: 'veiculo' | 'venda', entidadeId: string): Promise<{ userId: string }> {
  if (entidadeTipo === 'veiculo') {
    return exigirPerfilDocumentacao(entidadeId)
  }

  const { data: vendaData } = await adminSupabase().from('vendas').select('loja_id').eq('id', entidadeId).maybeSingle()
  if (!vendaData) throw new Error('Venda não encontrada.')
  // temAcessoLoja (e não loja_id === loja_id): admin/diretor operando outra
  // loja pelo seletor também acessam, igual ao resto do painel.
  const perfil = await exigirAcessoLoja(vendaData.loja_id, 'Você não tem permissão para acessar os anexos desta venda.')
  return { userId: perfil.id }
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
  await exigirPerfilDocumentacao(veiculoId)
  const supabase = adminSupabase()
  if (aquisicaoId) {
    // .eq('veiculo_id'): o acesso foi checado por este veículo; sem isso, um
    // aquisicaoId de outro veículo (de outra loja) seria aceito.
    const { data: atualizada, error } = await supabase
      .from('veiculo_aquisicao')
      .update(data)
      .eq('id', aquisicaoId)
      .eq('veiculo_id', veiculoId)
      .select('id')
    if (error) throw new Error(error.message)
    if (!atualizada?.length) throw new Error('Registro de aquisição não encontrado para este veículo.')
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
}): Promise<Anexo & { urlAssinada: string | null }> {
  const { userId } = await exigirPermissaoAnexo(data.entidadeTipo, data.entidadeId)
  // O upload (AnexosClient) grava em `${tipo}/${id}/arquivo`. Exigir esse
  // prefixo impede registrar — e receber signed URL de — um arquivo de outra
  // entidade/loja só informando o caminho dele.
  const prefixo = `${data.entidadeTipo}/${data.entidadeId}/`
  if (!data.path.startsWith(prefixo) || data.path.includes('..') || data.path.slice(prefixo.length).includes('/')) {
    throw new Error('Caminho de anexo inválido.')
  }
  const supabase = adminSupabase()

  const { data: anexo, error } = await supabase
    .from('anexos')
    .insert({
      entidade_tipo: data.entidadeTipo,
      entidade_id: data.entidadeId,
      nome_arquivo: data.nomeArquivo,
      url: data.path,
      tipo_arquivo: data.tipoArquivo,
      criado_por: userId,
    })
    .select('*, usuario:usuarios_perfil(nome)')
    .single()
  if (error) throw new Error(error.message)

  // Bucket privado — o cliente não consegue gerar a própria signed URL, então
  // a Server Action (service role) já devolve uma pronta pra usar no update
  // otimista da lista, sem precisar de outra chamada/round-trip.
  const { data: signed } = await supabase.storage.from('veiculos-documentos').createSignedUrl(data.path, 3600)

  if (data.entidadeTipo === 'veiculo') revalidatePath('/admin/veiculos/' + data.entidadeId)

  return { ...(anexo as Anexo), urlAssinada: signed?.signedUrl ?? null }
}

// `path` e `entidadeId` ficam na assinatura por compatibilidade, mas o que
// vale é o que está gravado no anexo: antes o arquivo removido do storage era
// o `path` mandado pelo navegador (dava para apagar documento de qualquer
// loja passando o caminho) e a permissão era checada contra um entidadeId
// qualquer.
export async function deletarAnexo(anexoId: string, _path: string, _entidadeId: string) {
  const admin = adminSupabase()

  const { data: anexo } = await admin
    .from('anexos')
    .select('entidade_tipo, entidade_id, url')
    .eq('id', anexoId)
    .single()
  if (!anexo) throw new Error('Anexo não encontrado.')
  const entidadeTipo = anexo.entidade_tipo as 'veiculo' | 'venda'
  const entidadeId = anexo.entidade_id as string

  await exigirPermissaoAnexo(entidadeTipo, entidadeId)

  await admin.storage.from('veiculos-documentos').remove([anexo.url as string])
  const { error } = await admin.from('anexos').delete().eq('id', anexoId)
  if (error) throw new Error(error.message)

  if (entidadeTipo === 'veiculo') revalidatePath('/admin/veiculos/' + entidadeId)
  else revalidatePath('/admin/vendas/' + entidadeId)
}

// ─── PROMISSÓRIAS (PARCELAMENTO) DA VENDA ──────────────────────────────────────

// Dado financeiro da venda — mesmo nível de acesso de despesas/lançamentos
// (gerente/diretor/admin), igual à RLS da tabela (migration 012).
export async function criarPromissoria(
  vendaId: string,
  dados: { valor: number; vencimento: string; observacoes: string | null }
): Promise<void> {
  await exigirPerfilFinanceiroCompleto()
  const supabase = adminSupabase()

  // Número da parcela é sequencial por venda, calculado aqui (não vem do
  // formulário) — evita o usuário ter que controlar isso manualmente.
  const { count } = await supabase
    .from('venda_promissorias')
    .select('id', { count: 'exact', head: true })
    .eq('venda_id', vendaId)

  const { error } = await supabase.from('venda_promissorias').insert({
    venda_id: vendaId,
    numero_parcela: (count ?? 0) + 1,
    valor: dados.valor,
    vencimento: dados.vencimento,
    observacoes: dados.observacoes,
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/vendas/' + vendaId)
}

export async function marcarPromissoriaPaga(id: string, vendaId: string): Promise<void> {
  await exigirPerfilFinanceiroCompleto()
  const supabase = adminSupabase()
  const hoje = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('venda_promissorias')
    .update({ pago: true, data_pagamento: hoje })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/vendas/' + vendaId)
}

export async function desmarcarPromissoriaPaga(id: string, vendaId: string): Promise<void> {
  await exigirPerfilFinanceiroCompleto()
  const supabase = adminSupabase()
  const { error } = await supabase
    .from('venda_promissorias')
    .update({ pago: false, data_pagamento: null })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/vendas/' + vendaId)
}

// ─── EXCLUSÃO DE VEÍCULO ───────────────────────────────────────────────────────

export async function excluirVeiculo(veiculoId: string): Promise<{ tipo: 'soft' | 'hard' }> {
  await exigirAcessoVeiculo(veiculoId)
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
  // loja_id do veículo no banco e inspetor da sessão; o `lojaId` do
  // navegador é ignorado (mantido só por compatibilidade com quem chama).
  void lojaId
  const { perfil, veiculo } = await exigirAcessoVeiculo(veiculoId)
  const supabase = adminSupabase()

  if (vistoriaId) {
    const { data: atualizada, error } = await supabase
      .from('vistoria_veiculo')
      .update({ itens, observacoes: observacoes || null, aprovado })
      .eq('id', vistoriaId)
      .eq('veiculo_id', veiculoId)
      .select('id')
    if (error) throw new Error(error.message)
    if (!atualizada?.length) throw new Error('Vistoria não encontrada para este veículo.')
  } else {
    const { error } = await supabase.from('vistoria_veiculo').insert({
      veiculo_id: veiculoId,
      loja_id: veiculo.loja_id,
      inspetor_id: perfil.id,
      itens,
      observacoes: observacoes || null,
      aprovado,
    })
    if (error) throw new Error(error.message)
  }
  revalidatePath('/admin/veiculos/' + veiculoId)
  revalidatePath('/admin/veiculos/' + veiculoId + '/vistoria')
}
