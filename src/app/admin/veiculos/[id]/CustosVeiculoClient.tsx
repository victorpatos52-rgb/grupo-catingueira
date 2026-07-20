'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAquisicao, saveValorVenda, saveCustoManutencao, deleteCustoManutencao } from '@/app/actions'
import { formatarPreco, calcularDiasEstoque } from '@/lib/utils'
import type { Veiculo, FinanceiroVeiculo, CustoManutencao } from '@/types'

const CATEGORIAS = ['Manutenção', 'Transporte', 'Estética', 'Documentação', 'Cortesia pós-venda', 'Outros']

interface Props {
  veiculo: Veiculo
  financeiro: FinanceiroVeiculo | null
  custos: CustoManutencao[]
  lojaId: string
  secao: 'financeiro' | 'checklist'
}

interface NovoCusto {
  categoria: string
  descricao: string
  valor: string
  data: string
}

const inputCls =
  'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all placeholder-[#D1D5DB]'
const labelCls =
  'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'

export default function CustosVeiculoClient({
  veiculo,
  financeiro,
  custos: initialCustos,
  lojaId,
  secao,
}: Props) {
  const router = useRouter()

  // ── Aquisição ──────────────────────────────────────────────────────────────
  function formatarInput(raw: string) {
    const numeros = raw.replace(/\D/g, '')
    if (!numeros) return ''
    const valor = parseInt(numeros) / 100
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const [custoAquisicao, setCustoAquisicao] = useState(
    financeiro?.custo_aquisicao != null
      ? (financeiro.custo_aquisicao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : ''
  )
  const [salvandoAquisicao, setSalvandoAquisicao] = useState(false)
  const [aquisicaoOk, setAquisicaoOk] = useState(false)

  // ── Valor de venda ─────────────────────────────────────────────────────────
  const [valorVenda, setValorVenda] = useState(
    financeiro?.preco_venda != null
      ? (financeiro.preco_venda).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : ''
  )
  const [salvandoVenda, setSalvandoVenda] = useState(false)
  const [vendaOk, setVendaOk] = useState(false)

  // ── Custos / Serviços ──────────────────────────────────────────────────────
  const [custos, setCustos] = useState(initialCustos)
  const [adicionando, setAdicionando] = useState(false)
  const [novoCusto, setNovoCusto] = useState<NovoCusto>({
    categoria: CATEGORIAS[0],
    descricao: '',
    valor: '',
    data: new Date().toISOString().split('T')[0],
  })
  const [salvandoCusto, setSalvandoCusto] = useState(false)
  const [deletandoCusto, setDeletandoCusto] = useState<string | null>(null)

  // ── Cálculos financeiros ───────────────────────────────────────────────────
  const custoAqNum = parseFloat(custoAquisicao.replace(/\./g, '').replace(',', '.')) || 0
  const valorVendaNum = parseFloat(valorVenda.replace(/\./g, '').replace(',', '.')) || 0
  const totalAdicionais = custos.reduce((a, c) => a + c.valor, 0)
  const custoTotal = custoAqNum + totalAdicionais
  const precoVenda = valorVendaNum > 0 ? valorVendaNum : veiculo.preco
  const usandoValorVenda = valorVendaNum > 0
  const lucroBruto = precoVenda - custoAqNum
  const lucroLiquido = precoVenda - custoTotal
  const margem = precoVenda > 0 ? (lucroLiquido / precoVenda) * 100 : 0
  const diasEstoque = calcularDiasEstoque(veiculo.data_aquisicao, financeiro?.data_venda)

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleSalvarAquisicao(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoAquisicao(true)
    setAquisicaoOk(false)
    try {
      await saveAquisicao(veiculo.id, lojaId, custoAqNum, financeiro?.id)
      setAquisicaoOk(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvandoAquisicao(false)
    }
  }

  async function handleSalvarVenda(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoVenda(true)
    setVendaOk(false)
    try {
      await saveValorVenda(veiculo.id, lojaId, valorVendaNum, financeiro?.id)
      setVendaOk(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvandoVenda(false)
    }
  }

  async function handleAdicionarCusto(e: React.FormEvent) {
    e.preventDefault()
    const valor = parseFloat(novoCusto.valor.replace(',', '.'))
    if (!novoCusto.descricao.trim() || isNaN(valor) || valor <= 0) return
    setSalvandoCusto(true)
    try {
      await saveCustoManutencao({
        veiculo_id: veiculo.id,
        loja_id: lojaId,
        categoria: novoCusto.categoria,
        descricao: novoCusto.descricao,
        valor,
        data: novoCusto.data || null,
      })
      setCustos(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          veiculo_id: veiculo.id,
          loja_id: lojaId,
          categoria: novoCusto.categoria,
          descricao: novoCusto.descricao,
          valor,
          data: novoCusto.data || null,
          created_at: new Date().toISOString(),
        },
      ])
      setNovoCusto({
        categoria: CATEGORIAS[0],
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
      })
      setAdicionando(false)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvandoCusto(false)
    }
  }

  async function handleDeletar(id: string) {
    if (!confirm('Remover este item?')) return
    setDeletandoCusto(id)
    try {
      await deleteCustoManutencao(id, veiculo.id)
      setCustos(prev => prev.filter(c => c.id !== id))
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar')
    } finally {
      setDeletandoCusto(null)
    }
  }

  // ── Labels dinâmicos por seção ─────────────────────────────────────────────
  const isChecklist = secao === 'checklist'
  const tituloLista = isChecklist ? 'Serviços realizados' : 'Custos adicionais'
  const textoBotaoAdicionar = isChecklist ? 'Adicionar serviço' : 'Adicionar custo'
  const textoVazio = isChecklist
    ? 'Nenhum serviço registrado.'
    : 'Nenhum custo adicional registrado.'
  const totalLabel = isChecklist ? 'Total serviços' : 'Total adicionais'

  // ── Lista compartilhada ────────────────────────────────────────────────────
  const secaoLista = (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <h3 className="text-[#111827] font-semibold text-sm">{tituloLista}</h3>
        <button
          onClick={() => setAdicionando(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D0D0D0] transition-colors bg-white"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {textoBotaoAdicionar}
        </button>
      </div>

      {adicionando && (
        <form onSubmit={handleAdicionarCusto} className="px-5 py-4 bg-[#FFFBEB] border-b border-[#E5E7EB]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <div>
              <label className={labelCls}>Categoria</label>
              <select
                value={novoCusto.categoria}
                onChange={e => setNovoCusto(p => ({ ...p, categoria: e.target.value }))}
                className={inputCls}
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Descrição</label>
              <input
                required
                value={novoCusto.descricao}
                onChange={e => setNovoCusto(p => ({ ...p, descricao: e.target.value }))}
                className={inputCls}
                placeholder="Ex: Troca de óleo"
              />
            </div>
            <div>
              <label className={labelCls}>Valor (R$)</label>
              <input
                required
                type="number"
                min={0}
                step={0.01}
                value={novoCusto.valor}
                onChange={e => setNovoCusto(p => ({ ...p, valor: e.target.value }))}
                className={inputCls}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className={labelCls}>Data</label>
              <input
                type="date"
                value={novoCusto.data}
                onChange={e => setNovoCusto(p => ({ ...p, data: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={salvandoCusto}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
            >
              {salvandoCusto ? 'Salvando...' : 'Adicionar'}
            </button>
            <button
              type="button"
              onClick={() => setAdicionando(false)}
              className="px-4 py-2 rounded-xl text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] hover:border-[#D0D0D0] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {custos.length === 0 ? (
        <p className="px-5 py-8 text-center text-[#9CA3AF] text-sm">{textoVazio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {['Categoria', 'Descrição', 'Valor', 'Data', ''].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-2.5 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {custos.map(c => (
                <tr key={c.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-[#F3F4F6] text-[#6B7280] font-medium">
                      {c.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[#111827]">{c.descricao}</td>
                  <td className="px-4 py-3 text-[#111827] font-semibold">{formatarPreco(c.valor)}</td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {c.data ? new Date(c.data + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDeletar(c.id)}
                      disabled={deletandoCusto === c.id}
                      className="text-[#D1D5DB] hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
                <td colSpan={2} className="px-4 py-2.5 text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">
                  {totalLabel}
                </td>
                <td className="px-4 py-2.5 text-[#111827] font-bold">{formatarPreco(totalAdicionais)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )

  // ── Aba Checklist ──────────────────────────────────────────────────────────
  if (secao === 'checklist') {
    return <div className="space-y-4">{secaoLista}</div>
  }

  // ── Aba Financeiro ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Custo de aquisição */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h3 className="text-[#111827] font-semibold text-sm mb-4">Custo de aquisição</h3>
        <form onSubmit={handleSalvarAquisicao} className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>Valor de aquisição (R$)</label>
            <input
              type="text"
              inputMode="numeric"
              value={custoAquisicao}
              onChange={e => { setCustoAquisicao(formatarInput(e.target.value)); setAquisicaoOk(false) }}
              className={inputCls}
              placeholder="0,00"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={salvandoAquisicao}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
            >
              {salvandoAquisicao ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          {aquisicaoOk && (
            <span className="text-green-600 text-sm font-medium">✓ Salvo</span>
          )}
        </form>
      </div>

      {/* Valor de venda final */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h3 className="text-[#111827] font-semibold text-sm mb-4">Valor de venda final</h3>
        <form onSubmit={handleSalvarVenda} className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <label className={labelCls}>Valor de venda (R$)</label>
            <input
              type="text"
              inputMode="numeric"
              value={valorVenda}
              onChange={e => { setValorVenda(formatarInput(e.target.value)); setVendaOk(false) }}
              className={inputCls}
              placeholder="0,00"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={salvandoVenda}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
            >
              {salvandoVenda ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          {vendaOk && (
            <span className="text-green-600 text-sm font-medium">✓ Salvo</span>
          )}
        </form>
      </div>

      {/* Custos adicionais */}
      {secaoLista}

      {/* Resultado */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h3 className="text-[#111827] font-semibold text-sm mb-4">Resultado</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Custo de aquisição', valor: formatarPreco(custoAqNum), cor: 'text-[#111827]' },
            { label: 'Custos adicionais', valor: formatarPreco(totalAdicionais), cor: 'text-[#111827]' },
            { label: 'Custo total', valor: formatarPreco(custoTotal), cor: 'text-[#111827] font-bold' },
            {
              label: usandoValorVenda ? 'Valor de venda' : 'Preço anunciado',
              valor: formatarPreco(precoVenda),
              cor: 'text-[#111827]',
            },
            {
              label: 'Lucro bruto',
              valor: formatarPreco(lucroBruto),
              cor: lucroBruto >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold',
            },
            {
              label: 'Lucro líquido',
              valor: formatarPreco(lucroLiquido),
              cor: lucroLiquido >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold',
            },
            {
              label: 'Margem %',
              valor: `${margem.toFixed(1)}%`,
              cor: margem >= 0 ? 'text-green-700 font-bold' : 'text-red-600 font-bold',
            },
            { label: 'Dias em estoque', valor: `${diasEstoque}d`, cor: 'text-[#6B7280]' },
          ].map(item => (
            <div key={item.label} className="bg-[#F9FAFB] rounded-xl p-3 border border-[#E5E7EB]">
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">{item.label}</p>
              <p className={`text-base font-[family-name:var(--font-barlow-condensed)] font-black ${item.cor}`}>
                {item.valor}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
