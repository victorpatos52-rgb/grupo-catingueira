'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'
import { urlMiniatura } from '@/lib/storage-fotos'

// Mostra a MINIATURA ({base}.thumb.webp, ~30–60 KB) de uma foto do bucket em
// vez da foto cheia (~200–600 KB). Se a miniatura não existir (foto antiga,
// antes do scripts/fotos-recomprimir.mjs), cai automaticamente para a original
// — a imagem nunca quebra. URLs de fora do bucket são usadas como estão.
//
// `src` é sempre a URL da foto ORIGINAL (a que está no banco).
type Props = Omit<ImageProps, 'src' | 'onError'> & { src: string }

export default function ImagemMiniatura({ src, alt, ...resto }: Props) {
  const miniatura = urlMiniatura(src)
  const [usarOriginal, setUsarOriginal] = useState(false)
  // Se a foto mudar (ex.: reordenação da grade), volta a tentar a miniatura.
  const [srcAnterior, setSrcAnterior] = useState(src)
  if (srcAnterior !== src) {
    setSrcAnterior(src)
    setUsarOriginal(false)
  }

  return (
    <Image
      {...resto}
      alt={alt}
      src={usarOriginal || !miniatura ? src : miniatura}
      onError={() => {
        if (!usarOriginal && miniatura !== src) setUsarOriginal(true)
      }}
    />
  )
}
