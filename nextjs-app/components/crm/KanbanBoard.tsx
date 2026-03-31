'use client'

import {
  DndContext,
  DragEndEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, Pencil, CalendarPlus } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stage {
  id: string
  name: string
  position: number
}

interface Deal {
  id: string
  title: string
  value: number
  stage_id: string | null
  contact_id: string | null
  company_id: string | null
  contacts?: { first_name: string | null; last_name: string | null } | null
  companies?: { name: string } | null
}

interface KanbanBoardProps {
  deals: Deal[]
  stages: Stage[]
  onStageDrop: (dealId: string, newStageId: string) => void
  onDelete: (dealId: string) => void
  onEdit: (deal: Deal) => void
  onCalendar?: (deal: Deal) => void
}

// ---------------------------------------------------------------------------
// Badge colors by stage position
// ---------------------------------------------------------------------------

const STAGE_BADGE_COLORS: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-green-100 text-green-700',
  5: 'bg-red-100 text-red-700',
}

function getStageBadgeColor(position: number): string {
  return STAGE_BADGE_COLORS[position] ?? 'bg-gray-100 text-gray-600'
}

// ---------------------------------------------------------------------------
// DealCard — sortable draggable card
// ---------------------------------------------------------------------------

function DealCard({
  deal,
  onDelete,
  onEdit,
  onCalendar,
}: {
  deal: Deal
  onDelete: (id: string) => void
  onEdit: (deal: Deal) => void
  onCalendar?: (deal: Deal) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const contactName = deal.contacts
    ? `${deal.contacts.first_name ?? ''} ${deal.contacts.last_name ?? ''}`.trim()
    : null
  const companyName = deal.companies?.name ?? null

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 leading-snug flex-1">
          {deal.title}
        </p>
        <div className="flex items-center gap-0.5 shrink-0">
          {onCalendar && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCalendar(deal)
              }}
              className="p-1 rounded hover:bg-green-50 text-gray-300 hover:text-green-600 transition"
              aria-label="Ajouter au calendrier"
            >
              <CalendarPlus size={12} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(deal)
            }}
            className="p-1 rounded hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition"
            aria-label="Modifier"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(deal.id)
            }}
            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition"
            aria-label="Supprimer"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {deal.value > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {new Intl.NumberFormat('fr-DZ', {
            style: 'currency',
            currency: 'DZD',
            maximumFractionDigits: 0,
          }).format(deal.value)}
        </p>
      )}

      {(contactName || companyName) && (
        <div className="mt-1.5 flex flex-col gap-0.5">
          {contactName && (
            <p className="text-xs text-gray-400 truncate">{contactName}</p>
          )}
          {companyName && (
            <p className="text-xs text-gray-400 truncate">{companyName}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanColumn — droppable stage column
// ---------------------------------------------------------------------------

function KanbanColumn({
  stage,
  deals,
  onDelete,
  onEdit,
  onCalendar,
}: {
  stage: Stage
  deals: Deal[]
  onDelete: (id: string) => void
  onEdit: (deal: Deal) => void
  onCalendar?: (deal: Deal) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  const badgeColor = getStageBadgeColor(stage.position)

  return (
    <div className="shrink-0 w-64 flex flex-col gap-2">
      {/* Column header */}
      <div className="flex items-center gap-2 px-1">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor}`}>
          {stage.name}
        </span>
        <span className="text-xs text-gray-400">{deals.length}</span>
      </div>

      {/* Droppable area */}
      <div
        ref={setNodeRef}
        className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors ${
          isOver ? 'bg-violet-50 ring-2 ring-violet-200' : 'bg-gray-50'
        }`}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onDelete={onDelete}
              onEdit={onEdit}
              onCalendar={onCalendar}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
            Glisser ici
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// KanbanBoard — main export
// ---------------------------------------------------------------------------

export function KanbanBoard({
  deals,
  stages,
  onStageDrop,
  onDelete,
  onEdit,
  onCalendar,
}: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const sortedStages = [...stages].sort((a, b) => a.position - b.position)

  function dealsByStage(stageId: string): Deal[] {
    return deals.filter((d) => d.stage_id === stageId)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const draggedDealId = active.id as string
    const targetId = over.id as string

    // Determine if `over` is a stage column id or a deal id
    const isOverStage = stages.some((s) => s.id === targetId)

    if (isOverStage) {
      // Dropped on a stage column
      onStageDrop(draggedDealId, targetId)
    } else {
      // Dropped on another deal card — find which stage it belongs to
      const targetDeal = deals.find((d) => d.id === targetId)
      if (targetDeal && targetDeal.stage_id && targetDeal.stage_id !== active.id) {
        onStageDrop(draggedDealId, targetDeal.stage_id)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={dealsByStage(stage.id)}
            onDelete={onDelete}
            onEdit={onEdit}
            onCalendar={onCalendar}
          />
        ))}
      </div>
    </DndContext>
  )
}
