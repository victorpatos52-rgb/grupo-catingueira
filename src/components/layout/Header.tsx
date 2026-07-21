'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useLoja } from '@/contexts/LojaContext'
import { buildWaHref, formatWA } from '@/lib/whatsapp'
import WaIcon from '@/components/ui/WaIcon'

function getLogoSrc(nome: string | undefined | null): string | null {
  if (!nome) return null
  const n = nome.toLowerCase()
  if (n.includes('felizardo')) return '/logo-felizardo.png'
  if (n.includes('catingueira')) return '/logo-catingueira.png'
  return null
}

export default function Header() {
  const pathname = usePathname()
  const loja = useLoja()
  const [open, setOpen] = useState(false)

  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum, 'Olá! Vim pelo site e gostaria de mais informações.')
  const waDisplay = formatWA(waNum)
  const logoSrc = getLogoSrc(loja?.nome)
  const nomeDisplay = loja?.nome ?? 'Grupo Catingueira'

  const NAV = [
    { label: 'Início', href: '/' },
    { label: 'Estoque', href: '/estoque' },
    { label: 'Sobre Nós', href: '/sobre' },
    { label: 'Localização', href: '/localizacao' },
    { label: 'Contato', href: '/contato' },
  ]

  useEffect(() => { setOpen(false) }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (pathname?.startsWith('/admin')) return null

  return (
    <>
      {/* Altura cresce com a área segura do topo (status bar/notch do iPhone
          em modo standalone) — resolve pra 0 em navegador normal, então isso
          não muda nada fora do PWA instalado. O conteúdo interno usa h-full,
          então continua ocupando só os 70px originais, empurrado pra baixo
          do espaço extra. */}
      <header
        className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm"
        style={{
          borderBottom: '2px solid var(--cor-primaria)',
          height: 'calc(70px + env(safe-area-inset-top))',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="max-w-7xl mx-auto px-5 h-full flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0" aria-label={nomeDisplay}>
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={nomeDisplay}
                width={160}
                height={48}
                style={{ height: '48px', width: 'auto' }}
                priority
              />
            ) : (
              <span
                className="font-[family-name:var(--font-barlow-condensed)] text-xl font-extrabold italic uppercase leading-none"
                style={{ color: 'var(--cor-primaria)' }}
              >
                {nomeDisplay}
              </span>
            )}
          </Link>

          <nav className="hidden md:flex items-center gap-7" aria-label="Navegação principal">
            {NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="font-semibold text-xs uppercase tracking-[0.12em] transition-colors"
                style={{ color: pathname === href ? 'var(--cor-primaria)' : '#3D3D3D' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--cor-primaria)')}
                onMouseLeave={e => { if (pathname !== href) e.currentTarget.style.color = '#3D3D3D' }}
              >
                {label}
              </Link>
            ))}
          </nav>

          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white text-xs font-bold uppercase tracking-wide hover:brightness-95 transition-all shrink-0"
          >
            <WaIcon size={14} />
            {waDisplay}
          </a>

          <button
            onClick={() => setOpen(v => !v)}
            className="md:hidden min-w-11 min-h-11 flex items-center justify-center -mr-1 text-[#3D3D3D]"
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
          style={{ paddingTop: 'calc(70px + env(safe-area-inset-top))' }}
        >
          <nav className="flex flex-col px-6 pt-8 gap-5" aria-label="Menu mobile">
            {NAV.map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase transition-colors"
                style={{ color: pathname === href ? 'var(--cor-primaria)' : '#CCCCCC' }}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto px-6 pt-10" style={{ paddingBottom: 'calc(2.5rem + env(safe-area-inset-bottom))' }}>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 rounded-lg bg-[#25D366] text-white font-bold text-sm uppercase tracking-wider hover:brightness-95 transition-all"
            >
              <WaIcon size={18} />
              FALAR NO WHATSAPP — {waDisplay}
            </a>
          </div>
        </div>
      )}
    </>
  )
}
