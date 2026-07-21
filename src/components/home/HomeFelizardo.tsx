import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, CreditCard, Users, Award, CheckCircle, Handshake } from 'lucide-react'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import AnimatedSection from '@/components/ui/AnimatedSection'
import WaIcon from '@/components/ui/WaIcon'
import type { Loja, Veiculo } from '@/types'

interface Props {
  loja: Loja
  destaques: Veiculo[]
  waHref: string
  waDisplay: string
  sobreTexto: string
}

const PILARES = [
  { icon: ShieldCheck, texto: 'Veículos Revisados' },
  { icon: CreditCard, texto: 'Financiamento Facilitado' },
  { icon: Users, texto: 'Atendimento Personalizado' },
  { icon: Award, texto: 'Qualidade Assegurada' },
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

export default function HomeFelizardo({ loja, destaques, waHref, waDisplay, sobreTexto }: Props) {
  return (
    <div className="pt-[70px] bg-white">

      {/* ══════════════════════════════════════
          HERO — split 55/45, branco editorial
      ══════════════════════════════════════ */}
      <section
        className="bg-white overflow-hidden"
        style={{ minHeight: 'calc(100svh - 70px)' }}
      >
        <div
          className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] h-full"
          style={{ minHeight: 'inherit' }}
        >
          {/* Esquerda — conteúdo */}
          <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-16 xl:px-24 py-16 relative overflow-hidden">
            {/* Imagem de fundo no mobile (hidden no desktop onde a imagem fica à direita).
                É a primeira coisa visível no mobile, então priority. */}
            <div className="absolute inset-0 lg:hidden">
              <Image
                src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80"
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 lg:hidden bg-white/85" />

            <AnimatedSection className="relative z-10">
              <p
                className="text-xs font-bold uppercase mb-6"
                style={{ color: '#2E6BE6', letterSpacing: '0.25em' }}
              >
                FELIZARDO VEÍCULOS
              </p>

              <h1
                className="font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase leading-none mb-6"
                style={{ fontSize: 'clamp(2.5rem, 7vw, 7rem)', color: '#0D1B2A' }}
              >
                <span className="block">TRADIÇÃO</span>
                <span className="block" style={{ color: '#2E6BE6' }}>E INOVAÇÃO</span>
                <span className="block">QUE MOVEM</span>
                <span className="block">VOCÊ</span>
              </h1>

              <p
                className="text-lg leading-relaxed mb-8 max-w-sm"
                style={{ color: '#6B7280' }}
              >
                A Felizardo Veículos combina tradição familiar e inovação para oferecer a melhor experiência em seminovos de Patos e região.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <Link
                  href="/estoque"
                  className="inline-flex items-center justify-center px-7 py-3.5 rounded-full font-bold text-sm uppercase tracking-wider text-white hover:brightness-110 transition-all"
                  style={{ backgroundColor: '#2E6BE6' }}
                >
                  VER ESTOQUE
                </Link>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
                >
                  <WaIcon size={16} />
                  WHATSAPP
                </a>
              </div>

              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Fundada em 2025&nbsp;&nbsp;|&nbsp;&nbsp;100% Qualidade&nbsp;&nbsp;|&nbsp;&nbsp;Atendimento Personalizado
              </p>
            </AnimatedSection>
          </div>

          {/* Direita — imagem (só existe visualmente a partir de lg; sem priority de
              propósito, porque priority faz preload mesmo com a ancestral "hidden"
              no mobile — deixando padrão (lazy) ela só carrega quando a tela cruza
              o breakpoint lg e o elemento realmente fica visível) */}
          <div className="relative hidden lg:block">
            <Image
              src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=900&q=80"
              alt="Carro elegante Felizardo Veículos"
              fill
              sizes="45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          BARRA DE PILARES — fundo #F0F4FF
      ══════════════════════════════════════ */}
      <section
        style={{
          backgroundColor: '#F0F4FF',
          borderTop: '1px solid #E2E8F0',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#E2E8F0]">
            {PILARES.map(({ icon: Icon, texto }) => (
              <div
                key={texto}
                className="flex items-center gap-3 px-8 py-5 w-full md:w-auto justify-center"
              >
                <Icon className="w-5 h-5 shrink-0" style={{ color: '#2E6BE6' }} />
                <span className="font-semibold text-sm" style={{ color: '#374151' }}>
                  {texto}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          ESTOQUE — fundo branco editorial
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end mb-12">
            <div>
              <h2
                className="font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase leading-none mb-3"
                style={{ fontSize: 'clamp(3rem, 7vw, 7rem)', color: '#0D1B2A' }}
              >
                NOSSO{'\n'}ESTOQUE
              </h2>
              <div className="w-14 h-[3px]" style={{ backgroundColor: '#2E6BE6' }} />
            </div>
            <p className="text-[#6B7280] text-base leading-relaxed max-w-sm">
              Veículos selecionados com procedência garantida e qualidade comprovada. Cada unidade passa por nossa avaliação rigorosa.
            </p>
          </AnimatedSection>

          {destaques.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {destaques.map((v, i) => (
                <VeiculoCard key={v.id} veiculo={v} loja={loja} delay={i * 0.08} />
              ))}
            </div>
          ) : (
            <AnimatedSection>
              <div
                className="flex flex-col items-center justify-center py-20 rounded-xl border"
                style={{ borderColor: '#E2E8F0' }}
              >
                <p
                  className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase mb-2"
                  style={{ color: '#CBD5E0' }}
                >
                  EM BREVE
                </p>
                <p className="text-[#A0AEC0] text-sm">Novos veículos chegando ao estoque.</p>
              </div>
            </AnimatedSection>
          )}

          <AnimatedSection className="mt-10 text-center">
            <Link
              href="/estoque"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 font-bold text-sm uppercase tracking-wider transition-all hover:bg-[#2E6BE6] hover:text-white"
              style={{ borderColor: '#2E6BE6', color: '#2E6BE6' }}
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
          NOSSA HISTÓRIA — split fundo #F8F9FA
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Imagem esquerda */}
          <AnimatedSection>
            <div className="relative rounded-2xl overflow-hidden" style={{ height: '460px' }}>
              <Image
                src="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80"
                alt="Nossa história - Felizardo Veículos"
                fill
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </AnimatedSection>

          {/* Direita — texto */}
          <AnimatedSection delay={0.15} className="flex flex-col justify-center">
            <span
              className="inline-block text-xs font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-5 self-start text-white"
              style={{ backgroundColor: '#2E6BE6' }}
            >
              NOSSA HISTÓRIA
            </span>
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase leading-tight mb-5"
              style={{ fontSize: 'clamp(2rem, 5vw, 5rem)', color: '#0D1B2A' }}
            >
              UM LEGADO<br />DE FAMÍLIA
            </h2>
            <p className="text-[#6B7280] text-base leading-relaxed mb-8 max-w-lg">
              {sobreTexto}
            </p>
            <Link
              href="/sobre"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 text-sm font-bold uppercase tracking-wider transition-all hover:bg-[#2E6BE6] hover:text-white self-start"
              style={{ borderColor: '#2E6BE6', color: '#2E6BE6' }}
            >
              SAIBA MAIS
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          INTERIOR — imagem fullwidth
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection>
            <div className="relative rounded-2xl overflow-hidden" style={{ height: '500px' }}>
              <Image
                src="https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=1600&q=80"
                alt="Estrutura da Felizardo Veículos"
                fill
                loading="lazy"
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <p className="text-center text-sm mt-4" style={{ color: '#9CA3AF' }}>
              Nossa estrutura pensada para você
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DIFERENCIAIS — fundo #F0F4FF
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F0F4FF' }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase leading-tight mb-4"
              style={{ fontSize: 'clamp(2rem, 5vw, 5rem)', color: '#0D1B2A' }}
            >
              POR QUE ESCOLHER<br />A FELIZARDO?
            </h2>
            <p className="text-[#6B7280] text-base max-w-lg mx-auto">
              Tradição familiar e compromisso com cada cliente em cada negociação.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIFERENCIAIS.map(({ icon: Icon, titulo, desc }, i) => (
              <AnimatedSection key={titulo} delay={i * 0.08}>
                <div
                  className="bg-white rounded-2xl shadow-md p-6 h-full flex gap-5"
                  style={{ borderTop: '3px solid #2E6BE6' }}
                >
                  <div className="shrink-0">
                    <div
                      className="w-11 h-11 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: '#EEF2FF' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#2E6BE6' }} />
                    </div>
                  </div>
                  <div>
                    <h3
                      className="font-[family-name:var(--font-barlow-condensed)] text-lg font-extrabold uppercase mb-1.5"
                      style={{ color: '#0D1B2A' }}
                    >
                      {titulo}
                    </h3>
                    <p className="text-[#6B7280] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL — fundo #1B3A6B
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-28 px-5" style={{ backgroundColor: '#1B3A6B' }}>
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <h2
            className="font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase text-white leading-tight mb-4"
            style={{ fontSize: 'clamp(2.5rem, 6vw, 6rem)' }}
          >
            PRONTO PARA UMA<br />NOVA EXPERIÊNCIA?
          </h2>
          <p className="text-white/60 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Fale agora com nossa equipe. Atendimento rápido, transparente e sem enrolação.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-3 w-full sm:w-auto px-8 py-4 rounded-full bg-white font-bold text-sm uppercase tracking-wider hover:bg-white/90 transition-colors"
            style={{ color: '#1B3A6B' }}
          >
            <WaIcon size={18} />
            FALAR AGORA — {waDisplay}
          </a>
          {loja.endereco && (
            <p className="mt-6 text-white/30 text-xs uppercase tracking-[0.15em]">
              {loja.endereco}
            </p>
          )}
        </AnimatedSection>
      </section>
    </div>
  )
}
