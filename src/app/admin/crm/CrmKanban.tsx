'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import Link from 'next/link'
import { updateLead } from '@/app/actions'
import type { Lead, StatusLead } from '@/types'

const COLUNAS: { status: StatusLead; label: string; cor: string; bg: string }[] = [
  { status: 'novo', label: 'Novo', cor: '#3B82F6', bg: '#1a2744' },
  { status: 'contato_feito', label: 'Contato', cor: '#F59E0B', bg: '#2a2010' },
  { status: 'negociando', label: 'Negociando', cor: '#F97316', bg: '#2a1800' },
  { status: 'fechado', label: 'Fechado', cor: '#22C55E', bg: '#0f2a14' },
  { status: 'perdido', label: 'Perdido', cor: '#EF4444', bg: '#2a0f0f' },
]

const origemBadge: Record<string, string> = {
  site: 'bg-purple-500/20 text-purple-400',
  whatsapp: 'bg-green-500/20 text-green-400',
  instagram: 'bg-pink-500/20 text-pink-400',
  indicacao: 'bg-blue-400/20 text-blue-300',
  outros: 'bg-gray-500/20 text-gray-400',
}

function tempoDesde(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

function KanbanCard({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id })
  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.4 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/admin/leads/${lead.id}`}
          className="text-white text-sm font-medium hover:underline leading-tight"
          onClick={e => e.stopPropagation()}
        >
          {lead.nome}
        </Link>
        <span className="text-[#555] text-[10px] shrink-0">{tempoDesde(lead.created_at)}</span>
      </div>

      {(lead.veiculo || lead.veiculo_interesse) && (
        <p className="text-[#666] text-xs mb-2 truncate">
          {lead.veiculo
            ? `${lead.veiculo.marca} ${lead.veiculo.modelo} ${lead.veiculo.ano}`
            : lead.veiculo_interesse}
        </p>
      )}

      <div className="flex items-center gap-1.5 mt-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${origemBadge[lead.origem]}`}>
          {lead.origem}
        </span>
        <span className="text-[#444] text-[10px]">{lead.telefone}</span>
      </div>
    </div>
  )
}

function KanbanColumn({
  coluna,
  leads,
  activeId,
}: {
  coluna: (typeof COLUNAS)[0]
  leads: Lead[]
  activeId: string | null
}) {
  const { setNodeRef, isOver } = useDroppable({ id: coluna.status })

  return (
    <div className="flex flex-col min-w-[220px] flex-1">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: coluna.cor }} />
          <span className="text-white text-xs font-semibold">{coluna.label}</span>
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: coluna.bg, color: coluna.cor }}
        >
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl p-2 space-y-2 min-h-[200px] transition-colors ${
          isOver ? 'ring-1' : ''
        }`}
        style={{
          backgroundColor: '#111',
          border: isOver ? `1px solid ${coluna.cor}` : '1px solid #1E1E1E',
          outline: isOver ? `2px solid ${coluna.cor}` : undefined,
          outlineOffset: '-1px',
        }}
      >
        {leads.map(lead => (
          <KanbanCard key={lead.id} lead={lead} isDragging={lead.id === activeId} />
        ))}
        {leads.length === 0 && (
          <p className="text-[#333] text-xs text-center pt-8">Nenhum lead</p>
        )}
      </div>
    </div>
  )
}

export default function CrmKanban({
  leads: initialLeads,
  vendedorMap,
}: {
  leads: Lead[]
  vendedorMap: Record<string, string>
}) {
  const router = useRouter()
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const activeLead = leads.find(l => l.id === activeId)

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  async function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) return
    const newStatus = over.id as StatusLead
    const lead = leads.find(l => l.id === active.id)
    if (!lead || lead.status === newStatus) return

    setLeads(prev => prev.map(l => l.id === active.id ? { ...l, status: newStatus } : l))
    try {
      await updateLead(lead.id, { status: newStatus })
      router.refresh()
    } catch {
      setLeads(initialLeads)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUNAS.map(col => (
          <KanbanColumn
            key={col.status}
            coluna={col}
            leads={leads.filter(l => l.status === col.status)}
            activeId={activeId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3 shadow-2xl w-56 opacity-95 rotate-2">
            <p className="text-white text-sm font-medium">{activeLead.nome}</p>
            <p className="text-[#555] text-xs mt-1">{activeLead.telefone}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
