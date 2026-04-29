import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLoja } from '@/lib/getLoja'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import AnimatedSection from '@/components/ui/AnimatedSection'
import type { Veiculo } from '@/types'
import { Clock, Users, ShieldCheck, CreditCard, Award, CheckCircle, Handshake } from 'lucide-react'

const WA_HREF =
  'https://wa.me/5583999671729?text=Olá! Vim pelo site e quero conhecer o estoque.'

function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const CONFIANCA = [
  { icon: Clock, texto: '30+ Anos de História' },
  { icon: Users, texto: '500+ Clientes Satisfeitos' },
  { icon: ShieldCheck, texto: '100% Procedência Garantida' },
  { icon: CreditCard, texto: 'Financiamento Facilitado' },
]

const HERO_STATS = [
  { valor: '30+', label: 'Anos de história' },
  { valor: '500+', label: 'Clientes satisfeitos' },
  { valor: '100%', label: 'Procedência garantida' },
]

const DIFERENCIAIS = [
  {
    icon: Award,
    titulo: 'Ampla Seleção',
    desc: 'Diversas marcas e modelos seminovos cuidadosamente selecionados para todos os perfis e bolsos.',
  },
  {
    icon: CheckCircle,
    titulo: 'Veículos Revisados',
    desc: 'Todos os veículos passam por avaliação técnica completa antes de entrar no nosso estoque.',
  },
  {
    icon: CreditCard,
    titulo: 'Financiamento Fácil',
    desc: 'Trabalhamos com os principais bancos do mercado. Aprovação rápida e condições especiais.',
  },
  {
    icon: Handshake,
    titulo: 'Condições Especiais',
    desc: 'Condições que fazem diferença no seu bolso. Venha negociar pessoalmente com nossa equipe.',
  },
]

export default async function HomePage() {
  const loja = await getLoja()
  const supabase = await createServerSupabase()

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

  return (
    <div className="pt-[70px]">

      {/* ══════════════════════════════════════
          SEÇÃO 1 — HERO
      ══════════════════════════════════════ */}
      <section className="bg-white py-14 md:py-20 px-5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Esquerda: texto */}
          <AnimatedSection>
            <span className="inline-block bg-[#F5C200] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-5">
              SUA REVENDA MULTIMARCAS EM PATOS E REGIÃO
            </span>
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-5xl md:text-6xl lg:text-7xl font-extrabold uppercase leading-tight text-[#1A1A1A] mb-5">
              ENCONTRE SEU
              <br />
              <span style={{ color: '#F5C200' }}>PRÓXIMO</span>
              <br />
              VEÍCULO
            </h1>
            <p className="text-[#666] text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              Mais de 30 anos realizando sonhos. Veículos seminovos selecionados com procedência,
              qualidade e atendimento que você merece.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/estoque"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg bg-[#F5C200] text-[#1A1A1A] font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
              >
                VER ESTOQUE
              </Link>
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
              >
                <WaIcon size={16} />
                FALAR NO WHATSAPP
              </a>
            </div>
          </AnimatedSection>

          {/* Direita: card amarelo com stats */}
          <AnimatedSection delay={0.15}>
            <div className="rounded-2xl p-8 md:p-10" style={{ backgroundColor: '#F5C200' }}>
              <p className="font-[family-name:var(--font-barlow-condensed)] text-sm font-extrabold uppercase tracking-[0.2em] text-[#1A1A1A]/60 mb-6">
                POR QUE NOS ESCOLHER
              </p>
              <div className="flex flex-col gap-6">
                {HERO_STATS.map(({ valor, label }, i) => (
                  <div
                    key={label}
                    className={`flex items-center gap-5 ${
                      i < HERO_STATS.length - 1 ? 'pb-6 border-b border-black/10' : ''
                    }`}
                  >
                    <span className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-extrabold text-[#1A1A1A] leading-none shrink-0">
                      {valor}
                    </span>
                    <span className="text-[#3D3D3D] font-medium text-base leading-snug">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 2 — BARRA DE CONFIANÇA
      ══════════════════════════════════════ */}
      <section style={{ backgroundColor: '#F5C200' }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-center divide-y md:divide-y-0 md:divide-x divide-black/15">
            {CONFIANCA.map(({ icon: Icon, texto }) => (
              <div
                key={texto}
                className="flex items-center gap-2.5 px-6 py-3.5 w-full md:w-auto justify-center"
              >
                <Icon className="w-4 h-4 text-[#1A1A1A] shrink-0" />
                <span className="font-semibold text-sm text-[#1A1A1A] whitespace-nowrap">
                  {texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — ESTOQUE EM DESTAQUE
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F8F8F8' }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="mb-10">
            <span className="inline-block bg-[#F5C200] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-4">
              SELEÇÃO ESPECIAL
            </span>
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-extrabold uppercase text-[#1A1A1A]">
              NOSSO ESTOQUE
            </h2>
            <p className="text-[#666] text-base mt-2 max-w-xl">
              Veículos selecionados com procedência garantida e qualidade comprovada.
            </p>
          </AnimatedSection>

          {destaques.length > 0 && loja ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {destaques.map((v, i) => (
                <VeiculoCard key={v.id} veiculo={v} loja={loja} delay={i * 0.08} />
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div className="flex flex-col items-center justify-center py-20 rounded-xl bg-white border border-[#E5E5E5]">
                <p className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase text-[#D0D0D0] mb-2">
                  EM BREVE
                </p>
                <p className="text-[#999] text-sm">Novos veículos chegando ao estoque.</p>
              </div>
            </AnimatedSection>
          )}

          <AnimatedSection className="mt-10 text-center">
            <Link
              href="/estoque"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border-2 border-[#3D3D3D] text-[#3D3D3D] text-sm font-bold uppercase tracking-wider hover:bg-[#F5C200] hover:border-[#F5C200] hover:text-[#1A1A1A] transition-all"
            >
              VER TODO O ESTOQUE
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 4 — POR QUE COMPRAR AQUI?
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-extrabold uppercase text-[#1A1A1A] mb-3">
              POR QUE COMPRAR AQUI?
            </h2>
            <p className="text-[#666] text-base max-w-lg mx-auto">
              Mais de 30 anos construindo confiança com cada cliente, uma negociação de cada vez.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIFERENCIAIS.map(({ icon: Icon, titulo, desc }, i) => (
              <AnimatedSection key={titulo} delay={i * 0.08}>
                <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 h-full flex gap-5">
                  <div className="shrink-0">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#F5C200' }}
                    >
                      <Icon className="w-5 h-5 text-[#1A1A1A]" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-[family-name:var(--font-barlow-condensed)] text-lg font-extrabold uppercase text-[#1A1A1A] mb-1.5">
                      {titulo}
                    </h3>
                    <p className="text-[#666] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 5 — SOBRE
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F8F8F8' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">

          <AnimatedSection className="flex flex-col justify-center">
            <span className="inline-block bg-[#F5C200] text-[#1A1A1A] text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded mb-5 self-start">
              QUEM SOMOS
            </span>
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-extrabold uppercase text-[#1A1A1A] leading-tight mb-5">
              CATINGUEIRA
              <br />
              MULTIMARCAS
            </h2>
            <p className="text-[#666] text-base leading-relaxed mb-8 max-w-lg">
              Empresa familiar com mais de 30 anos de história em Patos, no sertão da Paraíba. Somos
              referência em seminovos na região — transparência, qualidade e um atendimento que faz
              diferença na sua vida.
            </p>
            <Link
              href="/sobre"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-[#3D3D3D] text-[#3D3D3D] text-sm font-bold uppercase tracking-wider hover:bg-[#F5C200] hover:border-[#F5C200] hover:text-[#1A1A1A] transition-all self-start"
            >
              NOSSA HISTÓRIA
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </AnimatedSection>

          <AnimatedSection delay={0.12} className="flex">
            <div
              className="rounded-2xl p-8 md:p-10 w-full flex flex-col justify-between gap-8"
              style={{ backgroundColor: '#F5C200' }}
            >
              <p className="font-[family-name:var(--font-barlow-condensed)] text-2xl md:text-3xl font-extrabold uppercase text-[#1A1A1A] leading-snug">
                "Seu próximo carro pode estar aqui!"
              </p>
              <div>
                <p className="text-[#3D3D3D] text-sm font-medium mb-3">
                  Fale agora com nossa equipe. Atendimento rápido e sem enrolação.
                </p>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg bg-[#1A1A1A] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#3D3D3D] transition-colors"
                >
                  <WaIcon size={16} />
                  83 9 9967-1729
                </a>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 6 — CTA FINAL
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F5C200' }}>
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <h2 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-6xl font-extrabold uppercase text-[#1A1A1A] leading-tight mb-4">
            PRONTO PARA REALIZAR SEU SONHO?
          </h2>
          <p className="text-[#3D3D3D] text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Fale agora com nossa equipe. Atendimento rápido, transparente e sem enrolação.
          </p>
          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-[#1A1A1A] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#3D3D3D] transition-colors"
          >
            <WaIcon size={18} />
            FALAR AGORA — 83 9 9967-1729
          </a>
          <p className="mt-6 text-[#3D3D3D] text-xs uppercase tracking-[0.15em]">
            BR 230, KM 334 · São Sebastião · Patos/PB · Em frente ao Atacadão
          </p>
        </AnimatedSection>
      </section>
    </div>
  )
}
