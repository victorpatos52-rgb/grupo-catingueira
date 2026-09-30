import type { CondicaoVeiculo } from '@/types'

/**
 * Vocabulário único de tradução por campo para os feeds OLX e Facebook
 * Marketplace/Catálogo Automotivo — fonte única pra quando os geradores de
 * feed (fase separada, por canal) forem escritos, evitando duas listas de
 * código divergentes.
 *
 * Cada função recebe o valor livre já cadastrado no veículo (os mesmos
 * textos usados nos <select> do VeiculoForm.tsx) e devolve o código de cada
 * canal. `null` quando aquele canal não tem um código correspondente
 * confiável — nunca inventa um código só pra preencher.
 *
 * Códigos confirmados nas docs oficiais (não inventados):
 *   OLX      — https://developers.olx.com.br/anuncio/api/autos/sub_auto.html
 *              (campos `fuel`, `gearbox`, `cartype` da subcategoria Autos)
 *   Facebook — https://developers.facebook.com/docs/marketing-api/reference/product-catalog/vehicles/
 *              (schema de catálogo de veículos — `fuel_type`, `transmission`,
 *              `body_style`, `state_of_vehicle`)
 */

export interface CodigosCanal {
  olx: number | null
  facebook: string | null
}

// ── Combustível (OLX: campo `fuel` / Facebook: `fuel_type`) ────────────────
const COMBUSTIVEL_MAP: Record<string, CodigosCanal> = {
  Gasolina: { olx: 1, facebook: 'GASOLINE' },
  // OLX chama de "Álcool"; Facebook não tem código específico pra etanol.
  Etanol: { olx: 2, facebook: 'OTHER' },
  Flex: { olx: 3, facebook: 'FLEX' },
  Diesel: { olx: 5, facebook: 'DIESEL' },
  Híbrido: { olx: 6, facebook: 'HYBRID' },
  Elétrico: { olx: 7, facebook: 'ELECTRIC' },
}

export function traduzirCombustivel(valor: string): CodigosCanal {
  return COMBUSTIVEL_MAP[valor] ?? { olx: null, facebook: null }
}

// ── Câmbio (OLX: campo `gearbox` / Facebook: `transmission`) ──────────────
const CAMBIO_MAP: Record<string, CodigosCanal> = {
  Manual: { olx: 1, facebook: 'MANUAL' },
  Automático: { olx: 2, facebook: 'AUTOMATIC' },
  // CVT e automatizado (dupla-embreagem etc.) não têm código próprio em
  // nenhum dos dois canais — convenção do mercado é tratar como automático.
  CVT: { olx: 2, facebook: 'AUTOMATIC' },
  Automatizado: { olx: 4, facebook: 'AUTOMATIC' },
}

export function traduzirCambio(valor: string): CodigosCanal {
  return CAMBIO_MAP[valor] ?? { olx: null, facebook: null }
}

// ── Tipo / carroceria (OLX: campo `cartype` / Facebook: `body_style`) ─────
const TIPO_MAP: Record<string, CodigosCanal> = {
  Sedan: { olx: 8, facebook: 'SEDAN' },
  Hatch: { olx: 9, facebook: 'HATCHBACK' },
  SUV: { olx: 5, facebook: 'SUV' },
  Picape: { olx: 3, facebook: 'PICKUP' },
  // OLX não tem código próprio pra minivan — cai no mesmo "Van/Utilitário".
  Minivan: { olx: 7, facebook: 'MINIVAN' },
  Conversível: { olx: 2, facebook: 'CONVERTIBLE' },
  Coupé: { olx: 11, facebook: 'COUPE' },
  'Perua/SW': { olx: 12, facebook: 'WAGON' },
  Van: { olx: 7, facebook: 'VAN' },
  Outros: { olx: null, facebook: 'OTHER' },
}

export function traduzirTipo(valor: string): CodigosCanal {
  return TIPO_MAP[valor] ?? { olx: null, facebook: null }
}

// ── Condição (Facebook: `state_of_vehicle` — NEW/USED/CPO) ────────────────
// OLX Autos é anúncio classificado, não catálogo de concessionária — o
// schema documentado não tem um campo de condição novo/seminovo/usado
// (só existem campos de status financeiro). `olx` fica sempre null aqui.
const CONDICAO_MAP: Record<CondicaoVeiculo, CodigosCanal> = {
  novo: { olx: null, facebook: 'NEW' },
  // "Seminovo" não tem equivalente formal — mapeado pra USED (não CPO:
  // "certified pre-owned" implica um programa de certificação de fábrica
  // que essa loja não opera).
  seminovo: { olx: null, facebook: 'USED' },
  usado: { olx: null, facebook: 'USED' },
}

export function traduzirCondicao(valor: CondicaoVeiculo): CodigosCanal {
  return CONDICAO_MAP[valor]
}
