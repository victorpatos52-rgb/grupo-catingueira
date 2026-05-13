'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateUserRole, inviteUser, deleteUser } from '@/app/actions'
import type { UsuarioPerfil, Loja, Perfil } from '@/types'

interface Props {
  perfil: UsuarioPerfil
  usuarios: (UsuarioPerfil & { loja: Loja | null })[]
  lojas: Loja[]
}

const perfis: Perfil[] = ['vendedor', 'gerente', 'diretor', 'admin']

export default function UsuariosClient({ perfil, usuarios, lojas }: Props) {
  const router = useRouter()

  const [convidarAberto, setConvidarAberto] = useState(false)
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [lojaId, setLojaId] = useState(lojas[0]?.id ?? '')
  const [novoPerfil, setNovoPerfil] = useState<Perfil>('vendedor')
  const [convidandoLoading, setConvidandoLoading] = useState(false)
  const [convidandoErro, setConvidandoErro] = useState<string | null>(null)
  const [convidandoSucesso, setConvidandoSucesso] = useState(false)

  const [roleLoading, setRoleLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  async function handleConvidar(e: React.FormEvent) {
    e.preventDefault()
    setConvidandoLoading(true)
    setConvidandoErro(null)
    try {
      await inviteUser(email, lojaId, novoPerfil, nome)
      setConvidandoSucesso(true)
      setEmail('')
      setNome('')
      setConvidarAberto(false)
      router.refresh()
    } catch (err: unknown) {
      setConvidandoErro(err instanceof Error ? err.message : 'Erro ao convidar')
    } finally {
      setConvidandoLoading(false)
    }
  }

  async function handleRoleChange(perfilId: string, p: Perfil) {
    setRoleLoading(perfilId)
    try {
      await updateUserRole(perfilId, p)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
    } finally {
      setRoleLoading(null)
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Remover o usuário "${nome}"? Esta ação não pode ser desfeita.`)) return
    setDeleteLoading(id)
    try {
      await deleteUser(id)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao remover usuário')
    } finally {
      setDeleteLoading(null)
    }
  }

  const perfilBadge: Record<Perfil, string> = {
    vendedor: 'bg-gray-500/20 text-gray-400',
    gerente: 'bg-blue-500/20 text-blue-400',
    diretor: 'bg-purple-500/20 text-purple-400',
    admin: 'bg-red-500/20 text-red-400',
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-white">
            Usuários
          </h1>
          <p className="text-[#555] text-sm mt-1">{usuarios.length} usuário(s)</p>
        </div>
        <button
          onClick={() => {
            setConvidarAberto(true)
            setConvidandoSucesso(false)
            setConvidandoErro(null)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm text-[#0D0D0D] transition-all hover:brightness-90"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Convidar usuário
        </button>
      </div>

      {convidandoSucesso && (
        <div className="mb-6 px-4 py-3 bg-green-600/20 border border-green-600/30 rounded-lg text-green-400 text-sm">
          Convite enviado com sucesso! O usuário receberá um e-mail para definir sua senha.
        </div>
      )}

      {convidarAberto && (
        <div className="mb-6 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-6">
          <h2 className="text-white font-semibold text-sm mb-4">Convidar novo usuário</h2>
          <form onSubmit={handleConvidar} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#555] text-xs uppercase tracking-wider mb-1.5">
                Nome
              </label>
              <input
                required
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#555] text-xs uppercase tracking-wider mb-1.5">
                E-mail
              </label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[#555] text-xs uppercase tracking-wider mb-1.5">
                Loja
              </label>
              <select
                value={lojaId}
                onChange={e => setLojaId(e.target.value)}
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
              >
                {lojas.map(l => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[#555] text-xs uppercase tracking-wider mb-1.5">
                Perfil
              </label>
              <select
                value={novoPerfil}
                onChange={e => setNovoPerfil(e.target.value as Perfil)}
                className="w-full bg-[#111] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors"
              >
                {perfis.map(p => (
                  <option key={p} value={p} className="capitalize">
                    {p}
                  </option>
                ))}
              </select>
            </div>
            {convidandoErro && (
              <div className="col-span-full text-red-400 text-xs">{convidandoErro}</div>
            )}
            <div className="col-span-full flex gap-2">
              <button
                type="submit"
                disabled={convidandoLoading}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--cor-primaria)' }}
              >
                {convidandoLoading ? 'Enviando...' : 'Enviar convite'}
              </button>
              <button
                type="button"
                onClick={() => setConvidarAberto(false)}
                className="px-4 py-2 rounded-lg text-sm text-[#666] hover:text-white border border-[#2A2A2A] hover:border-[#333] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl overflow-hidden">
        {usuarios.length === 0 ? (
          <p className="px-5 py-12 text-center text-[#555] text-sm">
            Nenhum usuário cadastrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2A2A2A]">
                  {['Nome', 'Loja', 'Perfil', 'Ações'].map(h => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-[#555] font-medium text-xs uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E1E1E]">
                {usuarios.map((u, i) => (
                  <tr
                    key={u.id}
                    className={i % 2 === 0 ? 'bg-[#1A1A1A]' : 'bg-[#141414]'}
                  >
                    <td className="px-4 py-3 text-white font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-[#888]">{u.loja?.nome ?? '—'}</td>
                    <td className="px-4 py-3">
                      {u.id === perfil.id ? (
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${perfilBadge[u.perfil]}`}
                        >
                          {u.perfil} (você)
                        </span>
                      ) : (
                        <select
                          defaultValue={u.perfil}
                          disabled={roleLoading === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value as Perfil)}
                          className="bg-[#111] border border-[#222] rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-[var(--cor-primaria)] disabled:opacity-50"
                        >
                          {perfis.map(p => (
                            <option key={p} value={p} className="capitalize">
                              {p}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.id !== perfil.id && (
                        <button
                          onClick={() => handleDelete(u.id, u.nome)}
                          disabled={deleteLoading === u.id}
                          className="text-xs text-[#666] hover:text-red-400 px-2.5 py-1.5 rounded-md border border-[#2A2A2A] hover:border-red-400/30 transition-colors disabled:opacity-50"
                        >
                          {deleteLoading === u.id ? '...' : 'Remover'}
                        </button>
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
  )
}
