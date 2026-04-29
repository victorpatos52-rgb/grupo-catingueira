'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { MapPin, Phone, Clock } from 'lucide-react'
import { useLoja } from '@/contexts/LojaContext'

function getLogoSrc(nome: string | undefined | null): string | null {
  if (!nome) return null
  const n = nome.toLowerCase()
  if (n.includes('felizardo')) return '/logo-felizardo.png'
  if (n.includes('catingueira')) return '/logo-catingueira.png'
  return null
}

function buildWaHref(num: string): string {
  const d = num.replace(/\D/g, '')
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de mais informações.')}`
}

function formatWA(num: string): string {
  const d = num.replace(/\D/g, '')
  const local = d.length === 13 && d.startsWith('55') ? d.slice(2) : d
  if (local.length === 11) return `${local.slice(0, 2)} ${local[2]} ${local.slice(3, 7)}-${local.slice(7)}`
  return num
}

const NAV = [
  { label: 'Início', href: '/', external: false },
  { label: 'Estoque', href: '/estoque', external: false },
  { label: 'Sobre Nós', href: '/sobre', external: false },
  { label: 'Localização', href: '/localizacao', external: false },
]

export default function Footer() {
  const pathname = usePathname()
  const loja = useLoja()

  if (pathname?.startsWith('/admin')) return null

  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum)
  const waDisplay = formatWA(waNum)
  const logoSrc = getLogoSrc(loja?.nome)
  const nomeDisplay = loja?.nome ?? 'Grupo Catingueira'
  const endereco = loja?.endereco ?? 'BR 230, KM 334 — São Sebastião, Patos / PB'
  const horarioLinhas = (loja?.horario ?? 'Seg a Sex: 8h às 18h | Sáb: 8h às 13h').split(' | ')

  const nomeParts = nomeDisplay.split(' ')
  const nomeL1 = nomeParts[0] ?? nomeDisplay
  const nomeL2 = nomeParts.slice(1).join(' ')

  return (
    <footer style={{ backgroundColor: '#1A1A1A', borderTop: '3px solid var(--cor-primaria)' }}>
      <div className="max-w-7xl mx-auto px-5 py-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">

        {/* Col 1: Logo + descrição */}
        <div>
          <Link href="/" className="inline-block mb-5" aria-label={nomeDisplay}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={nomeDisplay}
                width={160}
                height={40}
                style={{ height: '40px', width: 'auto', filter: 'brightness(0) invert(1)' }}
              />
            ) : (
              <>
                <span
                  className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-extrabold italic uppercase leading-none"
                  style={{ color: 'var(--cor-primaria)' }}
                >
                  {nomeL1}
                </span>
                {nomeL2 && (
                  <span className="block text-white text-[10px] font-semibold tracking-[0.3em] -mt-0.5">
                    {nomeL2.toUpperCase()}
                  </span>
                )}
              </>
            )}
          </Link>
          <p className="text-[#888] text-sm leading-relaxed">
            Sua revenda de confiança em Patos e Região.
          </p>
        </div>

        {/* Col 2: Links */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-[0.25em] mb-5"
            style={{ color: 'var(--cor-primaria)' }}
          >
            Navegação
          </h3>
          <ul className="flex flex-col gap-3">
            {NAV.map(({ label, href }) => (
              <li key={label}>
                <Link href={href} className="text-[#888] text-sm hover:text-white transition-colors">
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#888] text-sm hover:text-white transition-colors"
              >
                Contato
              </a>
            </li>
          </ul>
        </div>

        {/* Col 3: Contato */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-[0.25em] mb-5"
            style={{ color: 'var(--cor-primaria)' }}
          >
            Contato
          </h3>
          <ul className="flex flex-col gap-4">
            <li>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-[#888] text-sm hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--cor-primaria)' }} />
                {waDisplay}
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-[#888] text-sm">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--cor-primaria)' }} />
              <span>{endereco}</span>
            </li>
            <li className="flex items-start gap-2.5 text-[#888] text-sm">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--cor-primaria)' }} />
              <span>
                {horarioLinhas.map((linha, i) => (
                  <span key={i}>
                    {linha}
                    {i < horarioLinhas.length - 1 && <br />}
                  </span>
                ))}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5">
        <p className="text-center text-[#555] text-xs uppercase tracking-[0.12em]">
          © {new Date().getFullYear()} {nomeDisplay} · Todos os direitos reservados
        </p>
      </div>
    </footer>
  )
}
