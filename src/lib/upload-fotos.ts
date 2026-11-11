import { createClient } from '@/lib/supabase'
import { BUCKET_FOTOS, caminhoMiniatura } from '@/lib/storage-fotos'

// Só navegador (usa Image, canvas e XMLHttpRequest) — importar apenas de
// Client Components.
//
// Upload direto do navegador para o Storage (bucket público `veiculos-fotos`).
// Não passa por Server Action, então não há limite de body do Next/Vercel.
//
// Foto de câmera de celular tem 3–10 MB e 4000px+; enviada crua por rede
// móvel ela falhava ou demorava minutos. Aqui cada foto é reduzida no próprio
// aparelho (lado maior ≤ 1600px, JPEG 0.8 — em geral 200–500 KB) e enviada
// UMA POR VEZ, com progresso real de bytes.
//
// Caminhos (as policies de Storage da migration 021 dependem deles):
//   fotos de veículo:        {loja_id}/{arquivo}.jpg
//   imagens de Configurações: configuracoes/{loja_id}/...

const LADO_MAXIMO_PADRAO = 1600
/** Imagens de Configurações (capa/seções/galeria da home). */
const LADO_MAXIMO_CONFIGURACAO = 2400
const LADO_MINIATURA = 640
const QUALIDADE_MINIATURA = 0.72
const QUALIDADE_JPEG_PADRAO = 0.8
const TIMEOUT_UPLOAD_MS = 120_000
const MB = 1024 * 1024

export type OpcoesPreparo = {
  /** Lado maior em px depois de reduzir (padrão 1600). */
  ladoMaximo?: number
  /** Qualidade do JPEG, 0–1 (padrão 0.8). */
  qualidade?: number
}

export type ProgressoUpload = {
  /** 1-based: foto atual dentro do lote. */
  atual: number
  total: number
  etapa: 'preparando' | 'enviando'
  /** 0–100 do envio da foto atual (só na etapa 'enviando'). */
  percentual: number
}

export type ResultadoUpload = {
  urls: string[]
  erros: { arquivo: string; mensagem: string }[]
}

const MSG_SESSAO = 'sua sessão expirou — saia do sistema e entre novamente'

function ehAndroid(): boolean {
  return typeof navigator !== 'undefined' && /android/i.test(navigator.userAgent)
}

function tamanhoLegivel(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

function carregarImagem(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode'))
    }
    img.src = url
  })
}

/**
 * Reduz e converte para JPEG no navegador. <img> já aplica a rotação EXIF
 * (image-orientation: from-image é o padrão), então a foto em pé não sai
 * deitada; recodificar também descarta os metadados (inclusive GPS).
 *
 * Não usar para logo/favicon: transparência vira fundo branco.
 */
export async function prepararFoto(file: File, opcoes: OpcoesPreparo = {}): Promise<Blob> {
  const img = await decodificar(file)
  return redimensionar(img, opcoes.ladoMaximo ?? LADO_MAXIMO_PADRAO, 'image/jpeg', opcoes.qualidade ?? QUALIDADE_JPEG_PADRAO)
}

/**
 * Foto principal (JPEG, lado maior `ladoMaximo`) + miniatura (WebP, lado maior
 * 640px, qualidade 0.72 — em geral 30–60 KB), decodificando o arquivo UMA vez.
 * Miniatura null se o navegador não conseguir gerá-la (a foto principal sobe
 * mesmo assim; as telas caem para a original — ImagemMiniatura).
 */
export async function prepararFotoComMiniatura(
  file: File,
  opcoes: OpcoesPreparo = {}
): Promise<{ principal: Blob; miniatura: Blob | null }> {
  const img = await decodificar(file)
  const principal = await redimensionar(img, opcoes.ladoMaximo ?? LADO_MAXIMO_PADRAO, 'image/jpeg', opcoes.qualidade ?? QUALIDADE_JPEG_PADRAO)
  let miniatura: Blob | null = null
  try {
    miniatura = await redimensionar(img, LADO_MINIATURA, 'image/webp', QUALIDADE_MINIATURA)
    // Safari antigo ignora 'image/webp' no canvas e devolve PNG (pesado):
    // nesse caso a miniatura vai em JPEG (o nome continua .thumb.webp; o
    // navegador identifica o formato pelo conteúdo).
    if (miniatura.type !== 'image/webp') miniatura = await redimensionar(img, LADO_MINIATURA, 'image/jpeg', QUALIDADE_MINIATURA)
  } catch {
    miniatura = null
  }
  return { principal, miniatura }
}

async function decodificar(file: File): Promise<HTMLImageElement> {
  const ehHeic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  if (file.type && !file.type.startsWith('image/') && !ehHeic) {
    throw new Error('o arquivo não é uma imagem (use JPG, PNG ou WEBP)')
  }

  let img: HTMLImageElement
  try {
    img = await carregarImagem(file)
  } catch {
    if (ehHeic) {
      // Chrome/Android não decodifica HEIC; Safari (iPhone) decodifica e, com
      // accept="image/*", normalmente já entrega JPEG.
      throw new Error(
        ehAndroid()
          ? 'foto em formato HEIC (de iPhone) não abre no Android. Envie esta foto pelo próprio iPhone, ou peça a foto em JPG'
          : 'formato HEIC não suportado neste navegador. No iPhone, use Ajustes > Câmera > Formatos > "Mais Compatível", ou envie pelo Safari'
      )
    }
    if (file.size > 25 * MB) {
      throw new Error(`foto grande demais para este aparelho processar (${tamanhoLegivel(file.size)}). Tente uma foto menor ou envie pelo computador`)
    }
    throw new Error('não foi possível abrir esta imagem (arquivo corrompido ou formato não suportado)')
  }
  return img
}

async function redimensionar(img: HTMLImageElement, ladoMaximo: number, tipo: 'image/jpeg' | 'image/webp', qualidade: number): Promise<Blob> {
  const escala = Math.min(1, ladoMaximo / Math.max(img.naturalWidth, img.naturalHeight))
  const largura = Math.max(1, Math.round(img.naturalWidth * escala))
  const altura = Math.max(1, Math.round(img.naturalHeight * escala))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('o navegador não conseguiu processar a imagem (pouca memória?) — feche outros apps e tente de novo')
  ctx.imageSmoothingQuality = 'high'
  // Fundo branco: PNG com transparência viraria preto no JPEG.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, largura, altura)
  ctx.drawImage(img, 0, 0, largura, altura)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, tipo, qualidade))
  // Libera a memória do canvas já (celular com pouca RAM processando várias fotos).
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('o navegador não conseguiu converter a imagem — tente de novo')
  return blob
}

/** Traduz a resposta de erro do Storage em uma mensagem para quem está usando. */
function mensagemErroStorage(status: number, detalhe: string, tamanho: number): string {
  const d = detalhe.toLowerCase()
  if (status === 401 || /jwt|token|expired|unauthorized|invalid signature/.test(d)) return MSG_SESSAO
  if (/row-level security|row level security|violates.*policy/.test(d)) {
    return 'sem permissão para enviar fotos desta loja. Saia do sistema e entre novamente; se continuar, fale com o administrador'
  }
  if (status === 413 || /payload too large|maximum allowed size|too large/.test(d)) {
    return `a foto ficou maior que o limite do servidor (${tamanhoLegivel(tamanho)}) — avise o administrador`
  }
  if (status === 415 || /mime|content type|invalid_mime_type/.test(d)) return 'formato de arquivo não aceito pelo servidor'
  if (status === 403) return MSG_SESSAO
  return `o servidor recusou o envio (HTTP ${status}${detalhe ? `: ${detalhe}` : ''})`
}

/**
 * Envio via XHR (e não supabase-js) só para ter progresso de upload — o
 * endpoint e os headers são os mesmos que o supabase-js usa no `.upload()`.
 */
function enviarBlob(
  caminho: string,
  blob: Blob,
  token: string,
  onProgresso: (percentual: number) => void
): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const url = `${base}/storage/v1/object/${BUCKET_FOTOS}/${caminho.split('/').map(encodeURIComponent).join('/')}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', anonKey)
    xhr.setRequestHeader('Content-Type', blob.type || 'image/jpeg')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Cache-Control', 'max-age=31536000')
    xhr.timeout = TIMEOUT_UPLOAD_MS

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgresso(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      // Storage responde { statusCode, error, message } — repassa a mensagem real.
      let detalhe = ''
      try {
        const corpo = JSON.parse(xhr.responseText) as { message?: string; error?: string }
        detalhe = corpo.message || corpo.error || ''
      } catch {
        detalhe = xhr.responseText.slice(0, 200)
      }
      reject(new Error(mensagemErroStorage(xhr.status, detalhe, blob.size)))
    }
    xhr.onerror = () =>
      reject(new Error(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'sem internet no momento — conecte e tente de novo'
          : 'falha de conexão durante o envio — verifique a internet e tente de novo'
      ))
    xhr.ontimeout = () => reject(new Error('o envio demorou demais (conexão lenta) — tente de novo com wi-fi ou menos fotos por vez'))
    xhr.send(blob)
  })
}

function nomeAleatorio(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2)}`
}

/**
 * Prepara e envia arquivos um por vez para `${pasta}/{aleatorio}.jpg`.
 * Não para no primeiro erro: devolve as URLs que subiram e os erros por arquivo.
 */
async function enviarLote(
  pasta: string,
  arquivos: File[],
  opcoes: OpcoesPreparo,
  onProgresso: (p: ProgressoUpload) => void
): Promise<ResultadoUpload> {
  const resultado: ResultadoUpload = { urls: [], erros: [] }
  if (arquivos.length === 0) return resultado

  const supabase = createClient()
  // getSession() renova o access token se estiver vencido (refresh token
  // ainda válido); se nem isso der, a sessão acabou de verdade.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return {
      urls: [],
      erros: arquivos.map(f => ({ arquivo: f.name || 'foto', mensagem: MSG_SESSAO })),
    }
  }

  for (const [i, file] of arquivos.entries()) {
    const atual = i + 1
    try {
      onProgresso({ atual, total: arquivos.length, etapa: 'preparando', percentual: 0 })
      const { principal, miniatura } = await prepararFotoComMiniatura(file, opcoes)

      // Token lido a cada foto: um lote longo pode atravessar a renovação da sessão.
      const { data: { session: s } } = await supabase.auth.getSession()
      if (!s) throw new Error(MSG_SESSAO)

      // {base}.jpg + {base}.thumb.webp (mesmo nome-base — ver urlMiniatura).
      const base = `${pasta}/${nomeAleatorio()}`
      const caminho = `${base}.jpg`
      onProgresso({ atual, total: arquivos.length, etapa: 'enviando', percentual: 0 })
      await enviarBlob(caminho, principal, s.access_token, percentual =>
        onProgresso({ atual, total: arquivos.length, etapa: 'enviando', percentual })
      )
      // Miniatura: melhor esforço. Se falhar, a foto continua valendo e as
      // telas mostram a original no lugar (ImagemMiniatura).
      if (miniatura) {
        await enviarBlob(caminhoMiniatura(caminho), miniatura, s.access_token, () => {}).catch(err =>
          console.warn('[upload] miniatura não enviada:', err instanceof Error ? err.message : err)
        )
      }
      resultado.urls.push(supabase.storage.from(BUCKET_FOTOS).getPublicUrl(caminho).data.publicUrl)
    } catch (err) {
      resultado.erros.push({
        arquivo: file.name || `foto ${atual}`,
        mensagem: err instanceof Error ? err.message : 'erro desconhecido',
      })
    }
  }
  return resultado
}

/** Fotos de veículo: `{loja_id}/...`, lado maior 1600px. */
export function enviarFotosVeiculo(
  lojaId: string,
  arquivos: File[],
  onProgresso: (p: ProgressoUpload) => void
): Promise<ResultadoUpload> {
  return enviarLote(lojaId, arquivos, {}, onProgresso)
}

/**
 * Imagens da home (capa, seções, galeria) em /admin/configuracoes:
 * `configuracoes/{loja_id}/{subpasta}/...`, lado maior 2400px, JPEG 0.8, com
 * miniatura .thumb.webp igual às fotos de veículo.
 * Não usar para favicon/logo (precisam manter transparência).
 */
export function enviarImagensConfiguracao(
  lojaId: string,
  subpasta: string,
  arquivos: File[],
  opcoes: OpcoesPreparo = {},
  onProgresso: (p: ProgressoUpload) => void = () => {}
): Promise<ResultadoUpload> {
  const sub = subpasta.replace(/[^a-z0-9_-]/gi, '') || 'imagens'
  return enviarLote(
    `configuracoes/${lojaId}/${sub}`,
    arquivos,
    { ladoMaximo: LADO_MAXIMO_CONFIGURACAO, qualidade: QUALIDADE_JPEG_PADRAO, ...opcoes },
    onProgresso
  )
}

export function textoProgresso(p: ProgressoUpload | null): string {
  if (!p) return ''
  const prefixo = p.total > 1 ? `Foto ${p.atual}/${p.total}: ` : ''
  return p.etapa === 'preparando' ? `${prefixo}reduzindo...` : `${prefixo}enviando ${p.percentual}%`
}
