'use client'

import { createContext, useContext } from 'react'
import type { Loja } from '@/types'

const LojaContext = createContext<Loja | null>(null)

export function LojaProvider({
  loja,
  children,
}: {
  loja: Loja | null
  children: React.ReactNode
}) {
  return <LojaContext.Provider value={loja}>{children}</LojaContext.Provider>
}

export function useLoja(): Loja | null {
  return useContext(LojaContext)
}
