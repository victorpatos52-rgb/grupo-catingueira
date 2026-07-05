'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { saveVeiculoAquisicao } from '@/app/actions'
import AnexosClient, { type AnexoComUrl } from '@/components/admin/AnexosClient'
import type { VeiculoAquisicao } from '@/types'

const aquisicaoSchema = z.object({
  nome_vendedor: z.string().optional(),
  documento_vendedor: z.string().optional(),
  telefone_vendedor: z.string().optional(),
  forma_pagamento_compra: z.string().optional(),
  data_compra: z.string().optional(),
  hora_compra: z.string().optional(),
  valor_compra: z.number().nullable().optional(),
  observacoes: z.string().optional(),
})

type AquisicaoFormData = z.infer<typeof aquisicaoSchema>

export type { AnexoComUrl }

interface Props {
  veiculoId: string
  aquisicao: VeiculoAquisicao | null
  anexos: AnexoComUrl[]
}

const inputCls =
  'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all placeholder-[#D1D5DB]'
const labelCls = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'
const errorCls = 'text-red-600 text-xs mt-1'

export default function DocumentacaoVeiculoClient({ veiculoId, aquisicao, anexos }: Props) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AquisicaoFormData>({
    resolver: zodResolver(aquisicaoSchema),
    defaultValues: {
      nome_vendedor: aquisicao?.nome_vendedor ?? '',
      documento_vendedor: aquisicao?.documento_vendedor ?? '',
      telefone_vendedor: aquisicao?.telefone_vendedor ?? '',
      forma_pagamento_compra: aquisicao?.forma_pagamento_compra ?? '',
      data_compra: aquisicao?.data_compra ?? '',
      hora_compra: aquisicao?.hora_compra ?? '',
      valor_compra: aquisicao?.valor_compra ?? null,
      observacoes: aquisicao?.observacoes ?? '',
    },
  })
  const [salvandoAquisicao, setSalvandoAquisicao] = useState(false)
  const [aquisicaoOk, setAquisicaoOk] = useState(false)
  const [erroAquisicao, setErroAquisicao] = useState('')

  async function onSubmitAquisicao(data: AquisicaoFormData) {
    setSalvandoAquisicao(true)
    setAquisicaoOk(false)
    setErroAquisicao('')
    try {
      await saveVeiculoAquisicao(
        veiculoId,
        {
          nome_vendedor: data.nome_vendedor || null,
          documento_vendedor: data.documento_vendedor || null,
          telefone_vendedor: data.telefone_vendedor || null,
          forma_pagamento_compra: data.forma_pagamento_compra || null,
          data_compra: data.data_compra || null,
          hora_compra: data.hora_compra || null,
          valor_compra: data.valor_compra ?? null,
          observacoes: data.observacoes || null,
        },
        aquisicao?.id
      )
      setAquisicaoOk(true)
      router.refresh()
    } catch (err: unknown) {
      setErroAquisicao(err instanceof Error ? err.message : 'Erro ao salvar aquisição')
    } finally {
      setSalvandoAquisicao(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Aquisição */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Dados da aquisição</h2>
        <form onSubmit={handleSubmit(onSubmitAquisicao)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Nome do vendedor</label>
              <input {...register('nome_vendedor')} className={inputCls} placeholder="Nome completo" />
            </div>
            <div>
              <label className={labelCls}>CPF/CNPJ</label>
              <input {...register('documento_vendedor')} className={inputCls} placeholder="000.000.000-00" />
            </div>
            <div>
              <label className={labelCls}>Telefone</label>
              <input {...register('telefone_vendedor')} className={inputCls} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className={labelCls}>Forma de pagamento</label>
              <input {...register('forma_pagamento_compra')} className={inputCls} placeholder="Ex: Pix, dinheiro, financiado" />
            </div>
            <div>
              <label className={labelCls}>Data da compra</label>
              <input type="date" {...register('data_compra')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hora da compra</label>
              <input type="time" {...register('hora_compra')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valor da compra (R$)</label>
              <input
                type="number"
                step="0.01"
                {...register('valor_compra', { setValueAs: v => (v === '' ? null : Number(v)) })}
                className={inputCls}
                placeholder="0,00"
              />
              {errors.valor_compra && <p className={errorCls}>{errors.valor_compra.message}</p>}
            </div>
          </div>
          <div>
            <label className={labelCls}>Observações</label>
            <textarea {...register('observacoes')} rows={3} className={`${inputCls} resize-y`} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={salvandoAquisicao}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
            >
              {salvandoAquisicao ? 'Salvando...' : 'Salvar'}
            </button>
            {aquisicaoOk && <span className="text-green-600 text-sm font-medium">✓ Salvo</span>}
            {erroAquisicao && <span className="text-red-600 text-sm">{erroAquisicao}</span>}
          </div>
        </form>
      </div>

      {/* Anexos */}
      <AnexosClient entidadeTipo="veiculo" entidadeId={veiculoId} anexos={anexos} />
    </div>
  )
}
