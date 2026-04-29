'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const WA_HREF =
  'https://wa.me/5583999671729?text=Olá! Vim pelo site e gostaria de mais informações.'
const WA_DISPLAY = '83 9 9967-1729'

const NAV = [
  { label: 'Início', href: '/' },
  { label: 'Estoque', href: '/estoque' },
  { label: 'Sobre Nós', href: '/sobre' },
  { label: 'Localização', href: '/localizacao' },
  { label: 'Contato', href: WA_HREF, external: true },
]

function WaIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (pathname?.startsWith('/admin')) return null

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-[70px] bg-white shadow-sm"
        style={{ borderBottom: '2px solid #F5C200' }}
      >
        <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label="Catingueira Multimarcas">
            <Image
              src="/logo-catingueira.png"
              alt="Catingueira Multimarcas"
              width={160}
              height={48}
              style={{ height: '48px', width: 'auto' }}
              priority
            />
          </Link>

          <nav className="hidden md:flex items-center gap-7" aria-label="Navegação principal">
            {NAV.map(({ label, href, external }) =>
              external ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-xs uppercase tracking-[0.12em] text-[#3D3D3D] hover:text-[#F5C200] transition-colors"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  href={href}
                  className={`font-semibold text-xs uppercase tracking-[0.12em] transition-colors ${
                    pathname === href
                      ? 'text-[#F5C200]'
                      : 'text-[#3D3D3D] hover:text-[#F5C200]'
                  }`}
                >
                  {label}
                </Link>
              )
            )}
          </nav>

          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold uppercase tracking-wide hover:brightness-95 transition-all shrink-0"
          >
            <WaIcon size={14} />
            {WA_DISPLAY}
          </a>

          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden p-2 -mr-1 text-[#3D3D3D]"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-white flex flex-col overflow-y-auto md:hidden"
          style={{ paddingTop: '70px' }}
        >
          <nav className="flex flex-col px-6 pt-8 gap-5" aria-label="Menu mobile">
            {NAV.map(({ label, href, external }) =>
              external ? (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase text-[#CCCCCC] hover:text-[#1A1A1A] transition-colors"
                >
                  {label}
                </a>
              ) : (
                <Link
                  key={label}
                  href={href}
                  className={`font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase transition-colors ${
                    pathname === href
                      ? 'text-[#F5C200]'
                      : 'text-[#CCCCCC] hover:text-[#1A1A1A]'
                  }`}
                >
                  {label}
                </Link>
              )
            )}
          </nav>
          <div className="mt-auto px-6 pb-10 pt-10">
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-lg bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
            >
              <WaIcon size={18} />
              FALAR NO WHATSAPP — {WA_DISPLAY}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
