'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarLead } from '@/app/actions'

interface Props {
  lojaId: string
  vendedores: { id: string; nome: string }[]
}

const inputCls = 'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all placeholder-[#D1D5DB]'
const labelCls = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'

const ORIGENS = ['site', 'whatsapp', 'instagram', 'indicacao', 'passagem', 'outros']

export default function NovoLeadForm({ lojaId, vendedores }: Props) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [origem, setOrigem] = useState('outros')
  const [veiculoInteresse, setVeiculoInteresse] = useState('')
  const [responsavelId, setResponsavelId] = useState('')
  const [proximoAtendimento, setProximoAtendimento] = useState('')
  const [observacoes, setObservacoes] = useState('')

  function resetar() {
    setNome(''); setTelefone(''); setEmail(''); setOrigem('outros')
    setVeiculoInteresse(''); setResponsavelId(''); setProximoAtendimento('')
    setObservacoes(''); setErro(null)
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!nome.trim() || !telefone.trim()) { setErro('Nome e telefone são obrigatórios'); return }
    setSalvando(true); setErro(null)
    try {
      await criarLead({
        loja_id: lojaId,
        nome: nome.trim(),
        telefone: telefone.trim(),
        email: email.trim() || null,
        origem,
        observacoes: observacoes.trim() || null,
        veiculo_interesse: veiculoInteresse.trim() || null,
        responsavel_id: responsavelId || null,
        proximo_atendimento: proximoAtendimento || null,
        status: 'novo',
        tags: [],
      })
      resetar()
      setAberto(false)
      router.refresh()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar lead')
    } finally {
      setSalvando(false)
    }
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E5E7EB] text-sm text-[#6B7280] hover:text-[#111] hover:border-[#D1D5DB] transition-colors bg-white"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar lead manualmente
      </button>
    )
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[#111] font-bold text-sm">Novo Lead</h2>
        <button onClick={() => { setAberto(false); resetar() }} className="text-[#9CA3AF] hover:text-[#111] transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Nome *</label>
            <input required value={nome} onChange={e => setNome(e.target.value)} className={inputCls} placeholder="Nome completo" />
          </div>
          <div>
            <label className={labelCls}>Telefone *</label>
            <input required value={telefone} onChange={e => setTelefone(e.target.value)} className={inputCls} placeholder="(83) 99999-9999" />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="opcional" />
          </div>
          <div>
            <label className={labelCls}>Origem</label>
            <select value={origem} onChange={e => setOrigem(e.target.value)} className={`${inputCls} cursor-pointer`}>
              {ORIGENS.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Veículo de interesse</label>
            <input value={veiculoInteresse} onChange={e => setVeiculoInteresse(e.target.value)} className={inputCls} placeholder="Ex: Honda Civic 2022" />
          </div>
          <div>
            <label className={labelCls}>Responsável</label>
            <select value={responsavelId} onChange={e => setResponsavelId(e.target.value)} className={`${inputCls} cursor-pointer`}>
              <option value="">— Nenhum —</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Próximo atendimento</label>
            <input type="datetime-local" value={proximoAtendimento} onChange={e => setProximoAtendimento(e.target.value)} className={inputCls} />
          </div>
          <div className="lg:col-span-2">
            <label className={labelCls}>Observações</label>
            <input value={observacoes} onChange={e => setObservacoes(e.target.value)} className={inputCls} placeholder="Observações iniciais" />
          </div>
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setAberto(false); resetar() }}
            className="px-4 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-xl hover:text-[#111] hover:border-[#D1D5DB] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-2 text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] rounded-xl hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar lead'}
          </button>
        </div>
      </form>
    </div>
  )
}
