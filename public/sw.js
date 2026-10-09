// Service worker mínimo — só o necessário para o site passar no critério de
// installability do Chrome (um SW registrado com handler de fetch).
// Sem cache: cada fetch vai direto pra rede.
//
// Só intercepta GET do próprio domínio. Todo o resto (POST de Server Action,
// upload de foto para o Supabase Storage em *.supabase.co, etc.) passa direto
// SEM respondWith — o navegador trata como se não houvesse SW. Antes o SW
// interceptava tudo e clonava o corpo para um retry: upload de foto de
// celular (vários MB) era bufferizado/clonado dentro do SW e, se a rede móvel
// oscilava, reenviado do zero — e em vários navegadores móveis corpo de
// arquivo grande via SW simplesmente falha.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  // Retry único em falha transitória de rede (ex: blip de wifi) — sem isso,
  // qualquer erro no primeiro fetch vira direto a página de erro padrão do
  // navegador. GET não tem corpo, então repetir é seguro. Se a 2ª tentativa
  // também falhar, o erro se propaga normalmente.
  event.respondWith(
    fetch(request).catch(() => fetch(request))
  )
})
