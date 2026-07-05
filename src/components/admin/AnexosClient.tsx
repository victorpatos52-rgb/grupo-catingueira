'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { criarAnexo, deletarAnexo } from '@/app/actions'
import type { Anexo, EntidadeAnexo } from '@/types'

export type AnexoComUrl = Anexo & { urlAssinada: string | null }

interface Props {
  entidadeTipo: EntidadeAnexo
  entidadeId: string
  anexos: AnexoComUrl[]
}

export default function AnexosClient({ entidadeTipo, entidadeId, anexos: anexosIniciais }: Props) {
  const router = useRouter()
  const [anexos, setAnexos] = useState<AnexoComUrl[]>(anexosIniciais)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [excluindo, setExcluindo] = useState<string | null>(null)

  async function uploadAnexos(files: FileList) {
    setEnviando(true)
    setErro('')
    const supabase = createClient()

    for (const file of Array.from(files)) {
      const tipoValido = file.type === 'application/pdf' || file.type.startsWith('image/')
      if (!tipoValido) {
        setErro('Apenas PDF ou imagens são permitidos.')
        continue
      }
      const ext = file.name.split('.').pop()
      const path = `${entidadeTipo}/${entidadeId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('veiculos-documentos')
        .upload(path, file, { upsert: false })
      if (uploadError) {
        setErro(uploadError.message)
        continue
      }
      try {
        await criarAnexo({
          entidadeTipo,
          entidadeId,
          nomeArquivo: file.name,
          path,
          tipoArquivo: file.type,
        })
        router.refresh()
      } catch (err: unknown) {
        setErro(err instanceof Error ? err.message : 'Erro ao registrar anexo')
      }
    }
    setEnviando(false)
  }

  async function handleExcluir(anexo: AnexoComUrl) {
    if (!confirm(`Excluir "${anexo.nome_arquivo}"?`)) return
    setExcluindo(anexo.id)
    try {
      await deletarAnexo(anexo.id, anexo.url, entidadeId)
      setAnexos(prev => prev.filter(a => a.id !== anexo.id))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao excluir anexo')
    } finally {
      setExcluindo(null)
    }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider">Anexos</h2>
        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D0D0D0] transition-colors bg-white cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {enviando ? 'Enviando...' : 'Enviar arquivo'}
          <input
            type="file"
            accept="application/pdf,image/*"
            multiple
            className="hidden"
            disabled={enviando}
            onChange={e => e.target.files && uploadAnexos(e.target.files)}
          />
        </label>
      </div>

      {erro && (
        <div className="px-5 py-2.5 bg-red-50 border-b border-red-200">
          <p className="text-red-600 text-xs">{erro}</p>
        </div>
      )}

      {anexos.length === 0 ? (
        <p className="px-5 py-8 text-center text-[#9CA3AF] text-sm">Nenhum anexo enviado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F9FAFB]">
                {['Arquivo', 'Enviado em', 'Por', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[#9CA3AF] font-semibold text-xs uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {anexos.map(a => (
                <tr key={a.id} className="hover:bg-[#FAFAFA]">
                  <td className="px-4 py-3 text-[#111827]">{a.nome_arquivo}</td>
                  <td className="px-4 py-3 text-[#9CA3AF] text-xs">
                    {new Date(a.criado_em).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-[#6B7280] text-xs">{a.usuario?.nome ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {a.urlAssinada && (
                        <a
                          href={a.urlAssinada}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#6B7280] hover:text-[#111827] px-2.5 py-1.5 rounded-md border border-[#E5E7EB] hover:border-[#D0D0D0] transition-colors bg-white"
                        >
                          Baixar
                        </a>
                      )}
                      <button
                        onClick={() => handleExcluir(a)}
                        disabled={excluindo === a.id}
                        className="text-[#D1D5DB] hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
