import { createClient } from '@/lib/supabase'

// Só navegador (usa Image, canvas e XMLHttpRequest) — importar apenas de
// Client Components.
//
// Upload de fotos de veículo direto do navegador para o Storage
// (bucket público `veiculos-fotos`, caminho `${lojaId}/...`).
//
// Foto de câmera de celular tem 3–10 MB e 4000px+; enviada crua por rede
// móvel ela falhava ou demorava minutos — no Storage só existiam JPEGs de
// ~100 KB (fotos já comprimidas, vindas de WhatsApp/computador). Aqui cada
// foto é reduzida no próprio aparelho (lado maior ≤ 1600px, JPEG 0.8 — em
// geral 200–500 KB) e enviada UMA POR VEZ, com progresso real de bytes.

const BUCKET = 'veiculos-fotos'
const LADO_MAXIMO = 1600
const QUALIDADE_JPEG = 0.8
const TIMEOUT_UPLOAD_MS = 120_000

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
 */
export async function prepararFoto(file: File): Promise<Blob> {
  const ehHeic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  if (file.type && !file.type.startsWith('image/') && !ehHeic) {
    throw new Error('o arquivo não é uma imagem')
  }

  let img: HTMLImageElement
  try {
    img = await carregarImagem(file)
  } catch {
    // Chrome/Android não decodifica HEIC; Safari (iPhone) decodifica e, com
    // accept="image/*", normalmente já entrega JPEG.
    throw new Error(
      ehHeic
        ? 'formato HEIC não suportado neste navegador. No iPhone, use Ajustes > Câmera > Formatos > "Mais Compatível", ou envie pelo Safari'
        : 'não foi possível ler esta imagem'
    )
  }

  const escala = Math.min(1, LADO_MAXIMO / Math.max(img.naturalWidth, img.naturalHeight))
  const largura = Math.max(1, Math.round(img.naturalWidth * escala))
  const altura = Math.max(1, Math.round(img.naturalHeight * escala))

  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('o navegador não conseguiu processar a imagem')
  ctx.imageSmoothingQuality = 'high'
  // Fundo branco: PNG com transparência viraria preto no JPEG.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, largura, altura)
  ctx.drawImage(img, 0, 0, largura, altura)

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', QUALIDADE_JPEG))
  // Libera a memória do canvas já (celular com pouca RAM processando várias fotos).
  canvas.width = 0
  canvas.height = 0
  if (!blob) throw new Error('o navegador não conseguiu converter a imagem')
  return blob
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
  const url = `${base}/storage/v1/object/${BUCKET}/${caminho.split('/').map(encodeURIComponent).join('/')}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', anonKey)
    xhr.setRequestHeader('Content-Type', 'image/jpeg')
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
      reject(new Error(`o servidor recusou o envio (HTTP ${xhr.status}${detalhe ? `: ${detalhe}` : ''})`))
    }
    xhr.onerror = () => reject(new Error('falha de conexão durante o envio — verifique a internet e tente de novo'))
    xhr.ontimeout = () => reject(new Error('o envio demorou demais (conexão lenta) — tente de novo com wi-fi ou menos fotos por vez'))
    xhr.send(blob)
  })
}

/**
 * Prepara e envia as fotos uma por vez. Não para no primeiro erro: devolve as
 * URLs que subiram e a lista de erros por arquivo para mostrar na tela.
 */
export async function enviarFotosVeiculo(
  lojaId: string,
  arquivos: File[],
  onProgresso: (p: ProgressoUpload) => void
): Promise<ResultadoUpload> {
  const resultado: ResultadoUpload = { urls: [], erros: [] }
  if (arquivos.length === 0) return resultado

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return {
      urls: [],
      erros: arquivos.map(f => ({ arquivo: f.name, mensagem: 'sessão expirada — atualize a página e entre de novo' })),
    }
  }

  for (const [i, file] of arquivos.entries()) {
    const atual = i + 1
    try {
      onProgresso({ atual, total: arquivos.length, etapa: 'preparando', percentual: 0 })
      const blob = await prepararFoto(file)

      // Token lido a cada foto: um lote longo pode atravessar a renovação da sessão.
      const { data: { session: s } } = await supabase.auth.getSession()
      const token = s?.access_token ?? session.access_token

      const caminho = `${lojaId}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`
      onProgresso({ atual, total: arquivos.length, etapa: 'enviando', percentual: 0 })
      await enviarBlob(caminho, blob, token, percentual =>
        onProgresso({ atual, total: arquivos.length, etapa: 'enviando', percentual })
      )
      resultado.urls.push(supabase.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl)
    } catch (err) {
      resultado.erros.push({
        arquivo: file.name || `foto ${atual}`,
        mensagem: err instanceof Error ? err.message : 'erro desconhecido',
      })
    }
  }
  return resultado
}

export function textoProgresso(p: ProgressoUpload | null): string {
  if (!p) return ''
  const prefixo = p.total > 1 ? `Foto ${p.atual}/${p.total}: ` : ''
  return p.etapa === 'preparando' ? `${prefixo}reduzindo...` : `${prefixo}enviando ${p.percentual}%`
}
