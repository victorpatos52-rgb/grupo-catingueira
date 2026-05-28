import type { Metadata } from 'next'
import { getLoja } from '@/lib/getLoja'
import ContatoForm from './ContatoForm'

export async function generateMetadata(): Promise<Metadata> {
  const loja = await getLoja()
  return {
    title: `${loja?.nome ?? 'Contato'} | Contato`,
    description: `Entre em contato com a ${loja?.nome ?? 'nossa equipe'}. Atendimento rápido e sem enrolação.`,
  }
}

export default async function ContatoPage() {
  const loja = await getLoja()

  if (!loja) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loja não encontrada.</p>
      </div>
    )
  }

  const waNum = loja.whatsapp.replace(/\D/g, '')
  const waHref = `https://wa.me/55${waNum}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de mais informações.')}`

  return (
    <main className="pt-[70px] min-h-screen bg-white">
      <section className="max-w-2xl mx-auto px-5 py-16 md:py-24">
        <p
          className="text-xs font-bold uppercase mb-4 tracking-[0.2em]"
          style={{ color: 'var(--cor-primaria)' }}
        >
          Fale conosco
        </p>
        <h1
          className="font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase leading-none mb-4"
          style={{ fontSize: 'clamp(3rem, 7vw, 5rem)', color: '#0D1B2A' }}
        >
          CONTATO
        </h1>
        <p className="text-[#6B7280] text-base mb-10 leading-relaxed">
          Preencha o formulário abaixo e entraremos em contato. Ou fale diretamente pelo WhatsApp!
        </p>

        <ContatoForm lojaId={loja.id} waHref={waHref} />

        <div className="mt-10 pt-8 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {loja.endereco && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Endereço</p>
              <p className="text-[#374151] text-sm">{loja.endereco}</p>
              {(loja.cidade || loja.estado) && (
                <p className="text-[#374151] text-sm">{[loja.cidade, loja.estado].filter(Boolean).join(' — ')}</p>
              )}
            </div>
          )}
          {loja.horario && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-1">Horário</p>
              <p className="text-[#374151] text-sm">{loja.horario}</p>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
