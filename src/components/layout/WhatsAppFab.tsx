'use client'

import { usePathname } from 'next/navigation'
import { useLoja } from '@/contexts/LojaContext'
import { buildWaHref } from '@/lib/whatsapp'
import WaIcon from '@/components/ui/WaIcon'

export default function WhatsAppFab() {
  const pathname = usePathname()
  const loja = useLoja()

  if (pathname?.startsWith('/admin')) return null

  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum, 'Olá! Vim pelo site e gostaria de mais informações.')

  return (
    <a
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed z-30 flex items-center justify-center w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:brightness-95 active:brightness-90 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent focus-visible:ring-white"
      style={{
        bottom: 'calc(1.25rem + env(safe-area-inset-bottom))',
        right: 'calc(1.25rem + env(safe-area-inset-right))',
      }}
    >
      <WaIcon size={30} />
    </a>
  )
}
