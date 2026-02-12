/**
 * Wrapper component that makes a block draggable and sortable.
 * Drag is initiated via a dedicated grip handle to avoid conflicts
 * with interactive elements (buttons, links, checkboxes) inside the block.
 */

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from "lucide-react"
import type { Id } from "../../../convex/_generated/dataModel"
import type { BlockDragData, Zone } from "./types"

interface SortableBlockProps {
  id: Id<"blocks">
  zone: Zone
  position: number
  children: React.ReactNode
}

export function SortableBlock({ id, zone, position, children }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: {
      type: "block",
      blockId: id,
      zone,
      position,
    } satisfies BlockDragData,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-block-id={id}
      data-zone={zone}
      data-dragging={isDragging}
    >
      <div className="flex">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="flex items-center px-0.5 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-3 h-3" />
        </button>
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
