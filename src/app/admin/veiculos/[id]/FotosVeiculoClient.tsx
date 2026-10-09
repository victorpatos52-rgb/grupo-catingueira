'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { atualizarFotosVeiculo } from '@/app/actions'
import { enviarFotosVeiculo, textoProgresso, type ProgressoUpload, type ResultadoUpload } from '@/lib/upload-fotos'

interface Props {
  veiculoId: string
  lojaId: string
  fotosIniciais: string[]
}

function FotoItem({
  foto,
  index,
  onRemover,
}: {
  foto: string
  index: number
  onRemover: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: foto })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      // touch-none evita que o gesto de arrastar compita com o scroll nativo
      // da página em touch (mesmo motivo do Kanban do CRM — ver CrmKanban.tsx).
      className={`relative aspect-square rounded-lg overflow-hidden bg-[#F9FAFB] cursor-grab active:cursor-grabbing border-2 touch-none transition-opacity ${
        isDragging ? 'opacity-40 border-[#F5C842]' : 'border-[#E5E7EB]'
      } ${index === 0 ? 'ring-2 ring-offset-2 ring-offset-white ring-[#F5C842]' : ''}`}
    >
      <Image src={foto} alt={`Foto ${index + 1}`} fill className="object-cover" sizes="100px" />
      {index === 0 && (
        <span className="absolute bottom-0 left-0 right-0 bg-[#F5C842] text-[#111827] text-[10px] font-bold text-center py-0.5">
          CAPA
        </span>
      )}
      <button
        type="button"
        onClick={onRemover}
        className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] hover:opacity-100 transition-opacity"
      >
        ×
      </button>
    </div>
  )
}

export default function FotosVeiculoClient({ veiculoId, lojaId, fotosIniciais }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fotos, setFotos] = useState<string[]>(fotosIniciais)
  const [uploading, setUploading] = useState(false)
  const [progresso, setProgresso] = useState<ProgressoUpload | null>(null)
  const [errosUpload, setErrosUpload] = useState<ResultadoUpload['erros']>([])
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [salvoOk, setSalvoOk] = useState(false)

  // Mesmo padrão do Kanban do CRM (CrmKanban.tsx): distance de 8px pra
  // diferenciar um toque/clique (ex: no botão de remover) de uma intenção
  // real de arrastar.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  async function uploadFotos(files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    setSalvoOk(false)
    setErrosUpload([])
    setErroSalvar(null)
    try {
      // Antes um erro de upload era descartado em silêncio e em seguida vinha
      // "✓ Salvo" — o usuário via sucesso e a foto simplesmente não aparecia.
      const { urls, erros } = await enviarFotosVeiculo(lojaId, files, setProgresso)
      setErrosUpload(erros)
      if (urls.length > 0) {
        const novasFotos = [...fotos, ...urls]
        setFotos(novasFotos)
        await salvarFotos(novasFotos)
      }
    } finally {
      setUploading(false)
      setProgresso(null)
    }
  }

  function removerFoto(index: number) {
    setSalvoOk(false)
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    setFotos(prev => {
      const fromIndex = prev.indexOf(active.id as string)
      const toIndex = prev.indexOf(over.id as string)
      if (fromIndex === -1 || toIndex === -1) return prev
      return arrayMove(prev, fromIndex, toIndex)
    })
    setSalvoOk(false)
  }

  async function salvarFotos(fotosParaSalvar = fotos) {
    setSalvando(true)
    setSalvoOk(false)
    setErroSalvar(null)
    try {
      await atualizarFotosVeiculo(veiculoId, fotosParaSalvar)
      setSalvoOk(true)
      router.refresh()
    } catch (err: unknown) {
      // Em produção o Next troca a mensagem de throw de Server Action por um
      // texto genérico; o principal aqui é não fingir que salvou.
      setErroSalvar(
        `As fotos foram enviadas, mas não foi possível salvar no veículo${err instanceof Error && err.message ? ` (${err.message})` : ''}. Toque em "Salvar ordem" para tentar de novo.`
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm">
      <h2 className="text-[#111827] font-bold text-sm uppercase tracking-wider mb-4">Fotos</h2>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={fotos} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
            {fotos.map((foto, i) => (
              <FotoItem key={foto} foto={foto} index={i} onRemover={() => removerFoto(i)} />
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="aspect-square rounded-lg border-2 border-dashed border-[#E5E7EB] hover:border-[#F5C842] bg-[#F9FAFB] flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <span className="text-[#6B7280] text-[10px] leading-tight text-center px-1">
                  {textoProgresso(progresso) || 'Enviando...'}
                </span>
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
        </SortableContext>
      </DndContext>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => {
          // Copia antes de limpar: zerar o value permite escolher o MESMO
          // arquivo de novo depois de um erro (senão o onChange não dispara).
          const arquivos = Array.from(e.target.files ?? [])
          e.target.value = ''
          void uploadFotos(arquivos)
        }}
      />

      {uploading && progresso && (
        <div className="mb-3" aria-live="polite">
          <p className="text-xs text-[#6B7280] mb-1">{textoProgresso(progresso)}</p>
          <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#F5C842] transition-all"
              style={{
                width: `${Math.round(((progresso.atual - 1 + (progresso.etapa === 'enviando' ? progresso.percentual / 100 : 0)) / progresso.total) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {errosUpload.length > 0 && (
        <div role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="font-semibold">
            {errosUpload.length === 1 ? 'Uma foto não foi enviada:' : `${errosUpload.length} fotos não foram enviadas:`}
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
            {errosUpload.map((e, i) => <li key={i}><span className="font-medium">{e.arquivo}</span>: {e.mensagem}</li>)}
          </ul>
        </div>
      )}

      {erroSalvar && (
        <p role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{erroSalvar}</p>
      )}

      <p className="text-[#9CA3AF] text-xs mb-4">Arraste para reordenar. A primeira foto será a capa.</p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => salvarFotos()}
          disabled={salvando || uploading}
          className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#111827] bg-[#F5C842] hover:brightness-90 transition-all disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar ordem'}
        </button>
        {salvoOk && <span className="text-green-600 text-sm font-medium">✓ Salvo</span>}
      </div>
    </div>
  )
}
