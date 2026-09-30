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
  const request = event.request
  // Retry único em falha transitória de rede (ex: blip de wifi) — sem isso,
  // qualquer erro no primeiro fetch vira direto a página de erro padrão do
  // navegador. clone() é obrigatório ANTES de consumir o body: request tem
  // body (POST de Server Action, upload etc.) só pode ser lido uma vez, então
  // a 1ª tentativa usa a cópia clonada e deixa `request` intacto pra 2ª. Se
  // a 2ª também falhar, o erro se propaga normalmente — o navegador mostra o
  // próprio tratamento padrão de erro de rede, como já fazia antes.
  event.respondWith(
    fetch(request.clone()).catch(() => fetch(request))
  )
})
