'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'
import { criarVeiculo, atualizarVeiculo, atualizarDadosVeiculo } from '@/app/actions'
import { useAdmin } from '@/contexts/AdminContext'
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
  valor_oferta: z.number().nullable().optional(),
  proprietario_tipo: z.enum(['felipe', 'dividido']),
  percentual_socio: z.number().nullable().optional(),
  placa: z.string().optional(),
  chassi: z.string().optional(),
  renavam: z.string().optional(),
  tipo: z.string().optional(),
  portas: z.number().nullable().optional(),
  hodometro_venda: z.number().nullable().optional(),
  descricao: z.string().optional(),
  status: z.enum(['disponivel', 'reservado', 'vendido', 'manutencao']),
  destaque: z.boolean(),
  data_aquisicao: z.string().min(1, 'Obrigatório'),
}).refine(
  data => data.valor_oferta == null || data.valor_oferta < data.preco,
  {
    message: 'O valor de oferta deve ser menor que o preço normal',
    path: ['valor_oferta'],
  }
).refine(
  data =>
    data.proprietario_tipo !== 'dividido' ||
    (data.percentual_socio != null && data.percentual_socio >= 0 && data.percentual_socio <= 100),
  {
    message: 'Percentual do sócio é obrigatório (entre 0 e 100) quando o veículo é dividido',
    path: ['percentual_socio'],
  }
)

type FormData = z.infer<typeof schema>

const CAMPO_LABELS: Partial<Record<keyof FormData, string>> = {
  marca: 'Marca',
  modelo: 'Modelo',
  ano: 'Ano',
  cor: 'Cor',
  km: 'Quilometragem',
  cambio: 'Câmbio',
  combustivel: 'Combustível',
  preco: 'Preço',
  valor_oferta: 'Valor de oferta',
  percentual_socio: 'Percentual do sócio',
  data_aquisicao: 'Data de aquisição',
}

interface VeiculoFormProps {
  veiculo?: Veiculo
  lojaId: string
  hideFotos?: boolean
  fotos?: string[]
  noRedirect?: boolean
}

export default function VeiculoForm({ veiculo, lojaId, hideFotos, fotos: fotosExterna, noRedirect }: VeiculoFormProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { loja, perfil } = useAdmin()
  const isFelizardo = (loja?.dominio ?? '').toLowerCase().includes('felizardo')
  const isSocio = perfil?.perfil === 'socio'

  const [fotos, setFotos] = useState<string[]>(hideFotos ? (fotosExterna ?? veiculo?.fotos ?? []) : (veiculo?.fotos ?? []))
  const [opcionais, setOpcionais] = useState<string[]>(veiculo?.opcionais ?? [])
  const [uploading, setUploading] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk] = useState(false)
  const [erro, setErro] = useState('')
  const [dragOver, setDragOver] = useState<number | null>(null)

  const {
    register,
    handleSubmit,
    watch,
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
      valor_oferta: veiculo?.valor_oferta ?? null,
      proprietario_tipo: veiculo?.proprietario_tipo ?? (isSocio ? 'dividido' : 'felipe'),
      percentual_socio: veiculo?.percentual_socio ?? null,
      placa: veiculo?.placa ?? '',
      chassi: veiculo?.chassi ?? '',
      renavam: veiculo?.renavam ?? '',
      tipo: veiculo?.tipo ?? '',
      portas: veiculo?.portas ?? null,
      hodometro_venda: veiculo?.hodometro_venda ?? null,
      descricao: veiculo?.descricao ?? '',
      status: veiculo?.status ?? 'disponivel',
      destaque: veiculo?.destaque ?? false,
      data_aquisicao: veiculo?.data_aquisicao ?? new Date().toISOString().split('T')[0],
    },
  })

  const proprietarioTipoAtual = watch('proprietario_tipo')

  async function uploadFotos(files: FileList) {
    setUploading(true)
    const supabase = createClient()
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
    setSalvoOk(false)
    setErro('')

    const dadosBase = {
      loja_id: lojaId,
      marca: data.marca,
      modelo: data.modelo,
      versao: data.versao || null,
      ano: data.ano,
      cor: data.cor,
      km: data.km,
      combustivel: data.combustivel,
      cambio: data.cambio,
      preco: data.preco,
      valor_oferta: data.valor_oferta ?? null,
      // Fora da Felizardo, os campos nem aparecem na tela — forço os valores
      // seguros aqui também, pra nunca depender só da UI escondida. Sócio
      // sempre grava 'dividido' (nunca pode voltar pra 'felipe' pela UI).
      proprietario_tipo: isSocio ? 'dividido' : isFelizardo ? data.proprietario_tipo : 'felipe',
      percentual_socio:
        isSocio || (isFelizardo && data.proprietario_tipo === 'dividido') ? data.percentual_socio : null,
      placa: data.placa || null,
      chassi: data.chassi || null,
      renavam: data.renavam || null,
      tipo: data.tipo || null,
      portas: data.portas ?? null,
      hodometro_venda: data.hodometro_venda ?? null,
      descricao: data.descricao || null,
      status: data.status,
      destaque: data.destaque,
      data_aquisicao: data.data_aquisicao,
      opcionais,
    }

    try {
      if (veiculo) {
        if (hideFotos) {
          await atualizarDadosVeiculo(veiculo.id, dadosBase)
        } else {
          await atualizarVeiculo(veiculo.id, { ...dadosBase, fotos })
        }
      } else {
        await criarVeiculo({ ...dadosBase, fotos })
      }
      if (noRedirect) {
        setSalvoOk(true)
        router.refresh()
        setSalvando(false)
      } else {
        router.push('/admin/veiculos')
        router.refresh()
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar veículo')
      setSalvando(false)
    }
  }

  const inputClass =
    'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all placeholder-[#D1D5DB]'
  const labelClass = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'
  const errorClass = 'text-red-600 text-xs mt-1'

  function campoCls(hasError?: boolean) {
    return hasError
      ? `${inputClass} border-red-500 focus:ring-red-200 focus:border-red-500`
      : inputClass
  }

  const camposComErro = Object.keys(errors)
    .map(k => CAMPO_LABELS[k as keyof FormData])
    .filter((label): label is string => !!label)

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {camposComErro.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">Preencha os campos obrigatórios destacados abaixo:</p>
          <p>{camposComErro.join(', ')}</p>
        </div>
      )}

      {/* Fotos */}
      {!hideFotos && <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Fotos</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
          {fotos.map((foto, i) => (
            <div
              key={foto}
              draggable
              onDragStart={e => onDragStart(e, i)}
              onDragOver={e => { e.preventDefault(); setDragOver(i) }}
              onDrop={e => onDrop(e, i)}
              onDragLeave={() => setDragOver(null)}
              className={`relative aspect-square rounded-lg overflow-hidden bg-[#F9FAFB] cursor-grab border-2 transition-colors ${
                dragOver === i ? 'border-[#F5C842]' : 'border-[#E5E7EB]'
              } ${i === 0 ? 'ring-2 ring-offset-2 ring-offset-white ring-[#F5C842]' : ''}`}
            >
              <Image src={foto} alt={`Foto ${i + 1}`} fill className="object-cover" sizes="100px" />
              {i === 0 && (
                <span className="absolute bottom-0 left-0 right-0 bg-[#F5C842] text-[#111827] text-[10px] font-bold text-center py-0.5">
                  CAPA
                </span>
              )}
              <button
                type="button"
                onClick={() => removerFoto(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="aspect-square rounded-lg border-2 border-dashed border-[#E5E7EB] hover:border-[#F5C842] bg-[#F9FAFB] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <span className="text-[#9CA3AF] text-xs">Enviando...</span>
            ) : (
              <>
                <svg className="w-6 h-6 text-[#D1D5DB]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-[#9CA3AF] text-[10px]">Adicionar</span>
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
        <p className="text-[#9CA3AF] text-xs">Arraste para reordenar. A primeira foto será a capa.</p>
      </div>}

      {/* Dados básicos */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Informações</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca *</label>
            <input {...register('marca')} className={campoCls(!!errors.marca)} placeholder="Ex: Toyota" />
            {errors.marca && <p className={errorClass}>{errors.marca.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Modelo *</label>
            <input {...register('modelo')} className={campoCls(!!errors.modelo)} placeholder="Ex: Corolla" />
            {errors.modelo && <p className={errorClass}>{errors.modelo.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Versão</label>
            <input {...register('versao')} className={campoCls(!!errors.versao)} placeholder="Ex: XEi 2.0" />
          </div>
          <div>
            <label className={labelClass}>Ano *</label>
            <input type="number" {...register('ano', { valueAsNumber: true })} className={campoCls(!!errors.ano)} />
            {errors.ano && <p className={errorClass}>{errors.ano.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Cor *</label>
            <input {...register('cor')} className={campoCls(!!errors.cor)} placeholder="Ex: Prata" />
            {errors.cor && <p className={errorClass}>{errors.cor.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Quilometragem *</label>
            <input type="number" {...register('km', { valueAsNumber: true })} className={campoCls(!!errors.km)} placeholder="0" />
            {errors.km && <p className={errorClass}>{errors.km.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Câmbio *</label>
            <select {...register('cambio')} className={campoCls(!!errors.cambio)}>
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
            <select {...register('combustivel')} className={campoCls(!!errors.combustivel)}>
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
            <input {...register('placa')} className={campoCls(!!errors.placa)} placeholder="AAA-0000" />
          </div>
          <div>
            <label className={labelClass}>Chassi</label>
            <input {...register('chassi')} className={campoCls(!!errors.chassi)} placeholder="9BWZZZ377VT004251" />
          </div>
          <div>
            <label className={labelClass}>Renavam</label>
            <input {...register('renavam')} className={campoCls(!!errors.renavam)} placeholder="00000000000" />
          </div>
          <div>
            <label className={labelClass}>Tipo</label>
            <select {...register('tipo')} className={campoCls(!!errors.tipo)}>
              <option value="">Selecione</option>
              <option>Sedan</option>
              <option>Hatch</option>
              <option>SUV</option>
              <option>Picape</option>
              <option>Minivan</option>
              <option>Conversível</option>
              <option>Coupé</option>
              <option>Perua/SW</option>
              <option>Van</option>
              <option>Outros</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Portas</label>
            <select {...register('portas', { valueAsNumber: true })} className={campoCls(!!errors.portas)}>
              <option value="">Selecione</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Hodômetro na venda (km)</label>
            <input type="number" {...register('hodometro_venda', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })} className={campoCls(!!errors.hodometro_venda)} placeholder="0" />
          </div>
          <div>
            <label className={labelClass}>Preço (R$) *</label>
            <input type="number" {...register('preco', { valueAsNumber: true })} className={campoCls(!!errors.preco)} placeholder="0" />
            {errors.preco && <p className={errorClass}>{errors.preco.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Valor de oferta (R$)</label>
            <input
              type="number"
              {...register('valor_oferta', { setValueAs: v => (v === '' ? null : Number(v)) })}
              className={campoCls(!!errors.valor_oferta)}
              placeholder="Deixe em branco se não houver oferta"
            />
            {errors.valor_oferta && <p className={errorClass}>{errors.valor_oferta.message}</p>}
          </div>
          {isFelizardo && (
            <>
              <div>
                <label className={labelClass}>Proprietário</label>
                {isSocio ? (
                  <input
                    type="text"
                    value="Dividido com sócio"
                    disabled
                    className={`${inputClass} bg-gray-100 text-gray-500 cursor-not-allowed`}
                  />
                ) : (
                  <select {...register('proprietario_tipo')} className={campoCls(!!errors.proprietario_tipo)}>
                    <option value="felipe">Só Felipe</option>
                    <option value="dividido">Dividido com sócio</option>
                  </select>
                )}
              </div>
              {(isSocio || proprietarioTipoAtual === 'dividido') && (
                <div>
                  <label className={labelClass}>Percentual do sócio (%) *</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    {...register('percentual_socio', { setValueAs: v => (v === '' ? null : Number(v)) })}
                    className={campoCls(!!errors.percentual_socio)}
                    placeholder="Ex: 50"
                  />
                  {errors.percentual_socio && <p className={errorClass}>{errors.percentual_socio.message}</p>}
                </div>
              )}
            </>
          )}
          <div>
            <label className={labelClass}>Data de aquisição *</label>
            <input type="date" {...register('data_aquisicao')} className={campoCls(!!errors.data_aquisicao)} />
            {errors.data_aquisicao && <p className={errorClass}>{errors.data_aquisicao.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Status *</label>
            <select {...register('status')} className={campoCls(!!errors.status)}>
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
              className="w-4 h-4 accent-[#F5C842]"
            />
            <label htmlFor="destaque" className="text-sm text-[#111827] cursor-pointer">
              Destaque na vitrine
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className={labelClass}>Descrição</label>
          <textarea
            {...register('descricao')}
            rows={4}
            className={`${campoCls(!!errors.descricao)} resize-none`}
            placeholder="Descreva o veículo, histórico de revisões, estado geral..."
          />
        </div>
      </div>

      {/* Opcionais */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Opcionais</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {OPCIONAIS_LISTA.map(op => (
            <label key={op} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={opcionais.includes(op)}
                onChange={() => toggleOpcional(op)}
                className="w-4 h-4 accent-[#F5C842] shrink-0"
              />
              <span className="text-sm text-[#374151] group-hover:text-[#111827] transition-colors">{op}</span>
            </label>
          ))}
        </div>
      </div>

      {erro && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erro}</p>
      )}

      <div className="flex items-center gap-3">
        {!noRedirect && (
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl border border-[#E5E7EB] text-sm text-[#6B7280] hover:text-[#111827] hover:border-[#D0D0D0] transition-colors"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={salvando || uploading}
          className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : veiculo ? 'Salvar alterações' : 'Cadastrar veículo'}
        </button>
        {salvoOk && !salvando && (
          <span className="text-green-600 text-sm font-medium">✓ Salvo</span>
        )}
      </div>
    </form>
  )
}
