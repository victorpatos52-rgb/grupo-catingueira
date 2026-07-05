'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { salvarLancamentoFinanceiro, deletarLancamentoFinanceiro } from '@/app/actions'
import type { LancamentoFinanceiro, TipoLancamento, UsuarioPerfil } from '@/types'

// ── Tipos exportados (usados em page.tsx) ─────────────────────────────────────

export interface VendaResumo {
  id: string
  valor_venda: number
  desconto: number
  valor_liquido: number
  data_venda: string
  veiculo_id: string
  veiculo: { marca: string; modelo: string; ano: number } | null
}

export interface FinVeiculoSimples {
  veiculo_id: string
  custo_aquisicao: number
}

export interface CustoManutSimples {
  veiculo_id: string
  valor: number
}

export interface DadosMensais {
  mes: number
  receitas: number
  despesas: number
  vendidos: number
}

export interface VendaFinanciadaSimples {
  id: string
  numero_venda: string | null
  comprador_nome: string
  data_venda: string
  pagamento_financeira_nome: string | null
  pagamento_financeira_valor: number
}

interface Props {
  perfil: UsuarioPerfil
  lojaId: string
  vendas: VendaResumo[]
  financeiroVeiculos: FinVeiculoSimples[]
  custosManut: CustoManutSimples[]
  dadosAnuais: DadosMensais[]
  lancamentos: LancamentoFinanceiro[]
  vendasFinanciadas: VendaFinanciadaSimples[]
  ano: number
  mes: number
  periodoInicio: string
  periodoFim: string
  personalizado: boolean
}

// ── Constantes ────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const CATEGORIAS = [
  'Salário','Escritório','Utilidades','Marketing',
  'Contabilidade','Manutenção','Combustível','Comissão','Outros',
]

const CATEGORIA_COR: Record<string, string> = {
  'Salário':       'bg-blue-50 text-blue-700 border border-blue-200',
  'Escritório':    'bg-slate-50 text-slate-700 border border-slate-200',
  'Utilidades':    'bg-amber-50 text-amber-700 border border-amber-200',
  'Marketing':     'bg-purple-50 text-purple-700 border border-purple-200',
  'Contabilidade': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  'Manutenção':    'bg-orange-50 text-orange-700 border border-orange-200',
  'Combustível':   'bg-yellow-50 text-yellow-700 border border-yellow-200',
  'Comissão':      'bg-green-50 text-green-700 border border-green-200',
  'Outros':        'bg-gray-50 text-gray-600 border border-gray-200',
}

const ANOS = [2024, 2025, 2026, 2027]

const CATEGORIAS_LANCAMENTO = [
  { value: 'comissao_financeira', label: 'Comissão financeira' },
  { value: 'outras_receitas', label: 'Outras receitas' },
  { value: 'despesa_manual', label: 'Despesa manual' },
]

function formatarCategoriaLancamento(categoria: string) {
  const preset = CATEGORIAS_LANCAMENTO.find(c => c.value === categoria)
  if (preset) return preset.label
  return categoria.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase())
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function CardResumo({
  label,
  valor,
  cor,
  icone,
}: {
  label: string
  valor: string
  cor: string
  icone: React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor}`}>
          {icone}
        </div>
      </div>
      <p className="text-[#111] font-bold text-xl">{valor}</p>
    </div>
  )
}

const inputCls = 'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all placeholder-[#D1D5DB]'
const labelCls = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'

// ── Componente principal ──────────────────────────────────────────────────────

export default function FinanceiroClient({
  perfil,
  lojaId,
  vendas,
  financeiroVeiculos,
  custosManut,
  dadosAnuais,
  lancamentos,
  vendasFinanciadas,
  ano,
  mes,
  periodoInicio,
  periodoFim,
  personalizado,
}: Props) {
  const router = useRouter()
  const ehSocio = perfil.perfil === 'socio'
  const [abaAtiva, setAbaAtiva] = useState<'balanco' | 'receitas' | 'movimentacoes' | 'anual'>('balanco')

  // ── Filtros ─────────────────────────────────────────────────────────────────
  const [modoPersonalizado, setModoPersonalizado] = useState(personalizado)
  const [filtroMes, setFiltroMes] = useState(mes)
  const [filtroAno, setFiltroAno] = useState(ano)
  const [filtroInicio, setFiltroInicio] = useState(periodoInicio)
  const [filtroFim, setFiltroFim] = useState(periodoFim)

  function aplicarFiltro() {
    if (modoPersonalizado) {
      router.push(`/admin/financeiro?periodo_inicio=${filtroInicio}&periodo_fim=${filtroFim}`)
    } else {
      router.push(`/admin/financeiro?mes=${filtroMes}&ano=${filtroAno}`)
    }
  }

  // ── Cálculos ─────────────────────────────────────────────────────────────────
  const totalEntradasLancamentos = useMemo(
    () => lancamentos.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0),
    [lancamentos]
  )
  const totalSaidasLancamentos = useMemo(
    () => lancamentos.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0),
    [lancamentos]
  )

  const stats = useMemo(() => {
    // DRE geral da loja: soma vendas + lançamentos manuais (que agora também
    // incluem o que antes era despesa — uma única fonte, sem duplicidade).
    // O DRE por veículo, calculado abaixo em vendasComLucro/topVeiculos, não muda.
    const totalReceitas = vendas.reduce((a, v) => a + v.valor_liquido, 0) + totalEntradasLancamentos
    const totalDespesas = totalSaidasLancamentos
    const lucroLiquido = totalReceitas - totalDespesas

    const porCategoria = lancamentos
      .filter(l => l.tipo === 'saida')
      .reduce((acc, l) => {
        acc[l.categoria] = (acc[l.categoria] ?? 0) + l.valor
        return acc
      }, {} as Record<string, number>)

    const topVeiculos = vendas.map(v => {
      const fin = financeiroVeiculos.find(f => f.veiculo_id === v.veiculo_id)
      const manut = custosManut
        .filter(c => c.veiculo_id === v.veiculo_id)
        .reduce((a, c) => a + c.valor, 0)
      const custo = (fin?.custo_aquisicao ?? 0) + manut
      const lucro = v.valor_liquido - custo
      return { ...v, custo, lucro }
    }).sort((a, b) => b.lucro - a.lucro).slice(0, 5)

    return { totalReceitas, totalDespesas, lucroLiquido, porCategoria, topVeiculos }
  }, [vendas, lancamentos, financeiroVeiculos, custosManut, totalEntradasLancamentos, totalSaidasLancamentos])

  const vendasComLucro = useMemo(() => vendas.map(v => {
    const fin = financeiroVeiculos.find(f => f.veiculo_id === v.veiculo_id)
    const manut = custosManut
      .filter(c => c.veiculo_id === v.veiculo_id)
      .reduce((a, c) => a + c.valor, 0)
    const custo = (fin?.custo_aquisicao ?? 0) + manut
    return {
      ...v,
      custoAquisicao: fin?.custo_aquisicao ?? 0,
      custosManut: manut,
      custo,
      lucro: v.valor_liquido - custo,
    }
  }), [vendas, financeiroVeiculos, custosManut])

  const totalVendido = vendasComLucro.reduce((a, v) => a + v.valor_venda, 0)
  const totalLucroVeiculos = vendasComLucro.reduce((a, v) => a + v.lucro, 0)
  const ticketMedio = vendas.length > 0 ? totalVendido / vendas.length : 0
  const mediaLucro = vendas.length > 0 ? totalLucroVeiculos / vendas.length : 0

  const chartData = dadosAnuais.map(d => ({
    name: MESES[d.mes - 1].slice(0, 3),
    Despesas: d.despesas,
    Receitas: d.receitas,
    Lucro: d.receitas - d.despesas,
  }))

  const totalAnual = dadosAnuais.reduce(
    (a, d) => ({
      despesas: a.despesas + d.despesas,
      receitas: a.receitas + d.receitas,
      vendidos: a.vendidos + d.vendidos,
    }),
    { despesas: 0, receitas: 0, vendidos: 0 }
  )

  // ── Lançamentos financeiros manuais (aba "Movimentações", inclui despesas) ──

  const [filtroCategoriaLanc, setFiltroCategoriaLanc] = useState('todas')
  const [filtroTipoLanc, setFiltroTipoLanc] = useState<'todos' | TipoLancamento>('todos')

  const categoriasDisponiveis = useMemo(() => {
    const set = new Set<string>(CATEGORIAS_LANCAMENTO.map(c => c.value))
    lancamentos.forEach(l => set.add(l.categoria))
    return Array.from(set)
  }, [lancamentos])

  const lancamentosFiltrados = useMemo(() => lancamentos.filter(l =>
    (filtroCategoriaLanc === 'todas' || l.categoria === filtroCategoriaLanc) &&
    (filtroTipoLanc === 'todos' || l.tipo === filtroTipoLanc)
  ), [lancamentos, filtroCategoriaLanc, filtroTipoLanc])

  const totalEntradasFiltradas = useMemo(
    () => lancamentosFiltrados.filter(l => l.tipo === 'entrada').reduce((a, l) => a + l.valor, 0),
    [lancamentosFiltrados]
  )
  const totalSaidasFiltradas = useMemo(
    () => lancamentosFiltrados.filter(l => l.tipo === 'saida').reduce((a, l) => a + l.valor, 0),
    [lancamentosFiltrados]
  )
  const saldoFiltrado = totalEntradasFiltradas - totalSaidasFiltradas

  // Formulário genérico (também usado pelo atalho "Outras receitas" e pela edição)
  const [lancFormAberto, setLancFormAberto] = useState(false)
  const [editandoLancamento, setEditandoLancamento] = useState<LancamentoFinanceiro | null>(null)
  const [lTipo, setLTipo] = useState<TipoLancamento>('entrada')
  const [lCategoria, setLCategoria] = useState('outras_receitas')
  const [lCategoriaLivre, setLCategoriaLivre] = useState('')
  const [lDescricao, setLDescricao] = useState('')
  const [lValor, setLValor] = useState('')
  const [lData, setLData] = useState(new Date().toISOString().split('T')[0])
  const [lRecorrente, setLRecorrente] = useState(false)
  const [salvandoLanc, setSalvandoLanc] = useState(false)
  const [erroLanc, setErroLanc] = useState<string | null>(null)
  const [deletandoLancId, setDeletandoLancId] = useState<string | null>(null)

  function resetLancForm() {
    setLTipo('entrada'); setLCategoria('outras_receitas'); setLCategoriaLivre('')
    setLDescricao(''); setLValor(''); setLData(new Date().toISOString().split('T')[0])
    setLRecorrente(false); setErroLanc(null)
  }

  function abrirNovoLancamento() {
    setEditandoLancamento(null)
    resetLancForm()
    setLancFormAberto(true)
  }

  function abrirEditarLancamento(l: LancamentoFinanceiro) {
    setEditandoLancamento(l)
    setLTipo(l.tipo)
    const presetExiste = CATEGORIAS_LANCAMENTO.some(c => c.value === l.categoria)
    setLCategoria(presetExiste ? l.categoria : '__outra__')
    setLCategoriaLivre(presetExiste ? '' : l.categoria)
    setLDescricao(l.descricao ?? '')
    // String(número) — não usar formatação pt-BR aqui, senão o separador de milhar
    // ("1.234,56") quebra o parseFloat(lValor.replace(',', '.')) do submit.
    setLValor(String(l.valor))
    setLData(l.data)
    setLRecorrente(l.recorrente)
    setErroLanc(null)
    setLancFormAberto(true)
    setRetornoAberto(false)
  }

  function fecharLancForm() { setLancFormAberto(false); setEditandoLancamento(null) }

  async function handleSalvarLancamento(e: React.FormEvent) {
    e.preventDefault()
    const valorNum = parseFloat(lValor.replace(',', '.'))
    const categoriaFinal = lCategoria === '__outra__' ? lCategoriaLivre.trim() : lCategoria
    if (!categoriaFinal) { setErroLanc('Categoria obrigatória'); return }
    if (isNaN(valorNum) || valorNum <= 0) { setErroLanc('Valor inválido'); return }
    setSalvandoLanc(true); setErroLanc(null)
    try {
      await salvarLancamentoFinanceiro({
        loja_id: lojaId,
        tipo: lTipo,
        categoria: categoriaFinal,
        descricao: lDescricao.trim() || null,
        valor: valorNum,
        data: lData,
        recorrente: lTipo === 'saida' && lRecorrente,
      }, editandoLancamento?.id)
      fecharLancForm()
      router.refresh()
    } catch (err: unknown) {
      setErroLanc(err instanceof Error ? err.message : 'Erro ao salvar lançamento')
    } finally {
      setSalvandoLanc(false)
    }
  }

  async function handleDeletarLancamento(id: string) {
    if (!confirm('Excluir este lançamento?')) return
    setDeletandoLancId(id)
    try {
      await deletarLancamentoFinanceiro(id)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir')
    } finally {
      setDeletandoLancId(null)
    }
  }

  // Retorno financeira/banco
  const [retornoAberto, setRetornoAberto] = useState(false)
  const [rVendaId, setRVendaId] = useState('')
  const [rValorBanco, setRValorBanco] = useState('')
  const [rValorComissao, setRValorComissao] = useState('')
  const [rData, setRData] = useState(new Date().toISOString().split('T')[0])
  const [salvandoRetorno, setSalvandoRetorno] = useState(false)
  const [erroRetorno, setErroRetorno] = useState<string | null>(null)

  const vendaSelecionadaRetorno = vendasFinanciadas.find(v => v.id === rVendaId) ?? null

  function abrirRetorno() {
    setRVendaId(''); setRValorBanco(''); setRValorComissao('')
    setRData(new Date().toISOString().split('T')[0])
    setErroRetorno(null)
    setRetornoAberto(true)
  }

  function fecharRetorno() { setRetornoAberto(false) }

  async function handleSalvarRetorno(e: React.FormEvent) {
    e.preventDefault()
    const comissaoNum = parseFloat(rValorComissao.replace(',', '.'))
    const bancoNum = parseFloat(rValorBanco.replace(',', '.'))
    if (!rVendaId) { setErroRetorno('Selecione a venda'); return }
    if (isNaN(comissaoNum) || comissaoNum <= 0) { setErroRetorno('Valor da comissão inválido'); return }
    setSalvandoRetorno(true); setErroRetorno(null)
    try {
      await salvarLancamentoFinanceiro({
        loja_id: lojaId,
        tipo: 'entrada',
        categoria: 'comissao_financeira',
        descricao: vendaSelecionadaRetorno
          ? `Venda ${vendaSelecionadaRetorno.numero_venda ?? vendaSelecionadaRetorno.id}`
          : null,
        valor: comissaoNum,
        valor_retornado_banco: !isNaN(bancoNum) && bancoNum > 0 ? bancoNum : null,
        data: rData,
        recorrente: false,
        venda_id: rVendaId,
      })
      fecharRetorno()
      router.refresh()
    } catch (err: unknown) {
      setErroRetorno(err instanceof Error ? err.message : 'Erro ao salvar retorno')
    } finally {
      setSalvandoRetorno(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Financeiro
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            {personalizado
              ? `${fmtData(periodoInicio)} — ${fmtData(periodoFim)}`
              : `${MESES[mes - 1]} de ${ano}`}
          </p>
        </div>

        {/* Filtros */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex flex-wrap items-end gap-3 shadow-sm">
          <div className="flex rounded-lg overflow-hidden border border-[#E5E7EB] text-xs font-semibold">
            <button
              onClick={() => setModoPersonalizado(false)}
              className={`px-3 py-1.5 transition-colors ${!modoPersonalizado ? 'bg-[#F5C842] text-[#111]' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
            >
              Mês/Ano
            </button>
            <button
              onClick={() => setModoPersonalizado(true)}
              className={`px-3 py-1.5 transition-colors ${modoPersonalizado ? 'bg-[#F5C842] text-[#111]' : 'text-[#6B7280] hover:bg-[#F9FAFB]'}`}
            >
              Personalizado
            </button>
          </div>

          {!modoPersonalizado ? (
            <>
              <select
                value={filtroMes}
                onChange={e => setFiltroMes(Number(e.target.value))}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-sm text-[#111] focus:outline-none focus:border-[#F5C842]"
              >
                {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select
                value={filtroAno}
                onChange={e => setFiltroAno(Number(e.target.value))}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-sm text-[#111] focus:outline-none focus:border-[#F5C842]"
              >
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </>
          ) : (
            <>
              <div>
                <p className="text-[#9CA3AF] text-[10px] mb-0.5">De</p>
                <input
                  type="date"
                  value={filtroInicio}
                  onChange={e => setFiltroInicio(e.target.value)}
                  className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-sm text-[#111] focus:outline-none focus:border-[#F5C842]"
                />
              </div>
              <div>
                <p className="text-[#9CA3AF] text-[10px] mb-0.5">Até</p>
                <input
                  type="date"
                  value={filtroFim}
                  onChange={e => setFiltroFim(e.target.value)}
                  className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-sm text-[#111] focus:outline-none focus:border-[#F5C842]"
                />
              </div>
            </>
          )}

          <button
            onClick={aplicarFiltro}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* ── Abas ───────────────────────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-[#E5E7EB] mb-6">
        {(
          [
            { key: 'balanco', label: 'Balanço do Período' },
            { key: 'receitas', label: 'Receitas' },
            { key: 'movimentacoes', label: 'Movimentações' },
            { key: 'anual', label: 'Balanço Anual' },
          ] as const
        )
          // Sócio não vê lançamentos manuais/despesas gerais — só gerente/diretor/admin
          .filter(t => !(ehSocio && t.key === 'movimentacoes'))
          .map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key)}
            className={`px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap border-b-2 -mb-px ${
              abaAtiva === key
                ? 'border-[#F5C842] text-[#111]'
                : 'border-transparent text-[#6B7280] hover:text-[#111]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 1 — BALANÇO DO PERÍODO                                         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'balanco' && (
        <div className="space-y-6">
          {(totalEntradasLancamentos > 0 || totalSaidasLancamentos > 0) && (
            <p className="text-[#9CA3AF] text-xs">
              * Totais incluem as movimentações financeiras manuais do período ({fmt(totalEntradasLancamentos)} em entradas, {fmt(totalSaidasLancamentos)} em saídas). Veja a aba{' '}
              <button onClick={() => setAbaAtiva('movimentacoes')} className="underline hover:text-[#6B7280]">Movimentações</button>.
            </p>
          )}
          {/* Cards 2x2 / 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardResumo
              label="Total Receitas"
              valor={fmt(stats.totalReceitas)}
              cor="bg-green-50"
              icone={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <CardResumo
              label="Total Despesas"
              valor={fmt(stats.totalDespesas)}
              cor="bg-red-50"
              icone={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <CardResumo
              label="Lucro Líquido"
              valor={fmt(stats.lucroLiquido)}
              cor={stats.lucroLiquido >= 0 ? 'bg-green-50' : 'bg-red-50'}
              icone={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            />
            <CardResumo
              label="Veículos Vendidos"
              valor={String(vendas.length)}
              cor="bg-blue-50"
              icone={<svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z"/></svg>}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Despesas por categoria */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4">Despesas por categoria</h3>
              {Object.keys(stats.porCategoria).length === 0 ? (
                <p className="text-[#9CA3AF] text-sm text-center py-6">Nenhuma despesa no período.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.porCategoria)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, total]) => {
                      const pct = stats.totalDespesas > 0 ? (total / stats.totalDespesas) * 100 : 0
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${CATEGORIA_COR[cat] ?? CATEGORIA_COR['Outros']}`}>
                              {formatarCategoriaLancamento(cat)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[#9CA3AF] text-xs">{pct.toFixed(1)}%</span>
                              <span className="text-[#111] text-sm font-semibold">{fmt(total)}</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Top veículos mais lucrativos */}
            <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4">Top veículos mais lucrativos</h3>
              {stats.topVeiculos.length === 0 ? (
                <p className="text-[#9CA3AF] text-sm text-center py-6">Nenhuma venda no período.</p>
              ) : (
                <div className="space-y-3">
                  {stats.topVeiculos.map((v, i) => (
                    <div key={v.id} className="flex items-center gap-3">
                      <span className="text-[#9CA3AF] text-xs w-5 shrink-0 text-right">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#111] text-sm font-medium truncate">
                          {v.veiculo ? `${v.veiculo.marca} ${v.veiculo.modelo} ${v.veiculo.ano}` : v.veiculo_id}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-0.5">
                          <span>Custo {fmt(v.custo)}</span>
                          <span>Venda {fmt(v.valor_venda)}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${v.lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmt(v.lucro)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 3 — RECEITAS                                                   */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'receitas' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <CardResumo label="Total Vendido" valor={fmt(totalVendido)} cor="bg-green-50"
              icone={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <CardResumo label="Lucro Total" valor={fmt(totalLucroVeiculos)} cor={totalLucroVeiculos >= 0 ? 'bg-green-50' : 'bg-red-50'}
              icone={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>}
            />
            <CardResumo label="Ticket Médio" valor={fmt(ticketMedio)} cor="bg-blue-50"
              icone={<svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
            />
            <CardResumo label="Média de Lucro" valor={fmt(mediaLucro)} cor="bg-purple-50"
              icone={<svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>}
            />
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
            {vendasComLucro.length === 0 ? (
              <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">Nenhuma venda finalizada no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      {['Veículo', 'Data', 'Valor Venda', 'Custo Aq.', 'Custo Manut.', 'Lucro', 'Ver'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {vendasComLucro.map(v => (
                      <tr key={v.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3 text-[#111] font-medium whitespace-nowrap">
                          {v.veiculo ? `${v.veiculo.marca} ${v.veiculo.modelo} ${v.veiculo.ano}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtData(v.data_venda)}</td>
                        <td className="px-4 py-3 text-[#111] font-semibold whitespace-nowrap">{fmt(v.valor_venda)}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{v.custoAquisicao > 0 ? fmt(v.custoAquisicao) : '—'}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{v.custosManut > 0 ? fmt(v.custosManut) : '—'}</td>
                        <td className={`px-4 py-3 font-bold whitespace-nowrap ${v.lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {fmt(v.lucro)}
                        </td>
                        <td className="px-4 py-3">
                          {/* Sócio não acessa /admin/vendas (bloqueado no proxy) — esconde o link */}
                          {!ehSocio && (
                            <a
                              href={`/admin/vendas/${v.id}`}
                              className="text-xs text-[#F59E0B] hover:underline whitespace-nowrap"
                            >
                              Ver venda
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA — MOVIMENTAÇÕES (lançamentos manuais, inclui despesas)         */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'movimentacoes' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-bold text-[#111]">Movimentações financeiras</h2>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => { abrirNovoLancamento(); setRetornoAberto(false) }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Lançamento
              </button>
              <button
                onClick={() => {
                  setEditandoLancamento(null)
                  setLTipo('entrada'); setLCategoria('outras_receitas'); setLCategoriaLivre('')
                  setLDescricao(''); setLValor(''); setLData(new Date().toISOString().split('T')[0])
                  setLRecorrente(false); setErroLanc(null); setLancFormAberto(true); setRetornoAberto(false)
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#111] bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
              >
                Outras Receitas
              </button>
              <button
                onClick={() => { abrirRetorno(); setLancFormAberto(false) }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Retorno Financeira/Banco
              </button>
            </div>
          </div>

          {/* Cards resumo do filtro atual */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <CardResumo
              label="Total Entradas"
              valor={fmt(totalEntradasFiltradas)}
              cor="bg-green-50"
              icone={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6"/></svg>}
            />
            <CardResumo
              label="Total Saídas"
              valor={fmt(totalSaidasFiltradas)}
              cor="bg-red-50"
              icone={<svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6"/></svg>}
            />
            <CardResumo
              label="Saldo do período"
              valor={fmt(saldoFiltrado)}
              cor={saldoFiltrado >= 0 ? 'bg-green-50' : 'bg-red-50'}
              icone={<svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2z"/></svg>}
            />
          </div>

          {/* Filtros locais (categoria e tipo — o período usa o filtro do topo da página) */}
          <div className="flex flex-wrap gap-3 items-end bg-white border border-[#E5E7EB] rounded-xl p-3 shadow-sm">
            <div>
              <p className="text-[#9CA3AF] text-[10px] mb-0.5">Tipo</p>
              <select
                value={filtroTipoLanc}
                onChange={e => setFiltroTipoLanc(e.target.value as 'todos' | TipoLancamento)}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-sm text-[#111] focus:outline-none focus:border-[#F5C842] cursor-pointer"
              >
                <option value="todos">Todos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-[10px] mb-0.5">Categoria</p>
              <select
                value={filtroCategoriaLanc}
                onChange={e => setFiltroCategoriaLanc(e.target.value)}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-sm text-[#111] focus:outline-none focus:border-[#F5C842] cursor-pointer"
              >
                <option value="todas">Todas</option>
                {categoriasDisponiveis.map(c => (
                  <option key={c} value={c}>{formatarCategoriaLancamento(c)}</option>
                ))}
              </select>
            </div>
            <p className="text-[#9CA3AF] text-xs pb-1.5">
              O período usa o mesmo filtro de {personalizado ? 'datas' : 'mês/ano'} lá em cima.
            </p>
          </div>

          {/* Formulário genérico de lançamento */}
          {lancFormAberto && (
            <div className="bg-[#FFFBEB] border border-[#F5C842] rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4">
                {editandoLancamento ? 'Editar lançamento' : 'Novo lançamento'}
              </h3>

              {editandoLancamento && (editandoLancamento.venda_id || editandoLancamento.despesa_origem_id) && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4">
                  {editandoLancamento.venda_id && (
                    <p className="text-blue-700 text-xs">
                      Vinculado à venda {editandoLancamento.venda?.numero_venda ?? editandoLancamento.venda_id}
                      {editandoLancamento.valor_retornado_banco != null &&
                        ` — retorno do banco: ${fmt(editandoLancamento.valor_retornado_banco)}`}
                      . Esse vínculo não é alterado por este formulário.
                    </p>
                  )}
                  {editandoLancamento.despesa_origem_id && (
                    <p className="text-blue-700 text-xs">
                      Esta movimentação veio de uma despesa migrada — o histórico original é preservado.
                    </p>
                  )}
                </div>
              )}

              <form onSubmit={handleSalvarLancamento}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Tipo *</label>
                    <select
                      value={lTipo}
                      onChange={e => setLTipo(e.target.value as TipoLancamento)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Categoria *</label>
                    <select
                      value={lCategoria}
                      onChange={e => setLCategoria(e.target.value)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      {CATEGORIAS_LANCAMENTO.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                      <option value="__outra__">Outra (digitar)</option>
                    </select>
                  </div>
                  {lCategoria === '__outra__' && (
                    <div>
                      <label className={labelCls}>Categoria personalizada *</label>
                      <input
                        type="text"
                        value={lCategoriaLivre}
                        onChange={e => setLCategoriaLivre(e.target.value)}
                        className={inputCls}
                        placeholder="Ex: aluguel_galpao"
                      />
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>Descrição</label>
                    <input
                      type="text"
                      value={lDescricao}
                      onChange={e => setLDescricao(e.target.value)}
                      className={inputCls}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Valor (R$) *</label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={lValor}
                      onChange={e => setLValor(e.target.value)}
                      className={inputCls}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Data *</label>
                    <input type="date" value={lData} onChange={e => setLData(e.target.value)} className={inputCls} />
                  </div>
                  {lTipo === 'saida' && (
                    <div className="flex items-end pb-2">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-[#374151]">
                        <input
                          type="checkbox"
                          checked={lRecorrente}
                          onChange={e => setLRecorrente(e.target.checked)}
                          className="w-4 h-4 accent-[#F5C842]"
                        />
                        Recorrente
                      </label>
                    </div>
                  )}
                </div>

                {erroLanc && <p className="text-red-600 text-sm mb-3">{erroLanc}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={salvandoLanc}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
                  >
                    {salvandoLanc ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    onClick={fecharLancForm}
                    className="px-5 py-2 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Retorno financeira/banco */}
          {retornoAberto && (
            <div className="bg-[#EFF6FF] border border-blue-300 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-[#111] mb-4">Retorno financeira/banco</h3>
              <form onSubmit={handleSalvarRetorno}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="sm:col-span-2">
                    <label className={labelCls}>Venda financiada *</label>
                    <select
                      value={rVendaId}
                      onChange={e => setRVendaId(e.target.value)}
                      className={`${inputCls} cursor-pointer`}
                    >
                      <option value="">Selecione a venda...</option>
                      {vendasFinanciadas.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.numero_venda ?? v.id} — {v.comprador_nome} — {fmtData(v.data_venda)}
                          {' '}({v.pagamento_financeira_nome || 'financeira'}: {fmt(v.pagamento_financeira_valor)})
                        </option>
                      ))}
                    </select>
                    {vendasFinanciadas.length === 0 && (
                      <p className="text-[#9CA3AF] text-xs mt-1">Nenhuma venda finalizada com pagamento por financeira encontrada.</p>
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Valor retornado pelo banco (R$)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={rValorBanco}
                      onChange={e => setRValorBanco(e.target.value)}
                      className={inputCls}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Valor da comissão (R$) *</label>
                    <input
                      required
                      type="text"
                      inputMode="decimal"
                      value={rValorComissao}
                      onChange={e => setRValorComissao(e.target.value)}
                      className={inputCls}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Data *</label>
                    <input type="date" value={rData} onChange={e => setRData(e.target.value)} className={inputCls} />
                  </div>
                </div>

                <p className="text-[#9CA3AF] text-xs mb-3">
                  O valor retornado pelo banco fica registrado só para referência (não entra no total de receitas) — apenas o valor da comissão conta como receita no DRE.
                </p>

                {erroRetorno && <p className="text-red-600 text-sm mb-3">{erroRetorno}</p>}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={salvandoRetorno}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-blue-700 bg-blue-100 border border-blue-300 hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    {salvandoRetorno ? 'Salvando...' : 'Registrar comissão'}
                  </button>
                  <button
                    type="button"
                    onClick={fecharRetorno}
                    className="px-5 py-2 rounded-xl text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabela */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
            {lancamentosFiltrados.length === 0 ? (
              <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">Nenhum lançamento encontrado para esse filtro.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Recorrente', 'Venda', 'Ações'].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3F4F6]">
                    {lancamentosFiltrados.map(l => (
                      <tr key={l.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">{fmtData(l.data)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                            l.tipo === 'entrada'
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-red-50 text-red-600 border border-red-200'
                          }`}>
                            {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-gray-50 text-gray-600 border border-gray-200">
                            {formatarCategoriaLancamento(l.categoria)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#111]">
                          {l.descricao || '—'}
                          {l.valor_retornado_banco != null && (
                            <p className="text-[#9CA3AF] text-xs mt-0.5">
                              Retorno banco: {fmt(l.valor_retornado_banco)}
                            </p>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${l.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                          {l.tipo === 'saida' ? '- ' : ''}{fmt(l.valor)}
                        </td>
                        <td className="px-4 py-3">
                          {l.recorrente
                            ? <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-medium">Sim</span>
                            : <span className="text-[#9CA3AF] text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {l.venda ? (
                            <a href={`/admin/vendas/${l.venda.id}`} className="text-xs text-[#F59E0B] hover:underline">
                              {l.venda.numero_venda ?? 'Ver venda'}
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => abrirEditarLancamento(l)}
                              className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeletarLancamento(l.id)}
                              disabled={deletandoLancId === l.id}
                              className="text-xs text-[#6B7280] hover:text-red-600 px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {deletandoLancId === l.id ? '...' : 'Excluir'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                      <td colSpan={4} className="px-4 py-3 text-[#6B7280] text-xs font-semibold uppercase tracking-wider">
                        Saldo do filtro
                      </td>
                      <td className={`px-4 py-3 font-bold whitespace-nowrap ${saldoFiltrado >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {fmt(saldoFiltrado)}
                      </td>
                      <td colSpan={3} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ABA 4 — BALANÇO ANUAL                                              */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === 'anual' && (
        <div className="space-y-6">
          <h2 className="text-base font-bold text-[#111]">Balanço anual — {ano}</h2>

          {/* Gráfico */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9CA3AF' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                />
                <Tooltip
                  formatter={(value) => fmt(Number(value ?? 0))}
                  contentStyle={{ borderRadius: '10px', border: '1px solid #E5E7EB', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                <Bar dataKey="Despesas" fill="#FCA5A5" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Receitas" fill="#86EFAC" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="Lucro"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela mensal */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    {['Mês', 'Despesas', 'Receitas', 'Lucro', 'Veículos Vendidos'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {dadosAnuais.map(d => {
                    const lucro = d.receitas - d.despesas
                    const ehMesAtual = !personalizado && d.mes === mes && ano === filtroAno
                    return (
                      <tr
                        key={d.mes}
                        className={`hover:bg-[#FAFAFA] transition-colors ${ehMesAtual ? 'bg-[#FFFBEB]' : ''}`}
                      >
                        <td className="px-4 py-3 text-[#111] font-medium whitespace-nowrap">
                          {MESES[d.mes - 1]}
                          {ehMesAtual && <span className="ml-2 text-[10px] text-[#F59E0B] font-bold">(atual)</span>}
                        </td>
                        <td className="px-4 py-3 text-red-500 whitespace-nowrap">{d.despesas > 0 ? fmt(d.despesas) : '—'}</td>
                        <td className="px-4 py-3 text-green-600 whitespace-nowrap">{d.receitas > 0 ? fmt(d.receitas) : '—'}</td>
                        <td className={`px-4 py-3 font-semibold whitespace-nowrap ${lucro >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {d.receitas > 0 || d.despesas > 0 ? fmt(lucro) : '—'}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap">
                          {d.vendidos > 0 ? d.vendidos : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#E5E7EB] bg-[#F9FAFB]">
                    <td className="px-4 py-3 text-[#111] font-bold text-xs uppercase tracking-wider">Total</td>
                    <td className="px-4 py-3 text-red-500 font-bold whitespace-nowrap">{fmt(totalAnual.despesas)}</td>
                    <td className="px-4 py-3 text-green-600 font-bold whitespace-nowrap">{fmt(totalAnual.receitas)}</td>
                    <td className={`px-4 py-3 font-bold whitespace-nowrap ${totalAnual.receitas - totalAnual.despesas >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmt(totalAnual.receitas - totalAnual.despesas)}
                    </td>
                    <td className="px-4 py-3 text-[#111] font-bold">{totalAnual.vendidos}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
