import type { Loja, Veiculo } from '@/types'

// Pendências que impedem (ou deveriam impedir) a publicação de um veículo
// marcado com publicar_olx / publicar_marketplace.
//
// Base das regras:
//   - OLX: doc oficial (developers.olx.com.br/anuncio/api/import.html e
//     autos/sub_auto.html): images e price obrigatórios desde 05/08/2025,
//     vehicle_tag (placa) obrigatório para usados, vehicle_brand/model/version
//     obrigatórios e validados contra o catálogo da OLX, zipcode e phone
//     obrigatórios (vêm da loja — ver pendenciasLojaOlx).
//   - Chassi e cor NÃO são obrigatórios na doc da OLX (chassi e carcolor são
//     "Não"); entram aqui por regra interna da loja, valendo para os dois canais.
//   - Marketplace: sem doc lida ainda — só as regras internas comuns.

export type Canal = 'olx' | 'marketplace'

export type PendenciasVeiculo = {
  canal: Canal
  itens: string[]
}[]

type VeiculoParaPublicacao = Pick<
  Veiculo,
  'fotos' | 'preco' | 'cor' | 'placa' | 'chassi' | 'status' | 'rascunho' | 'condicao' | 'publicar_olx' | 'publicar_marketplace'
> & {
  // Colunas da migration 020 (proposta, ainda não aplicada) — opcionais até lá.
  olx_versao_id?: string | null
}

function pendenciasComuns(v: VeiculoParaPublicacao): string[] {
  const itens: string[] = []
  if (v.status === 'vendido') itens.push('vendido — desmarque a publicação (o anúncio só sai do ar com remoção explícita)')
  if (v.rascunho) itens.push('cadastro em rascunho')
  if (!v.fotos || v.fotos.length === 0) itens.push('sem fotos')
  if (!v.preco || v.preco <= 0) itens.push('preço zerado')
  if (!v.cor?.trim()) itens.push('sem cor')
  if (!v.placa?.trim()) itens.push('sem placa')
  if (!v.chassi?.trim()) itens.push('sem chassi')
  return itens
}

export function pendenciasPublicacao(v: VeiculoParaPublicacao): PendenciasVeiculo {
  const resultado: PendenciasVeiculo = []
  const comuns = pendenciasComuns(v)

  if (v.publicar_olx) {
    const itens = [...comuns]
    // Placa já está nas comuns; para a OLX ela só é dispensada em veículo novo.
    if (v.condicao === 'novo') {
      const i = itens.indexOf('sem placa')
      if (i >= 0) itens.splice(i, 1)
    }
    // Só cobra depois que a migration 020 existir (coluna presente na linha).
    if ('olx_versao_id' in v && !v.olx_versao_id) itens.push('não vinculado ao catálogo OLX (marca/modelo/versão)')
    if (itens.length > 0) resultado.push({ canal: 'olx', itens })
  }

  if (v.publicar_marketplace && comuns.length > 0) {
    resultado.push({ canal: 'marketplace', itens: comuns })
  }

  return resultado
}

/** Dados da loja que a OLX exige em todo anúncio (zipcode e phone). */
export function pendenciasLojaOlx(loja: Pick<Loja, 'cep' | 'whatsapp'>): string[] {
  const itens: string[] = []
  if ((loja.cep ?? '').replace(/\D/g, '').length !== 8) itens.push('CEP da loja não preenchido (Configurações)')
  const tel = (loja.whatsapp ?? '').replace(/\D/g, '')
  // phone: DDD + número, 10 ou 11 dígitos, sem +55.
  if (tel.length < 10 || tel.length > 11) itens.push('telefone/WhatsApp da loja precisa ter DDD + número (10 ou 11 dígitos, sem +55)')
  return itens
}

export const NOME_CANAL: Record<Canal, string> = { olx: 'OLX', marketplace: 'Marketplace' }
