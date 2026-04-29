'use client'

import { createContext, useContext } from 'react'
import type { UsuarioPerfil, Loja } from '@/types'

interface AdminContextValue {
  perfil: UsuarioPerfil | null
  loja: Loja | null
  lojas: Loja[]
}

const AdminContext = createContext<AdminContextValue>({
  perfil: null,
  loja: null,
  lojas: [],
})

export function AdminProvider({
  value,
  children,
}: {
  value: AdminContextValue
  children: React.ReactNode
}) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminContextValue {
  return useContext(AdminContext)
}
