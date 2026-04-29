import Link from 'next/link'
import { ShieldCheck, CreditCard, Users, Award, CheckCircle, Handshake } from 'lucide-react'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import AnimatedSection from '@/components/ui/AnimatedSection'
import type { Loja, Veiculo } from '@/types'

interface Props {
  loja: Loja
  destaques: Veiculo[]
  waHref: string
  waDisplay: string
  sobreTexto: string
}

function WaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

const STATS = [
  { valor: '2025', label: 'Fundada em' },
  { valor: '100%', label: 'Qualidade garantida' },
  { valor: 'Nova', label: 'Geração' },
]

const CONFIANCA = [
  { icon: ShieldCheck, texto: 'Veículos Revisados' },
  { icon: CreditCard, texto: 'Financiamento Facilitado' },
  { icon: Users, texto: 'Atendimento Personalizado' },
  { icon: Award, texto: 'Qualidade Garantida' },
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
    <div className="pt-[70px]">

      {/* ══════════════════════════════════════
          SEÇÃO 1 — HERO
          Fundo branco, altura 100svh
      ══════════════════════════════════════ */}
      <section
        className="bg-white px-5 flex items-center"
        style={{ minHeight: 'calc(100svh - 70px)' }}
      >
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 py-16 md:py-20">

          {/* Esquerda */}
          <AnimatedSection className="flex flex-col justify-center">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-6 self-start"
              style={{ backgroundColor: '#EEF2FF', color: '#2E6BE6' }}
            >
              NOVA GERAÇÃO DE SEMINOVOS EM PATOS
            </span>

            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-6xl md:text-8xl font-extrabold uppercase leading-none mb-6">
              <span style={{ color: '#2E6BE6' }}>FELIZARDO</span>
              <br />
              <span style={{ color: '#0D1B2A' }}>VEÍCULOS</span>
            </h1>

            <p className="text-[#4A5568] text-base md:text-lg leading-relaxed mb-8 max-w-lg">
              A Felizardo Veículos transforma a experiência de compra em algo mais leve, seguro e especial. Tradição familiar e inovação em cada negociação.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/estoque"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg text-white font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all"
                style={{ backgroundColor: '#2E6BE6' }}
              >
                VER ESTOQUE
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
              >
                <WaIcon size={16} />
                WHATSAPP
              </a>
            </div>
          </AnimatedSection>

          {/* Direita: card stats */}
          <AnimatedSection delay={0.15} className="flex items-center">
            <div
              className="w-full rounded-2xl p-8 md:p-10 border-2"
              style={{ backgroundColor: '#F0F4FF', borderColor: '#2E6BE6', borderRadius: '16px' }}
            >
              <p
                className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.25em] mb-8"
                style={{ color: '#2E6BE6' }}
              >
                POR QUE NOS ESCOLHER
              </p>
              <div className="flex flex-col gap-7">
                {STATS.map(({ valor, label }, i) => (
                  <div
                    key={label}
                    className={`flex items-center gap-5 ${i < STATS.length - 1 ? 'pb-7 border-b border-[#2E6BE6]/20' : ''}`}
                  >
                    <span
                      className="font-[family-name:var(--font-barlow-condensed)] text-6xl font-extrabold leading-none shrink-0"
                      style={{ color: '#2E6BE6' }}
                    >
                      {valor}
                    </span>
                    <span className="font-medium text-base leading-snug" style={{ color: '#0D1B2A' }}>
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
          Fundo #2E6BE6, texto branco
      ══════════════════════════════════════ */}
      <section style={{ backgroundColor: '#2E6BE6' }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="flex flex-col md:flex-row items-center justify-center divide-y md:divide-y-0 md:divide-x divide-white/20">
            {CONFIANCA.map(({ icon: Icon, texto }) => (
              <div
                key={texto}
                className="flex items-center gap-2.5 px-6 py-4 w-full md:w-auto justify-center"
              >
                <Icon className="w-4 h-4 text-white shrink-0" />
                <span className="font-semibold text-sm text-white whitespace-nowrap">{texto}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 3 — ESTOQUE
          Fundo #F8F9FA claro
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="mb-10">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4 text-white"
              style={{ backgroundColor: '#2E6BE6' }}
            >
              SELEÇÃO ESPECIAL
            </span>
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-extrabold uppercase"
              style={{ color: '#0D1B2A' }}
            >
              NOSSO ESTOQUE
            </h2>
            <p className="text-[#4A5568] text-base mt-2 max-w-xl">
              Veículos selecionados com procedência garantida e qualidade comprovada.
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
              <div className="flex flex-col items-center justify-center py-20 rounded-xl bg-white border border-[#E2E8F0]">
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
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg border-2 font-bold text-sm uppercase tracking-wider transition-all hover:bg-[#2E6BE6] hover:text-white"
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
          SEÇÃO 4 — SOBRE
          Fundo #F0F4FF (azul bem claro)
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F0F4FF' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-stretch">

          <AnimatedSection className="flex flex-col justify-center">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-5 self-start text-white"
              style={{ backgroundColor: '#2E6BE6' }}
            >
              QUEM SOMOS
            </span>
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-extrabold uppercase leading-tight mb-5"
              style={{ color: '#0D1B2A' }}
            >
              FELIZARDO
              <br />
              VEÍCULOS
            </h2>
            <p className="text-[#4A5568] text-base leading-relaxed mb-8 max-w-lg">
              {sobreTexto}
            </p>
            <Link
              href="/sobre"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border-2 text-sm font-bold uppercase tracking-wider transition-all hover:bg-[#2E6BE6] hover:text-white self-start"
              style={{ borderColor: '#2E6BE6', color: '#2E6BE6' }}
            >
              NOSSA HISTÓRIA
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </AnimatedSection>

          <AnimatedSection delay={0.12} className="flex">
            <div
              className="bg-white rounded-2xl shadow-lg p-8 md:p-10 w-full flex flex-col justify-between gap-8"
              style={{ borderTop: '4px solid #2E6BE6' }}
            >
              <p
                className="font-[family-name:var(--font-barlow-condensed)] text-2xl md:text-3xl font-extrabold uppercase leading-snug"
                style={{ color: '#0D1B2A' }}
              >
                "Tradição e inovação em cada negociação!"
              </p>
              <div>
                <p className="text-[#4A5568] text-sm font-medium mb-4">
                  Fale agora com nossa equipe. Atendimento rápido e sem enrolação.
                </p>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
                >
                  <WaIcon size={16} />
                  {waDisplay}
                </a>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 5 — DIFERENCIAIS
          Fundo #FFFFFF branco
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-extrabold uppercase mb-3"
              style={{ color: '#0D1B2A' }}
            >
              POR QUE COMPRAR AQUI?
            </h2>
            <p className="text-[#4A5568] text-base max-w-lg mx-auto">
              Tradição familiar e compromisso com cada cliente em cada negociação.
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIFERENCIAIS.map(({ icon: Icon, titulo, desc }, i) => (
              <AnimatedSection key={titulo} delay={i * 0.08}>
                <div
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 p-6 h-full flex gap-5"
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
                    <p className="text-[#4A5568] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SEÇÃO 6 — CTA FINAL
          Fundo #1B3A6B (azul escuro)
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#1B3A6B' }}>
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <h2 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-6xl font-extrabold uppercase text-white leading-tight mb-4">
            PRONTO PARA REALIZAR SEU SONHO?
          </h2>
          <p className="text-white/70 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
            Fale agora com nossa equipe. Atendimento rápido, transparente e sem enrolação.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-lg bg-white font-bold text-sm uppercase tracking-wider hover:bg-white/90 transition-colors"
            style={{ color: '#1B3A6B' }}
          >
            <WaIcon size={18} />
            FALAR AGORA — {waDisplay}
          </a>
          {loja.endereco && (
            <p className="mt-6 text-white/40 text-xs uppercase tracking-[0.15em]">
              {loja.endereco}
            </p>
          )}
        </AnimatedSection>
      </section>
    </div>
  )
}
