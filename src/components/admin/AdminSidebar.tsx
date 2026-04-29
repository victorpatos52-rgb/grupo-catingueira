'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { UsuarioPerfil, Loja } from '@/types'

interface AdminSidebarProps {
  perfil: (UsuarioPerfil & { loja: Loja | null }) | null
  loja: Loja | null
  lojas: Loja[]
}

const menuItems = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href: '/admin/veiculos',
    label: 'Veículos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 .001M13 16H3m10 0h1m0 0l1-1h3l1-1.5 1-4.5H13V7" />
      </svg>
    ),
  },
  {
    href: '/admin/financeiro',
    label: 'Financeiro',
    perfis: ['gerente', 'diretor', 'admin'],
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    href: '/admin/crm',
    label: 'CRM',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function AdminSidebar({ perfil, loja, lojas }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileAberto, setMobileAberto] = useState(false)

  const corPrimaria = loja?.cor_primaria ?? '#F5C842'

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredMenu = menuItems.filter(item => {
    if (!item.perfis) return true
    return perfil?.perfil && item.perfis.includes(perfil.perfil)
  })

  const sidebar = (
    <div className="w-60 shrink-0 bg-[#0D0D0D] border-r border-[#1A1A1A] flex flex-col h-full">
      {/* Logo / nome da loja */}
      <div className="px-5 py-6 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center font-[family-name:var(--font-barlow-condensed)] font-black text-sm text-[#0D0D0D] shrink-0"
            style={{ backgroundColor: corPrimaria }}
          >
            {(loja?.nome ?? 'GC').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{loja?.nome ?? 'Grupo Catingueira'}</p>
            <p className="text-[#555] text-xs">Painel Admin</p>
          </div>
        </div>
      </div>

      {/* Seletor de loja para diretor/admin */}
      {lojas.length > 1 && (
        <div className="px-4 pt-4">
          <select className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--cor-primaria)]">
            {lojas.map(l => (
              <option key={l.id} value={l.id} selected={l.id === loja?.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {filteredMenu.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'text-[#0D0D0D]'
                  : 'text-[#777] hover:text-white hover:bg-[#1A1A1A]'
              }`}
              style={active ? { backgroundColor: corPrimaria } : undefined}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Usuário e sair */}
      <div className="px-4 py-4 border-t border-[#1A1A1A]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-[#888] text-xs font-bold shrink-0">
            {(perfil?.nome ?? '?').substring(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{perfil?.nome ?? 'Usuário'}</p>
            <p className="text-[#555] text-xs capitalize">{perfil?.perfil ?? ''}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            target="_blank"
            className="flex-1 py-1.5 rounded-md text-xs text-[#666] hover:text-white border border-[#222] hover:border-[#333] text-center transition-colors"
          >
            Ver site
          </a>
          <button
            onClick={sair}
            className="flex-1 py-1.5 rounded-md text-xs text-[#666] hover:text-red-400 border border-[#222] hover:border-red-400/30 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileAberto(!mobileAberto)}
          className="bg-[#0D0D0D] border border-[#222] rounded-lg p-2"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay */}
      {mobileAberto && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileAberto(false)}
        />
      )}

      {/* Desktop: static sidebar */}
      <div className="hidden md:flex h-screen sticky top-0">
        {sidebar}
      </div>

      {/* Mobile: slide-in */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ${mobileAberto ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebar}
      </div>
    </>
  )
}
