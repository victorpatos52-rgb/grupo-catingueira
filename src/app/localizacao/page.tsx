import type { Metadata } from 'next'
import { MapPin, Clock, Phone, ExternalLink } from 'lucide-react'

const WA_HREF =
  'https://wa.me/5583999671729?text=Olá! Vim pelo site e gostaria de mais informações.'
const MAPS_LINK =
  'https://www.google.com/maps/search/BR+230,+KM+334,+Patos,+PB,+Brasil/@-7.0609,-37.2842,15z'
const MAPS_EMBED =
  'https://maps.google.com/maps?q=BR+230+KM+334+Patos+PB+Brasil&output=embed&z=15&hl=pt-BR'

export const metadata: Metadata = {
  title: 'Localização — Catingueira Multimarcas | Patos, PB',
  description:
    'Encontre a Catingueira Multimarcas em Patos, Paraíba. BR 230, KM 334 — em frente ao Atacadão. Seg–Sex 8h às 18h, Sáb 8h às 13h.',
}

function WaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  )
}

export default function LocalizacaoPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="pt-28 pb-12 px-4 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-4xl mx-auto">
          <p
            className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-3"
            style={{ color: '#F5C200' }}
          >
            CATINGUEIRA MULTIMARCAS
          </p>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-6xl font-black uppercase text-[#1A1A1A] leading-none mb-2">
            ONDE ESTAMOS
          </h1>
          <div className="w-14 h-[3px] mt-3" style={{ backgroundColor: '#F5C200' }} />
          <p className="text-[#888] text-base md:text-lg mt-5">
            Venha nos visitar em Patos, no coração do sertão da Paraíba.
          </p>
        </div>
      </section>

      {/* ── Card de informações ── */}
      <section className="py-12 px-4 bg-[#F8F8F8]">
        <div className="max-w-2xl mx-auto">
          <div
            className="bg-white rounded-xl shadow-md overflow-hidden"
            style={{ borderTop: '3px solid #F5C200' }}
          >
            <div className="p-6 flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(245,194,0,0.1)' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: '#F5C200' }} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">
                    Endereço
                  </p>
                  <p className="text-[#555] text-sm leading-relaxed">
                    BR 230, KM 334 — São Sebastião
                    <br />
                    Patos - PB, 58700-000
                    <br />
                    <span className="text-[#AAA] text-xs">Em frente ao Atacadão</span>
                  </p>
                </div>
              </div>

              <div className="border-t border-[#F0F0F0]" />

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(245,194,0,0.1)' }}
                >
                  <Clock className="w-5 h-5" style={{ color: '#F5C200' }} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">
                    Horário de funcionamento
                  </p>
                  <p className="text-[#555] text-sm">Seg a Sex: 8h às 18h</p>
                  <p className="text-[#555] text-sm">Sáb: 8h às 13h</p>
                  <p className="text-[#AAA] text-xs mt-1">Dom: Fechado</p>
                </div>
              </div>

              <div className="border-t border-[#F0F0F0]" />

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(245,194,0,0.1)' }}
                >
                  <Phone className="w-5 h-5" style={{ color: '#F5C200' }} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">
                    WhatsApp
                  </p>
                  <a
                    href={WA_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#555] text-sm hover:text-[#F5C200] transition-colors"
                  >
                    83 9 9967-1729
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Mapa ── */}
      <section className="px-4 pb-10">
        <div className="max-w-5xl mx-auto">
          <div className="w-full rounded-xl overflow-hidden shadow-md" style={{ height: '400px' }}>
            <iframe
              src={MAPS_EMBED}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização da Catingueira Multimarcas — BR 230, KM 334, Patos/PB"
            />
          </div>
        </div>
      </section>

      {/* ── Botões CTA ── */}
      <section className="px-4 pb-20 md:pb-28">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={MAPS_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-lg bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            ABRIR NO GOOGLE MAPS
          </a>
          <a
            href={WA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-lg bg-[#25D366] text-white text-xs font-bold uppercase tracking-widest hover:brightness-95 transition-all"
          >
            <WaIcon size={16} />
            FALAR NO WHATSAPP
          </a>
        </div>
      </section>
    </div>
  )
}
