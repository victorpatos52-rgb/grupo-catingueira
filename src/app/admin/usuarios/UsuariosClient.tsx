'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarUsuario, resetarSenha, atualizarUsuario, deleteUser } from '@/app/actions'
import type { UsuarioPerfil, Loja, Perfil } from '@/types'

// ── Constantes ────────────────────────────────────────────────────────────────

const TODOS_MODULOS = [
  'dashboard',
  'veiculos',
  'crm',
  'vendas',
  'financeiro',
  'configuracoes',
  'usuarios',
] as const

type Modulo = typeof TODOS_MODULOS[number]

const MODULO_LABEL: Record<Modulo, string> = {
  dashboard:     'Dashboard',
  veiculos:      'Veículos',
  crm:           'CRM',
  vendas:        'Vendas',
  financeiro:    'Financeiro',
  configuracoes: 'Configurações',
  usuarios:      'Usuários',
}

const MODULO_COR: Record<Modulo, string> = {
  dashboard:     'bg-blue-50 text-blue-700 border-blue-200',
  veiculos:      'bg-gray-100 text-gray-700 border-gray-200',
  crm:           'bg-purple-50 text-purple-700 border-purple-200',
  vendas:        'bg-amber-50 text-amber-700 border-amber-200',
  financeiro:    'bg-green-50 text-green-700 border-green-200',
  configuracoes: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  usuarios:      'bg-red-50 text-red-700 border-red-200',
}

const MODULOS_POR_PERFIL: Record<Perfil, Modulo[]> = {
  vendedor: ['dashboard', 'veiculos', 'crm', 'vendas'],
  gerente:  ['dashboard', 'veiculos', 'crm', 'vendas', 'financeiro', 'configuracoes'],
  diretor:  [...TODOS_MODULOS],
  admin:    [...TODOS_MODULOS],
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type UsuarioComEmail = UsuarioPerfil & {
  loja: Loja | null
  email: string
  modulos_permitidos: string[]  // explícito: normalizado para [] em page.tsx antes de serializar
}

interface Props {
  perfil: UsuarioPerfil
  usuarios: UsuarioComEmail[]
  lojas: Loja[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PERFIS: Perfil[] = ['vendedor', 'gerente', 'diretor', 'admin']

const perfilBadge: Record<Perfil, string> = {
  vendedor: 'bg-blue-50 text-blue-700 border-blue-200',
  gerente:  'bg-orange-50 text-orange-700 border-orange-200',
  diretor:  'bg-purple-50 text-purple-700 border-purple-200',
  admin:    'bg-red-50 text-red-700 border-red-200',
}

function getIniciais(nome: string) {
  const p = nome.trim().split(' ')
  if (p.length >= 2) return (p[0][0] + p[p.length - 1][0]).toUpperCase()
  return nome.slice(0, 2).toUpperCase()
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!'
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Estilos base ──────────────────────────────────────────────────────────────

const inputCls  = 'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all placeholder-[#D1D5DB]'
const labelCls  = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'
const selectCls = `${inputCls} cursor-pointer`

// ── ModulosCheckbox ───────────────────────────────────────────────────────────

function ModulosCheckbox({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(modulo: Modulo) {
    if (modulo === 'dashboard') return
    if (value.includes(modulo)) {
      onChange(value.filter(m => m !== modulo))
    } else {
      onChange([...value, modulo])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TODOS_MODULOS.map(modulo => {
        const ativo    = value.includes(modulo)
        const disabled = modulo === 'dashboard'
        return (
          <button
            key={modulo}
            type="button"
            onClick={() => toggle(modulo)}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              ativo
                ? 'bg-[#FEF9C3] border-[#F5C842] text-[#92400E]'
                : 'bg-white border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB] hover:text-[#374151]'
            } ${disabled ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
          >
            <span
              className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                ativo ? 'bg-[#F5C842] border-[#F59E0B]' : 'border-[#D1D5DB] bg-white'
              }`}
            >
              {ativo && (
                <svg className="w-2.5 h-2.5 text-[#92400E]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {MODULO_LABEL[modulo]}
            {disabled && <span className="text-[10px] text-[#9CA3AF]">(obrigatório)</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsuariosClient({ perfil, usuarios, lojas }: Props) {
  const router = useRouter()

  const [modal,           setModal]           = useState<'criar' | 'editar' | null>(null)
  const [editandoUsuario, setEditandoUsuario] = useState<UsuarioComEmail | null>(null)
  const [credenciais,     setCredenciais]     = useState<{ email: string; senha: string } | null>(null)
  const [senhasReset,     setSenhasReset]     = useState<Record<string, string>>({})

  // ── Criar form ────────────────────────────────────────────────────────────
  const [nomeNovo,     setNomeNovo]     = useState('')
  const [emailNovo,    setEmailNovo]    = useState('')
  const [senhaNova,    setSenhaNova]    = useState('')
  const [perfilNovo,   setPerfilNovo]   = useState<Perfil>('vendedor')
  const [lojaIdNova,   setLojaIdNova]   = useState(lojas[0]?.id ?? '')
  const [modulosNovos, setModulosNovos] = useState<string[]>(MODULOS_POR_PERFIL['vendedor'])
  const [criandoLoad,  setCriandoLoad]  = useState(false)
  const [criandoErro,  setCriandoErro]  = useState<string | null>(null)

  // ── Editar form ───────────────────────────────────────────────────────────
  const [nomeEdit,     setNomeEdit]     = useState('')
  const [perfilEdit,   setPerfilEdit]   = useState<Perfil>('vendedor')
  const [lojaIdEdit,   setLojaIdEdit]   = useState('')
  const [ativoEdit,    setAtivoEdit]    = useState(true)
  const [modulosEdit,  setModulosEdit]  = useState<string[]>([])
  const [editandoLoad, setEditandoLoad] = useState(false)
  const [editandoErro, setEditandoErro] = useState<string | null>(null)

  // ── Row loading ───────────────────────────────────────────────────────────
  const [resetLoad,  setResetLoad]  = useState<string | null>(null)
  const [toggleLoad, setToggleLoad] = useState<string | null>(null)
  const [deleteLoad, setDeleteLoad] = useState<string | null>(null)

  // ── Handlers ─────────────────────────────────────────────────────────────

  function abrirCriar() {
    setNomeNovo(''); setEmailNovo(''); setSenhaNova(gerarSenha())
    setPerfilNovo('vendedor'); setLojaIdNova(lojas[0]?.id ?? '')
    setModulosNovos(MODULOS_POR_PERFIL['vendedor'])
    setCriandoErro(null); setModal('criar')
  }

  function abrirEditar(u: UsuarioComEmail) {
    setEditandoUsuario(u)
    setNomeEdit(u.nome); setPerfilEdit(u.perfil)
    setLojaIdEdit(u.loja_id); setAtivoEdit(u.ativo)
    setModulosEdit(u.modulos_permitidos ?? MODULOS_POR_PERFIL[u.perfil])
    setEditandoErro(null); setModal('editar')
  }

  function fecharModal() { setModal(null); setEditandoUsuario(null) }

  function handlePerfilCriarChange(p: Perfil) {
    setPerfilNovo(p)
    setModulosNovos(MODULOS_POR_PERFIL[p])
  }

  function handlePerfilEditarChange(p: Perfil) {
    setPerfilEdit(p)
    setModulosEdit(MODULOS_POR_PERFIL[p])
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!senhaNova.trim()) { setCriandoErro('Gere ou digite uma senha'); return }
    setCriandoLoad(true); setCriandoErro(null)
    try {
      await criarUsuario({
        email: emailNovo, senha: senhaNova, nome: nomeNovo,
        perfil: perfilNovo, loja_id: lojaIdNova, modulos_permitidos: modulosNovos,
      })
      setCredenciais({ email: emailNovo, senha: senhaNova })
      fecharModal(); router.refresh()
    } catch (err: unknown) {
      setCriandoErro(err instanceof Error ? err.message : 'Erro ao criar usuário')
    } finally {
      setCriandoLoad(false)
    }
  }

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!editandoUsuario) return
    setEditandoLoad(true); setEditandoErro(null)
    try {
      await atualizarUsuario(editandoUsuario.id, {
        nome: nomeEdit, perfil: perfilEdit,
        loja_id: lojaIdEdit, ativo: ativoEdit, modulos_permitidos: modulosEdit,
      })
      fecharModal(); router.refresh()
    } catch (err: unknown) {
      setEditandoErro(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setEditandoLoad(false)
    }
  }

  async function handleResetSenha(userId: string) {
    if (!confirm('Gerar nova senha aleatória para este usuário?')) return
    setResetLoad(userId)
    try {
      const { novaSenha } = await resetarSenha(userId)
      setSenhasReset(prev => ({ ...prev, [userId]: novaSenha }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao resetar senha')
    } finally {
      setResetLoad(null)
    }
  }

  async function handleToggleAtivo(u: UsuarioComEmail) {
    setToggleLoad(u.id)
    try {
      await atualizarUsuario(u.id, {
        nome: u.nome, perfil: u.perfil, loja_id: u.loja_id,
        ativo: !u.ativo, modulos_permitidos: u.modulos_permitidos ?? [],
      })
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar')
    } finally {
      setToggleLoad(null)
    }
  }

  async function handleDeletar(u: UsuarioComEmail) {
    if (!confirm(`Deletar o usuário "${u.nome}" (${u.email})?\n\nEsta ação não pode ser desfeita.`)) return
    setDeleteLoad(u.id)
    try {
      await deleteUser(u.id); router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao deletar')
    } finally {
      setDeleteLoad(null)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
            Usuários
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">{usuarios.length} usuário(s)</p>
        </div>
        <button
          onClick={abrirCriar}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Criar usuário
        </button>
      </div>

      {/* Credenciais pós-criação */}
      {credenciais && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-green-700 font-semibold text-sm mb-3">✅ Usuário criado com sucesso!</p>
              <div className="space-y-2">
                {[
                  { label: 'Email', value: credenciais.email },
                  { label: 'Senha', value: credenciais.senha },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-green-600 text-xs font-medium w-12">{label}</span>
                    <code className="bg-white border border-green-200 text-green-800 px-2.5 py-1 rounded-lg text-sm font-mono">
                      {value}
                    </code>
                    <button
                      onClick={() => navigator.clipboard.writeText(value)}
                      className="text-green-600 text-xs hover:underline"
                    >
                      Copiar
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-green-600 text-xs mt-3">⚠️ Anote estas credenciais — não serão exibidas novamente.</p>
            </div>
            <button onClick={() => setCredenciais(null)} className="text-green-400 hover:text-green-600 shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
        {usuarios.length === 0 ? (
          <p className="px-5 py-12 text-center text-[#9CA3AF] text-sm">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  {['Usuário', 'E-mail', 'Perfil', 'Loja', 'Módulos', 'Status', 'Criado', 'Ações'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-[#FAFAFA] transition-colors">

                    {/* Avatar + nome */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 text-white shadow-sm"
                          style={{ background: 'linear-gradient(135deg, #F5C842 0%, #F59E0B 100%)' }}
                        >
                          {getIniciais(u.nome)}
                        </div>
                        <span className="text-[#111] font-medium whitespace-nowrap">
                          {u.nome}
                          {u.id === perfil.id && (
                            <span className="ml-1.5 text-[#9CA3AF] text-xs font-normal">(você)</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-[#6B7280] text-xs">{u.email || '—'}</td>

                    {/* Perfil */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold capitalize ${perfilBadge[u.perfil]}`}>
                        {u.perfil}
                      </span>
                    </td>

                    {/* Loja */}
                    <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap text-sm">{u.loja?.nome ?? '—'}</td>

                    {/* Módulos */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(u.modulos_permitidos ?? []).length === 0 ? (
                          <span className="text-[#9CA3AF] text-xs">—</span>
                        ) : (
                          (u.modulos_permitidos ?? []).map(m => (
                            <span
                              key={m}
                              className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${MODULO_COR[m as Modulo] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
                            >
                              {MODULO_LABEL[m as Modulo] ?? m}
                            </span>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${u.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Criado */}
                    <td className="px-4 py-3 text-[#9CA3AF] text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => abrirEditar(u)}
                            className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors bg-white"
                          >
                            Editar
                          </button>
                          {u.id !== perfil.id && (
                            <>
                              <button
                                onClick={() => handleResetSenha(u.id)}
                                disabled={resetLoad === u.id}
                                className="text-xs text-[#6B7280] hover:text-amber-700 px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-amber-200 hover:bg-amber-50 transition-colors disabled:opacity-50"
                              >
                                {resetLoad === u.id ? '...' : 'Reset senha'}
                              </button>
                              <button
                                onClick={() => handleToggleAtivo(u)}
                                disabled={toggleLoad === u.id}
                                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                                  u.ativo
                                    ? 'text-[#6B7280] hover:text-red-600 border-[#E5E7EB] hover:border-red-200 hover:bg-red-50'
                                    : 'text-[#6B7280] hover:text-green-700 border-[#E5E7EB] hover:border-green-200 hover:bg-green-50'
                                }`}
                              >
                                {toggleLoad === u.id ? '...' : u.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                              <button
                                onClick={() => handleDeletar(u)}
                                disabled={deleteLoad === u.id}
                                className="text-xs text-[#6B7280] hover:text-red-600 px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-red-200 transition-colors disabled:opacity-50"
                              >
                                {deleteLoad === u.id ? '...' : 'Deletar'}
                              </button>
                            </>
                          )}
                        </div>
                        {senhasReset[u.id] && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-amber-600 text-xs">Nova senha:</span>
                            <code className="bg-amber-50 text-amber-700 text-xs px-1.5 py-0.5 rounded-lg border border-amber-200 font-mono">
                              {senhasReset[u.id]}
                            </code>
                            <button
                              onClick={() => navigator.clipboard.writeText(senhasReset[u.id])}
                              className="text-amber-500 text-xs hover:underline"
                            >
                              Copiar
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Criar ───────────────────────────────────────────────────────── */}
      {modal === 'criar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={fecharModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-[#111] font-bold text-base">Criar usuário</h2>
              <button onClick={fecharModal} className="text-[#9CA3AF] hover:text-[#111] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCriar} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nome completo</label>
                <input required value={nomeNovo} onChange={e => setNomeNovo(e.target.value)} className={inputCls} placeholder="João da Silva" />
              </div>
              <div>
                <label className={labelCls}>E-mail</label>
                <input required type="email" value={emailNovo} onChange={e => setEmailNovo(e.target.value)} className={inputCls} placeholder="joao@email.com" />
              </div>
              <div>
                <label className={labelCls}>Senha inicial</label>
                <div className="flex gap-2">
                  <input
                    required
                    value={senhaNova}
                    onChange={e => setSenhaNova(e.target.value)}
                    className={inputCls}
                    placeholder="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setSenhaNova(gerarSenha())}
                    className="shrink-0 px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#6B7280] text-xs font-medium hover:text-[#111] hover:border-[#D1D5DB] transition-colors whitespace-nowrap"
                  >
                    Gerar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Perfil</label>
                  <select
                    value={perfilNovo}
                    onChange={e => handlePerfilCriarChange(e.target.value as Perfil)}
                    className={selectCls}
                  >
                    {PERFIS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Loja</label>
                  <select value={lojaIdNova} onChange={e => setLojaIdNova(e.target.value)} className={selectCls}>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Módulos permitidos</label>
                <p className="text-[#9CA3AF] text-xs mb-2">Sugeridos pelo perfil — ajuste se necessário.</p>
                <ModulosCheckbox value={modulosNovos} onChange={setModulosNovos} />
              </div>

              {criandoErro && <p className="text-red-600 text-sm">{criandoErro}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={criandoLoad}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
                >
                  {criandoLoad ? 'Criando...' : 'Criar usuário'}
                </button>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2.5 rounded-xl text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Editar ──────────────────────────────────────────────────────── */}
      {modal === 'editar' && editandoUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={fecharModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-[#111] font-bold text-base">Editar usuário</h2>
              <button onClick={fecharModal} className="text-[#9CA3AF] hover:text-[#111] transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditar} className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nome</label>
                <input required value={nomeEdit} onChange={e => setNomeEdit(e.target.value)} className={inputCls} />
              </div>
              <p className="text-[#9CA3AF] text-xs -mt-2">E-mail não pode ser editado ({editandoUsuario.email})</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Perfil</label>
                  <select
                    value={perfilEdit}
                    onChange={e => handlePerfilEditarChange(e.target.value as Perfil)}
                    className={selectCls}
                  >
                    {PERFIS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Loja</label>
                  <select value={lojaIdEdit} onChange={e => setLojaIdEdit(e.target.value)} className={selectCls}>
                    {lojas.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
                <input
                  type="checkbox"
                  id="ativoEdit"
                  checked={ativoEdit}
                  onChange={e => setAtivoEdit(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#F5C842]"
                />
                <label htmlFor="ativoEdit" className="text-[#111] text-sm font-medium cursor-pointer">Usuário ativo</label>
              </div>
              <div>
                <label className={labelCls}>Módulos permitidos</label>
                <p className="text-[#9CA3AF] text-xs mb-2">Ao mudar o perfil, os módulos são sugeridos automaticamente.</p>
                <ModulosCheckbox value={modulosEdit} onChange={setModulosEdit} />
              </div>

              {editandoErro && <p className="text-red-600 text-sm">{editandoErro}</p>}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={editandoLoad}
                  className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
                >
                  {editandoLoad ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={fecharModal}
                  className="px-4 py-2.5 rounded-xl text-sm text-[#6B7280] hover:text-[#111] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
