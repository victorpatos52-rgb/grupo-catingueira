'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { setLojaAtiva } from '@/app/actions'
import type { UsuarioPerfil, Loja } from '@/types'

interface AdminSidebarProps {
  perfil: (UsuarioPerfil & { loja: Loja | null }) | null
  loja: Loja | null
  lojas: Loja[]
}

// ── Icons ────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCar() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
    </svg>
  )
}

function IconCRM() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

function IconFinanceiro() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}



function IconUsuarios() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function IconReceipt() {
  return (
    <svg className="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

// ── Menu config ──────────────────────────────────────────────────────────────

const GESTAO_ITEMS = [
  { href: '/admin/dashboard',  label: 'Dashboard',  modulo: 'dashboard',  Icon: IconDashboard },
  { href: '/admin/veiculos',   label: 'Veículos',   modulo: 'veiculos',   Icon: IconCar },
  { href: '/admin/crm',        label: 'CRM',        modulo: 'crm',        Icon: IconCRM },
  { href: '/admin/vendas',     label: 'Vendas',     modulo: 'vendas',     Icon: IconReceipt },
  { href: '/admin/financeiro', label: 'Financeiro', modulo: 'financeiro', Icon: IconFinanceiro },
]

const ADMIN_ITEMS = [
  { href: '/admin/usuarios', label: 'Usuários', modulo: 'usuarios', Icon: IconUsuarios },
]

// ── Badge de perfil ───────────────────────────────────────────────────────────

const perfilBadge: Record<string, string> = {
  vendedor: 'bg-blue-50 text-blue-700 border border-blue-200',
  gerente:  'bg-orange-50 text-orange-700 border border-orange-200',
  diretor:  'bg-purple-50 text-purple-700 border border-purple-200',
  admin:    'bg-red-50 text-red-700 border border-red-200',
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function initials(str: string) {
  return str.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function canSee(modulo: string, perfil: UsuarioPerfil | null): boolean {
  if (!perfil) return false
  if (perfil.perfil === 'admin' || perfil.perfil === 'diretor') return true
  return (perfil.modulos_permitidos ?? []).includes(modulo)
}

// ── NavItem ───────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string
  label: string
  Icon: () => React.ReactElement
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-[#FEF9C3] text-[#92400E]'
          : 'text-[#6B7280] hover:bg-gray-50 hover:text-[#111]'
      }`}
    >
      {active && (
        <span
          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full"
          style={{ backgroundColor: '#F5C842' }}
        />
      )}
      <Icon />
      {label}
    </Link>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminSidebar({ perfil, loja, lojas }: AdminSidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [mobileOpen,    setMobileOpen]    = useState(false)
  const [seletorAberto, setSeletorAberto] = useState(false)

  const isAdminOrDiretor = perfil?.perfil === 'admin' || perfil?.perfil === 'diretor'

  async function sair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleLojaChange(lojaId: string) {
    await setLojaAtiva(lojaId)
    setSeletorAberto(false)
    router.refresh()
  }

  const gestaoVisivel = GESTAO_ITEMS.filter(i => canSee(i.modulo, perfil))
  const adminVisivel  = ADMIN_ITEMS.filter(i => canSee(i.modulo, perfil))

  const sidebar = (
    <div className="w-64 shrink-0 flex flex-col h-full bg-white" style={{ borderRight: '1px solid #E5E7EB' }}>

      {/* ── Logo ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)' }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[#111] text-sm font-bold truncate leading-tight">
              {loja?.nome ?? 'Grupo Catingueira'}
            </p>
            <p className="text-[#9CA3AF] text-xs mt-0.5">Painel administrativo</p>
          </div>
        </div>
      </div>

      {/* ── Seletor de loja ──────────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        {isAdminOrDiretor && lojas.length > 1 ? (
          <div className="relative">
            <button
              onClick={() => setSeletorAberto(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors text-left"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)', color: '#111' }}
              >
                {initials(loja?.nome ?? 'GC')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#111] text-xs font-semibold truncate leading-tight">{loja?.nome ?? '—'}</p>
                {loja?.cidade && (
                  <p className="text-[#9CA3AF] text-[10px] truncate">{loja.cidade}{loja.estado ? `, ${loja.estado}` : ''}</p>
                )}
              </div>
              <svg
                className={`w-3.5 h-3.5 text-[#9CA3AF] shrink-0 transition-transform ${seletorAberto ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {seletorAberto && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSeletorAberto(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E5E7EB] rounded-xl shadow-lg z-20 py-1 overflow-hidden">
                  {lojas.map(l => (
                    <button
                      key={l.id}
                      onClick={() => handleLojaChange(l.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] transition-colors text-left ${
                        l.id === loja?.id ? 'bg-[#FEF9C3]' : ''
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)', color: '#111' }}
                      >
                        {initials(l.nome)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[#111] text-xs font-medium truncate">{l.nome}</p>
                        {l.cidade && (
                          <p className="text-[#9CA3AF] text-[10px]">{l.cidade}{l.estado ? `, ${l.estado}` : ''}</p>
                        )}
                      </div>
                      {l.id === loja?.id && (
                        <svg className="w-3.5 h-3.5 text-[#F59E0B] shrink-0 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)', color: '#111' }}
            >
              {initials(loja?.nome ?? 'GC')}
            </div>
            <p className="text-[#111] text-xs font-semibold truncate">{loja?.nome ?? '—'}</p>
          </div>
        )}
      </div>

      {/* ── Navegação ────────────────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">

        {gestaoVisivel.length > 0 && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Gestão
            </p>
            <div className="space-y-0.5">
              {gestaoVisivel.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} active={active} />
              })}
            </div>
          </div>
        )}

        {adminVisivel.length > 0 && (
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF]">
              Administração
            </p>
            <div className="space-y-0.5">
              {adminVisivel.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return <NavItem key={item.href} href={item.href} label={item.label} Icon={item.Icon} active={active} />
              })}
            </div>
          </div>
        )}

      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-2.5 mb-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)' }}
          >
            {initials(perfil?.nome ?? '?')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#111] text-xs font-semibold truncate leading-tight">
              {perfil?.nome ?? 'Usuário'}
            </p>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-md font-semibold capitalize mt-0.5 ${perfilBadge[perfil?.perfil ?? 'vendedor']}`}>
              {perfil?.perfil ?? ''}
            </span>
          </div>
        </div>

        <div className="flex gap-1.5">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-1.5 rounded-lg text-xs text-[#6B7280] hover:text-[#111] text-center font-medium transition-colors border border-[#E5E7EB] hover:border-[#D1D5DB] bg-white"
          >
            Ver site
          </a>
          <button
            onClick={sair}
            className="flex-1 py-1.5 rounded-lg text-xs text-[#6B7280] hover:text-red-600 font-medium transition-colors border border-[#E5E7EB] hover:border-red-200 hover:bg-red-50 bg-white"
          >
            Sair
          </button>
        </div>
      </div>

    </div>
  )

  return (
    <>
      {/* Mobile: botão hamburger */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-lg bg-white shadow-sm border border-[#E5E7EB] flex items-center justify-center"
        >
          <svg className="w-4 h-4 text-[#374151]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile: overlay com blur */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.25)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop: sidebar fixa */}
      <div className="hidden md:flex h-screen sticky top-0">{sidebar}</div>

      {/* Mobile: drawer deslizante */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebar}
      </div>
    </>
  )
}
