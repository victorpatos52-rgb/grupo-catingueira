'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createBrowserClient } from '@/lib/supabase'

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  telefone: z.string().min(8, 'Telefone inválido'),
  origem: z.enum(['site', 'whatsapp', 'instagram', 'indicacao', 'outros']),
  observacoes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function NovoLeadForm({ lojaId }: { lojaId: string }) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { origem: 'outros' },
  })

  async function onSubmit(data: FormData) {
    setSalvando(true)
    const supabase = createBrowserClient()
    await supabase.from('leads').insert({
      loja_id: lojaId,
      ...data,
      observacoes: data.observacoes || null,
      status: 'novo',
      veiculo_id: null,
    })
    reset()
    setAberto(false)
    setSalvando(false)
    router.refresh()
  }

  const inputClass =
    'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors'

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#2A2A2A] text-sm text-[#888] hover:text-white hover:border-[#333] transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Adicionar lead manualmente
      </button>
    )
  }

  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Novo Lead</h2>
        <button onClick={() => setAberto(false)} className="text-[#555] hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <input {...register('nome')} className={inputClass} placeholder="Nome *" />
          {errors.nome && <p className="text-red-400 text-xs mt-1">{errors.nome.message}</p>}
        </div>
        <div>
          <input {...register('telefone')} className={inputClass} placeholder="Telefone *" />
          {errors.telefone && <p className="text-red-400 text-xs mt-1">{errors.telefone.message}</p>}
        </div>
        <div>
          <select {...register('origem')} className={inputClass}>
            <option value="site">Site</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="instagram">Instagram</option>
            <option value="indicacao">Indicação</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        <div>
          <input {...register('observacoes')} className={inputClass} placeholder="Observações" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="px-4 py-2 text-sm text-[#666] border border-[#2A2A2A] rounded-lg hover:text-white hover:border-[#333] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvando}
            className="px-6 py-2 text-sm font-bold text-[#0D0D0D] rounded-lg transition-all hover:brightness-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--cor-primaria)' }}
          >
            {salvando ? 'Salvando...' : 'Salvar lead'}
          </button>
        </div>
      </form>
    </div>
  )
}
