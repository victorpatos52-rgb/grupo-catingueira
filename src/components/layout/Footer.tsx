'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MapPin, Phone, Clock } from 'lucide-react'

const WA_HREF =
  'https://wa.me/5583999671729?text=Olá! Vim pelo site e gostaria de mais informações.'

const NAV = [
  { label: 'Início', href: '/', external: false },
  { label: 'Estoque', href: '/estoque', external: false },
  { label: 'Sobre Nós', href: '/sobre', external: false },
  { label: 'Localização', href: '/localizacao', external: false },
  { label: 'Contato', href: WA_HREF, external: true },
]

export default function Footer() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null

  return (
    <footer style={{ backgroundColor: '#1A1A1A', borderTop: '3px solid #F5C200' }}>
      <div className="max-w-7xl mx-auto px-5 py-14 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">

        {/* Col 1: Logo + descrição */}
        <div>
          <Link href="/" className="inline-block mb-5" aria-label="Catingueira Multimarcas">
            <span className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-extrabold italic uppercase leading-none" style={{ color: '#F5C200' }}>
              CATINGUEIRA
            </span>
            <span className="block text-white text-[10px] font-semibold tracking-[0.3em] -mt-0.5">
              MULTIMARCAS
            </span>
          </Link>
          <p className="text-[#888] text-sm leading-relaxed">
            Mais de 30 anos realizando sonhos.
            <br />
            Sua revenda de confiança em Patos e Região.
          </p>
        </div>

        {/* Col 2: Links */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-[0.25em] mb-5"
            style={{ color: '#F5C200' }}
          >
            Navegação
          </h3>
          <ul className="flex flex-col gap-3">
            {NAV.map(({ label, href, external }) => (
              <li key={label}>
                {external ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#888] text-sm hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                ) : (
                  <Link href={href} className="text-[#888] text-sm hover:text-white transition-colors">
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Col 3: Contato */}
        <div>
          <h3
            className="text-xs font-bold uppercase tracking-[0.25em] mb-5"
            style={{ color: '#F5C200' }}
          >
            Contato
          </h3>
          <ul className="flex flex-col gap-4">
            <li>
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-[#888] text-sm hover:text-white transition-colors"
              >
                <Phone className="w-4 h-4 shrink-0" style={{ color: '#F5C200' }} />
                83 9 9967-1729
              </a>
            </li>
            <li className="flex items-start gap-2.5 text-[#888] text-sm">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F5C200' }} />
              <span>
                BR 230, KM 334 — São Sebastião
                <br />
                Patos / PB
              </span>
            </li>
            <li className="flex items-start gap-2.5 text-[#888] text-sm">
              <Clock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F5C200' }} />
              <span>
                Seg a Sex: 8h às 18h
                <br />
                Sáb: 8h às 13h
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-5 py-5">
        <p className="text-center text-[#555] text-xs uppercase tracking-[0.12em]">
          © {new Date().getFullYear()} Catingueira Multimarcas · Todos os direitos reservados · Patos/PB
        </p>
      </div>
    </footer>
  )
}
