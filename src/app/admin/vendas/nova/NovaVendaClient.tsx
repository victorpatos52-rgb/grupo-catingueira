'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { salvarVenda, finalizarVenda } from '@/app/actions'
import type { UsuarioPerfil, Veiculo, Venda } from '@/types'

interface Props {
  perfil: UsuarioPerfil
  veiculos: Veiculo[]
  usuarios: UsuarioPerfil[]
  lojaId: string
  vendedorId: string
  veiculoIdInicial: string | null
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function parseMoeda(s: string): number {
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

function inputMoedaDisplay(v: number): string {
  if (!v) return ''
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const inputCls = 'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all placeholder-[#D1D5DB]'
const labelCls = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'

type FormData = {
  veiculo_id: string
  numero_negociacao: string
  valor_venda: number
  comprador_nome: string
  comprador_cpf: string
  comprador_rg: string
  comprador_identidade: string
  comprador_profissao: string
  comprador_data_nasc: string
  comprador_estado_civil: string
  comprador_endereco: string
  comprador_numero: string
  comprador_bairro: string
  comprador_cep: string
  comprador_cidade: string
  comprador_uf: string
  comprador_telefone: string
  comprador_email: string
  vendedor_id: string
  data_venda: string
  hora_venda: string
  desconto: number
  valor_liquido: number
  pagamento_dinheiro: number
  pagamento_cheque1_banco: string
  pagamento_cheque1_data: string
  pagamento_cheque1_valor: number
  pagamento_cheque2_banco: string
  pagamento_cheque2_data: string
  pagamento_cheque2_valor: number
  pagamento_duplicata1_banco: string
  pagamento_duplicata1_data: string
  pagamento_duplicata1_valor: number
  pagamento_duplicata2_banco: string
  pagamento_duplicata2_data: string
  pagamento_duplicata2_valor: number
  pagamento_financeira_nome: string
  pagamento_financeira_valor: number
  pagamento_outros_desc: string
  pagamento_outros_valor: number
  origem: string
  numero_fiscal: string
  inscricao_estadual: string
  hodometro_venda: number | null
  observacoes: string
}

const hoje = new Date().toISOString().split('T')[0]

function initialForm(veiculoIdInicial: string | null, vendedorId: string): FormData {
  return {
    veiculo_id: veiculoIdInicial ?? '',
    numero_negociacao: '',
    valor_venda: 0,
    comprador_nome: '',
    comprador_cpf: '',
    comprador_rg: '',
    comprador_identidade: '',
    comprador_profissao: '',
    comprador_data_nasc: '',
    comprador_estado_civil: '',
    comprador_endereco: '',
    comprador_numero: '',
    comprador_bairro: '',
    comprador_cep: '',
    comprador_cidade: '',
    comprador_uf: '',
    comprador_telefone: '',
    comprador_email: '',
    vendedor_id: vendedorId,
    data_venda: hoje,
    hora_venda: '',
    desconto: 0,
    valor_liquido: 0,
    pagamento_dinheiro: 0,
    pagamento_cheque1_banco: '',
    pagamento_cheque1_data: '',
    pagamento_cheque1_valor: 0,
    pagamento_cheque2_banco: '',
    pagamento_cheque2_data: '',
    pagamento_cheque2_valor: 0,
    pagamento_duplicata1_banco: '',
    pagamento_duplicata1_data: '',
    pagamento_duplicata1_valor: 0,
    pagamento_duplicata2_banco: '',
    pagamento_duplicata2_data: '',
    pagamento_duplicata2_valor: 0,
    pagamento_financeira_nome: '',
    pagamento_financeira_valor: 0,
    pagamento_outros_desc: '',
    pagamento_outros_valor: 0,
    origem: '',
    numero_fiscal: '',
    inscricao_estadual: '',
    hodometro_venda: null,
    observacoes: '',
  }
}

// ── Stepper ──────────────────────────────────────────────────────────────────

const ETAPAS = ['Veículo', 'Comprador', 'Pagamento', 'Revisão']

function Stepper({ etapa }: { etapa: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {ETAPAS.map((label, i) => {
        const num = i + 1
        const concluido = num < etapa
        const ativo = num === etapa
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  concluido
                    ? 'bg-green-500 text-white'
                    : ativo
                    ? 'bg-[#F5C842] text-[#111]'
                    : 'bg-[#F3F4F6] text-[#9CA3AF]'
                }`}
              >
                {concluido ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : num}
              </div>
              <span className={`text-xs font-medium ${ativo ? 'text-[#111]' : 'text-[#9CA3AF]'}`}>{label}</span>
            </div>
            {i < ETAPAS.length - 1 && (
              <div className={`h-0.5 w-12 mx-1 mb-5 rounded transition-colors ${concluido ? 'bg-green-400' : 'bg-[#E5E7EB]'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── MoedaInput ────────────────────────────────────────────────────────────────

function MoedaInput({
  value,
  onChange,
  placeholder,
  readOnly,
  className,
}: {
  value: number
  onChange?: (v: number) => void
  placeholder?: string
  readOnly?: boolean
  className?: string
}) {
  const [raw, setRaw] = useState(value ? inputMoedaDisplay(value) : '')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const s = e.target.value.replace(/[^0-9,]/g, '')
    setRaw(s)
    onChange?.(parseMoeda(s))
  }

  function handleBlur() {
    if (value) setRaw(inputMoedaDisplay(value))
    else setRaw('')
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-sm pointer-events-none">R$</span>
      <input
        type="text"
        inputMode="decimal"
        value={readOnly ? inputMoedaDisplay(value) : raw}
        onChange={handleChange}
        onBlur={handleBlur}
        readOnly={readOnly}
        placeholder={placeholder ?? '0,00'}
        className={`${inputCls} pl-9 ${readOnly ? 'bg-[#F3F4F6] cursor-default' : ''}`}
      />
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NovaVendaClient({ veiculos, usuarios, lojaId, vendedorId, veiculoIdInicial }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState(1)
  const [buscaVeiculo, setBuscaVeiculo] = useState('')
  const [form, setForm] = useState<FormData>(() => initialForm(veiculoIdInicial, vendedorId))
  const [vendaId, setVendaId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const veiculoSelecionado = veiculos.find(v => v.id === form.veiculo_id) ?? null

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }, [])

  function calcularLiquido(vv: number, desc: number) {
    return Math.max(0, vv - desc)
  }

  function totalPagamentos() {
    return (
      form.pagamento_dinheiro +
      form.pagamento_cheque1_valor +
      form.pagamento_cheque2_valor +
      form.pagamento_duplicata1_valor +
      form.pagamento_duplicata2_valor +
      form.pagamento_financeira_valor +
      form.pagamento_outros_valor
    )
  }

  async function autoSalvar(): Promise<string> {
    const payload = {
      ...(vendaId ? { id: vendaId } : {}),
      loja_id: lojaId,
      veiculo_id: form.veiculo_id,
      vendedor_id: form.vendedor_id || null,
      numero_negociacao: form.numero_negociacao || null,
      data_venda: form.data_venda,
      hora_venda: form.hora_venda || null,
      comprador_nome: form.comprador_nome || 'Rascunho',
      comprador_cpf: form.comprador_cpf || null,
      comprador_rg: form.comprador_rg || null,
      comprador_identidade: form.comprador_identidade || null,
      comprador_data_nasc: form.comprador_data_nasc || null,
      comprador_estado_civil: form.comprador_estado_civil || null,
      comprador_profissao: form.comprador_profissao || null,
      comprador_endereco: form.comprador_endereco || null,
      comprador_numero: form.comprador_numero || null,
      comprador_bairro: form.comprador_bairro || null,
      comprador_cep: form.comprador_cep || null,
      comprador_cidade: form.comprador_cidade || null,
      comprador_uf: form.comprador_uf || null,
      comprador_telefone: form.comprador_telefone || null,
      comprador_email: form.comprador_email || null,
      valor_venda: form.valor_venda,
      desconto: form.desconto,
      valor_liquido: form.valor_liquido,
      pagamento_dinheiro: form.pagamento_dinheiro,
      pagamento_cheque1_banco: form.pagamento_cheque1_banco || null,
      pagamento_cheque1_data: form.pagamento_cheque1_data || null,
      pagamento_cheque1_valor: form.pagamento_cheque1_valor,
      pagamento_cheque2_banco: form.pagamento_cheque2_banco || null,
      pagamento_cheque2_data: form.pagamento_cheque2_data || null,
      pagamento_cheque2_valor: form.pagamento_cheque2_valor,
      pagamento_duplicata1_banco: form.pagamento_duplicata1_banco || null,
      pagamento_duplicata1_data: form.pagamento_duplicata1_data || null,
      pagamento_duplicata1_valor: form.pagamento_duplicata1_valor,
      pagamento_duplicata2_banco: form.pagamento_duplicata2_banco || null,
      pagamento_duplicata2_data: form.pagamento_duplicata2_data || null,
      pagamento_duplicata2_valor: form.pagamento_duplicata2_valor,
      pagamento_financeira_nome: form.pagamento_financeira_nome || null,
      pagamento_financeira_valor: form.pagamento_financeira_valor,
      pagamento_outros_desc: form.pagamento_outros_desc || null,
      pagamento_outros_valor: form.pagamento_outros_valor,
      origem: form.origem || null,
      numero_fiscal: form.numero_fiscal || null,
      inscricao_estadual: form.inscricao_estadual || null,
      hodometro_venda: form.hodometro_venda ?? null,
      observacoes: form.observacoes || null,
      documentos_urls: [],
      status: 'rascunho' as const,
    }
    const { id } = await salvarVenda(payload)
    setVendaId(id)
    return id
  }

  async function avancar() {
    if (etapa === 1 && form.veiculo_id) {
      setSalvando(true)
      try { await autoSalvar() } catch {}
      setSalvando(false)
    }
    if (etapa === 2) {
      setSalvando(true)
      try { await autoSalvar() } catch {}
      setSalvando(false)
    }
    setEtapa(e => e + 1)
  }

  async function handleSalvarRascunho() {
    setSalvando(true)
    setErro(null)
    try {
      const id = await autoSalvar()
      router.push(`/admin/vendas/${id}`)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar')
      setSalvando(false)
    }
  }

  async function handleFinalizar() {
    setFinalizando(true)
    setErro(null)
    try {
      const id = await autoSalvar()
      await finalizarVenda(id, form.veiculo_id)
      router.push(`/admin/vendas/${id}`)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao finalizar')
      setFinalizando(false)
    }
  }

  const podaAvancar1 = !!form.veiculo_id && form.valor_venda > 0
  const podaAvancar2 = !!form.comprador_nome.trim()

  const total = totalPagamentos()
  const diferePagamento = form.valor_liquido > 0 && Math.abs(total - form.valor_liquido) > 0.01

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
          Nova Venda
        </h1>
      </div>

      <Stepper etapa={etapa} />

      {/* ── Etapa 1: Veículo ─────────────────────────────────────────────────── */}
      {etapa === 1 && (
        <div>
          <h2 className="text-lg font-bold text-[#111] mb-4">Selecione o veículo</h2>

          {veiculos.length > 0 && (
            <div className="relative mb-5">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
              </svg>
              <input
                type="text"
                value={buscaVeiculo}
                onChange={e => setBuscaVeiculo(e.target.value)}
                placeholder="Buscar veículo..."
                className="w-full bg-white border border-[#E5E7EB] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#111] placeholder-[#9CA3AF] focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all"
              />
              {buscaVeiculo && (
                <button
                  type="button"
                  onClick={() => setBuscaVeiculo('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {veiculos.length === 0 ? (
            <p className="text-[#9CA3AF] text-sm py-8 text-center">Nenhum veículo disponível ou reservado.</p>
          ) : (() => {
            const termo = buscaVeiculo.toLowerCase().trim()
            const filtrados = termo
              ? veiculos.filter(v =>
                  v.marca.toLowerCase().includes(termo) ||
                  v.modelo.toLowerCase().includes(termo) ||
                  String(v.ano).includes(termo) ||
                  (v.placa ?? '').toLowerCase().includes(termo)
                )
              : veiculos
            if (filtrados.length === 0) {
              return (
                <p className="text-[#9CA3AF] text-sm py-8 text-center">
                  Nenhum veículo encontrado para &quot;{buscaVeiculo}&quot;.
                </p>
              )
            }
            return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filtrados.map(v => {
                const selecionado = form.veiculo_id === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      set('veiculo_id', v.id)
                      if (!form.valor_venda) set('valor_venda', v.preco)
                      if (!form.valor_liquido) set('valor_liquido', v.preco)
                    }}
                    className={`text-left rounded-xl overflow-hidden border-2 transition-all ${
                      selecionado
                        ? 'border-[#F5C842] bg-[#FEF9C3]'
                        : 'border-[#E5E7EB] bg-white hover:border-[#F5C842]/50'
                    }`}
                  >
                    <div className="relative aspect-[4/3] bg-[#F3F4F6] overflow-hidden">
                      {v.fotos?.[0] ? (
                        <Image
                          src={v.fotos[0]}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 17H3v-4l2.5-5h11L19 13v4h-2m-10 0a2 2 0 104 0 2 2 0 00-4 0zm8 0a2 2 0 104 0 2 2 0 00-4 0z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-[#111] text-sm">{v.marca} {v.modelo}</p>
                      <p className="text-[#6B7280] text-xs">{v.ano}{v.versao ? ` · ${v.versao}` : ''}</p>
                      <p className="text-[#F59E0B] font-bold text-sm mt-1">{formatarMoeda(v.preco)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
            )
          })()}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 max-w-2xl">
            <div>
              <label className={labelCls}>Número da negociação</label>
              <input
                type="text"
                value={form.numero_negociacao}
                onChange={e => set('numero_negociacao', e.target.value)}
                className={inputCls}
                placeholder="Ex: 001/2026"
              />
            </div>
            <div>
              <label className={labelCls}>Valor de venda</label>
              <MoedaInput
                value={form.valor_venda}
                onChange={v => {
                  set('valor_venda', v)
                  set('valor_liquido', calcularLiquido(v, form.desconto))
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Etapa 2: Comprador ───────────────────────────────────────────────── */}
      {etapa === 2 && (
        <div>
          <h2 className="text-lg font-bold text-[#111] mb-4">Dados do comprador</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome completo *</label>
              <input
                required
                type="text"
                value={form.comprador_nome}
                onChange={e => set('comprador_nome', e.target.value)}
                className={inputCls}
                placeholder="Nome completo do comprador"
              />
            </div>
            <div>
              <label className={labelCls}>CPF</label>
              <input type="text" value={form.comprador_cpf} onChange={e => set('comprador_cpf', e.target.value)} className={inputCls} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className={labelCls}>RG</label>
              <input type="text" value={form.comprador_rg} onChange={e => set('comprador_rg', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Identidade</label>
              <input type="text" value={form.comprador_identidade} onChange={e => set('comprador_identidade', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Profissão</label>
              <input type="text" value={form.comprador_profissao} onChange={e => set('comprador_profissao', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data de nascimento</label>
              <input type="date" value={form.comprador_data_nasc} onChange={e => set('comprador_data_nasc', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Estado civil</label>
              <div className="flex gap-4 pt-2">
                {['Solteiro', 'Casado'].map(op => (
                  <label key={op} className="flex items-center gap-2 cursor-pointer text-sm text-[#374151]">
                    <input
                      type="radio"
                      name="estado_civil"
                      value={op}
                      checked={form.comprador_estado_civil === op}
                      onChange={() => set('comprador_estado_civil', op)}
                      className="accent-[#F5C842]"
                    />
                    {op}
                  </label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Endereço</label>
              <input type="text" value={form.comprador_endereco} onChange={e => set('comprador_endereco', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Número</label>
              <input type="text" value={form.comprador_numero} onChange={e => set('comprador_numero', e.target.value)} className={inputCls} placeholder="123" />
            </div>
            <div>
              <label className={labelCls}>Bairro</label>
              <input type="text" value={form.comprador_bairro} onChange={e => set('comprador_bairro', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CEP</label>
              <input type="text" value={form.comprador_cep} onChange={e => set('comprador_cep', e.target.value)} className={inputCls} placeholder="00000-000" />
            </div>
            <div>
              <label className={labelCls}>Cidade</label>
              <input type="text" value={form.comprador_cidade} onChange={e => set('comprador_cidade', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <input type="text" maxLength={2} value={form.comprador_uf} onChange={e => set('comprador_uf', e.target.value.toUpperCase())} className={inputCls} placeholder="PB" />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input type="tel" value={form.comprador_telefone} onChange={e => set('comprador_telefone', e.target.value)} className={inputCls} placeholder="(83) 99999-9999" />
            </div>
            <div>
              <label className={labelCls}>E-mail</label>
              <input type="email" value={form.comprador_email} onChange={e => set('comprador_email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Vendedor responsável</label>
              <select
                value={form.vendedor_id}
                onChange={e => set('vendedor_id', e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">— Nenhum —</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Data da venda</label>
              <input type="date" value={form.data_venda} onChange={e => set('data_venda', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hora da venda</label>
              <input type="time" value={form.hora_venda} onChange={e => set('hora_venda', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Origem</label>
              <select value={form.origem} onChange={e => set('origem', e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">— Selecione —</option>
                <option>Site</option>
                <option>WhatsApp</option>
                <option>Instagram</option>
                <option>Indicação</option>
                <option>Passagem</option>
                <option>Outros</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>N. Fiscal</label>
              <input type="text" value={form.numero_fiscal} onChange={e => set('numero_fiscal', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Inscrição Estadual</label>
              <input type="text" value={form.inscricao_estadual} onChange={e => set('inscricao_estadual', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hodômetro na venda (km)</label>
              <input
                type="number"
                value={form.hodometro_venda ?? ''}
                onChange={e => set('hodometro_venda', e.target.value === '' ? null : Number(e.target.value))}
                className={inputCls}
                placeholder="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Etapa 3: Pagamento ───────────────────────────────────────────────── */}
      {etapa === 3 && (
        <div className="max-w-2xl">
          <h2 className="text-lg font-bold text-[#111] mb-4">Pagamento</h2>

          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]">
            <div>
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1">Valor de venda</p>
              <p className="text-[#111] font-bold text-lg">{formatarMoeda(form.valor_venda)}</p>
            </div>
            <div>
              <label className={labelCls}>Desconto</label>
              <MoedaInput
                value={form.desconto}
                onChange={v => {
                  set('desconto', v)
                  set('valor_liquido', calcularLiquido(form.valor_venda, v))
                }}
              />
            </div>
            <div className="col-span-2 border-t border-[#E5E7EB] pt-3">
              <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider mb-1">Valor líquido</p>
              <p className="text-[#111] font-bold text-xl">{formatarMoeda(form.valor_liquido)}</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Dinheiro */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Dinheiro</p>
              <MoedaInput value={form.pagamento_dinheiro} onChange={v => set('pagamento_dinheiro', v)} />
            </div>

            {/* Cheque 1 */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Cheque 1</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className={labelCls}>Banco</label>
                  <input type="text" value={form.pagamento_cheque1_banco} onChange={e => set('pagamento_cheque1_banco', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" value={form.pagamento_cheque1_data} onChange={e => set('pagamento_cheque1_data', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <MoedaInput value={form.pagamento_cheque1_valor} onChange={v => set('pagamento_cheque1_valor', v)} />
                </div>
              </div>
            </div>

            {/* Cheque 2 */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Cheque 2</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Banco</label>
                  <input type="text" value={form.pagamento_cheque2_banco} onChange={e => set('pagamento_cheque2_banco', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" value={form.pagamento_cheque2_data} onChange={e => set('pagamento_cheque2_data', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <MoedaInput value={form.pagamento_cheque2_valor} onChange={v => set('pagamento_cheque2_valor', v)} />
                </div>
              </div>
            </div>

            {/* Duplicata 1 */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Duplicata 1</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Banco</label>
                  <input type="text" value={form.pagamento_duplicata1_banco} onChange={e => set('pagamento_duplicata1_banco', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" value={form.pagamento_duplicata1_data} onChange={e => set('pagamento_duplicata1_data', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <MoedaInput value={form.pagamento_duplicata1_valor} onChange={v => set('pagamento_duplicata1_valor', v)} />
                </div>
              </div>
            </div>

            {/* Duplicata 2 */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Duplicata 2</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Banco</label>
                  <input type="text" value={form.pagamento_duplicata2_banco} onChange={e => set('pagamento_duplicata2_banco', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" value={form.pagamento_duplicata2_data} onChange={e => set('pagamento_duplicata2_data', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <MoedaInput value={form.pagamento_duplicata2_valor} onChange={v => set('pagamento_duplicata2_valor', v)} />
                </div>
              </div>
            </div>

            {/* Financeira */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Financeira / Consórcio</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Nome</label>
                  <input type="text" value={form.pagamento_financeira_nome} onChange={e => set('pagamento_financeira_nome', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <MoedaInput value={form.pagamento_financeira_valor} onChange={v => set('pagamento_financeira_valor', v)} />
                </div>
              </div>
            </div>

            {/* Outros */}
            <div className="p-4 rounded-xl border border-[#E5E7EB] bg-white">
              <p className="text-sm font-semibold text-[#374151] mb-3">Outros</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Descrição</label>
                  <input type="text" value={form.pagamento_outros_desc} onChange={e => set('pagamento_outros_desc', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Valor</label>
                  <MoedaInput value={form.pagamento_outros_valor} onChange={v => set('pagamento_outros_valor', v)} />
                </div>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-4 p-4 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#374151]">Total dos pagamentos</p>
              <p className="font-bold text-[#111] text-lg">{formatarMoeda(total)}</p>
            </div>
          </div>

          {diferePagamento && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-amber-700 text-xs">
                Atenção: total dos pagamentos ({formatarMoeda(total)}) difere do valor líquido ({formatarMoeda(form.valor_liquido)})
              </p>
            </div>
          )}

          <div className="mt-4">
            <label className={labelCls}>Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => set('observacoes', e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>
        </div>
      )}

      {/* ── Etapa 4: Revisão ─────────────────────────────────────────────────── */}
      {etapa === 4 && (
        <div className="max-w-3xl space-y-4">
          <h2 className="text-lg font-bold text-[#111] mb-4">Revisão</h2>

          {/* Card veículo */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">Veículo</p>
            {veiculoSelecionado ? (
              <div className="flex items-center gap-4">
                {veiculoSelecionado.fotos?.[0] && (
                  <Image
                    src={veiculoSelecionado.fotos[0]}
                    alt=""
                    width={80}
                    height={56}
                    className="object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-bold text-[#111]">{veiculoSelecionado.marca} {veiculoSelecionado.modelo}</p>
                  <p className="text-[#6B7280] text-sm">{veiculoSelecionado.ano}{veiculoSelecionado.versao ? ` · ${veiculoSelecionado.versao}` : ''} · {veiculoSelecionado.placa ?? '—'}</p>
                  <p className="text-[#F59E0B] font-bold mt-1">{formatarMoeda(form.valor_venda)}</p>
                </div>
              </div>
            ) : <p className="text-[#9CA3AF] text-sm">Nenhum veículo selecionado</p>}
            {form.numero_negociacao && (
              <p className="text-[#6B7280] text-xs mt-2">Neg. {form.numero_negociacao}</p>
            )}
          </div>

          {/* Card comprador */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">Comprador</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-[#9CA3AF] text-xs">Nome</span><p className="text-[#111] font-medium">{form.comprador_nome || '—'}</p></div>
              <div><span className="text-[#9CA3AF] text-xs">CPF</span><p className="text-[#111]">{form.comprador_cpf || '—'}</p></div>
              <div><span className="text-[#9CA3AF] text-xs">Telefone</span><p className="text-[#111]">{form.comprador_telefone || '—'}</p></div>
              <div><span className="text-[#9CA3AF] text-xs">E-mail</span><p className="text-[#111]">{form.comprador_email || '—'}</p></div>
              <div className="col-span-2"><span className="text-[#9CA3AF] text-xs">Endereço</span><p className="text-[#111]">{form.comprador_endereco || '—'}{form.comprador_cidade ? `, ${form.comprador_cidade}` : ''}{form.comprador_uf ? ` - ${form.comprador_uf}` : ''}</p></div>
            </div>
          </div>

          {/* Card pagamento */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">Pagamentos</p>
            <div className="space-y-1.5 text-sm">
              {form.pagamento_dinheiro > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Dinheiro</span><span className="font-medium">{formatarMoeda(form.pagamento_dinheiro)}</span></div>}
              {form.pagamento_cheque1_valor > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Cheque 1 ({form.pagamento_cheque1_banco})</span><span className="font-medium">{formatarMoeda(form.pagamento_cheque1_valor)}</span></div>}
              {form.pagamento_cheque2_valor > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Cheque 2 ({form.pagamento_cheque2_banco})</span><span className="font-medium">{formatarMoeda(form.pagamento_cheque2_valor)}</span></div>}
              {form.pagamento_duplicata1_valor > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Duplicata 1 ({form.pagamento_duplicata1_banco})</span><span className="font-medium">{formatarMoeda(form.pagamento_duplicata1_valor)}</span></div>}
              {form.pagamento_duplicata2_valor > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Duplicata 2 ({form.pagamento_duplicata2_banco})</span><span className="font-medium">{formatarMoeda(form.pagamento_duplicata2_valor)}</span></div>}
              {form.pagamento_financeira_valor > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Financeira ({form.pagamento_financeira_nome})</span><span className="font-medium">{formatarMoeda(form.pagamento_financeira_valor)}</span></div>}
              {form.pagamento_outros_valor > 0 && <div className="flex justify-between"><span className="text-[#6B7280]">Outros ({form.pagamento_outros_desc})</span><span className="font-medium">{formatarMoeda(form.pagamento_outros_valor)}</span></div>}
              <div className="flex justify-between border-t border-[#E5E7EB] pt-2 mt-2">
                <span className="font-bold text-[#111]">Total</span>
                <span className="font-bold text-[#111]">{formatarMoeda(totalPagamentos())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Desconto</span>
                <span>{formatarMoeda(form.desconto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-[#111]">Valor líquido</span>
                <span className="font-semibold">{formatarMoeda(form.valor_liquido)}</span>
              </div>
            </div>
          </div>

          {erro && <p className="text-red-600 text-sm">{erro}</p>}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleSalvarRascunho}
              disabled={salvando || finalizando}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar Rascunho'}
            </button>
            <button
              onClick={handleFinalizar}
              disabled={salvando || finalizando || !form.veiculo_id}
              className="flex-1 px-4 py-3 rounded-xl font-semibold text-sm text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
            >
              {finalizando ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          </div>
        </div>
      )}

      {/* ── Navegação ────────────────────────────────────────────────────────── */}
      {etapa < 4 && (
        <div className="flex justify-between mt-8 pt-6 border-t border-[#E5E7EB] max-w-3xl">
          <button
            onClick={() => setEtapa(e => e - 1)}
            disabled={etapa === 1}
            className="px-5 py-2.5 rounded-xl text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111] hover:border-[#D1D5DB] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            onClick={avancar}
            disabled={
              (etapa === 1 && !podaAvancar1) ||
              (etapa === 2 && !podaAvancar2) ||
              salvando
            }
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {salvando ? 'Salvando...' : 'Próximo'}
          </button>
        </div>
      )}
    </div>
  )
}
