import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLoja } from '@/lib/getLoja'
import BotaoWhatsApp from '@/components/ui/BotaoWhatsApp'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import GaleriaClient from './GaleriaClient'
import { formatarPreco, formatarKm } from '@/lib/utils'
import type { Veiculo } from '@/types'

export default async function VeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const loja = await getLoja()
  const supabase = await createServerSupabase()

  const { data } = await supabase.from('veiculos').select('*').eq('id', id).single()
  if (!data) notFound()

  const veiculo = data as Veiculo
  if (loja && veiculo.loja_id !== loja.id) notFound()

  const { data: similares } = await supabase
    .from('veiculos')
    .select('*')
    .eq('loja_id', veiculo.loja_id)
    .eq('status', 'disponivel')
    .neq('id', veiculo.id)
    .limit(3)

  const veiculosSimilares = (similares ?? []) as Veiculo[]

  const statusLabel: Record<string, { label: string; cls: string }> = {
    disponivel: { label: 'Disponível', cls: 'bg-green-100 text-green-700' },
    reservado: { label: 'Reservado', cls: 'bg-amber-400 text-black' },
    vendido: { label: 'Vendido', cls: 'bg-red-100 text-red-700' },
    manutencao: { label: 'Em manutenção', cls: 'bg-gray-100 text-gray-700' },
  }

  const badge = statusLabel[veiculo.status] ?? statusLabel.disponivel
  const specs = [
    { label: 'Ano', value: String(veiculo.ano) },
    { label: 'Quilometragem', value: formatarKm(veiculo.km) },
    { label: 'Câmbio', value: veiculo.cambio },
    { label: 'Combustível', value: veiculo.combustivel },
    { label: 'Cor', value: veiculo.cor },
    ...(veiculo.versao ? [{ label: 'Versão', value: veiculo.versao }] : []),
  ]

  const waMsg = `Olá! Tenho interesse no ${veiculo.marca} ${veiculo.modelo} ${veiculo.ano} — ${formatarPreco(veiculo.preco)}`
  const waNum = loja?.whatsapp ?? ''
  const waHref = waNum ? `https://wa.me/55${waNum.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}` : '#'

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 pt-8 pb-4">
        <Link
          href="/estoque"
          className="text-[#6B7280] hover:text-[#111] text-sm transition-colors inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao estoque
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 grid grid-cols-1 lg:grid-cols-[55%_45%] gap-10 items-start">
        {/* Galeria interativa */}
        <GaleriaClient
          fotos={veiculo.fotos}
          titulo={`${veiculo.marca} ${veiculo.modelo}`}
          statusLabel={badge.label}
          statusCls={badge.cls}
        />

        {/* Informações */}
        <div className="flex flex-col gap-6">
          {/* Badge da loja */}
          {loja && (
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--cor-primaria)' }}
            >
              {loja.nome}
            </p>
          )}

          {/* Título */}
          <div>
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-black uppercase leading-tight text-[#0D0D0D]">
              {veiculo.marca} {veiculo.modelo}
            </h1>
            {veiculo.versao && (
              <p className="text-lg text-gray-500 mt-1">{veiculo.versao} · {veiculo.ano}</p>
            )}
            {!veiculo.versao && (
              <p className="text-lg text-gray-500 mt-1">{veiculo.ano}</p>
            )}
          </div>

          {/* Preço */}
          <div
            className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-black"
            style={{ color: 'var(--cor-primaria)' }}
          >
            {formatarPreco(veiculo.preco)}
          </div>

          {/* CTA buttons */}
          {veiculo.status === 'disponivel' && loja && (
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-xl bg-[#25D366] text-white font-bold text-sm uppercase tracking-wide hover:brightness-95 transition-all"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                Tenho interesse — WhatsApp
              </a>
            </div>
          )}

          {/* Especificações */}
          <div className="bg-[#F8F8F8] rounded-xl p-6">
            <h2 className="font-semibold text-[#111] mb-4 text-sm uppercase tracking-wider">
              Especificações
            </h2>
            <div className="grid grid-cols-3 gap-x-4 gap-y-4">
              {specs.map(s => (
                <div key={s.label}>
                  <p className="text-gray-400 text-xs uppercase tracking-wide">{s.label}</p>
                  <p className="text-[#111] font-semibold mt-0.5 text-sm">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Opcionais */}
          {veiculo.opcionais.length > 0 && (
            <div className="bg-[#F8F8F8] rounded-xl p-6">
              <h2 className="font-semibold text-[#111] mb-4 text-sm uppercase tracking-wider">
                Opcionais
              </h2>
              <div className="flex flex-wrap gap-2">
                {veiculo.opcionais.map(op => (
                  <span
                    key={op}
                    className="text-xs px-3 py-1 rounded-full bg-white border border-[#E5E5E5] text-[#374151]"
                  >
                    {op}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          {veiculo.descricao && (
            <div>
              <h2 className="font-[family-name:var(--font-barlow-condensed)] text-sm font-bold uppercase tracking-wider text-[#111] mb-3">
                SOBRE ESTE VEÍCULO
              </h2>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-line">
                {veiculo.descricao}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Similares */}
      {veiculosSimilares.length > 0 && loja && (
        <section className="border-t border-[#F0F0F0] px-4 py-16 bg-[#F8F8F8]">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111] mb-8">
              Mais{' '}
              <span style={{ color: 'var(--cor-primaria)' }}>{veiculo.marca}</span>{' '}
              no estoque
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {veiculosSimilares.map(v => (
                <VeiculoCard key={v.id} veiculo={v} loja={loja} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
