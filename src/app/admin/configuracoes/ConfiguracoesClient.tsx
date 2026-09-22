'use client'

import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase'
import LandingImage from '@/components/ui/LandingImage'
import { updateLojaSettings } from '@/app/actions'
import { useAdmin } from '@/contexts/AdminContext'
import { SECOES_CATINGUEIRA, SECOES_FELIZARDO, PLACEHOLDER_LANDING_IMG } from '@/lib/landing-images'
import type { Loja } from '@/types'

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  whatsapp: z.string().min(1, 'Obrigatório'),
  cor_primaria: z.string().min(1, 'Obrigatório'),
  cor_secundaria: z.string().min(1, 'Obrigatório'),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  horario: z.string().optional(),
  sobre: z.string().optional(),
  missao: z.string().optional(),
  visao: z.string().optional(),
  instagram: z.string().optional(),
  maps_url: z.string().optional(),
})

type FormData = z.infer<typeof schema>

const inputClass =
  'w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3.5 py-2.5 text-[#111827] text-sm focus:outline-none focus:ring-2 focus:ring-[#F5C842] focus:border-[#F5C842] transition-all placeholder-[#D1D5DB]'
const labelClass = 'block text-[#6B7280] text-xs font-semibold uppercase tracking-wider mb-1.5'
const errorClass = 'text-red-600 text-xs mt-1'

function ImagemSlot({
  label,
  url,
  onUpload,
  onRemover,
  uploading,
}: {
  label: string
  url: string
  onUpload: (file: File) => void
  onRemover: () => void
  uploading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const temImagem = !!url

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-4">
        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-[#F9FAFB] border border-[#E5E7EB] shrink-0">
          <LandingImage
            src={url || PLACEHOLDER_LANDING_IMG}
            alt={label}
            fill
            className="object-cover"
            sizes="128px"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] hover:border-[#F5C842] transition-colors disabled:opacity-50 text-left"
          >
            {uploading ? 'Enviando...' : temImagem ? 'Trocar imagem' : 'Enviar imagem'}
          </button>
          {temImagem && (
            <button
              type="button"
              onClick={onRemover}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
            >
              Remover
            </button>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ''
          }}
        />
      </div>
    </div>
  )
}

export default function ConfiguracoesClient() {
  const { loja } = useAdmin()

  if (!loja) {
    return <p className="p-6 text-[#6B7280] text-sm">Nenhuma loja selecionada.</p>
  }

  return <ConfiguracoesForm key={loja.id} loja={loja} />
}

function ConfiguracoesForm({ loja }: { loja: Loja }) {
  const isFelizardo = (loja.dominio ?? loja.nome ?? '').toLowerCase().includes('felizardo')
  const secoesDef = isFelizardo ? SECOES_FELIZARDO : SECOES_CATINGUEIRA

  const [heroUrl, setHeroUrl] = useState(loja.imagens_landing?.hero ?? '')
  const [secoesUrls, setSecoesUrls] = useState<Record<string, string>>(loja.imagens_landing?.secoes ?? {})
  const [uploadingChave, setUploadingChave] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk] = useState(false)
  const [erro, setErro] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: loja.nome ?? '',
      whatsapp: loja.whatsapp ?? '',
      cor_primaria: loja.cor_primaria ?? '#F5C842',
      cor_secundaria: loja.cor_secundaria ?? '#1C1C1C',
      endereco: loja.endereco ?? '',
      cidade: loja.cidade ?? '',
      estado: loja.estado ?? '',
      horario: loja.horario ?? '',
      sobre: loja.sobre ?? '',
      missao: loja.missao ?? '',
      visao: loja.visao ?? '',
      instagram: loja.instagram ?? '',
      maps_url: loja.maps_url ?? '',
    },
  })

  async function uploadImagem(chave: string, file: File, aplicar: (url: string) => void) {
    setUploadingChave(chave)
    setErro('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const nome = `landing/${loja.id}/${chave}-${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
    const { error } = await supabase.storage
      .from('veiculos-fotos')
      .upload(nome, file, { upsert: false })

    if (error) {
      setErro(`Erro ao enviar imagem: ${error.message}`)
    } else {
      const { data } = supabase.storage.from('veiculos-fotos').getPublicUrl(nome)
      aplicar(data.publicUrl)
    }
    setUploadingChave(null)
  }

  async function onSubmit(data: FormData) {
    setSalvando(true)
    setSalvoOk(false)
    setErro('')
    try {
      await updateLojaSettings(loja.id, {
        nome: data.nome,
        whatsapp: data.whatsapp,
        cor_primaria: data.cor_primaria,
        cor_secundaria: data.cor_secundaria,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        horario: data.horario || null,
        sobre: data.sobre || null,
        missao: data.missao || null,
        visao: data.visao || null,
        instagram: data.instagram || null,
        maps_url: data.maps_url || null,
        imagens_landing: { hero: heroUrl || null, secoes: secoesUrls },
      })
      setSalvoOk(true)
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* Dados da loja */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Dados da loja</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome *</label>
            <input {...register('nome')} className={inputClass} />
            {errors.nome && <p className={errorClass}>{errors.nome.message}</p>}
          </div>
          <div>
            <label className={labelClass}>WhatsApp *</label>
            <input {...register('whatsapp')} className={inputClass} placeholder="83999999999" />
            {errors.whatsapp && <p className={errorClass}>{errors.whatsapp.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Cor primária *</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={watch('cor_primaria') || '#000000'}
                onChange={e => setValue('cor_primaria', e.target.value, { shouldDirty: true })}
                className="w-10 h-10 rounded-lg border border-[#E5E7EB] shrink-0"
              />
              <input {...register('cor_primaria')} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cor secundária *</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={watch('cor_secundaria') || '#000000'}
                onChange={e => setValue('cor_secundaria', e.target.value, { shouldDirty: true })}
                className="w-10 h-10 rounded-lg border border-[#E5E7EB] shrink-0"
              />
              <input {...register('cor_secundaria')} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Cidade</label>
            <input {...register('cidade')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <input {...register('estado')} className={inputClass} placeholder="PB" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Endereço</label>
            <input {...register('endereco')} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Horário</label>
            <input {...register('horario')} className={inputClass} placeholder="Seg a Sex: 8h às 18h | Sáb: 8h às 13h" />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input {...register('instagram')} className={inputClass} placeholder="@usuario" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Link do Google Maps</label>
            <input {...register('maps_url')} className={inputClass} />
          </div>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className={labelClass}>Sobre</label>
            <textarea {...register('sobre')} rows={3} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Missão</label>
            <textarea {...register('missao')} rows={2} className={`${inputClass} resize-none`} />
          </div>
          <div>
            <label className={labelClass}>Visão</label>
            <textarea {...register('visao')} rows={2} className={`${inputClass} resize-none`} />
          </div>
        </div>
      </div>

      {/* Imagens da landing page */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
        <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-1">Imagens da landing page</h2>
        <p className="text-[#9CA3AF] text-xs mb-4">
          Imagens usadas na home pública. Enquanto um slot estiver vazio, um placeholder genérico é exibido no lugar.
        </p>
        <div className="space-y-5">
          <ImagemSlot
            label="Imagem de fundo do hero"
            url={heroUrl}
            uploading={uploadingChave === 'hero'}
            onUpload={file => uploadImagem('hero', file, setHeroUrl)}
            onRemover={() => setHeroUrl('')}
          />
          {secoesDef.map(({ chave, label }) => (
            <ImagemSlot
              key={chave}
              label={label}
              url={secoesUrls[chave] ?? ''}
              uploading={uploadingChave === chave}
              onUpload={file => uploadImagem(chave, file, url => setSecoesUrls(prev => ({ ...prev, [chave]: url })))}
              onRemover={() => setSecoesUrls(prev => {
                const next = { ...prev }
                delete next[chave]
                return next
              })}
            />
          ))}
        </div>
      </div>

      {erro && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erro}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={salvando || uploadingChave !== null}
          className="px-8 py-2.5 rounded-xl font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {salvoOk && !salvando && (
          <span className="text-green-600 text-sm font-medium">✓ Salvo</span>
        )}
      </div>
    </form>
  )
}
