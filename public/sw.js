// Service worker mínimo — só o necessário para o site passar no critério de
// installability do Chrome (um SW registrado com handler de fetch).
// Sem estratégia de cache agressiva por enquanto: cada fetch vai direto pra
// rede, sem interceptar nem guardar nada. Suporte offline de verdade fica
// para uma etapa futura, se/quando quisermos.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})
