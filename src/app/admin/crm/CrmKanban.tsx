'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import Link from 'next/link'
import { updateLead } from '@/app/actions'
import type { Lead, StatusLead } from '@/types'

interface Props {
  leads: Lead[]
  vendedorMap: Record<string, string>
}

const COLUNAS: { id: StatusLead; label: string; cor: string; bg: string }[] = [
  { id: 'novo', label: 'Novo', cor: '#3B82F6', bg: '#EFF6FF' },
  { id: 'contato_feito', label: 'Contato feito', cor: '#D97706', bg: '#FFFBEB' },
  { id: 'negociando', label: 'Negociando', cor: '#EA580C', bg: '#FFF7ED' },
  { id: 'fechado', label: 'Fechado', cor: '#16A34A', bg: '#F0FDF4' },
  { id: 'perdido', label: 'Perdido', cor: '#DC2626', bg: '#FEF2F2' },
]

function KanbanCard({ lead, isDragging }: { lead: Lead; isDragging: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      // touch-none é essencial pro drag funcionar bem em touch: sem isso, o
      // gesto de arrastar compete com o scroll nativo do navegador (que tenta
      // rolar a página/coluna assim que o dedo se move), então o pointermove
      // sintético do dnd-kit fica instável perto das bordas — é exatamente
      // isso que fazia o auto-scroll não disparar de forma confiável no
      // celular. Não afeta mouse/desktop.
      className={`bg-white rounded-lg border border-[#E5E5E5] p-3 cursor-grab active:cursor-grabbing shadow-sm transition-shadow touch-none ${
        isDragging ? 'opacity-40' : 'hover:shadow-md'
      }`}
    >
      <Link
        href={`/admin/leads/${lead.id}`}
        onClick={e => e.stopPropagation()}
        className="font-medium text-sm text-[#111] hover:underline block mb-1"
      >
        {lead.nome}
      </Link>
      <p className="text-[#9CA3AF] text-xs">{lead.telefone}</p>
      {(lead.veiculo || lead.veiculo_interesse) && (
        <p className="text-[#6B7280] text-xs mt-1 truncate">
          {lead.veiculo
            ? `${lead.veiculo.marca} ${lead.veiculo.modelo}`
            : lead.veiculo_interesse}
        </p>
      )}
      <div className="flex gap-1 mt-2 flex-wrap">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          lead.origem === 'whatsapp' ? 'bg-green-50 text-green-700' :
          lead.origem === 'instagram' ? 'bg-pink-50 text-pink-700' :
          lead.origem === 'site' ? 'bg-purple-50 text-purple-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {lead.origem}
        </span>
      </div>
    </div>
  )
}

function KanbanColumn({
  coluna,
  leads,
  activeId,
}: {
  coluna: typeof COLUNAS[0]
  leads: Lead[]
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.id })

  return (
    <div className="flex-1 min-w-[200px] max-w-[260px] flex flex-col gap-2">
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-lg"
        style={{ backgroundColor: coluna.bg }}
      >
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: coluna.cor }}>
          {coluna.label}
        </span>
        <span
          className="text-xs font-bold rounded-full px-1.5 py-0.5"
          style={{ color: coluna.cor, backgroundColor: `${coluna.cor}18` }}
        >
          {leads.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className="flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors"
        style={{
          backgroundColor: isOver ? `${coluna.cor}08` : '#F8F8F8',
          border: isOver ? `1px solid ${coluna.cor}40` : '1px solid #E5E5E5',
          outline: isOver ? `2px solid ${coluna.cor}60` : undefined,
          outlineOffset: '-1px',
        }}
      >
        {leads.map(lead => (
          <KanbanCard key={lead.id} lead={lead} isDragging={lead.id === activeId} />
        ))}
        {leads.length === 0 && (
          <div className="h-16 flex items-center justify-center">
            <p className="text-[#D0D0D0] text-xs">Sem leads</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CrmKanban({ leads: initialLeads, vendedorMap }: Props) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeLead = leads.find(l => l.id === activeId)

  function onDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const leadId = active.id as string
    const newStatus = over.id as StatusLead
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.status === newStatus) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l))
    try {
      await updateLead(leadId, { status: newStatus })
      router.refresh()
    } catch {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: lead.status } : l))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      // Auto-scroll do @dnd-kit já vem ligado por padrão, mas deixo explícito
      // e ajustado pro caso de uso: coluna estreita em mobile precisa de uma
      // zona de borda generosa (threshold.x) e velocidade perceptível
      // (acceleration) pra rolar rápido o bastante enquanto o card é
      // arrastado perto da esquerda/direita — para sozinho quando o
      // ponteiro/toque some da borda ou o card é solto (comportamento nativo
      // do dnd-kit, sem precisar de mais nada).
      autoScroll={{
        threshold: { x: 0.2, y: 0.2 },
        acceleration: 15,
      }}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUNAS.map(coluna => (
          <KanbanColumn
            key={coluna.id}
            coluna={coluna}
            leads={leads.filter(l => l.status === coluna.id)}
            activeId={activeId}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && (
          <div className="bg-white rounded-lg border border-[#E5E5E5] p-3 shadow-xl rotate-2 w-[220px]">
            <p className="font-medium text-sm text-[#111]">{activeLead.nome}</p>
            <p className="text-[#9CA3AF] text-xs">{activeLead.telefone}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
