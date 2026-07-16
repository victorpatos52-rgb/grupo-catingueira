'use client'

import { useEffect } from 'react'

export default function PwaServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.error('Falha ao registrar o service worker:', err)
    })
  }, [])

  return null
}
