import { notFound } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'
import { getLoja } from '@/lib/getLoja'
import BotaoWhatsApp from '@/components/ui/BotaoWhatsApp'
import VeiculoCard from '@/components/veiculo/VeiculoCard'
import { formatarPreco, formatarKm, calcularDiasEstoque } from '@/lib/utils'
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
    .eq('marca', veiculo.marca)
    .eq('status', 'disponivel')
    .neq('id', veiculo.id)
    .limit(3)

  const veiculosSimilares = (similares ?? []) as Veiculo[]

  const statusLabel: Record<string, { label: string; className: string }> = {
    disponivel: { label: 'Disponível', className: 'bg-green-600 text-white' },
    reservado: { label: 'Reservado', className: 'bg-yellow-500 text-black' },
    vendido: { label: 'Vendido', className: 'bg-red-600 text-white' },
    manutencao: { label: 'Em manutenção', className: 'bg-gray-500 text-white' },
  }

  const badge = statusLabel[veiculo.status]
  const diasEstoque = calcularDiasEstoque(veiculo.data_aquisicao)

  const specs = [
    { label: 'Ano', value: String(veiculo.ano) },
    { label: 'Quilometragem', value: formatarKm(veiculo.km) },
    { label: 'Câmbio', value: veiculo.cambio },
    { label: 'Combustível', value: veiculo.combustivel },
    { label: 'Cor', value: veiculo.cor },
    ...(veiculo.versao ? [{ label: 'Versão', value: veiculo.versao }] : []),
    ...(veiculo.placa ? [{ label: 'Placa', value: veiculo.placa }] : []),
    { label: 'No estoque há', value: `${diasEstoque} dias` },
  ]

  return (
    <main className="min-h-screen bg-[#0D0D0D]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          href="/estoque"
          className="text-[#666] hover:text-white text-sm transition-colors inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao estoque
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Galeria */}
        <div>
          {veiculo.fotos.length > 0 ? (
            <div className="space-y-3">
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1A1A1A]">
                <Image
                  src={veiculo.fotos[0]}
                  alt={`${veiculo.marca} ${veiculo.modelo}`}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                <span
                  className={`absolute top-3 left-3 text-xs font-bold uppercase px-3 py-1 rounded-full ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>
              {veiculo.fotos.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {veiculo.fotos.slice(1, 5).map((foto, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden bg-[#1A1A1A]"
                    >
                      <Image
                        src={foto}
                        alt={`Foto ${i + 2}`}
                        fill
                        className="object-cover"
                        sizes="25vw"
                      />
                      {i === 3 && veiculo.fotos.length > 5 && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            +{veiculo.fotos.length - 5}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[4/3] rounded-xl bg-[#1A1A1A] flex items-center justify-center">
              <svg
                className="w-20 h-20 text-[#333]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex flex-col gap-6">
          <div>
            {loja && (
              <p
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: 'var(--cor-primaria)' }}
              >
                {loja.nome}
              </p>
            )}
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-4xl md:text-5xl font-black uppercase leading-tight text-white">
              {veiculo.marca} {veiculo.modelo}
            </h1>
            {veiculo.versao && <p className="text-[#888] mt-1">{veiculo.versao}</p>}
          </div>

          <div
            className="text-4xl font-[family-name:var(--font-barlow-condensed)] font-black"
            style={{ color: 'var(--cor-primaria)' }}
          >
            {formatarPreco(veiculo.preco)}
          </div>

          {loja && veiculo.status === 'disponivel' && (
            <BotaoWhatsApp
              whatsapp={loja.whatsapp}
              veiculo={veiculo}
              texto="Tenho interesse — WhatsApp"
              tamanho="lg"
              className="w-full"
            />
          )}

          {/* Especificações */}
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
              Especificações
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {specs.map(s => (
                <div key={s.label}>
                  <p className="text-[#555] text-xs uppercase tracking-wide">{s.label}</p>
                  <p className="text-white font-medium mt-0.5">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Opcionais */}
          {veiculo.opcionais.length > 0 && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <h2 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">
                Opcionais
              </h2>
              <div className="flex flex-wrap gap-2">
                {veiculo.opcionais.map(op => (
                  <span
                    key={op}
                    className="text-xs px-3 py-1 rounded-full border border-[#333] text-[#ccc]"
                  >
                    {op}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Descrição */}
          {veiculo.descricao && (
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
              <h2 className="font-semibold text-white mb-3 text-sm uppercase tracking-wider">
                Descrição
              </h2>
              <p className="text-[#999] text-sm leading-relaxed whitespace-pre-line">
                {veiculo.descricao}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Similares */}
      {veiculosSimilares.length > 0 && loja && (
        <section className="border-t border-[#1A1A1A] px-4 py-16">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white mb-8">
              Outros{' '}
              <span style={{ color: 'var(--cor-primaria)' }}>{veiculo.marca}</span> no estoque
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
