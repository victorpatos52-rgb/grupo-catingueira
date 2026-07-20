'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { finalizarVenda, salvarVenda } from '@/app/actions'
import AnexosClient, { type AnexoComUrl } from '@/components/admin/AnexosClient'
import type { UsuarioPerfil, Venda, Loja } from '@/types'

interface Props {
  venda: Venda
  loja: Loja
  perfil: UsuarioPerfil
  anexos: AnexoComUrl[]
  podeVerDocumentacao: boolean
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

function Campo({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div>
      <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-[#111] text-sm mt-0.5">{value || '—'}</p>
    </div>
  )
}

export default function VendaDetalheClient({ venda: initial, perfil, anexos, podeVerDocumentacao }: Props) {
  const router = useRouter()
  const [venda, setVenda] = useState(initial)
  const [finalizando, setFinalizando] = useState(false)
  const [obsEditando, setObsEditando] = useState(false)
  const [novaObs, setNovaObs] = useState(initial.observacoes ?? '')
  const [salvandoObs, setSalvandoObs] = useState(false)

  const total =
    venda.pagamento_dinheiro +
    venda.pagamento_cheque1_valor +
    venda.pagamento_cheque2_valor +
    venda.pagamento_duplicata1_valor +
    venda.pagamento_duplicata2_valor +
    venda.pagamento_financeira_valor +
    venda.pagamento_outros_valor

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
          {podeVerDocumentacao && (
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

        {/* Card Pagamentos */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-4">Pagamentos</p>
          <div className="space-y-2 text-sm">
            {venda.pagamento_dinheiro > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Dinheiro</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_dinheiro)}</span>
              </div>
            )}
            {venda.pagamento_cheque1_valor > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Cheque 1 {venda.pagamento_cheque1_banco ? `(${venda.pagamento_cheque1_banco})` : ''}</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_cheque1_valor)}</span>
              </div>
            )}
            {venda.pagamento_cheque2_valor > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Cheque 2 {venda.pagamento_cheque2_banco ? `(${venda.pagamento_cheque2_banco})` : ''}</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_cheque2_valor)}</span>
              </div>
            )}
            {venda.pagamento_duplicata1_valor > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Duplicata 1 {venda.pagamento_duplicata1_banco ? `(${venda.pagamento_duplicata1_banco})` : ''}</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_duplicata1_valor)}</span>
              </div>
            )}
            {venda.pagamento_duplicata2_valor > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Duplicata 2 {venda.pagamento_duplicata2_banco ? `(${venda.pagamento_duplicata2_banco})` : ''}</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_duplicata2_valor)}</span>
              </div>
            )}
            {venda.pagamento_financeira_valor > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Financeira {venda.pagamento_financeira_nome ? `(${venda.pagamento_financeira_nome})` : ''}</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_financeira_valor)}</span>
              </div>
            )}
            {venda.pagamento_outros_valor > 0 && (
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Outros {venda.pagamento_outros_desc ? `(${venda.pagamento_outros_desc})` : ''}</span>
                <span className="font-medium">{formatarMoeda(venda.pagamento_outros_valor)}</span>
              </div>
            )}
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

      {/* Anexos (mesma tabela/bucket privado usados na Documentação do veículo).
          Restrito a gerente/diretor/admin — mesmo motivo de sensibilidade. */}
      {podeVerDocumentacao && (
        <div className="mt-5">
          <AnexosClient entidadeTipo="venda" entidadeId={venda.id} anexos={anexos} />
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
