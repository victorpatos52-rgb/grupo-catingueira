import { createServerSupabase } from '@/lib/supabase-server'
import { getLoja } from '@/lib/getLoja'
import HomeCatingueira from '@/components/home/HomeCatingueira'
import HomeFelizardo from '@/components/home/HomeFelizardo'
import type { Veiculo } from '@/types'

function buildWaHref(num: string, text: string): string {
  const d = num.replace(/\D/g, '')
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

function formatWA(num: string): string {
  const d = num.replace(/\D/g, '')
  const local = d.length === 13 && d.startsWith('55') ? d.slice(2) : d
  if (local.length === 11) return `${local.slice(0, 2)} ${local[2]} ${local.slice(3, 7)}-${local.slice(7)}`
  return num
}

export default async function HomePage() {
  const loja = await getLoja()
  const supabase = await createServerSupabase()

  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum, 'Olá! Vim pelo site e quero conhecer o estoque.')
  const waDisplay = formatWA(waNum)

  let destaques: Veiculo[] = []
  if (loja) {
    const { data } = await supabase
      .from('veiculos')
      .select('*')
      .eq('loja_id', loja.id)
      .eq('status', 'disponivel')
      .eq('destaque', true)
      .limit(6)
    destaques = (data ?? []) as Veiculo[]
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

  return (
    <HomeCatingueira
      loja={loja!}
      destaques={destaques}
      waHref={waHref}
      waDisplay={waDisplay}
      sobreTexto={sobreTexto}
    />
  )
}
