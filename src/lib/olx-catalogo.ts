import { adminSupabase } from '@/lib/supabase-server'

// Só servidor: usa o access_token OLX da loja (olx_integracoes, service role).
//
// Catálogo de Autos da OLX — https://developers.olx.com.br/anuncio/api/autos/car_models.html
//   POST https://apps.olx.com.br/autoupload/car_info                       → marcas
//   POST https://apps.olx.com.br/autoupload/car_info/{id_marca}            → modelos
//   POST https://apps.olx.com.br/autoupload/car_info/{id_marca}/{id_modelo} → versões
//   corpo JSON { "access_token": "..." } (exige a loja conectada — Fase B)
//   resposta { "status": "ok", "data": { "<NOME>": <id numérico>, ... } }
// No anúncio (autos/sub_auto.html) vehicle_brand/model/version vão como string.
//
// O catálogo NÃO tem dimensão de ano — o ano do veículo só vira `regdate`
// (ver regdateOlx). A OLX "equalizou" os ids em 25/09/2025 e rejeita anúncio
// com id fora do catálogo; por isso o cache é curto e nada é adivinhado.

const BASE = 'https://apps.olx.com.br/autoupload/car_info'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export type OpcaoCatalogo = { id: string; nome: string }

export type ResultadoNivel =
  | { ok: true; id: string; nome: string; criterio: 'exato' | 'contido' }
  | { ok: false; candidatos: OpcaoCatalogo[] }

export type ResultadoCatalogo =
  | { ok: false; erro: string }
  | {
      ok: true
      marca: ResultadoNivel
      /** null quando o nível anterior não foi resolvido. */
      modelo: ResultadoNivel | null
      versao: ResultadoNivel | null
      /** Preenchido só quando os três níveis bateram. */
      ids: { vehicle_brand: string; vehicle_model: string; vehicle_version: string } | null
      regdate: string | null
    }

// ── Cache em memória (por instância do servidor) ──────────────────────────
// Chave = caminho do catálogo, não o token: a doc não diz que o catálogo
// varia por conta, e ele é o mesmo para qualquer anunciante. Requisições
// simultâneas do mesmo caminho compartilham a mesma promise.
const cache = new Map<string, { expira: number; opcoes: OpcaoCatalogo[] }>()
const emVoo = new Map<string, Promise<OpcaoCatalogo[]>>()

async function tokenDaLoja(lojaId: string): Promise<string | null> {
  const { data } = await adminSupabase()
    .from('olx_integracoes')
    .select('access_token')
    .eq('loja_id', lojaId)
    .maybeSingle()
  return data?.access_token ?? null
}

async function buscarNivel(caminho: string, token: string): Promise<OpcaoCatalogo[]> {
  const agora = Date.now()
  const hit = cache.get(caminho)
  if (hit && hit.expira > agora) return hit.opcoes

  const pendente = emVoo.get(caminho)
  if (pendente) return pendente

  const promise = (async () => {
    const resp = await fetch(`${BASE}${caminho}`, {
      method: 'POST',
      // A doc usa `curl -A Mozila` em todos os exemplos — User-Agent explícito.
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: JSON.stringify({ access_token: token }),
      cache: 'no-store',
    })
    let corpo: { status?: unknown; data?: unknown } = {}
    try {
      corpo = await resp.json()
    } catch {
      // tratado abaixo
    }
    if (!resp.ok || corpo.status !== 'ok' || typeof corpo.data !== 'object' || corpo.data === null) {
      // Nunca logar o token; só caminho e status.
      throw new Error(`Catálogo OLX indisponível (${caminho || '/'}: HTTP ${resp.status}).`)
    }
    const opcoes = Object.entries(corpo.data as Record<string, unknown>)
      .filter(([, id]) => typeof id === 'number' || typeof id === 'string')
      .map(([nome, id]) => ({ id: String(id), nome }))
    cache.set(caminho, { expira: Date.now() + CACHE_TTL_MS, opcoes })
    return opcoes
  })()

  emVoo.set(caminho, promise)
  try {
    return await promise
  } finally {
    emVoo.delete(caminho)
  }
}

// ── Normalização e correspondência ────────────────────────────────────────

/** "Gol 1.0" → "GOL 1.0"; "Citroën C4-Cactus" → "CITROEN C4 CACTUS". Mantém o ponto de "1.0". */
export function normalizarTexto(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9.]+/g, ' ')
    .replace(/(^|\s)\.+|\.+(\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokens(s: string): string[] {
  return normalizarTexto(s).split(' ').filter(Boolean)
}

function contemTodos(maior: string[], menor: string[]): boolean {
  return menor.length > 0 && menor.every(t => maior.includes(t))
}

function rankearCandidatos(texto: string, opcoes: OpcaoCatalogo[], limite = 20): OpcaoCatalogo[] {
  const nossos = new Set(tokens(texto))
  return opcoes
    .map(o => {
      const deles = tokens(o.nome)
      const comuns = deles.filter(t => nossos.has(t)).length
      return { o, score: comuns / Math.max(1, new Set([...nossos, ...deles]).size) }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || a.o.nome.localeCompare(b.o.nome))
    .slice(0, limite)
    .map(x => x.o)
}

/**
 * Regras (determinísticas, nunca palpite):
 *  1. Igualdade após normalização, com exatamente uma opção igual → 'exato'.
 *  2. Opções cujos tokens estão TODOS contidos no nosso texto, que costuma
 *     ser mais detalhado. Se uma única tiver o maior número de tokens em
 *     comum → 'contido' (ex: nosso "Gol 1.0" ⊇ OLX "GOL"; nosso "Polo Track"
 *     escolhe "POLO TRACK" e não "POLO").
 *  3. Só com `aceitarMaisDetalhado` (marca): também o inverso — nosso texto
 *     todo contido na opção da OLX ("Chevrolet" ⊆ "GM - CHEVROLET") — e aí
 *     apenas se for a ÚNICA opção nessa situação. Para modelo isso seria
 *     palpite (nosso "Tiggo" ⊆ "TIGGO 2", "TIGGO 5X"... qual?).
 *  Empate, nada contido ou várias iguais → { ok:false, candidatos }.
 */
export function casarNivel(texto: string, opcoes: OpcaoCatalogo[], aceitarMaisDetalhado = false): ResultadoNivel {
  const alvo = normalizarTexto(texto)
  if (!alvo) return { ok: false, candidatos: opcoes.slice(0, 20) }

  const iguais = opcoes.filter(o => normalizarTexto(o.nome) === alvo)
  if (iguais.length === 1) return { ok: true, id: iguais[0].id, nome: iguais[0].nome, criterio: 'exato' }
  if (iguais.length > 1) return { ok: false, candidatos: iguais }

  const nossos = tokens(texto)
  const comTokens = opcoes.map(o => ({ o, deles: tokens(o.nome) }))

  const contidos = comTokens
    .filter(({ deles }) => contemTodos(nossos, deles))
    .map(({ o, deles }) => ({ o, comuns: deles.length }))
    .sort((a, b) => b.comuns - a.comuns)

  if (contidos.length === 1 || (contidos.length > 1 && contidos[0].comuns > contidos[1].comuns)) {
    const { o } = contidos[0]
    return { ok: true, id: o.id, nome: o.nome, criterio: 'contido' }
  }
  if (contidos.length > 1) {
    return { ok: false, candidatos: contidos.filter(c => c.comuns === contidos[0].comuns).map(c => c.o) }
  }

  if (aceitarMaisDetalhado) {
    const maisDetalhados = comTokens.filter(({ deles }) => contemTodos(deles, nossos)).map(({ o }) => o)
    if (maisDetalhados.length === 1) {
      return { ok: true, id: maisDetalhados[0].id, nome: maisDetalhados[0].nome, criterio: 'contido' }
    }
    if (maisDetalhados.length > 1) return { ok: false, candidatos: maisDetalhados }
  }

  return { ok: false, candidatos: rankearCandidatos(texto, opcoes) }
}

/**
 * Versões na OLX costumam repetir o modelo no começo ("A1 SPORTBACK 1.4 ...").
 * Compara sem esse prefixo dos dois lados, e SÓ por igualdade: duas versões
 * que diferem por câmbio/portas são carros diferentes, então "contido" aqui
 * seria palpite.
 */
export function casarVersao(versao: string, modeloNome: string, opcoes: OpcaoCatalogo[]): ResultadoNivel {
  const prefixo = tokens(modeloNome)
  const semModelo = (s: string) => {
    const t = tokens(s)
    const comeca = prefixo.length > 0 && prefixo.every((p, i) => t[i] === p)
    return (comeca ? t.slice(prefixo.length) : t).join(' ')
  }

  const alvo = semModelo(versao)
  if (!alvo) return { ok: false, candidatos: opcoes.slice(0, 20) }

  const iguais = opcoes.filter(o => semModelo(o.nome) === alvo)
  if (iguais.length === 1) return { ok: true, id: iguais[0].id, nome: iguais[0].nome, criterio: 'exato' }
  if (iguais.length > 1) return { ok: false, candidatos: iguais }
  return { ok: false, candidatos: rankearCandidatos(versao, opcoes) }
}

/**
 * `regdate` da OLX: o próprio ano a partir de 1980; antes disso, faixas de 5
 * anos (1975 = "entre 1975 e 1980" … 1950 = "1950 ou anterior").
 * A doc não define a fronteira exata das faixas ("Entre 1975 e 1980" inclui
 * 1980?). Como de 1980 em diante vale o ano, 1975–1979 → "1975" etc.
 */
export function regdateOlx(ano: number | null | undefined): string | null {
  if (!ano || !Number.isInteger(ano) || ano < 1900) return null
  if (ano >= 1980) return String(ano)
  if (ano <= 1950) return '1950'
  return String(Math.floor(ano / 5) * 5)
}

// ── API pública ───────────────────────────────────────────────────────────

/** Lista um nível do catálogo (para a tela de vínculo manual). */
export async function listarCatalogoOlx(
  lojaId: string,
  nivel: { marcaId?: string; modeloId?: string } = {}
): Promise<{ ok: true; opcoes: OpcaoCatalogo[] } | { ok: false; erro: string }> {
  const token = await tokenDaLoja(lojaId)
  if (!token) return { ok: false, erro: 'Loja não conectada à OLX — conecte em Configurações > Integrações.' }
  if (nivel.modeloId && !nivel.marcaId) return { ok: false, erro: 'Informe a marca para listar as versões.' }

  const caminho = nivel.marcaId
    ? nivel.modeloId
      ? `/${encodeURIComponent(nivel.marcaId)}/${encodeURIComponent(nivel.modeloId)}`
      : `/${encodeURIComponent(nivel.marcaId)}`
    : ''
  try {
    const opcoes = await buscarNivel(caminho, token)
    return { ok: true, opcoes: [...opcoes].sort((a, b) => a.nome.localeCompare(b.nome)) }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro ao consultar o catálogo OLX.' }
  }
}

/**
 * Dados marca/modelo/versão/ano do veículo, devolve os ids da OLX quando a
 * correspondência é inequívoca. Qualquer nível sem correspondência volta
 * { ok:false, candidatos } e os níveis seguintes ficam null.
 */
export async function buscarIdsCatalogoOlx(
  lojaId: string,
  veiculo: { marca: string; modelo: string; versao: string | null; ano: number | null }
): Promise<ResultadoCatalogo> {
  const token = await tokenDaLoja(lojaId)
  if (!token) return { ok: false, erro: 'Loja não conectada à OLX — conecte em Configurações > Integrações.' }

  const regdate = regdateOlx(veiculo.ano)
  try {
    const marca = casarNivel(veiculo.marca, await buscarNivel('', token), true)
    if (!marca.ok) return { ok: true, marca, modelo: null, versao: null, ids: null, regdate }

    const modelo = casarNivel(veiculo.modelo, await buscarNivel(`/${encodeURIComponent(marca.id)}`, token))
    if (!modelo.ok) return { ok: true, marca, modelo, versao: null, ids: null, regdate }

    const versoes = await buscarNivel(`/${encodeURIComponent(marca.id)}/${encodeURIComponent(modelo.id)}`, token)
    const versao = veiculo.versao?.trim()
      ? casarVersao(veiculo.versao, modelo.nome, versoes)
      : { ok: false as const, candidatos: versoes.slice(0, 20) }

    return {
      ok: true,
      marca,
      modelo,
      versao,
      ids: versao.ok ? { vehicle_brand: marca.id, vehicle_model: modelo.id, vehicle_version: versao.id } : null,
      regdate,
    }
  } catch (err) {
    return { ok: false, erro: err instanceof Error ? err.message : 'Erro ao consultar o catálogo OLX.' }
  }
}
