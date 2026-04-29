import type { Veiculo } from '@/types'

export function gerarLinkWhatsApp(whatsapp: string, veiculo?: Veiculo): string {
  const numero = whatsapp.replace(/\D/g, '')
  const mensagem = veiculo
    ? `Olá! Vi o ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} no site. Ainda está disponível?`
    : 'Olá! Gostaria de saber mais informações sobre os veículos disponíveis.'
  return `https://wa.me/55${numero}?text=${encodeURIComponent(mensagem)}`
}
