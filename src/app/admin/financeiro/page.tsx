import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/supabase-server'
import { formatarPreco, calcularLucro, calcularDiasEstoque } from '@/lib/utils'
import type { FinanceiroVeiculo, UsuarioPerfil } from '@/types'

interface SearchParams {
  mes?: string
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const supabase = await createServerSupabase()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: perfilData } = await supabase
    .from('usuario_perfis')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!perfilData) redirect('/admin/login')
  const perfil = perfilData as UsuarioPerfil

  if (!['gerente', 'diretor', 'admin'].includes(perfil.perfil)) {
    redirect('/admin/dashboard')
  }

  let query = supabase
    .from('financeiro_veiculos')
    .select('*, veiculo:veiculos(marca, modelo, ano, data_aquisicao)')
    .eq('loja_id', perfil.loja_id)
    .order('created_at', { ascending: false })

  if (params.mes) {
    const [ano, mes] = params.mes.split('-')
    const inicio = new Date(parseInt(ano), parseInt(mes) - 1, 1).toISOString()
    const fim = new Date(parseInt(ano), parseInt(mes), 0).toISOString()
    query = query.gte('created_at', inicio).lte('created_at', fim)
  }

  const { data } = await query
  const registros = (data ?? []) as FinanceiroVeiculo[]

  const totais = registros.reduce(
    (acc, f) => {
      const r = calcularLucro(f)
      return {
        faturamento: acc.faturamento + (f.preco_venda ?? 0),
        custo: acc.custo + r.custo_total,
        lucro: acc.lucro + r.lucro_bruto,
        count: acc.count + 1,
      }
    },
    { faturamento: 0, custo: 0, lucro: 0, count: 0 }
  )

  const margemMedia = totais.faturamento > 0
    ? (totais.lucro / totais.faturamento) * 100
    : 0

  const cards = [
    { label: 'Faturamento total', valor: formatarPreco(totais.faturamento), cor: '#3B82F6' },
    { label: 'Custo total', valor: formatarPreco(totais.custo), cor: '#EF4444' },
    { label: 'Lucro total', valor: formatarPreco(totais.lucro), cor: '#22C55E' },
    { label: 'Margem média', valor: `${margemMedia.toFixed(1)}%`, cor: 'var(--cor-primaria)' },
  ]

  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
            Financeiro
          </h1>
          <p className="text-[#555] text-sm mt-1">DRE por veículo</p>
        </div>
        <input
          type="month"
          defaultValue={params.mes ?? mesAtual}
          onChange={e => {
            if (typeof window !== 'undefined') {
              window.location.href = `/admin/financeiro?mes=${e.target.value}`
            }
          }}
          className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
        />
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
            <p className="text-[#555] text-xs uppercase tracking-wider mb-2">{c.label}</p>
            <p
              className="font-[family-name:var(--font-barlow-condensed)] text-2xl font-black"
              style={{ color: c.cor }}
            >
              {c.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Tabela DRE */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A2A]">
                {[
                  'Veículo', 'Custo Aq.', 'Custos Extras', 'Custo Total',
                  'Preço Venda', 'Lucro Bruto', 'Margem %', 'Dias Estoque',
                ].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E1E1E]">
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[#555] text-sm">
                    Nenhum registro financeiro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map((f, i) => {
                  const r = calcularLucro(f)
                  const extras = f.custos_adicionais.reduce((a, c) => a + c.valor, 0)
                  const dias = f.veiculo
                    ? calcularDiasEstoque(f.veiculo.data_aquisicao!, f.data_venda)
                    : 0
                  const lucroPositivo = r.lucro_bruto >= 0

                  return (
                    <tr
                      key={f.id}
                      className={i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}
                    >
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">
                        {f.veiculo
                          ? `${f.veiculo.marca} ${f.veiculo.modelo} ${f.veiculo.ano}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#888]">{formatarPreco(f.custo_aquisicao)}</td>
                      <td className="px-4 py-3 text-[#888]">{formatarPreco(extras)}</td>
                      <td className="px-4 py-3 text-white">{formatarPreco(r.custo_total)}</td>
                      <td className="px-4 py-3 text-white">
                        {f.preco_venda ? formatarPreco(f.preco_venda) : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${lucroPositivo ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {formatarPreco(r.lucro_bruto)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${lucroPositivo ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {r.margem_percentual.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-[#888]">{dias}d</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
