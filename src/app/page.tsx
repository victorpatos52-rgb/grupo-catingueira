import { publicSupabase } from '@/lib/supabase-server'
import { getLoja } from '@/lib/getLoja'
import HomeCatingueira from '@/components/home/HomeCatingueira'
import HomeFelizardo from '@/components/home/HomeFelizardo'
import { buildWaHref, formatWA } from '@/lib/whatsapp'
import { SELECT_VEICULO_PUBLICO, VIEW_VEICULOS_PUBLICOS, type VeiculoPublico } from '@/lib/veiculos-publicos'

export async function generateMetadata() {
  const loja = await getLoja()
  return {
    title: `${loja?.nome ?? 'Catingueira Multimarcas'} | Veículos Seminovos`,
    description: loja?.sobre ?? `Veículos seminovos em ${loja?.cidade ?? 'Patos'}, ${loja?.estado ?? 'PB'}.`,
  }
}

export default async function HomePage() {
  const loja = await getLoja()
  const supabase = publicSupabase()

  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum, 'Olá! Vim pelo site e quero conhecer o estoque.')
  const waDisplay = formatWA(waNum)

  // View pública: já filtra disponível / não-rascunho / não-excluído e só
  // expõe colunas seguras (ver src/lib/veiculos-publicos.ts).
  let destaques: VeiculoPublico[] = []
  if (loja) {
    const { data, error } = await supabase
      .from(VIEW_VEICULOS_PUBLICOS)
      .select(SELECT_VEICULO_PUBLICO)
      .eq('loja_id', loja.id)
      .eq('destaque', true)
      .order('created_at', { ascending: false })
      .limit(9)

    if (error) {
      console.error('[HomePage] erro ao buscar veículos em destaque:', error)
    }
    destaques = (data ?? []) as unknown as VeiculoPublico[]

    if (destaques.length === 0) {
      const { data: recentes, error: erroRecentes } = await supabase
        .from(VIEW_VEICULOS_PUBLICOS)
        .select(SELECT_VEICULO_PUBLICO)
        .eq('loja_id', loja.id)
        .order('created_at', { ascending: false })
        .limit(9)

      if (erroRecentes) {
        console.error('[HomePage] erro ao buscar veículos recentes (fallback de destaques):', erroRecentes)
      }
      destaques = (recentes ?? []) as unknown as VeiculoPublico[]
    }
  }

  const isFelizardo = (loja?.nome ?? '').toLowerCase().includes('felizardo')

  const sobreTexto = loja?.sobre ?? (isFelizardo
    ? 'A Felizardo Veículos nasce em 2025 como um marco na continuidade de uma história familiar construída com paixão pelo setor automotivo. Fundada por Felipe Catingueira, a loja surge como uma homenagem ao seu pai, Felizardo, que dedicou sua vida ao mercado de veículos, deixando um legado de trabalho, honestidade e confiança.'
    : 'Empresa familiar com mais de 30 anos de história em Patos, no sertão da Paraíba. Somos referência em seminovos na região — transparência, qualidade e um atendimento que faz diferença na sua vida.')

  if (isFelizardo && loja) {
    return (
      <HomeFelizardo
        loja={loja}
        destaques={destaques}
        waHref={waHref}
        waDisplay={waDisplay}
        sobreTexto={sobreTexto}
      />
    )
  }

  if (!loja) return null

  return (
    <HomeCatingueira
      loja={loja}
      destaques={destaques}
      waHref={waHref}
      waDisplay={waDisplay}
      sobreTexto={sobreTexto}
    />
  )
}
