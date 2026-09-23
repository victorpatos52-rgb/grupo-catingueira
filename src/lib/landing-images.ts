import type { Loja } from '@/types'

/** Usado quando a loja ainda não tem a imagem daquele slot configurada em /admin/configuracoes. */
export const PLACEHOLDER_LANDING_IMG = '/placeholder-landing.svg'

export interface SecaoImagemDef {
  chave: string
  label: string
}

// Chaves de `imagens_landing.secoes` usadas por cada Home hardcoded —
// fonte única tanto para os campos de upload em /admin/configuracoes
// quanto para as leituras em HomeCatingueira.tsx/HomeFelizardo.tsx. Mudar
// uma chave aqui exige atualizar o Home* correspondente também.
export const SECOES_CATINGUEIRA: SecaoImagemDef[] = [
  { chave: 'interior', label: 'Interior da loja (seção "Visite nossa loja")' },
  { chave: 'fachada', label: 'Fachada (seção final antes do CTA)' },
]

export const SECOES_FELIZARDO: SecaoImagemDef[] = [
  { chave: 'historia', label: 'Nossa história (seção split)' },
  { chave: 'interior', label: 'Interior/estrutura (seção fullwidth)' },
]

type LojaComImagens = Pick<Loja, 'imagens_landing'> | null | undefined

export function getHeroImage(loja: LojaComImagens): string {
  return loja?.imagens_landing?.hero || PLACEHOLDER_LANDING_IMG
}

export function getSecaoImage(loja: LojaComImagens, chave: string): string {
  return loja?.imagens_landing?.secoes?.[chave] || PLACEHOLDER_LANDING_IMG
}

/** Sem placeholder — a galeria é conteúdo opcional; a seção some inteira se vazia (ver Home*.tsx). */
export function getGaleriaImages(loja: LojaComImagens): string[] {
  return loja?.imagens_landing?.galeria ?? []
}
