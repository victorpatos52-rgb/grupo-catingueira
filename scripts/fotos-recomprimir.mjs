#!/usr/bin/env node
// ============================================================================
// Recomprime fotos antigas e gera miniaturas (.thumb.webp) no bucket
// veiculos-fotos. Rode na pasta do projeto (usa node_modules e .env.local).
//
//   node scripts/fotos-recomprimir.mjs                      → SIMULA (padrão; não grava nada)
//   node scripts/fotos-recomprimir.mjs --gravar             → executa
//   node scripts/fotos-recomprimir.mjs --loja <id>          → só uma loja
//   node scripts/fotos-recomprimir.mjs --limite 20          → só as N primeiras imagens
//   node scripts/fotos-recomprimir.mjs --desfazer <log.json> [--gravar]
//                                                           → volta as referências do log
//
// O que processa (só imagens REFERENCIADAS, do bucket veiculos-fotos):
//   - veiculos.fotos de veículos não excluídos;
//   - lojas.imagens_landing (capa, seções, galeria). Logo e favicon ficam de fora.
//
// Regras:
//   - Foto de veículo > 400 KB ou > 1600 px → nova versão 1600 px JPEG q80.
//   - Imagem de configuração > 700 KB ou > 2400 px → nova versão 2400 px JPEG q80.
//   - Todas: miniatura {base}.thumb.webp (640 px, WebP q72), se não existir.
//   - Nova versão vai para {base}.v2.jpg (NÃO sobrescreve: o original foi
//     enviado com cache de 1 ano, sobrescrever poderia continuar mostrando a
//     versão antiga). A referência no banco é trocada na mesma etapa.
//   - NÃO apaga os originais (ficam para o --desfazer).
//   - Idempotente: o que já tem .v2 e miniatura é pulado; .v2 já enviado numa
//     execução anterior é reaproveitado.
//   - Log JSON em scripts/logs/ com cada troca antigo → novo.
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

// ── Argumentos ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const GRAVAR = args.includes('--gravar')
const valorDe = nome => {
  const i = args.indexOf(nome)
  return i >= 0 ? args[i + 1] : undefined
}
const LOJA = valorDe('--loja')
const LIMITE = valorDe('--limite') ? Number(valorDe('--limite')) : Infinity
const DESFAZER = valorDe('--desfazer')

// ── .env.local ─────────────────────────────────────────────────────────────
const env = {}
for (const linha of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const BUCKET = 'veiculos-fotos'
const PREFIXO_PUBLICO = `/storage/v1/object/public/${BUCKET}/`
const HOST = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host
const KB = 1024
const kb = n => `${Math.round(n / KB)} KB`
const mb = n => `${(n / KB / KB).toFixed(1)} MB`

const REGRAS = {
  veiculo: { ladoMaximo: 1600, limiteBytes: 400 * KB },
  configuracao: { ladoMaximo: 2400, limiteBytes: 700 * KB },
}
const MINIATURA = { lado: 640, qualidade: 72 }
const QUALIDADE_JPEG = 80

// ── Caminhos (mesma regra de src/lib/storage-fotos.ts) ─────────────────────
const RE_EXTENSAO = /(\.v2)?\.(jpe?g|png|webp|gif)$/i
function caminhoDaUrl(url) {
  try {
    const u = new URL(url)
    if (u.host !== HOST || !u.pathname.startsWith(PREFIXO_PUBLICO)) return null
    const c = decodeURIComponent(u.pathname.slice(PREFIXO_PUBLICO.length))
    return c && !c.includes('..') ? c : null
  } catch {
    return null
  }
}
const urlPublica = caminho => supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl
const caminhoMiniatura = c => (RE_EXTENSAO.test(c) ? c.replace(RE_EXTENSAO, '.thumb.webp') : `${c}.thumb.webp`)
const caminhoV2 = c => (RE_EXTENSAO.test(c) ? c.replace(RE_EXTENSAO, '.v2.jpg') : `${c}.v2.jpg`)
const ehV2 = c => /\.v2\.jpg$/i.test(c)

// Lista (uma vez por pasta) o que existe no bucket, para pular o que já foi feito.
const cachePastas = new Map()
async function existe(caminho) {
  const pasta = caminho.includes('/') ? caminho.slice(0, caminho.lastIndexOf('/')) : ''
  if (!cachePastas.has(pasta)) {
    const nomes = new Map()
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await supabase.storage.from(BUCKET).list(pasta, { limit: 1000, offset })
      if (error) throw new Error(`list("${pasta}"): ${error.message}`)
      for (const item of data) if (item.id !== null) nomes.set(item.name, item.metadata?.size ?? 0)
      if (data.length < 1000) break
    }
    cachePastas.set(pasta, nomes)
  }
  return cachePastas.get(pasta).has(caminho.slice(caminho.lastIndexOf('/') + 1))
}
function marcarExistente(caminho) {
  const pasta = caminho.includes('/') ? caminho.slice(0, caminho.lastIndexOf('/')) : ''
  cachePastas.get(pasta)?.set(caminho.slice(caminho.lastIndexOf('/') + 1), 1)
}

async function baixar(caminho) {
  const { data, error } = await supabase.storage.from(BUCKET).download(caminho)
  if (error) throw new Error(`download ${caminho}: ${error.message}`)
  return Buffer.from(await data.arrayBuffer())
}

async function enviar(caminho, buffer, contentType) {
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, buffer, {
    contentType,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error && !/exists|duplicate/i.test(error.message)) throw new Error(`upload ${caminho}: ${error.message}`)
  marcarExistente(caminho)
}

// ── Leitura das referências ────────────────────────────────────────────────
async function lerTudo(tabela, colunas, filtro) {
  const linhas = []
  for (let de = 0; ; de += 1000) {
    let q = supabase.from(tabela).select(colunas).range(de, de + 999)
    if (filtro) q = filtro(q)
    const { data, error } = await q
    if (error) throw new Error(`${tabela}: ${error.message}`)
    linhas.push(...data)
    if (data.length < 1000) break
  }
  return linhas
}

function urlsDaLanding(imagens) {
  const urls = []
  if (!imagens || typeof imagens !== 'object') return urls
  if (imagens.hero) urls.push(imagens.hero)
  for (const v of Object.values(imagens.secoes ?? {})) if (v) urls.push(v)
  for (const v of imagens.galeria ?? []) if (v) urls.push(v)
  return urls
}

function trocarNaLanding(imagens, mapa) {
  const t = u => mapa.get(u) ?? u
  const novo = { ...imagens }
  if (novo.hero) novo.hero = t(novo.hero)
  if (novo.secoes) novo.secoes = Object.fromEntries(Object.entries(novo.secoes).map(([k, v]) => [k, v ? t(v) : v]))
  if (Array.isArray(novo.galeria)) novo.galeria = novo.galeria.map(v => (v ? t(v) : v))
  return novo
}

// ── Modo desfazer ──────────────────────────────────────────────────────────
async function desfazer(arquivoLog) {
  const log = JSON.parse(readFileSync(arquivoLog, 'utf8'))
  const volta = new Map(log.trocas.map(t => [t.depois, t.antes]))
  console.log(`${GRAVAR ? 'DESFAZENDO' : 'SIMULANDO desfazer'} ${volta.size} troca(s) do log ${arquivoLog}`)

  let veicAlterados = 0
  let lojasAlteradas = 0
  for (const v of await lerTudo('veiculos', 'id, fotos')) {
    const fotos = v.fotos ?? []
    const novas = fotos.map(u => volta.get(u) ?? u)
    if (novas.some((u, i) => u !== fotos[i])) {
      veicAlterados++
      if (GRAVAR) {
        const { error } = await supabase.from('veiculos').update({ fotos: novas }).eq('id', v.id)
        if (error) console.error(`  veículo ${v.id}: ${error.message}`)
      }
    }
  }
  for (const l of await lerTudo('lojas', 'id, imagens_landing')) {
    if (!l.imagens_landing) continue
    const nova = trocarNaLanding(l.imagens_landing, volta)
    if (JSON.stringify(nova) !== JSON.stringify(l.imagens_landing)) {
      lojasAlteradas++
      if (GRAVAR) {
        const { error } = await supabase.from('lojas').update({ imagens_landing: nova }).eq('id', l.id)
        if (error) console.error(`  loja ${l.id}: ${error.message}`)
      }
    }
  }
  console.log(`Veículos ${GRAVAR ? 'revertidos' : 'a reverter'}: ${veicAlterados}. Lojas: ${lojasAlteradas}.`)
  console.log('Os arquivos .v2.jpg e .thumb.webp continuam no bucket (não atrapalham).')
  if (!GRAVAR) console.log('Nada foi gravado. Repita com --gravar para aplicar.')
}

// ── Processamento ──────────────────────────────────────────────────────────
async function processarImagem(url, tipo) {
  const caminho = caminhoDaUrl(url)
  if (!caminho) return { url, pulada: 'fora do bucket' }
  if (caminho.endsWith('.thumb.webp')) return { url, pulada: 'já é miniatura' }
  const regra = REGRAS[tipo]
  const r = { url, caminho, tipo, novaUrl: null, bytesAntes: 0, bytesDepois: 0, miniatura: null, erro: null }

  const temV2Pronto = !ehV2(caminho) && (await existe(caminhoV2(caminho)))
  const temMiniatura = await existe(caminhoMiniatura(caminho))
  if ((ehV2(caminho) || temV2Pronto) && temMiniatura) {
    if (temV2Pronto) r.novaUrl = urlPublica(caminhoV2(caminho)) // só falta trocar a referência
    return r
  }

  const original = await baixar(caminho)
  r.bytesAntes = original.length
  const meta = await sharp(original).metadata()
  const lado = Math.max(meta.width ?? 0, meta.height ?? 0)

  // Nova versão, se precisar e ainda não existir.
  if (!ehV2(caminho)) {
    if (temV2Pronto) {
      r.novaUrl = urlPublica(caminhoV2(caminho))
    } else if (original.length > regra.limiteBytes || lado > regra.ladoMaximo) {
      const v2 = await sharp(original)
        .rotate()
        .resize({ width: regra.ladoMaximo, height: regra.ladoMaximo, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: QUALIDADE_JPEG, mozjpeg: true })
        .toBuffer()
      // Só vale a pena se ficar menor.
      if (v2.length < original.length) {
        r.bytesDepois = v2.length
        r.novaUrl = urlPublica(caminhoV2(caminho))
        if (GRAVAR) await enviar(caminhoV2(caminho), v2, 'image/jpeg')
      }
    }
  }

  if (!temMiniatura) {
    const mini = await sharp(original)
      .rotate()
      .resize({ width: MINIATURA.lado, height: MINIATURA.lado, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: MINIATURA.qualidade })
      .toBuffer()
    r.miniatura = mini.length
    if (GRAVAR) await enviar(caminhoMiniatura(caminho), mini, 'image/webp')
  }
  return r
}

async function principal() {
  if (DESFAZER) return desfazer(DESFAZER)

  console.log(`${GRAVAR ? '*** GRAVANDO ***' : 'SIMULAÇÃO (nada será gravado)'}${LOJA ? ` — loja ${LOJA}` : ''}${Number.isFinite(LIMITE) ? ` — limite ${LIMITE}` : ''}`)

  const veiculos = await lerTudo('veiculos', 'id, loja_id, fotos, excluido', q => {
    q = q.eq('excluido', false)
    return LOJA ? q.eq('loja_id', LOJA) : q
  })
  const lojas = await lerTudo('lojas', 'id, nome, imagens_landing', q => (LOJA ? q.eq('id', LOJA) : q))

  // Fila única de imagens (sem repetir URL).
  const fila = new Map()
  for (const v of veiculos) for (const u of v.fotos ?? []) if (u && !fila.has(u)) fila.set(u, 'veiculo')
  for (const l of lojas) for (const u of urlsDaLanding(l.imagens_landing)) if (u && !fila.has(u)) fila.set(u, 'configuracao')

  const itens = [...fila.entries()].slice(0, LIMITE)
  console.log(`Imagens referenciadas: ${fila.size} (processando ${itens.length})\n`)

  const resultados = []
  let i = 0
  for (const [url, tipo] of itens) {
    i++
    try {
      const r = await processarImagem(url, tipo)
      resultados.push(r)
      const partes = []
      if (r.pulada) partes.push(`pulada (${r.pulada})`)
      if (r.novaUrl && r.bytesDepois) partes.push(`v2 ${kb(r.bytesAntes)} → ${kb(r.bytesDepois)}`)
      else if (r.novaUrl) partes.push('v2 já existe — troca referência')
      if (r.miniatura) partes.push(`miniatura ${kb(r.miniatura)}`)
      if (!partes.length) partes.push('ok, nada a fazer')
      console.log(`[${i}/${itens.length}] ${tipo === 'veiculo' ? 'veículo' : 'config '} ${r.caminho ?? url}  ${partes.join(' | ')}`)
    } catch (err) {
      resultados.push({ url, tipo, erro: err.message })
      console.error(`[${i}/${itens.length}] ERRO ${url}: ${err.message}`)
    }
  }

  // Mapa antigo → novo e atualização das referências.
  const mapa = new Map(resultados.filter(r => r.novaUrl).map(r => [r.url, r.novaUrl]))
  const trocas = []
  for (const v of veiculos) {
    const fotos = v.fotos ?? []
    const novas = fotos.map(u => mapa.get(u) ?? u)
    if (novas.some((u, k) => u !== fotos[k])) {
      fotos.forEach((u, k) => u !== novas[k] && trocas.push({ tabela: 'veiculos', id: v.id, antes: u, depois: novas[k] }))
      if (GRAVAR) {
        const { error } = await supabase.from('veiculos').update({ fotos: novas }).eq('id', v.id)
        if (error) console.error(`  ERRO ao atualizar veículo ${v.id}: ${error.message}`)
      }
    }
  }
  for (const l of lojas) {
    if (!l.imagens_landing) continue
    const nova = trocarNaLanding(l.imagens_landing, mapa)
    if (JSON.stringify(nova) !== JSON.stringify(l.imagens_landing)) {
      for (const u of urlsDaLanding(l.imagens_landing)) if (mapa.has(u)) trocas.push({ tabela: 'lojas', id: l.id, antes: u, depois: mapa.get(u) })
      if (GRAVAR) {
        const { error } = await supabase.from('lojas').update({ imagens_landing: nova }).eq('id', l.id)
        if (error) console.error(`  ERRO ao atualizar loja ${l.id}: ${error.message}`)
      }
    }
  }

  // Resumo.
  const recomprimidas = resultados.filter(r => r.bytesDepois)
  const antes = recomprimidas.reduce((s, r) => s + r.bytesAntes, 0)
  const depois = recomprimidas.reduce((s, r) => s + r.bytesDepois, 0)
  const miniaturas = resultados.filter(r => r.miniatura)
  const erros = resultados.filter(r => r.erro)
  console.log('\n=== Resumo ===')
  console.log(`Recomprimidas (.v2.jpg): ${recomprimidas.length} — ${mb(antes)} → ${mb(depois)} (economia ${mb(antes - depois)})`)
  console.log(`Miniaturas a criar: ${miniaturas.length} — ${mb(miniaturas.reduce((s, r) => s + r.miniatura, 0))} no total`)
  console.log(`Referências trocadas: ${trocas.length} (veículos ${new Set(trocas.filter(t => t.tabela === 'veiculos').map(t => t.id)).size}, lojas ${new Set(trocas.filter(t => t.tabela === 'lojas').map(t => t.id)).size})`)
  console.log(`Erros: ${erros.length}`)

  if (GRAVAR) {
    mkdirSync(path.join(process.cwd(), 'scripts', 'logs'), { recursive: true })
    const arquivo = path.join('scripts', 'logs', `fotos-recomprimir-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
    writeFileSync(arquivo, JSON.stringify({ quando: new Date().toISOString(), loja: LOJA ?? null, trocas, erros }, null, 2))
    console.log(`\nLog: ${arquivo}`)
    console.log(`Para voltar as referências: node scripts/fotos-recomprimir.mjs --desfazer ${arquivo} --gravar`)
  } else {
    console.log('\nNada foi gravado. Repita com --gravar para aplicar.')
  }
}

principal().catch(err => {
  console.error('Falhou:', err)
  process.exit(1)
})
