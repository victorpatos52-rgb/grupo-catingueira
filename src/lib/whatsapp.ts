import type { Veiculo } from '@/types'

export function gerarLinkWhatsApp(whatsapp: string, veiculo?: Veiculo): string {
  const numero = whatsapp.replace(/\D/g, '')
  const mensagem = veiculo
    ? `Olá! Vi o ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} no site. Ainda está disponível?`
    : 'Olá! Gostaria de saber mais informações sobre os veículos disponíveis.'
  return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`
}

// Link de WhatsApp com mensagem customizável pelo chamador — antes duplicado
// em Header.tsx, Footer.tsx, sobre/page.tsx, localizacao/page.tsx e
// app/page.tsx (Footer.tsx tinha uma variante de 1 argumento, com a mensagem
// fixa embutida; os outros 4 já usavam essa mesma assinatura de 2 argumentos).
export function buildWaHref(numero: string, texto: string): string {
  const d = numero.replace(/\D/g, '')
  const full = d.startsWith('55') ? d : `55${d}`
  return `https://wa.me/${full}?text=${encodeURIComponent(texto)}`
}

// Formata um número de WhatsApp brasileiro pra exibição (ex: "83 9 9999-9999")
// — antes duplicado em Header.tsx, Footer.tsx, localizacao/page.tsx e app/page.tsx.
export function formatWA(numero: string): string {
  const d = numero.replace(/\D/g, '')
  const local = d.length === 13 && d.startsWith('55') ? d.slice(2) : d
  if (local.length === 11) return `${local.slice(0, 2)} ${local[2]} ${local.slice(3, 7)}-${local.slice(7)}`
  return numero
}
