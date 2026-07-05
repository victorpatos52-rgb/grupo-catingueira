'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UsuarioPerfil } from '@/types'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IcoDashboard() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IcoCar() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
    </svg>
  )
}

function IcoCRM() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IcoVendas() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function IcoFinanceiro() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function IcoUsuarios() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IcoMais() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

// ── Configuração dos itens ────────────────────────────────────────────────────

const ALL_ITEMS = [
  { href: '/admin/dashboard',  label: 'Dashboard',  modulo: 'dashboard',  Icon: IcoDashboard },
  { href: '/admin/veiculos',   label: 'Veículos',   modulo: 'veiculos',   Icon: IcoCar },
  { href: '/admin/crm',        label: 'CRM',        modulo: 'crm',        Icon: IcoCRM },
  { href: '/admin/vendas',     label: 'Vendas',     modulo: 'vendas',     Icon: IcoVendas },
  { href: '/admin/financeiro', label: 'Financeiro', modulo: 'financeiro', Icon: IcoFinanceiro },
  { href: '/admin/usuarios',   label: 'Usuários',   modulo: 'usuarios',   Icon: IcoUsuarios },
]

function canSee(modulo: string, perfil: UsuarioPerfil): boolean {
  // Dashboard é exclusivo do perfil admin (mesma regra já aplicada na sidebar
  // de desktop — esta barra mobile não tinha essa restrição ainda).
  if (modulo === 'dashboard') return perfil.perfil === 'admin'
  // Sócio tem acesso restrito por regra fixa — só Veículos e Financeiro.
  if (perfil.perfil === 'socio') return modulo === 'veiculos' || modulo === 'financeiro'
  if (perfil.perfil === 'admin' || perfil.perfil === 'diretor') return true
  return (perfil.modulos_permitidos ?? []).includes(modulo)
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function AdminBottomBar({ perfil }: { perfil: UsuarioPerfil }) {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const itens = ALL_ITEMS.filter(i => canSee(i.modulo, perfil))

  const MAX_BAR = 5
  const barItens   = itens.length <= MAX_BAR ? itens : itens.slice(0, MAX_BAR - 1)
  const maisItens  = itens.length >  MAX_BAR ? itens.slice(MAX_BAR - 1) : []
  const temMais    = maisItens.length > 0

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden bg-black/20 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer de itens extras */}
      {temMais && (
        <div
          className={`fixed left-0 right-0 z-40 md:hidden bg-white border-t border-[#E5E7EB] shadow-lg transition-transform duration-200 ${
            drawerOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
          style={{ bottom: '64px' }}
        >
          <div className="px-4 py-3 grid grid-cols-3 gap-2">
            {maisItens.map(item => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-colors ${
                    active ? 'bg-[#FEF9C3] text-[#F5C842]' : 'text-[#6B7280] hover:bg-[#F9FAFB]'
                  }`}
                >
                  <item.Icon />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-white border-t border-[#E5E7EB] h-16">
        {barItens.map(item => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? 'text-[#F5C842]' : 'text-[#9CA3AF]'
              }`}
            >
              <item.Icon />
              <span className="text-[9px] font-semibold leading-none">{item.label}</span>
            </Link>
          )
        })}

        {temMais && (
          <button
            onClick={() => setDrawerOpen(v => !v)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              drawerOpen ? 'text-[#F5C842]' : 'text-[#9CA3AF]'
            }`}
          >
            <IcoMais />
            <span className="text-[9px] font-semibold leading-none">Mais</span>
          </button>
        )}
      </nav>
    </>
  )
}
