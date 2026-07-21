'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { finalizarVenda, salvarVenda } from '@/app/actions'
import AnexosClient, { type AnexoComUrl } from '@/components/admin/AnexosClient'
import PromissoriasClient from './PromissoriasClient'
import type { UsuarioPerfil, Venda, Loja, VendaPagamento, VendaPromissoria } from '@/types'

interface Props {
  venda: Venda
  loja: Loja
  perfil: UsuarioPerfil
  anexos: AnexoComUrl[]
  pagamentos: VendaPagamento[]
  promissorias: VendaPromissoria[]
  podeVerFinanceiroCompleto: boolean
}

function formatarMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

function formatarKm(v: number) {
  return v.toLocaleString('pt-BR') + ' km'
}

function labelPagamento(p: VendaPagamento): string {
  switch (p.tipo) {
    case 'dinheiro': return 'Dinheiro'
    case 'pix': return 'Pix'
    case 'cheque': return `Cheque${p.detalhes?.banco ? ` (${p.detalhes.banco})` : ''}`
    case 'duplicata': return `Duplicata${p.detalhes?.banco ? ` (${p.detalhes.banco})` : ''}`
    case 'financeira': return `Financeira${p.detalhes?.nome ? ` (${p.detalhes.nome})` : ''}`
    case 'veiculo': return `Veículo recebido${p.detalhes?.marca ? ` — ${p.detalhes.marca} ${p.detalhes.modelo ?? ''}`.trimEnd() : ''}`
    case 'outros': return `Outros${p.detalhes?.descricao ? ` (${p.detalhes.descricao})` : ''}`
    default: return p.tipo
  }
}

function Campo({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-[#111] text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
}

export default function VendaDetalheClient({ venda: initial, perfil, anexos, pagamentos, promissorias, podeVerFinanceiroCompleto }: Props) {
  const router = useRouter()
  const [venda, setVenda] = useState(initial)
  const [finalizando, setFinalizando] = useState(false)
  const [obsEditando, setObsEditando] = useState(false)
  const [novaObs, setNovaObs] = useState(initial.observacoes ?? '')
  const [salvandoObs, setSalvandoObs] = useState(false)

  const total = pagamentos.reduce((a, p) => a + p.valor, 0)

  async function handleFinalizar() {
    if (!confirm('Finalizar esta venda? O veículo será marcado como vendido.')) return
    setFinalizando(true)
    try {
      await finalizarVenda(venda.id, venda.veiculo_id)
      router.refresh()
      setVenda(v => ({ ...v, status: 'finalizada' }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao finalizar')
    } finally {
      setFinalizando(false)
    }
  }

  async function handleSalvarObs() {
    setSalvandoObs(true)
    try {
      await salvarVenda({
        id: venda.id,
        loja_id: venda.loja_id,
        veiculo_id: venda.veiculo_id,
        comprador_nome: venda.comprador_nome,
        observacoes: novaObs || null,
      })
      setVenda(v => ({ ...v, observacoes: novaObs || null }))
      setObsEditando(false)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvandoObs(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-black uppercase text-[#111]">
              Venda
            </h1>
            {venda.numero_venda && (
              <span className="text-[#111] text-lg font-bold bg-[#FEF9C3] border border-[#F5C842] px-2.5 py-0.5 rounded-lg">
                {venda.numero_venda}
              </span>
            )}
            {venda.status === 'finalizada' ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-green-50 text-green-700 border border-green-200">
                Finalizada
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                Rascunho
              </span>
            )}
          </div>
          <p className="text-[#6B7280] text-sm mt-1">{formatarData(venda.data_venda)}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`/admin/veiculos/${venda.veiculo_id}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB] transition-colors bg-white"
          >
            🚗 Ver veículo
          </a>
          {podeVerFinanceiroCompleto && (
            <a
              href={`/admin/veiculos/${venda.veiculo_id}?aba=financeiro`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] hover:border-[#D1D5DB] transition-colors bg-white"
            >
              💸 Lançar despesa neste veículo
            </a>
          )}
          <a
            href={`/api/pdf/venda/${venda.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-[#E5E7EB] text-[#374151] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Documentos
          </a>
          {venda.status === 'rascunho' && (
            <button
              onClick={handleFinalizar}
              disabled={finalizando}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
            >
              {finalizando ? 'Finalizando...' : 'Finalizar Venda'}
            </button>
          )}
          <button
            onClick={() => router.push('/admin/vendas')}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-[#E5E7EB] text-[#6B7280] hover:text-[#111] hover:border-[#D1D5DB] transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>

      {/* Rascunho aberto direto (link antigo, favorito etc.) — os dados da
          negociação só são editáveis pelo assistente agora. */}
      {venda.status === 'rascunho' && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-amber-700 text-sm">
            Esta venda ainda é um rascunho — veículo, comprador e forma de pagamento só podem ser editados pelo assistente de criação.
          </p>
          <a
            href={`/admin/vendas/nova?venda_id=${venda.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F5C842] text-[#111827] hover:brightness-90 transition-colors whitespace-nowrap"
          >
            ✏️ Editar negociação
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Card Veículo */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">Veículo</p>
          {venda.veiculo ? (
            <div className="space-y-4">
              {venda.veiculo.fotos?.[0] && (
                <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-[#F3F4F6]">
                  <Image
                    src={venda.veiculo.fotos[0]}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Veículo" value={`${venda.veiculo.marca} ${venda.veiculo.modelo}`} />
                <Campo label="Ano" value={venda.veiculo.ano} />
                <Campo label="Placa" value={venda.veiculo.placa} />
                <Campo label="Cor" value={venda.veiculo.cor} />
                <Campo label="KM" value={formatarKm(venda.veiculo.km)} />
                <Campo label="Câmbio" value={venda.veiculo.cambio} />
                <Campo label="Combustível" value={venda.veiculo.combustivel} />
                {venda.veiculo.versao && <Campo label="Versão" value={venda.veiculo.versao} />}
              </div>
            </div>
          ) : (
            <p className="text-[#9CA3AF] text-sm">Veículo não encontrado</p>
          )}
        </div>

        {/* Card Comprador */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">Comprador</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Campo label="Nome" value={venda.comprador_nome} /></div>
            <Campo label="CPF" value={venda.comprador_cpf} />
            <Campo label="RG" value={venda.comprador_rg} />
            <Campo label="Identidade" value={venda.comprador_identidade} />
            <Campo label="Profissão" value={venda.comprador_profissao} />
            <Campo label="Data Nasc." value={formatarData(venda.comprador_data_nasc)} />
            <Campo label="Estado Civil" value={venda.comprador_estado_civil} />
            <div className="col-span-2"><Campo label="Endereço" value={venda.comprador_endereco} /></div>
            <Campo label="CEP" value={venda.comprador_cep} />
            <Campo label="Cidade / UF" value={venda.comprador_cidade ? `${venda.comprador_cidade} - ${venda.comprador_uf}` : null} />
            <Campo label="Telefone" value={venda.comprador_telefone} />
            <Campo label="E-mail" value={venda.comprador_email} />
            <Campo label="Vendedor" value={venda.vendedor?.nome} />
          </div>
        </div>

        {/* Card Detalhes da venda — capturados no assistente mas antes não
            apareciam em lugar nenhum depois de criada a venda. */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">Detalhes da venda</p>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Origem" value={venda.origem} />
            <Campo label="N. Fiscal" value={venda.numero_fiscal} />
            <Campo label="Inscrição Estadual" value={venda.inscricao_estadual} />
            <Campo label="Hodômetro" value={venda.hodometro_venda ? formatarKm(venda.hodometro_venda) : null} />
          </div>
        </div>

        {/* Card Pagamentos */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">Pagamentos</p>
          <div className="space-y-2 text-sm">
            {pagamentos.length === 0 && (
              <p className="text-[#9CA3AF]">Nenhum pagamento registrado.</p>
            )}
            {pagamentos.map(p => (
              <div key={p.id} className="flex justify-between">
                <span className="text-[#6B7280]">{labelPagamento(p)}</span>
                <span className="font-medium">{formatarMoeda(p.valor)}</span>
              </div>
            ))}
            <div className="border-t border-[#E5E7EB] pt-2 mt-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Valor de venda</span>
                <span className="font-medium">{formatarMoeda(venda.valor_venda)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Desconto</span>
                <span>{formatarMoeda(venda.desconto)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#111]">
                <span>Valor líquido</span>
                <span>{formatarMoeda(venda.valor_liquido)}</span>
              </div>
              <div className="flex justify-between font-bold text-base">
                <span>Total pagamentos</span>
                <span>{formatarMoeda(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Documentos (legado) — mantido só para exibir uploads antigos feitos
            via mecanismo anterior (bucket público "vendas-docs"). Novos anexos
            devem ser enviados pelo card "Anexos" abaixo. */}
        {(venda.documentos_urls ?? []).length > 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">
              Documentos Anexados (legado)
            </p>
            <ul className="space-y-2">
              {venda.documentos_urls.map((url, i) => {
                const nome = decodeURIComponent(url.split('/').pop() ?? `documento-${i + 1}`)
                return (
                  <li key={url} className="flex items-center gap-2 p-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
                    <svg className="w-4 h-4 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[#374151] text-xs truncate flex-1">{nome}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#F59E0B] hover:underline shrink-0"
                    >
                      Baixar
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

      </div>

      {/* Anexos de venda (contrato assinado etc.) — uso do dia a dia do
          vendedor, liberado pra qualquer perfil da loja. Diferente dos anexos
          de veículo (Documentação), que continuam restritos a gerente/
          diretor/admin. */}
      <div className="mt-5">
        <AnexosClient entidadeTipo="venda" entidadeId={venda.id} anexos={anexos} />
      </div>

      {/* Promissórias (parcelamento) — financeiro completo, admin apenas,
          mesmo nível de despesas/lançamentos/Financeiro do veículo. */}
      {podeVerFinanceiroCompleto && (
        <div className="mt-5">
          <PromissoriasClient vendaId={venda.id} promissorias={promissorias} />
        </div>
      )}

      {/* Card Observações */}
      <div className="mt-5 bg-white border border-[#E5E7EB] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Observações</p>
          {!obsEditando && (
            <button
              onClick={() => { setNovaObs(venda.observacoes ?? ''); setObsEditando(true) }}
              className="text-xs text-[#6B7280] hover:text-[#111] px-2.5 py-1 rounded-lg border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
            >
              Editar
            </button>
          )}
        </div>

        {obsEditando ? (
          <div className="space-y-3">
            <textarea
              value={novaObs}
              onChange={e => setNovaObs(e.target.value)}
              rows={4}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-[#111] text-sm focus:outline-none focus:border-[#F5C842] focus:ring-2 focus:ring-[#FEF9C3] transition-all resize-none placeholder-[#D1D5DB]"
              placeholder="Observações sobre a venda..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleSalvarObs}
                disabled={salvandoObs}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] transition-colors disabled:opacity-50"
              >
                {salvandoObs ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setObsEditando(false)}
                className="px-4 py-1.5 rounded-lg text-sm text-[#6B7280] border border-[#E5E7EB] hover:border-[#D1D5DB] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[#374151] text-sm">
            {venda.observacoes || <span className="text-[#9CA3AF]">Nenhuma observação.</span>}
          </p>
        )}
      </div>

    </div>
  )
}
