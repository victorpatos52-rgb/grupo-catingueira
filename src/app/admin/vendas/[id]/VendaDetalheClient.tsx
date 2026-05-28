'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { finalizarVenda, salvarVenda } from '@/app/actions'
import { createClient } from '@/lib/supabase'
import type { UsuarioPerfil, Venda, Loja } from '@/types'

interface Props {
  venda: Venda
  loja: Loja
  perfil: UsuarioPerfil
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

export default function VendaDetalheClient({ venda: initial, perfil }: Props) {
  const router = useRouter()
  const [venda, setVenda] = useState(initial)
  const [finalizando, setFinalizando] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  async function handleUpload(files: FileList) {
    if (!files.length) return
    setUploading(true)
    try {
      const supabase = createClient()
      const novasUrls: string[] = []
      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()
        const path = `${venda.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('vendas-docs').upload(path, file)
        if (error) throw new Error(error.message)
        const { data: { publicUrl } } = supabase.storage.from('vendas-docs').getPublicUrl(path)
        novasUrls.push(publicUrl)
      }
      const documentos_urls = [...(venda.documentos_urls ?? []), ...novasUrls]
      await salvarVenda({
        ...venda,
        documentos_urls,
      })
      setVenda(v => ({ ...v, documentos_urls }))
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Erro ao fazer upload')
    } finally {
      setUploading(false)
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
            {venda.numero_negociacao && (
              <span className="text-[#6B7280] text-lg font-medium">#{venda.numero_negociacao}</span>
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
                <img
                  src={venda.veiculo.fotos[0]}
                  alt=""
                  className="w-full aspect-[16/9] object-cover rounded-lg bg-[#F3F4F6]"
                />
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
          {venda.observacoes && (
            <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
              <p className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-1">Observações</p>
              <p className="text-[#374151] text-sm">{venda.observacoes}</p>
            </div>
          )}
        </div>

        {/* Card Documentos */}
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">Documentos Anexados</p>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold text-[#92400E] bg-[#FEF9C3] border border-[#F5C842] hover:bg-[#FEF08A] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? 'Enviando...' : 'Anexar Documentos'}
            </button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)}
            />
          </div>

          {(venda.documentos_urls ?? []).length === 0 ? (
            <p className="text-[#9CA3AF] text-sm text-center py-6">Nenhum documento anexado.</p>
          ) : (
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
          )}
        </div>

      </div>
    </div>
  )
}
