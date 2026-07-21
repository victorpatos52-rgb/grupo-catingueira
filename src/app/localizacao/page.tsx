import type { Metadata } from 'next'
import { MapPin, Clock, Phone, ExternalLink } from 'lucide-react'
import { getLoja } from '@/lib/getLoja'
import { buildWaHref, formatWA } from '@/lib/whatsapp'
import WaIcon from '@/components/ui/WaIcon'

export async function generateMetadata(): Promise<Metadata> {
  const loja = await getLoja()
  return {
    title: `${loja?.nome ?? 'Localização'} | Localização`,
    description: `Encontre a ${loja?.nome ?? 'nossa loja'} em ${loja?.cidade ?? 'Patos'}, ${loja?.estado ?? 'PB'}. Venha nos visitar!`,
  }
}

export default async function LocalizacaoPage() {
  const loja = await getLoja()

  const waNum = loja?.whatsapp ?? '83999671729'
  const waHref = buildWaHref(waNum, 'Olá! Vim pelo site e gostaria de mais informações.')
  const waDisplay = formatWA(waNum)
  const nomeDisplay = loja?.nome ?? 'Catingueira Multimarcas'
  const endereco = loja?.endereco ?? 'BR 230, KM 334 — São Sebastião, Patos - PB'
  const horarioLinhas = (loja?.horario ?? 'Seg a Sex: 8h às 18h | Sáb: 8h às 13h').split(' | ')

  const mapsEmbed = loja?.maps_url
    ?? 'https://maps.google.com/maps?q=BR+230+KM+334+Patos+PB+Brasil&output=embed&z=15&hl=pt-BR'

  const mapsLink = `https://www.google.com/maps/search/${encodeURIComponent(endereco)}`

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="pt-28 pb-12 px-4 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-4xl mx-auto">
          <p
            className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-[0.3em] mb-3"
            style={{ color: 'var(--cor-primaria)' }}
          >
            {nomeDisplay.toUpperCase()}
          </p>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-6xl font-black uppercase text-[#1A1A1A] leading-none mb-2">
            ONDE ESTAMOS
          </h1>
          <div className="w-14 h-[3px] mt-3" style={{ backgroundColor: 'var(--cor-primaria)' }} />
          <p className="text-[#888] text-base md:text-lg mt-5">
            Venha nos visitar em {loja?.cidade ?? 'Patos'}, no coração do sertão da Paraíba.
          </p>
        </div>
      </section>

      {/* ── Card de informações ── */}
      <section className="py-12 px-4 bg-[#F8F8F8]">
        <div className="max-w-2xl mx-auto">
          <div
            className="bg-white rounded-xl shadow-md overflow-hidden"
            style={{ borderTop: '3px solid var(--cor-primaria)' }}
          >
            <div className="p-6 flex flex-col gap-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: 'var(--cor-primaria)' }} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">
                    Endereço
                  </p>
                  <p className="text-[#555] text-sm leading-relaxed">{endereco}</p>
                </div>
              </div>

              <div className="border-t border-[#F0F0F0]" />

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)' }}
                >
                  <Clock className="w-5 h-5" style={{ color: 'var(--cor-primaria)' }} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">
                    Horário de funcionamento
                  </p>
                  {horarioLinhas.map((linha: string, i: number) => (
                    <p key={i} className="text-[#555] text-sm">{linha}</p>
                  ))}
                  <p className="text-[#AAA] text-xs mt-1">Dom: Fechado</p>
                </div>
              </div>

              <div className="border-t border-[#F0F0F0]" />

              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'color-mix(in srgb, var(--cor-primaria) 12%, transparent)' }}
                >
                  <Phone className="w-5 h-5" style={{ color: 'var(--cor-primaria)' }} />
                </div>
                <div>
                  <p className="font-[family-name:var(--font-barlow-condensed)] text-xs font-bold uppercase tracking-widest text-[#1A1A1A] mb-1">
                    WhatsApp
                  </p>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#555] text-sm hover:text-[#1A1A1A] transition-colors"
                  >
                    {waDisplay}
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
              src={mapsEmbed}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Localização da ${nomeDisplay}`}
            />
          </div>
        </div>
      </section>

      {/* ── Botões CTA ── */}
      <section className="px-4 pb-20 md:pb-28">
        <div className="max-w-lg mx-auto flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-lg bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            ABRIR NO GOOGLE MAPS
          </a>
          <a
            href={waHref}
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
