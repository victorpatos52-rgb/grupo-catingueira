import Image, { type ImageProps } from 'next/image'

// SVGs locais (hoje só o placeholder de imagens_landing vazias) não passam
// pelo otimizador de imagem por padrão — unoptimized evita precisar
// habilitar dangerouslyAllowSVG em next.config só por causa do fallback.
export default function LandingImage(props: ImageProps) {
  const isSvg = typeof props.src === 'string' && props.src.endsWith('.svg')
  return <Image {...props} unoptimized={isSvg || props.unoptimized} />
}
