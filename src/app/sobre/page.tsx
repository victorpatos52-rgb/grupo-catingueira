import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, FileCheck, CreditCard, HeartHandshake, CheckCircle } from 'lucide-react'
import AnimatedSection from '@/components/ui/AnimatedSection'
import { getLoja } from '@/lib/getLoja'

function WaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

function buildWaHref(num: string, text: string): string {
  const d = num.replace(/\D/g, '')
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`
}

const DIFERENCIAIS = [
  {
    icon: ShieldCheck,
    titulo: 'Inspeção Rigorosa',
    desc: 'Todos os veículos passam por avaliação técnica completa antes de entrar no estoque.',
  },
  {
    icon: FileCheck,
    titulo: 'Documentação OK',
    desc: 'Laudo cautelar e documentação revisada. Você compra com total segurança jurídica.',
  },
  {
    icon: CreditCard,
    titulo: 'Financiamento Fácil',
    desc: 'Trabalhamos com os principais bancos do mercado para as melhores condições.',
  },
  {
    icon: HeartHandshake,
    titulo: 'Pós-venda Garantido',
    desc: 'Nosso compromisso não termina na compra. Suporte completo após a venda.',
  },
]

export async function generateMetadata(): Promise<Metadata> {
  const loja = await getLoja()
  const isFelizardo = (loja?.nome ?? '').toLowerCase().includes('felizardo')
  return {
    title: isFelizardo
      ? 'Sobre a Felizardo Veículos — Quem Somos'
      : 'Sobre a Catingueira Multimarcas — Quem Somos',
    description: isFelizardo
      ? 'Conheça a história da Felizardo Veículos, fundada por Felipe Catingueira em homenagem ao seu pai Felizardo.'
      : 'Mais de 30 anos realizando sonhos no sertão da Paraíba. Conheça a história, missão e valores da Catingueira Multimarcas.',
  }
}

export default async function SobrePage() {
  const loja = await getLoja()
  const isFelizardo = (loja?.nome ?? '').toLowerCase().includes('felizardo')
  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum, 'Olá! Vim pelo site e gostaria de mais informações.')

  const nomeParts = (loja?.nome ?? 'Catingueira Multimarcas').split(' ')
  const nomeDisplay = loja?.nome ?? 'Catingueira Multimarcas'

  const sobreParas = isFelizardo
    ? [
        'A Felizardo Veículos nasce em 2025 como um marco na continuidade de uma história familiar construída com paixão pelo setor automotivo. Fundada por Felipe Catingueira, a loja surge como uma homenagem ao seu pai, Felizardo, que dedicou sua vida ao mercado de veículos, deixando um legado de trabalho, honestidade e confiança.',
        'Cada veículo que entra no estoque passa por um criterioso processo de seleção e inspeção, garantindo mais segurança em cada negociação.',
        'Acreditamos que adquirir um carro é uma das decisões mais importantes da vida das pessoas. Por isso, trabalhamos para que cada cliente saia satisfeito, com o veículo certo e a tranquilidade de ter feito um bom negócio.',
      ]
    : [
        'A Catingueira Multimarcas é uma empresa familiar com mais de 30 anos de história, localizada em Patos, no sertão da Paraíba. Desde a sua fundação, a empresa se dedica a oferecer veículos seminovos de qualidade, aliando um atendimento transparente, próximo e acolhedor.',
        'Ao longo dos anos, construiu uma trajetória baseada na confiança, consolidando-se como uma das referências no mercado local. Cada veículo passa por um processo criterioso de seleção e inspeção, garantindo mais segurança em cada negociação.',
        'Acreditamos que adquirir um carro é uma das decisões mais importantes da vida das pessoas. Por isso, trabalhamos para que cada cliente saia satisfeito, com o veículo certo e a tranquilidade de ter feito um bom negócio.',
      ]

  const heroStats = isFelizardo
    ? [
        { numero: '2025', label: 'Fundada em' },
        { numero: '100%', label: 'Qualidade garantida' },
        { numero: 'Nova', label: 'Geração' },
      ]
    : [
        { numero: '+30', label: 'Anos de história' },
        { numero: '+5.000', label: 'Clientes atendidos' },
        { numero: '100%', label: 'Compromisso com o cliente' },
      ]

  const MVV = [
    {
      titulo: 'MISSÃO',
      texto: loja?.missao ?? (
        isFelizardo
          ? 'Proporcionar aos clientes veículos seminovos de alta qualidade, com transparência e atendimento diferenciado, mantendo vivo o legado de confiança e credibilidade iniciado por Felizardo.'
          : 'Proporcionar aos nossos clientes a realização de sonhos, oferecendo veículos seminovos de qualidade, com transparência e excelência no atendimento.'
      ),
    },
    {
      titulo: 'VISÃO',
      texto: loja?.visao ?? (
        isFelizardo
          ? 'Ser referência no segmento de veículos em Patos e região, destacando-se pela inovação, confiança e pela capacidade de unir tradição e modernidade.'
          : 'Ser a primeira escolha dos clientes que desejam adquirir um veículo seminovo, sendo referência em qualidade, confiança e atendimento diferenciado.'
      ),
    },
    {
      titulo: 'VALORES',
      lista: isFelizardo
        ? ['Tradição', 'Transparência', 'Inovação', 'Compromisso', 'Respeito']
        : ['Credibilidade', 'Transparência', 'Qualidade', 'Honestidade'],
    },
  ]

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="pt-28 pb-12 px-4 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-4xl mx-auto">
          <p
            className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-3"
            style={{ color: 'var(--cor-primaria)' }}
          >
            {nomeDisplay.toUpperCase()}
          </p>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-6xl font-black uppercase text-[#1A1A1A] leading-none mb-2">
            SOBRE NÓS
          </h1>
          <div className="w-14 h-[3px] mt-3" style={{ backgroundColor: 'var(--cor-primaria)' }} />
          <p className="text-[#888] text-base md:text-lg mt-5 max-w-xl leading-relaxed">
            {isFelizardo
              ? 'Uma história familiar que nasceu em 2025 para continuar um legado.'
              : 'Mais de 30 anos realizando sonhos no sertão da Paraíba.'}
          </p>
        </div>
      </section>

      {/* ── História ── */}
      <section className="py-16 md:py-20 px-4 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <AnimatedSection>
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-3"
              style={{ color: 'var(--cor-primaria)' }}
            >
              NOSSA HISTÓRIA
            </p>
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl md:text-4xl font-black uppercase text-[#1A1A1A] mb-6">
              UMA TRAJETÓRIA DE CONFIANÇA
            </h2>
            <div className="space-y-4 text-[#555] text-sm leading-relaxed">
              {sobreParas.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div
              className="rounded-xl p-8 md:p-10 flex flex-col gap-6"
              style={{ backgroundColor: 'var(--cor-primaria)' }}
            >
              {heroStats.map(({ numero, label }, i) => (
                <div
                  key={label}
                  className={`border-b border-black/10 pb-6 last:border-0 last:pb-0`}
                >
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-black text-[#1A1A1A] leading-none">
                    {numero}
                  </p>
                  <p className="text-[#3D3D3D] text-sm font-semibold mt-1">{label}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── Missão / Visão / Valores ── */}
      <section className="py-16 md:py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-3"
              style={{ color: 'var(--cor-primaria)' }}
            >
              NOSSOS PRINCÍPIOS
            </p>
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl md:text-5xl font-black uppercase text-[#1A1A1A]">
              MISSÃO, VISÃO E VALORES
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MVV.map(({ titulo, texto, lista }, i) => (
              <AnimatedSection key={titulo} delay={i * 0.1}>
                <div
                  className="bg-white rounded-xl shadow-md p-7 h-full"
                  style={{ borderTop: '3px solid var(--cor-primaria)' }}
                >
                  <div
                    className="inline-block px-3 py-1 rounded mb-5 font-[family-name:var(--font-barlow-condensed)] text-xs font-black uppercase tracking-[0.2em] text-[#1A1A1A]"
                    style={{ backgroundColor: 'var(--cor-primaria)' }}
                  >
                    {titulo}
                  </div>
                  {texto && <p className="text-[#555] text-sm leading-relaxed">{texto}</p>}
                  {lista && (
                    <ul className="flex flex-col gap-2.5">
                      {lista.map(item => (
                        <li key={item} className="flex items-center gap-2.5">
                          <CheckCircle className="w-4 h-4 shrink-0" style={{ color: 'var(--cor-primaria)' }} />
                          <span className="text-[#555] text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diferenciais ── */}
      <section className="py-16 md:py-20 px-4 bg-[#F8F8F8]">
        <div className="max-w-7xl mx-auto">
          <AnimatedSection className="text-center mb-12">
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-3"
              style={{ color: 'var(--cor-primaria)' }}
            >
              POR QUE NOS ESCOLHER
            </p>
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl md:text-5xl font-black uppercase text-[#1A1A1A]">
              NOSSOS DIFERENCIAIS
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DIFERENCIAIS.map(({ icon: Icon, titulo, desc }, i) => (
              <AnimatedSection key={titulo} delay={i * 0.1}>
                <div className="bg-white rounded-xl shadow-md p-6 h-full hover:shadow-lg transition-shadow">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center mb-5"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--cor-primaria) 15%, transparent)' }}
                  >
                    <Icon className="w-5 h-5" style={{ color: 'var(--cor-primaria)' }} />
                  </div>
                  <h3 className="font-[family-name:var(--font-barlow-condensed)] text-base font-bold uppercase text-[#1A1A1A] mb-2 tracking-wide">
                    {titulo}
                  </h3>
                  <p className="text-[#888] text-xs leading-relaxed">{desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-20 px-4" style={{ backgroundColor: 'var(--cor-primaria)' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl md:text-5xl font-black uppercase text-[#1A1A1A] leading-tight mb-4">
            VENHA NOS CONHECER PESSOALMENTE
          </h2>
          <p className="text-[#3D3D3D] text-base mb-8">
            Nossa equipe está pronta para te receber e ajudar a encontrar o carro ideal.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-lg bg-[#25D366] text-white font-bold text-sm uppercase tracking-widest hover:brightness-95 transition-all"
            >
              <WaIcon size={18} />
              FALAR NO WHATSAPP
            </a>
            <Link
              href="/localizacao"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#1A1A1A] text-white text-sm font-bold uppercase tracking-widest hover:bg-[#333] transition-colors"
            >
              VER LOCALIZAÇÃO
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
