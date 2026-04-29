import Link from 'next/link'
import { Award, CheckCircle, CreditCard, Handshake, MapPin, Clock } from 'lucide-react'
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

const NUMS = [
  { valor: '30+', label: 'Anos' },
  { valor: '500+', label: 'Clientes' },
  { valor: '100%', label: 'Procedência' },
  { valor: '5★', label: 'Avaliação' },
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

export default function HomeCatingueira({ loja, destaques, waHref, waDisplay }: Props) {
  const endereco = loja?.endereco ?? 'BR 230, KM 334 — São Sebastião, Patos - PB'
  const horarioLinhas = (loja?.horario ?? 'Seg a Sex: 8h às 18h | Sáb: 8h às 13h').split(' | ')

  return (
    <div className="pt-[70px]" style={{ backgroundColor: '#0A0A0A' }}>

      {/* ══════════════════════════════════════
          HERO — fullscreen escuro com imagem
      ══════════════════════════════════════ */}
      <section
        className="relative overflow-hidden flex items-center"
        style={{ minHeight: 'calc(100svh - 70px)' }}
      >
        {/* Borda esquerda amarela */}
        <div className="absolute left-0 top-0 h-full w-[3px] z-20" style={{ backgroundColor: '#F5C200' }} />

        {/* Imagem de fundo */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=1920&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Overlay */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: 'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.2) 100%)',
          }}
        />

        {/* Conteúdo principal */}
        <div className="relative z-10 max-w-7xl mx-auto px-8 lg:px-12 w-full py-20">
          <AnimatedSection className="max-w-2xl">
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase mb-6"
              style={{ color: '#F5C200', letterSpacing: '0.4em' }}
            >
              PATOS · PARAÍBA
            </p>

            <h1
              className="font-[family-name:var(--font-barlow-condensed)] font-black italic uppercase leading-none mb-6"
              style={{ fontSize: 'clamp(4rem, 10vw, 9rem)' }}
            >
              <span className="block text-white">HÁ 30 ANOS</span>
              <span className="block text-white">REALIZANDO</span>
              <span className="block" style={{ color: '#F5C200' }}>SONHOS</span>
            </h1>

            <p className="text-[#999] font-light text-base md:text-lg max-w-md mb-10">
              A revenda multimarcas de confiança do sertão da Paraíba. Veículos seminovos selecionados com procedência e qualidade comprovada.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/estoque"
                className="inline-flex items-center justify-center px-8 py-4 font-black text-sm uppercase tracking-wider transition-all hover:brightness-95"
                style={{ backgroundColor: '#F5C200', color: '#0A0A0A' }}
              >
                VER ESTOQUE →
              </Link>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white text-white font-black text-sm uppercase tracking-wider hover:bg-white/10 transition-all"
              >
                <WaIcon size={16} />
                WHATSAPP
              </a>
            </div>
          </AnimatedSection>
        </div>

        {/* Card de stats — canto inferior direito */}
        <div className="absolute bottom-8 right-6 lg:right-10 z-10">
          <AnimatedSection delay={0.3}>
            <div
              className="backdrop-blur-md border border-white/10 p-6 min-w-[220px]"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              {HERO_STATS.map(({ valor, label }, i) => (
                <div
                  key={label}
                  className={`flex items-center gap-4 ${i < HERO_STATS.length - 1 ? 'pb-4 mb-4 border-b border-white/10' : ''}`}
                >
                  <span
                    className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black text-white leading-none"
                  >
                    {valor}
                  </span>
                  <span className="text-white/60 text-xs uppercase tracking-wider">{label}</span>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          NÚMEROS — fundo amarelo
      ══════════════════════════════════════ */}
      <section style={{ backgroundColor: '#F5C200' }}>
        <div className="max-w-7xl mx-auto px-5">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {NUMS.map(({ valor, label }, i) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center py-8 px-4"
                style={{ borderRight: i < NUMS.length - 1 ? '1px solid rgba(0,0,0,0.1)' : 'none' }}
              >
                <span
                  className="font-[family-name:var(--font-barlow-condensed)] font-black italic leading-none text-black"
                  style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)' }}
                >
                  {valor}
                </span>
                <span className="text-black/60 text-xs font-bold uppercase tracking-widest mt-1">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          ESTOQUE — fundo #111111
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#111111' }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="mb-12">
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] font-black italic uppercase text-white leading-none mb-4"
              style={{ fontSize: 'clamp(3rem, 8vw, 7rem)' }}
            >
              NOSSO ESTOQUE
            </h2>
            <div className="w-16 h-[3px] mb-5" style={{ backgroundColor: '#F5C200' }} />
            <p className="text-[#666] text-base max-w-xl">
              Veículos seminovos selecionados com procedência garantida e qualidade comprovada.
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
              <div className="flex flex-col items-center justify-center py-20 border border-white/10">
                <p className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black italic uppercase text-white/20 mb-2">
                  EM BREVE
                </p>
                <p className="text-[#555] text-sm">Novos veículos chegando ao estoque.</p>
              </div>
            </AnimatedSection>
          )}

          <AnimatedSection className="mt-10 text-center">
            <Link
              href="/estoque"
              className="inline-flex items-center gap-2 px-8 py-4 border font-black text-sm uppercase tracking-wider hover:bg-[#F5C200] hover:text-black hover:border-[#F5C200] transition-all"
              style={{ borderColor: '#F5C200', color: '#F5C200' }}
            >
              VER TODO O ESTOQUE →
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ══════════════════════════════════════
          SPLIT — VISITE NOSSA LOJA
      ══════════════════════════════════════ */}
      <section style={{ backgroundColor: '#0A0A0A' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2">
          {/* Imagem esquerda — fullheight */}
          <div className="relative overflow-hidden" style={{ minHeight: '520px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1562519819-016930ada31b?w=800&q=80"
              alt="Interior da loja Catingueira Multimarcas"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Direita — conteúdo */}
          <div className="flex flex-col justify-center px-8 lg:px-12 py-16" style={{ backgroundColor: '#111111' }}>
            <AnimatedSection>
              <p
                className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase mb-4"
                style={{ color: '#F5C200', letterSpacing: '0.4em' }}
              >
                VENHA NOS VISITAR
              </p>
              <h2
                className="font-[family-name:var(--font-barlow-condensed)] font-black italic uppercase text-white leading-none mb-8"
                style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
              >
                ESTAMOS<br />ESPERANDO<br />VOCÊ
              </h2>
              <div className="space-y-5 mb-10">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#F5C200' }} />
                  <p className="text-[#999] text-sm leading-relaxed">{endereco}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#F5C200' }} />
                  <div>
                    {horarioLinhas.map((linha: string, i: number) => (
                      <p key={i} className="text-[#999] text-sm">{linha}</p>
                    ))}
                    <p className="text-[#555] text-xs mt-1">Dom: Fechado</p>
                  </div>
                </div>
              </div>
              <Link
                href="/localizacao"
                className="inline-flex items-center gap-2 px-6 py-3.5 font-black text-sm uppercase tracking-wider hover:brightness-95 transition-all self-start"
                style={{ backgroundColor: '#F5C200', color: '#0A0A0A' }}
              >
                COMO CHEGAR →
              </Link>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          DIFERENCIAIS — fundo amarelo
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-24 px-5" style={{ backgroundColor: '#F5C200' }}>
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="mb-12">
            <h2
              className="font-[family-name:var(--font-barlow-condensed)] font-black italic uppercase text-black leading-none"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 6rem)' }}
            >
              POR QUE COMPRAR AQUI?
            </h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {DIFERENCIAIS.map(({ icon: Icon, titulo, desc }, i) => (
              <AnimatedSection key={titulo} delay={i * 0.08}>
                <div
                  className="h-full flex gap-5 p-6"
                  style={{ backgroundColor: '#111111', borderLeft: '4px solid #F5C200' }}
                >
                  <div className="shrink-0">
                    <div
                      className="w-11 h-11 rounded flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(245,194,0,0.12)' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: '#F5C200' }} />
                    </div>
                  </div>
                  <div>
                    <h3
                      className="font-[family-name:var(--font-barlow-condensed)] text-lg font-black italic uppercase text-white mb-1.5"
                    >
                      {titulo}
                    </h3>
                    <p className="text-[#777] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FACHADA — imagem fullwidth com overlay
      ══════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ height: '500px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=1600&q=80"
          alt="Fachada Catingueira Multimarcas"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
          <h2
            className="font-[family-name:var(--font-barlow-condensed)] font-black italic uppercase text-white leading-none mb-4"
            style={{ fontSize: 'clamp(2rem, 6vw, 6rem)' }}
          >
            CATINGUEIRA<br />MULTIMARCAS
          </h2>
          <p className="text-white/50 text-sm uppercase tracking-[0.3em]">{endereco}</p>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA FINAL — fundo amarelo
      ══════════════════════════════════════ */}
      <section className="py-16 md:py-28 px-5" style={{ backgroundColor: '#F5C200' }}>
        <AnimatedSection className="max-w-3xl mx-auto text-center">
          <h2
            className="font-[family-name:var(--font-barlow-condensed)] font-black italic uppercase text-black leading-none mb-5"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 7rem)' }}
          >
            PRONTO PARA<br />REALIZAR SEU<br />SONHO?
          </h2>
          <p className="text-black/60 text-base md:text-lg mb-10 max-w-md mx-auto">
            Fale agora com nossa equipe. Atendimento rápido, transparente e sem enrolação.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-black text-white font-black text-sm uppercase tracking-wider hover:bg-[#1A1A1A] transition-colors"
          >
            <WaIcon size={18} />
            FALAR AGORA — {waDisplay}
          </a>
        </AnimatedSection>
      </section>
    </div>
  )
}
