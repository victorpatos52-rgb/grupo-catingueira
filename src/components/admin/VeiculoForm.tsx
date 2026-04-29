'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { createBrowserClient } from '@/lib/supabase'
import type { Veiculo } from '@/types'

const OPCIONAIS_LISTA = [
  'Ar-condicionado', 'Direção hidráulica', 'Direção elétrica', 'Vidro elétrico',
  'Trava elétrica', 'Airbag', 'ABS', 'Câmera de ré', 'Sensor de ré',
  'Central multimídia', 'Bluetooth', 'GPS', 'Bancos de couro', 'Teto solar',
  'Rodas de liga leve', 'Farol de milha', 'Farol LED', 'Alarme',
  'Piloto automático', 'Controle de estabilidade', 'Start/Stop',
]

const schema = z.object({
  marca: z.string().min(1, 'Obrigatório'),
  modelo: z.string().min(1, 'Obrigatório'),
  versao: z.string().optional(),
  ano: z.number().min(1900).max(new Date().getFullYear() + 1),
  cor: z.string().min(1, 'Obrigatório'),
  km: z.number().min(0),
  combustivel: z.string().min(1, 'Obrigatório'),
  cambio: z.string().min(1, 'Obrigatório'),
  preco: z.number().min(1, 'Obrigatório'),
  placa: z.string().optional(),
  descricao: z.string().optional(),
  status: z.enum(['disponivel', 'reservado', 'vendido', 'manutencao']),
  destaque: z.boolean(),
  data_aquisicao: z.string().min(1, 'Obrigatório'),
})

type FormData = z.infer<typeof schema>

interface VeiculoFormProps {
  veiculo?: Veiculo
  lojaId: string
}

export default function VeiculoForm({ veiculo, lojaId }: VeiculoFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fotos, setFotos] = useState<string[]>(veiculo?.fotos ?? [])
  const [opcionais, setOpcionais] = useState<string[]>(veiculo?.opcionais ?? [])
  const [uploading, setUploading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [dragOver, setDragOver] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      marca: veiculo?.marca ?? '',
      modelo: veiculo?.modelo ?? '',
      versao: veiculo?.versao ?? '',
      ano: veiculo?.ano ?? new Date().getFullYear(),
      cor: veiculo?.cor ?? '',
      km: veiculo?.km ?? 0,
      combustivel: veiculo?.combustivel ?? '',
      cambio: veiculo?.cambio ?? '',
      preco: veiculo?.preco ?? 0,
      placa: veiculo?.placa ?? '',
      descricao: veiculo?.descricao ?? '',
      status: veiculo?.status ?? 'disponivel',
      destaque: veiculo?.destaque ?? false,
      data_aquisicao: veiculo?.data_aquisicao ?? new Date().toISOString().split('T')[0],
    },
  })

  async function uploadFotos(files: FileList) {
    setUploading(true)
    const supabase = createBrowserClient()
    const urls: string[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const nome = `${lojaId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const { error } = await supabase.storage
        .from('veiculos-fotos')
        .upload(nome, file, { upsert: false })

      if (!error) {
        const { data } = supabase.storage.from('veiculos-fotos').getPublicUrl(nome)
        urls.push(data.publicUrl)
      }
    }

    setFotos(prev => [...prev, ...urls])
    setUploading(false)
  }

  function removerFoto(index: number) {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  function onDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.setData('text/plain', String(index))
  }

  function onDrop(e: React.DragEvent, targetIndex: number) {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'))
    if (fromIndex === targetIndex) return
    const newFotos = [...fotos]
    const [moved] = newFotos.splice(fromIndex, 1)
    newFotos.splice(targetIndex, 0, moved)
    setFotos(newFotos)
    setDragOver(null)
  }

  function toggleOpcional(op: string) {
    setOpcionais(prev =>
      prev.includes(op) ? prev.filter(o => o !== op) : [...prev, op]
    )
  }

  async function onSubmit(data: FormData) {
    setSalvando(true)
    setErro('')
    const supabase = createBrowserClient()

    const payload = {
      loja_id: lojaId,
      ...data,
      versao: data.versao || null,
      placa: data.placa || null,
      descricao: data.descricao || null,
      fotos,
      opcionais,
    }

    if (veiculo) {
      const { error } = await supabase
        .from('veiculos')
        .update(payload)
        .eq('id', veiculo.id)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('veiculos').insert(payload)
      if (error) { setErro(error.message); setSalvando(false); return }
    }

    router.push('/admin/veiculos')
    router.refresh()
  }

  const inputClass =
    'w-full bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[var(--cor-primaria)] transition-colors'
  const labelClass = 'block text-xs text-[#888] uppercase tracking-wider mb-1.5'
  const errorClass = 'text-red-400 text-xs mt-1'

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Fotos */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Fotos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
          {fotos.map((foto, i) => (
            <div
              key={foto}
              draggable
              onDragStart={e => onDragStart(e, i)}
              onDragOver={e => { e.preventDefault(); setDragOver(i) }}
              onDrop={e => onDrop(e, i)}
              onDragLeave={() => setDragOver(null)}
              className={`relative aspect-square rounded-lg overflow-hidden bg-[#111] cursor-grab border-2 transition-colors ${
                dragOver === i ? 'border-[var(--cor-primaria)]' : 'border-transparent'
              } ${i === 0 ? 'ring-2 ring-offset-2 ring-offset-[#1A1A1A] ring-[var(--cor-primaria)]' : ''}`}
            >
              <Image src={foto} alt={`Foto ${i + 1}`} fill className="object-cover" sizes="100px" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-[var(--cor-primaria)] text-[#0D0D0D] text-[10px] font-bold text-center py-0.5">
                  CAPA
                </span>
              )}
              <button
                type="button"
                onClick={() => removerFoto(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-[#2A2A2A] hover:border-[var(--cor-primaria)] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-[#555] text-xs">Enviando...</span>
            ) : (
              <>
                <svg className="w-6 h-6 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[#555] text-[10px]">Adicionar</span>
              </>
            )}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => e.target.files && uploadFotos(e.target.files)}
        />
        <p className="text-[#444] text-xs">Arraste para reordenar. A primeira foto será a capa.</p>
      </div>

      {/* Dados básicos */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Informações</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca *</label>
            <input {...register('marca')} className={inputClass} placeholder="Ex: Toyota" />
            {errors.marca && <p className={errorClass}>{errors.marca.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Modelo *</label>
            <input {...register('modelo')} className={inputClass} placeholder="Ex: Corolla" />
            {errors.modelo && <p className={errorClass}>{errors.modelo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Versão</label>
            <input {...register('versao')} className={inputClass} placeholder="Ex: XEi 2.0" />
          </div>
          <div>
            <label className={labelClass}>Ano *</label>
            <input type="number" {...register('ano', { valueAsNumber: true })} className={inputClass} />
            {errors.ano && <p className={errorClass}>{errors.ano.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Cor *</label>
            <input {...register('cor')} className={inputClass} placeholder="Ex: Prata" />
            {errors.cor && <p className={errorClass}>{errors.cor.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Quilometragem *</label>
            <input type="number" {...register('km', { valueAsNumber: true })} className={inputClass} placeholder="0" />
            {errors.km && <p className={errorClass}>{errors.km.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Câmbio *</label>
            <select {...register('cambio')} className={inputClass}>
              <option value="">Selecione</option>
              <option>Manual</option>
              <option>Automático</option>
              <option>CVT</option>
              <option>Automatizado</option>
            </select>
            {errors.cambio && <p className={errorClass}>{errors.cambio.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Combustível *</label>
            <select {...register('combustivel')} className={inputClass}>
              <option value="">Selecione</option>
              <option>Flex</option>
              <option>Gasolina</option>
              <option>Etanol</option>
              <option>Diesel</option>
              <option>Elétrico</option>
              <option>Híbrido</option>
            </select>
            {errors.combustivel && <p className={errorClass}>{errors.combustivel.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Placa</label>
            <input {...register('placa')} className={inputClass} placeholder="AAA-0000" />
          </div>
          <div>
            <label className={labelClass}>Preço (R$) *</label>
            <input type="number" {...register('preco', { valueAsNumber: true })} className={inputClass} placeholder="0" />
            {errors.preco && <p className={errorClass}>{errors.preco.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Data de aquisição *</label>
            <input type="date" {...register('data_aquisicao')} className={inputClass} />
            {errors.data_aquisicao && <p className={errorClass}>{errors.data_aquisicao.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Status *</label>
            <select {...register('status')} className={inputClass}>
              <option value="disponivel">Disponível</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
              <option value="manutencao">Manutenção</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input
              type="checkbox"
              id="destaque"
              {...register('destaque')}
              className="w-4 h-4 accent-[var(--cor-primaria)]"
            />
            <label htmlFor="destaque" className="text-sm text-white cursor-pointer">
              Destaque na vitrine
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Descrição</label>
          <textarea
            {...register('descricao')}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Descreva o veículo, histórico de revisões, estado geral..."
          />
        </div>
      </div>

      {/* Opcionais */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl p-5">
        <h2 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Opcionais</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {OPCIONAIS_LISTA.map(op => (
            <label
              key={op}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={opcionais.includes(op)}
                onChange={() => toggleOpcional(op)}
                className="w-4 h-4 accent-[var(--cor-primaria)] shrink-0"
              />
              <span className="text-sm text-[#888] group-hover:text-white transition-colors">{op}</span>
            </label>
          ))}
        </div>
      </div>

      {erro && (
        <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">{erro}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg border border-[#2A2A2A] text-sm text-[#888] hover:text-white hover:border-[#333] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={salvando || uploading}
          className="flex-1 py-2.5 rounded-lg font-bold text-sm text-[#0D0D0D] transition-all hover:brightness-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--cor-primaria)' }}
        >
          {salvando ? 'Salvando...' : veiculo ? 'Salvar alterações' : 'Cadastrar veículo'}
        </button>
      </div>
    </form>
  )
}
