'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { updateLead, addLeadInteracao } from '@/app/actions'
import Modal from '@/components/ui/Modal'
import type { Lead, LeadInteracao, MensagemPadrao, TipoInteracao } from '@/types'

const statusOpts = [
  { value: 'novo', label: 'Novo', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'contato_feito', label: 'Contato feito', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'negociando', label: 'Negociando', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'fechado', label: 'Fechado', cls: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'perdido', label: 'Perdido', cls: 'bg-red-50 text-red-700 border-red-200' },
]

const origemConfig: Record<string, { icon: string; label: string }> = {
  site: { icon: '🌐', label: 'Site' },
  instagram: { icon: '📸', label: 'Instagram' },
  indicacao: { icon: '👥', label: 'Indicação' },
  whatsapp: { icon: '💬', label: 'WhatsApp' },
  olx: { icon: '🚗', label: 'OLX' },
  outros: { icon: '📋', label: 'Outros' },
}

const tipoOpts: { value: TipoInteracao; label: string; icon: string }[] = [
  { value: 'nota', label: 'Nota', icon: '📝' },
  { value: 'ligacao', label: 'Ligação', icon: '📞' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'visita', label: 'Visita', icon: '🏪' },
  { value: 'proposta', label: 'Proposta', icon: '💰' },
]

const tipoIcon: Record<string, string> = {
  nota: '📝', ligacao: '📞', whatsapp: '💬',
  visita: '🏪', proposta: '💰', site: '🌐',
}

interface Props {
  lead: Lead
  interacoes: LeadInteracao[]
  vendedores: { id: string; nome: string }[]
  templates: MensagemPadrao[]
  lojaId: string
  userId: string
  criadorNome?: string | null
}

const inputCls = 'w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors placeholder-[#D0D0D0]'
const labelCls = 'block text-[#9CA3AF] text-xs uppercase tracking-wider mb-1.5'

export default function LeadDetailClient({
  lead,
  interacoes: initialInteracoes,
  vendedores,
  templates,
  lojaId,
  criadorNome,
}: Props) {
  const router = useRouter()

  const [status, setStatus] = useState(lead.status)
  const [responsavelId, setResponsavelId] = useState(lead.responsavel_id ?? '')
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [salvandoResp, setSalvandoResp] = useState(false)

  // Edit modal
  const [showEdit, setShowEdit] = useState(false)
  const [editNome, setEditNome] = useState(lead.nome)
  const [editTelefone, setEditTelefone] = useState(lead.telefone)
  const [editEmail, setEditEmail] = useState(lead.email ?? '')
  const [editVeiculo, setEditVeiculo] = useState(lead.veiculo_interesse ?? '')
  const [editando, setEditando] = useState(false)

  // Interactions
  const [interacoes, setInteracoes] = useState(initialInteracoes)
  const [tipoInteracao, setTipoInteracao] = useState<TipoInteracao>('nota')
  const [descInteracao, setDescInteracao] = useState('')
  const [registrando, setRegistrando] = useState(false)

  const statusAtual = statusOpts.find(s => s.value === status)
  const origem = origemConfig[lead.origem] ?? { icon: '📋', label: lead.origem }

  async function handleChangeStatus(novoStatus: Lead['status']) {
    const anterior = status
    setStatus(novoStatus)
    setShowStatusMenu(false)
    try {
      await updateLead(lead.id, { status: novoStatus })
      router.refresh()
    } catch (err) {
      setStatus(anterior)
      alert(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  async function handleChangeResponsavel(id: string) {
    setResponsavelId(id)
    setSalvandoResp(true)
    try {
      await updateLead(lead.id, { responsavel_id: id || null })
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar responsável')
    } finally {
      setSalvandoResp(false)
    }
  }

  async function handleSalvarEdicao(e: React.FormEvent) {
    e.preventDefault()
    setEditando(true)
    try {
      await updateLead(lead.id, {
        nome: editNome,
        telefone: editTelefone,
        email: editEmail || null,
        veiculo_interesse: editVeiculo || null,
      })
      setShowEdit(false)
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setEditando(false)
    }
  }

  async function handleRegistrarInteracao(e: React.FormEvent) {
    e.preventDefault()
    if (!descInteracao.trim()) return
    setRegistrando(true)
    try {
      await addLeadInteracao(lead.id, lojaId, tipoInteracao, descInteracao)
      setDescInteracao('')
      setInteracoes(prev => [{
        id: Date.now().toString(),
        lead_id: lead.id,
        loja_id: lojaId,
        usuario_id: null,
        tipo: tipoInteracao,
        descricao: descInteracao,
        created_at: new Date().toISOString(),
        usuario: null,
      }, ...prev])
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao registrar')
    } finally {
      setRegistrando(false)
    }
  }

  function handleWhatsApp(msg?: string) {
    const num = `55${lead.telefone.replace(/\D/g, '')}`
    const text = msg ?? `Olá ${lead.nome}, entramos em contato da nossa loja. Como posso ajudá-lo?`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(text)}`, '_blank')
  }

  function useTemplate(t: MensagemPadrao) {
    const veiculoStr = lead.veiculo
      ? `${lead.veiculo.marca} ${lead.veiculo.modelo} ${lead.veiculo.ano}`
      : lead.veiculo_interesse ?? ''
    const msg = t.mensagem
      .replace(/{nome}/g, lead.nome)
      .replace(/{veiculo}/g, veiculoStr)
      .replace(/{preco}/g, '')
    handleWhatsApp(msg)
    setShowTemplates(false)
  }

  return (
    <div className="space-y-6">

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
              {lead.nome}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#6B7280] bg-[#F0F0F0] px-2.5 py-1 rounded-full">
                {origem.icon} {origem.label}
              </span>
              <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-medium ${statusAtual?.cls ?? ''}`}>
                {statusAtual?.label}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowEdit(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E5E5] text-[#6B7280] hover:text-[#111] hover:border-[#D0D0D0] transition-colors"
          >
            ✏️ Editar dados
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Telefone</p>
            <a
              href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#111] text-sm font-medium hover:underline"
            >
              {lead.telefone}
            </a>
          </div>
          {lead.email && (
            <div>
              <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">E-mail</p>
              <a href={`mailto:${lead.email}`} className="text-[#111] text-sm hover:underline truncate block">
                {lead.email}
              </a>
            </div>
          )}
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Veículo de interesse</p>
            {lead.veiculo ? (
              <Link
                href={`/admin/veiculos/${lead.veiculo.id}`}
                className="text-[#111] text-sm hover:underline font-medium"
              >
                {lead.veiculo.marca} {lead.veiculo.modelo} {lead.veiculo.ano}
              </Link>
            ) : (
              <p className="text-[#111] text-sm">{lead.veiculo_interesse || '—'}</p>
            )}
          </div>
          <div>
            <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-1">Registrado em</p>
            <p className="text-[#6B7280] text-sm">
              {new Date(lead.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: '2-digit',
              })}
              {criadorNome ? ` · ${criadorNome}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Quick actions ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Status dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStatusMenu(v => !v)}
            className={`inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg text-xs font-medium border transition-colors ${statusAtual?.cls ?? ''}`}
          >
            Mudar status
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showStatusMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-[#E5E5E5] rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
              {statusOpts.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleChangeStatus(opt.value as Lead['status'])}
                  className="w-full text-left px-3 py-2 hover:bg-[#F8F8F8] transition-colors"
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium ${opt.cls}`}>
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <button
          onClick={() => handleWhatsApp()}
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-[#25D366]/10 text-[#16A34A] text-xs font-medium hover:bg-[#25D366]/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          WhatsApp
        </button>

        {templates.length > 0 && (
          <button
            onClick={() => setShowTemplates(v => !v)}
            className="inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-xs font-medium border border-[#E5E5E5] text-[#6B7280] hover:text-[#111] hover:border-[#D0D0D0] transition-colors bg-white"
          >
            📋 Template
          </button>
        )}
      </div>

      {showTemplates && (
        <div className="bg-white border border-[#E5E5E5] rounded-xl p-4 shadow-sm space-y-2">
          <p className="text-[#9CA3AF] text-xs uppercase tracking-wider mb-3">Templates de mensagem</p>
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => useTemplate(t)}
              className="w-full text-left px-4 py-3 rounded-lg bg-[#F8F8F8] hover:bg-[#F0F0F0] transition-colors"
            >
              <p className="text-[#111] text-sm font-medium">{t.titulo}</p>
              <p className="text-[#9CA3AF] text-xs mt-0.5 truncate">{t.mensagem}</p>
            </button>
          ))}
        </div>
      )}

      {/* ── Responsável ───────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
        <label className={labelCls}>Responsável</label>
        <select
          value={responsavelId}
          onChange={e => handleChangeResponsavel(e.target.value)}
          disabled={salvandoResp}
          className={inputCls}
        >
          <option value="">— Nenhum —</option>
          {vendedores.map(v => (
            <option key={v.id} value={v.id}>{v.nome}</option>
          ))}
        </select>
        {salvandoResp && <p className="text-[#9CA3AF] text-xs mt-1">Salvando...</p>}
      </div>

      {/* ── Nova interação ────────────────────────────────────────────── */}
      <form
        onSubmit={handleRegistrarInteracao}
        className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm space-y-3"
      >
        <h2 className="text-[#111] font-semibold text-sm">Registrar interação</h2>
        <div className="flex gap-2 flex-wrap">
          {tipoOpts.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTipoInteracao(opt.value)}
              className={`inline-flex items-center justify-center min-h-[44px] px-3 rounded-lg text-xs font-medium border transition-colors ${
                tipoInteracao === opt.value
                  ? 'border-[var(--cor-primaria)] text-[#111] bg-[#F8F8F8]'
                  : 'border-[#E5E5E5] text-[#6B7280] hover:border-[#D0D0D0] hover:text-[#374151] bg-white'
              }`}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        <textarea
          value={descInteracao}
          onChange={e => setDescInteracao(e.target.value)}
          rows={3}
          placeholder="Descreva a interação..."
          className="w-full bg-[#F8F8F8] border border-[#E5E5E5] rounded-lg px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors resize-none placeholder-[#D0D0D0]"
        />
        <button
          type="submit"
          disabled={registrando || !descInteracao.trim()}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)', color: '#111' }}
        >
          {registrando ? 'Registrando...' : 'Registrar'}
        </button>
      </form>

      {/* ── Timeline ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-[#E5E5E5] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111] font-semibold text-sm mb-4">
          Histórico {interacoes.length > 0 && <span className="text-[#9CA3AF] font-normal">({interacoes.length})</span>}
        </h2>
        {interacoes.length === 0 ? (
          <p className="text-[#9CA3AF] text-sm text-center py-4">Nenhuma interação registrada.</p>
        ) : (
          <div className="space-y-0">
            {interacoes.map((int, idx) => (
              <div key={int.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm bg-[#F5F5F5] mt-0.5">
                    {tipoIcon[int.tipo] ?? '📝'}
                  </div>
                  {idx < interacoes.length - 1 && (
                    <div className="w-px flex-1 bg-[#E5E5E5] my-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-4">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[#111] text-xs font-semibold capitalize">{int.tipo.replace('_', ' ')}</span>
                    <span className="text-[#9CA3AF] text-xs">
                      {new Date(int.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    {int.usuario?.nome && (
                      <span className="text-[#6B7280] text-xs">· {int.usuario.nome}</span>
                    )}
                  </div>
                  <p className="text-[#6B7280] text-sm leading-relaxed">{int.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Edit modal ────────────────────────────────────────────────── */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)}>
        <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between sticky top-0 bg-white rounded-t-2xl sm:rounded-t-2xl">
          <h3 className="text-[#111] font-semibold text-sm">Editar dados do lead</h3>
          <button
            onClick={() => setShowEdit(false)}
            className="text-[#9CA3AF] hover:text-[#111] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSalvarEdicao} className="p-6 space-y-4">
          <div>
            <label className={labelCls}>Nome</label>
            <input
              required
              value={editNome}
              onChange={e => setEditNome(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Telefone</label>
            <input
              required
              value={editTelefone}
              onChange={e => setEditTelefone(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>E-mail</label>
            <input
              type="email"
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              className={inputCls}
              placeholder="opcional"
            />
          </div>
          <div>
            <label className={labelCls}>Veículo de interesse</label>
            <input
              value={editVeiculo}
              onChange={e => setEditVeiculo(e.target.value)}
              className={inputCls}
              placeholder="Ex: Honda Civic 2022"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={editando}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:brightness-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--cor-primaria)', color: '#111' }}
            >
              {editando ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="px-4 py-2.5 rounded-lg text-sm border border-[#E5E5E5] text-[#6B7280] hover:text-[#111] hover:border-[#D0D0D0] transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
