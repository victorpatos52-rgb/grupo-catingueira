'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  /** Largura máxima a partir do breakpoint `sm` (onde o modal deixa de ser bottom-sheet e passa a ser centralizado). */
  maxWidth?: 'sm:max-w-sm' | 'sm:max-w-md' | 'sm:max-w-lg'
}

/**
 * Modal compartilhado: bottom-sheet ancorado na base da tela no mobile
 * (evita empurrar o conteúdo/rodapé de botões pra fora da viewport quando o
 * teclado abre) e modal centralizado a partir do breakpoint `sm`. O painel
 * tem `max-h` + `overflow-y-auto` próprios, então header/corpo/rodapé de
 * cada chamador continuam simples — sem precisar de scroll/sticky manual.
 */
export default function Modal({ open, onClose, children, maxWidth = 'sm:max-w-md' }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`relative bg-white w-full ${maxWidth} rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
