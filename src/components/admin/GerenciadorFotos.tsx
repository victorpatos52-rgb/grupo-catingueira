'use client'

import { useRef, useState, type ReactNode } from 'react'
import ImagemMiniatura from '@/components/ui/ImagemMiniatura'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Camera, GripVertical, ImagePlus, X } from 'lucide-react'
import { enviarFotosVeiculo, textoProgresso, type ProgressoUpload, type ResultadoUpload } from '@/lib/upload-fotos'

// Grade de fotos do veículo, compartilhada entre o cadastro (VeiculoForm) e a
// aba Fotos de um veículo salvo (FotosVeiculoClient). O componente cuida do
// upload, da ordenação e da UI; o que acontece no banco ao adicionar/remover
// fica com quem usa (callbacks).
//
// Celular:
//   - dois botões: "Tirar foto" (abre a câmera) e "Escolher da galeria";
//   - arrastar só pela alça (canto superior esquerdo) — o resto da foto deixa
//     a página rolar normalmente (touch-none só na alça);
//   - × de remover sempre visível, com área de toque de 44px.

interface Props {
  lojaId: string
  fotos: string[]
  /** Chamado com as URLs recém-enviadas ao Storage. Pode lançar erro (mostrado na tela). */
  onAdicionadas: (urls: string[]) => Promise<void> | void
  /** Remove a foto (cadastro + Storage). Deve lançar erro se falhar. */
  onRemover: (url: string) => Promise<void>
  onReordenar: (fotos: string[]) => void
  desabilitado?: boolean
  /** Conteúdo extra abaixo da grade (ex.: botão "Salvar ordem"). */
  rodape?: ReactNode
  /** Avisa quem usa quando há upload em andamento (ex.: travar o "Salvar"). */
  onEnviandoChange?: (enviando: boolean) => void
}

function FotoItem({
  foto,
  index,
  removendo,
  desabilitado,
  onRemover,
}: {
  foto: string
  index: number
  removendo: boolean
  desabilitado: boolean
  onRemover: () => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: foto, disabled: desabilitado })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative aspect-square rounded-lg overflow-hidden bg-[#F9FAFB] border-2 transition-opacity ${
        isDragging ? 'opacity-40 border-[#F5C842] z-10' : 'border-[#E5E7EB]'
      } ${index === 0 ? 'ring-2 ring-offset-2 ring-offset-white ring-[#F5C842]' : ''} ${removendo ? 'opacity-50' : ''}`}
    >
      {/* Miniatura (cai para a original se ainda não existir). */}
      <ImagemMiniatura src={foto} alt={`Foto ${index + 1}`} fill className="object-cover" sizes="(max-width: 640px) 33vw, 160px" />

      {/* Alça de arrastar: único ponto com touch-none */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={desabilitado}
        aria-label={`Arrastar foto ${index + 1} para mudar a ordem`}
        className="absolute top-0 left-0 w-11 h-11 flex items-center justify-center touch-none cursor-grab active:cursor-grabbing disabled:cursor-default"
      >
        <span className="w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center shadow">
          <GripVertical className="w-4 h-4" aria-hidden="true" />
        </span>
      </button>

      <button
        type="button"
        onClick={onRemover}
        disabled={desabilitado || removendo}
        aria-label={`Remover foto ${index + 1}`}
        className="absolute top-0 right-0 w-11 h-11 flex items-center justify-center disabled:opacity-60"
      >
        <span className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow">
          {removendo ? (
            <span className="w-3 h-3 border-2 border-white/60 border-t-white rounded-full animate-spin" aria-hidden="true" />
          ) : (
            <X className="w-4 h-4" aria-hidden="true" />
          )}
        </span>
      </button>

      {index === 0 && (
        <span className="absolute bottom-0 left-0 right-0 bg-[#F5C842] text-[#111827] text-[11px] font-bold text-center py-0.5">
          CAPA
        </span>
      )}
    </div>
  )
}

export default function GerenciadorFotos({
  lojaId,
  fotos,
  onAdicionadas,
  onRemover,
  onReordenar,
  desabilitado = false,
  rodape,
  onEnviandoChange,
}: Props) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)

  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState<ProgressoUpload | null>(null)
  const [errosUpload, setErrosUpload] = useState<ResultadoUpload['erros']>([])
  const [erro, setErro] = useState<string | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const bloqueado = desabilitado || enviando

  function definirEnviando(valor: boolean) {
    setEnviando(valor)
    onEnviandoChange?.(valor)
  }

  async function enviar(arquivos: File[]) {
    if (arquivos.length === 0) return
    definirEnviando(true)
    setErrosUpload([])
    setErro(null)
    try {
      const { urls, erros } = await enviarFotosVeiculo(lojaId, arquivos, setProgresso)
      setErrosUpload(erros)
      if (urls.length > 0) await onAdicionadas(urls)
    } catch (err) {
      setErro(err instanceof Error && err.message ? err.message : 'Não foi possível salvar as fotos enviadas.')
    } finally {
      definirEnviando(false)
      setProgresso(null)
    }
  }

  async function remover(url: string) {
    if (!window.confirm('Remover esta foto? O arquivo será apagado.')) return
    setRemovendo(url)
    setErro(null)
    try {
      await onRemover(url)
    } catch (err) {
      setErro(err instanceof Error && err.message ? err.message : 'Não foi possível remover a foto.')
    } finally {
      setRemovendo(null)
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const de = fotos.indexOf(active.id as string)
    const para = fotos.indexOf(over.id as string)
    if (de === -1 || para === -1) return
    onReordenar(arrayMove(fotos, de, para))
  }

  function aoEscolher(e: React.ChangeEvent<HTMLInputElement>) {
    // Copia antes de limpar: zerar o value permite escolher o MESMO arquivo
    // de novo depois de um erro (senão o onChange não dispara).
    const arquivos = Array.from(e.target.files ?? [])
    e.target.value = ''
    void enviar(arquivos)
  }

  const botaoCls =
    'inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-50'

  return (
    <div>
      {fotos.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fotos} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-4">
              {fotos.map((foto, i) => (
                <FotoItem
                  key={foto}
                  foto={foto}
                  index={i}
                  removendo={removendo === foto}
                  desabilitado={bloqueado || removendo !== null}
                  onRemover={() => void remover(foto)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-[#9CA3AF] mb-4">Nenhuma foto ainda.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={bloqueado}
          className={`${botaoCls} border-[#F5C842] bg-[#F5C842] text-[#111827] hover:brightness-95`}
        >
          <Camera className="w-5 h-5" aria-hidden="true" />
          Tirar foto
        </button>
        <button
          type="button"
          onClick={() => galeriaRef.current?.click()}
          disabled={bloqueado}
          className={`${botaoCls} border-[#E5E7EB] bg-white text-[#374151] hover:border-[#F5C842]`}
        >
          <ImagePlus className="w-5 h-5" aria-hidden="true" />
          Escolher da galeria
        </button>
      </div>

      {/* Câmera: uma foto por vez (capture ignora multiple na maioria dos celulares). */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={aoEscolher} />
      <input ref={galeriaRef} type="file" accept="image/*" multiple className="hidden" onChange={aoEscolher} />

      {enviando && (
        <div className="mb-3" aria-live="polite">
          <p className="text-xs text-[#6B7280] mb-1">{textoProgresso(progresso) || 'Enviando...'}</p>
          {progresso && (
            <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F5C842] transition-all"
                style={{
                  width: `${Math.round(((progresso.atual - 1 + (progresso.etapa === 'enviando' ? progresso.percentual / 100 : 0)) / progresso.total) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {errosUpload.length > 0 && (
        <div role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="font-semibold">
            {errosUpload.length === 1 ? 'Uma foto não foi enviada:' : `${errosUpload.length} fotos não foram enviadas:`}
          </p>
          <ul className="list-disc pl-5 mt-1 space-y-0.5 text-xs">
            {errosUpload.map((e, i) => (
              <li key={i}>
                <span className="font-medium">{e.arquivo}</span>: {e.mensagem}
              </li>
            ))}
          </ul>
        </div>
      )}

      {erro && (
        <p role="alert" className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {erro}
        </p>
      )}

      <p className="text-[#9CA3AF] text-xs mb-3">
        Arraste pela alça <GripVertical className="inline w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> para reordenar. A primeira foto é a capa.
      </p>

      {rodape}
    </div>
  )
}
