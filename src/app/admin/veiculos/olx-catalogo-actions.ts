'use server'

import { revalidatePath } from 'next/cache'
import { adminSupabase } from '@/lib/supabase-server'
import { obterPerfilDaSessao, temAcessoLoja } from '@/lib/acesso'
import { buscarIdsCatalogoOlx, listarCatalogoOlx, type OpcaoCatalogo, type ResultadoCatalogo } from '@/lib/olx-catalogo'
import type { ResultadoAcao } from '@/types'

// Mesmo critério de edição de veículo: acesso à loja do veículo; sócio só em
// veículo de propriedade dividida (validarVeiculoParaSocio em actions.ts).
async function exigirAcessoVeiculo(veiculoId: string): Promise<{ ok: true; lojaId: string } | { ok: false; erro: string }> {
  const perfil = await obterPerfilDaSessao()
  if (!perfil) return { ok: false, erro: 'Sessão expirada. Atualize a página e tente novamente.' }

  const { data: veiculo } = await adminSupabase()
    .from('veiculos')
    .select('loja_id, proprietario_tipo')
    .eq('id', veiculoId)
    .maybeSingle()
  if (!veiculo) return { ok: false, erro: 'Veículo não encontrado.' }
  if (!temAcessoLoja(perfil, veiculo.loja_id)) return { ok: false, erro: 'Sem permissão para este veículo.' }
  if (perfil.perfil === 'socio' && veiculo.proprietario_tipo !== 'dividido') {
    return { ok: false, erro: 'Sem permissão para este veículo.' }
  }
  return { ok: true, lojaId: veiculo.loja_id }
}

/** Busca automática com os valores atuais do formulário (ainda não salvos). */
export async function consultarCatalogoOlx(
  veiculoId: string,
  dados: { marca: string; modelo: string; versao: string | null; ano: number | null }
): Promise<ResultadoCatalogo> {
  const acesso = await exigirAcessoVeiculo(veiculoId)
  if (!acesso.ok) return acesso
  return buscarIdsCatalogoOlx(acesso.lojaId, dados)
}

/** Lista um nível inteiro, para escolher manualmente quando não houve correspondência. */
export async function listarNivelCatalogoOlx(
  veiculoId: string,
  nivel: { marcaId?: string; modeloId?: string }
): Promise<ResultadoAcao<{ opcoes: OpcaoCatalogo[] }>> {
  const acesso = await exigirAcessoVeiculo(veiculoId)
  if (!acesso.ok) return acesso
  return listarCatalogoOlx(acesso.lojaId, nivel)
}

export async function salvarVinculoOlx(
  veiculoId: string,
  ids: { marcaId: string; modeloId: string; versaoId: string }
): Promise<ResultadoAcao> {
  const acesso = await exigirAcessoVeiculo(veiculoId)
  if (!acesso.ok) return acesso

  // Não confia no id vindo do cliente: confere cada nível no catálogo atual.
  const [marcas, modelos, versoes] = await Promise.all([
    listarCatalogoOlx(acesso.lojaId),
    listarCatalogoOlx(acesso.lojaId, { marcaId: ids.marcaId }),
    listarCatalogoOlx(acesso.lojaId, { marcaId: ids.marcaId, modeloId: ids.modeloId }),
  ])
  for (const r of [marcas, modelos, versoes]) if (!r.ok) return r
  const existe = (r: typeof marcas, id: string) => r.ok && r.opcoes.some(o => o.id === id)
  if (!existe(marcas, ids.marcaId) || !existe(modelos, ids.modeloId) || !existe(versoes, ids.versaoId)) {
    return { ok: false, erro: 'Marca, modelo ou versão não existe mais no catálogo da OLX. Busque de novo.' }
  }

  const { data, error } = await adminSupabase()
    .from('veiculos')
    .update({ olx_marca_id: ids.marcaId, olx_modelo_id: ids.modeloId, olx_versao_id: ids.versaoId })
    .eq('id', veiculoId)
    .select('id')
  if (error) {
    // PGRST204 (PostgREST) / 42703 (Postgres): coluna inexistente.
    if (error.code === 'PGRST204' || error.code === '42703') {
      return { ok: false, erro: 'As colunas da OLX ainda não existem no banco — rode a migration 020.' }
    }
    return { ok: false, erro: `Erro ao salvar o vínculo: ${error.message}` }
  }
  if (!data?.length) return { ok: false, erro: 'Veículo não encontrado.' }

  revalidatePath('/admin/veiculos')
  revalidatePath('/admin/veiculos/' + veiculoId)
  return { ok: true }
}
