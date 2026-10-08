'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { consultarCatalogoOlx, listarNivelCatalogoOlx, salvarVinculoOlx } from '@/app/admin/veiculos/olx-catalogo-actions'
import type { OpcaoCatalogo, ResultadoNivel } from '@/lib/olx-catalogo'

type Nivel = 'marca' | 'modelo' | 'versao'
const ROTULO: Record<Nivel, string> = { marca: 'Marca', modelo: 'Modelo', versao: 'Versão' }

type EstadoNivel = {
  escolhido: OpcaoCatalogo | null
  /** Como o escolhido foi definido — 'manual' quando o usuário escolheu na lista. */
  origem: 'exato' | 'contido' | 'manual' | null
  opcoes: OpcaoCatalogo[]
  listaCompleta: boolean
}

const vazio: EstadoNivel = { escolhido: null, origem: null, opcoes: [], listaCompleta: false }

function deResultado(r: ResultadoNivel | null): EstadoNivel {
  if (!r) return vazio
  if (r.ok) return { escolhido: { id: r.id, nome: r.nome }, origem: r.criterio, opcoes: [], listaCompleta: false }
  return { escolhido: null, origem: null, opcoes: r.candidatos, listaCompleta: false }
}

interface Props {
  veiculoId: string
  marca: string
  modelo: string
  versao: string | null
  ano: number | null
  vinculoAtual: { marcaId: string; modeloId: string; versaoId: string } | null
}

// Busca marca/modelo/versão no catálogo da OLX com os valores atuais do
// formulário e mostra o que bateu e os candidatos do que não bateu — nunca
// escolhe sozinho entre candidatos. Salvar exige os três níveis definidos.
export default function VinculoCatalogoOlx({ veiculoId, marca, modelo, versao, ano, vinculoAtual }: Props) {
  const router = useRouter()
  // true só depois de uma busca bem-sucedida — erro ao listar um nível depois
  // disso mostra a mensagem sem esconder o que já foi resolvido.
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState<Nivel | 'busca' | 'salvar' | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvo, setSalvo] = useState(false)
  const [niveis, setNiveis] = useState<Record<Nivel, EstadoNivel>>({ marca: vazio, modelo: vazio, versao: vazio })

  async function buscar() {
    setAberto(false)
    setErro(null)
    setSalvo(false)
    setCarregando('busca')
    try {
      const r = await consultarCatalogoOlx(veiculoId, { marca, modelo, versao, ano })
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      setNiveis({ marca: deResultado(r.marca), modelo: deResultado(r.modelo), versao: deResultado(r.versao) })
      setAberto(true)
    } catch {
      setErro('Erro de conexão ao consultar o catálogo da OLX.')
    } finally {
      setCarregando(null)
    }
  }

  async function carregarListaCompleta(nivel: Nivel, marcaId?: string, modeloId?: string) {
    setErro(null)
    setCarregando(nivel)
    try {
      const r = await listarNivelCatalogoOlx(veiculoId, { marcaId, modeloId })
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      setNiveis(prev => ({ ...prev, [nivel]: { ...prev[nivel], opcoes: r.opcoes, listaCompleta: true } }))
    } catch {
      setErro('Erro de conexão ao consultar o catálogo da OLX.')
    } finally {
      setCarregando(null)
    }
  }

  // Trocar um nível invalida os seguintes e já carrega a lista do próximo.
  function escolher(nivel: Nivel, opcao: OpcaoCatalogo) {
    setSalvo(false)
    setNiveis(prev => {
      const novo = { ...prev, [nivel]: { ...prev[nivel], escolhido: opcao, origem: 'manual' as const } }
      if (nivel === 'marca') {
        novo.modelo = vazio
        novo.versao = vazio
      }
      if (nivel === 'modelo') novo.versao = vazio
      return novo
    })
    if (nivel === 'marca') void carregarListaCompleta('modelo', opcao.id)
    if (nivel === 'modelo' && niveis.marca.escolhido) void carregarListaCompleta('versao', niveis.marca.escolhido.id, opcao.id)
  }

  function trocar(nivel: Nivel) {
    setNiveis(prev => ({ ...prev, [nivel]: { ...prev[nivel], escolhido: null, origem: null } }))
    const marcaId = niveis.marca.escolhido?.id
    const modeloId = niveis.modelo.escolhido?.id
    if (nivel === 'marca') void carregarListaCompleta('marca')
    if (nivel === 'modelo' && marcaId) void carregarListaCompleta('modelo', marcaId)
    if (nivel === 'versao' && marcaId && modeloId) void carregarListaCompleta('versao', marcaId, modeloId)
  }

  async function salvar() {
    const { marca: m, modelo: mo, versao: v } = niveis
    if (!m.escolhido || !mo.escolhido || !v.escolhido) return
    setErro(null)
    setCarregando('salvar')
    try {
      const r = await salvarVinculoOlx(veiculoId, { marcaId: m.escolhido.id, modeloId: mo.escolhido.id, versaoId: v.escolhido.id })
      if (!r.ok) {
        setErro(r.erro)
        return
      }
      setSalvo(true)
      router.refresh()
    } catch {
      setErro('Erro de conexão ao salvar o vínculo.')
    } finally {
      setCarregando(null)
    }
  }

  const completo = !!(niveis.marca.escolhido && niveis.modelo.escolhido && niveis.versao.escolhido)
  const anterioresOk: Record<Nivel, boolean> = {
    marca: true,
    modelo: !!niveis.marca.escolhido,
    versao: !!niveis.marca.escolhido && !!niveis.modelo.escolhido,
  }

  return (
    <div className="mt-4 border-t border-[#E5E7EB] pt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Catálogo OLX</p>
          <p className="text-xs text-[#6B7280]">
            {vinculoAtual
              ? `Vinculado (marca ${vinculoAtual.marcaId} · modelo ${vinculoAtual.modeloId} · versão ${vinculoAtual.versaoId})`
              : 'Não vinculado — a OLX recusa anúncio sem marca/modelo/versão do catálogo dela.'}
          </p>
        </div>
        <button
          type="button"
          onClick={buscar}
          disabled={carregando !== null || !marca.trim() || !modelo.trim()}
          className="px-3 py-2 rounded-lg text-xs font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors disabled:opacity-50"
        >
          {carregando === 'busca' ? 'Buscando...' : vinculoAtual ? 'Refazer vínculo com o catálogo OLX' : 'Vincular ao catálogo OLX'}
        </button>
      </div>

      {erro && <p className="mt-3 text-red-600 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

      {aberto && carregando !== 'busca' && (
        <div className="mt-3 space-y-3">
          {(['marca', 'modelo', 'versao'] as Nivel[]).map(nivel => {
            const n = niveis[nivel]
            if (!anterioresOk[nivel]) return null
            return (
              <div key={nivel} className="text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] mb-1">{ROTULO[nivel]}</p>
                {n.escolhido ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-green-700 font-medium">✓ {n.escolhido.nome}</span>
                    <span className="text-[10px] text-[#9CA3AF]">
                      {n.origem === 'exato' ? 'nome idêntico' : n.origem === 'contido' ? 'nome contido no cadastro — confira' : 'escolhido manualmente'}
                    </span>
                    <button type="button" onClick={() => trocar(nivel)} className="text-xs text-[#6B7280] underline">
                      trocar
                    </button>
                  </div>
                ) : carregando === nivel ? (
                  <p className="text-xs text-[#6B7280]">Carregando opções...</p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-xs text-amber-700">
                      {n.opcoes.length > 0
                        ? n.listaCompleta ? 'Escolha na lista da OLX:' : 'Sem correspondência exata. Candidatos:'
                        : 'Nenhum candidato encontrado.'}
                    </p>
                    {n.opcoes.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={e => {
                          const o = n.opcoes.find(x => x.id === e.target.value)
                          if (o) escolher(nivel, o)
                        }}
                        className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="" disabled>Selecione...</option>
                        {n.opcoes.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                      </select>
                    )}
                    {!n.listaCompleta && (
                      <button
                        type="button"
                        onClick={() =>
                          carregarListaCompleta(nivel, nivel === 'marca' ? undefined : niveis.marca.escolhido?.id, nivel === 'versao' ? niveis.modelo.escolhido?.id : undefined)
                        }
                        className="text-xs text-[#6B7280] underline"
                      >
                        ver lista completa da OLX
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={salvar}
              disabled={!completo || carregando !== null}
              className="px-4 py-2 rounded-lg text-xs font-bold text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
            >
              {carregando === 'salvar' ? 'Salvando...' : 'Salvar vínculo'}
            </button>
            {salvo && <span className="text-green-600 text-xs font-medium">✓ Vínculo salvo</span>}
          </div>
        </div>
      )}
    </div>
  )
}
