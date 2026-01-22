/**
 * Home page - Zone layout with blocks.
 * Compact UI optimized for vertical space.
 */

import { useState, useMemo } from "react"
import { createFileRoute, Link } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import type { Id } from "../../convex/_generated/dataModel"
import { DroppableZone, SortableBlock, ZONES, type Zone } from "@/components/dnd"
import { useFileDrop } from "@/hooks/useFileDrop"
import { useSession } from "@/contexts/SessionContext"
import { GeneratePanel } from "@/components/GeneratePanel"
import { BrainstormPanel } from "@/components/BrainstormPanel"
import { SessionMetrics, ZoneHeader } from "@/components/metrics"
import { ContextExport } from "@/components/ContextExport"
import { cn } from "@/lib/utils"
import {
  BLOCK_TYPE_METADATA,
  getBlockTypesByCategory,
  getBlockTypeMetadata,
  CATEGORY_LABELS,
  type BlockType,
} from "@/lib/blockTypes"
import { useNavigate } from "@tanstack/react-router"

// Zone display info
const ZONE_INFO: Record<Zone, { label: string; description: string }> = {
  PERMANENT: { label: "Permanent", description: "Always included" },
  STABLE: { label: "Stable", description: "Reference material" },
  WORKING: { label: "Working", description: "Draft content" },
}

// Simple client-side token estimation (4 chars/token)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Compact add block form
function AddBlockForm({ sessionId }: { sessionId: Id<"sessions"> }) {
  const [content, setContent] = useState("")
  const [type, setType] = useState<BlockType>("note")
  const [zone, setZone] = useState<Zone>("WORKING")
  const [isExpanded, setIsExpanded] = useState(false)
  const blockTypesByCategory = useMemo(() => getBlockTypesByCategory(), [])
  const createBlock = useMutation(api.blocks.create)
  const metrics = useQuery(api.metrics.getZoneMetrics, { sessionId })

  const estimatedTokens = useMemo(() => {
    if (!content.trim()) return 0
    return estimateTokens(content.trim())
  }, [content])

  const budgetStatus = useMemo(() => {
    if (!metrics || !content.trim()) return null
    const zoneData = metrics.zones[zone]
    if (!zoneData) return null
    const newTotal = zoneData.tokens + estimatedTokens
    const percentUsed = Math.round((newTotal / zoneData.budget) * 100)
    return {
      percentUsed,
      wouldExceed: newTotal > zoneData.budget,
      isWarning: percentUsed > 80 && percentUsed <= 95,
      isDanger: percentUsed > 95,
    }
  }, [metrics, zone, estimatedTokens, content])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || budgetStatus?.wouldExceed) return
    await createBlock({ sessionId, content: content.trim(), type, zone })
    setContent("")
    setIsExpanded(false)
  }

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="h-7 text-xs"
      >
        + Add Block
      </Button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded border border-border bg-card p-3 space-y-2">
      <div className="flex gap-2">
        <select
          value={type}
          onChange={(e) => {
            const newType = e.target.value as BlockType
            setType(newType)
            const meta = BLOCK_TYPE_METADATA[newType]
            if (meta) setZone(meta.defaultZone)
          }}
          className="rounded border border-input bg-background px-2 py-1 text-xs flex-1"
        >
          {Object.entries(blockTypesByCategory).map(([category, types]) => (
            <optgroup key={category} label={CATEGORY_LABELS[category]}>
              {types.map((t) => (
                <option key={t} value={t}>{BLOCK_TYPE_METADATA[t].displayName}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select
          value={zone}
          onChange={(e) => setZone(e.target.value as Zone)}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>{ZONE_INFO[z].label}</option>
          ))}
        </select>
      </div>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Block content..."
        rows={2}
        className={cn(
          "w-full rounded border bg-background px-2 py-1.5 text-sm resize-none",
          budgetStatus?.wouldExceed ? "border-destructive" : "border-input"
        )}
        autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {estimatedTokens > 0 && `~${estimatedTokens} tokens`}
          {budgetStatus?.wouldExceed && (
            <span className="text-destructive ml-2">Exceeds budget</span>
          )}
        </span>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setIsExpanded(false)}>
            Cancel
          </Button>
          <Button type="submit" size="sm" className="h-6 px-2 text-xs" disabled={!content.trim() || budgetStatus?.wouldExceed}>
            Add
          </Button>
        </div>
      </div>
    </form>
  )
}

// Collapsible tools section
function ToolsSection({ sessionId }: { sessionId: Id<"sessions"> }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-2 text-xs text-muted-foreground"
      >
        {isOpen ? "▼" : "▶"} Tools
      </Button>
      {isOpen && (
        <div className="mt-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SessionMetrics sessionId={sessionId} />
            <ContextExport sessionId={sessionId} />
          </div>
          <GeneratePanel sessionId={sessionId} />
        </div>
      )}
    </div>
  )
}

// Format relative time
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return "now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

// Compact block card
function BlockCard({
  id,
  content,
  type,
  zone,
  createdAt,
  tokens,
}: {
  id: Id<"blocks">
  content: string
  type: string
  zone: Zone
  createdAt: number
  tokens?: number
}) {
  const [showActions, setShowActions] = useState(false)
  const removeBlock = useMutation(api.blocks.remove)
  const moveBlock = useMutation(api.blocks.move)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await removeBlock({ id })
  }

  const handleMove = async (e: React.MouseEvent, targetZone: Zone) => {
    e.stopPropagation()
    await moveBlock({ id, zone: targetZone })
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(content)
  }

  const typeMeta = getBlockTypeMetadata(type)
  const otherZones = ZONES.filter((z) => z !== zone)

  return (
    <div
      className="rounded border border-border bg-card p-2 select-none hover:border-border/80 transition-colors"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium", typeMeta.color)}>
            {typeMeta.displayName}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatTimeAgo(createdAt)}</span>
          {tokens && <span className="text-[10px] text-muted-foreground font-mono">{tokens}t</span>}
        </div>
        {showActions && (
          <div className="flex gap-0.5 shrink-0">
            <button onClick={handleCopy} className="px-1.5 py-0.5 text-[10px] rounded hover:bg-muted">Copy</button>
            <Link
              to="/blocks/$blockId"
              params={{ blockId: id }}
              onClick={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 text-[10px] rounded hover:bg-muted"
            >
              Edit
            </Link>
            <button onClick={handleDelete} className="px-1.5 py-0.5 text-[10px] rounded hover:bg-destructive/10 text-destructive">Del</button>
          </div>
        )}
      </div>
      <p className="text-xs text-foreground whitespace-pre-wrap break-words line-clamp-2 leading-tight">
        {content}
      </p>
      {showActions && (
        <div className="flex gap-1 mt-1">
          {otherZones.map((z) => (
            <button
              key={z}
              onClick={(e) => handleMove(e, z)}
              className="px-1.5 py-0.5 text-[10px] rounded border border-input hover:bg-muted"
            >
              → {ZONE_INFO[z].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Zone column
function ZoneColumn({
  sessionId,
  zone,
  zoneMetrics,
}: {
  sessionId: Id<"sessions">
  zone: Zone
  zoneMetrics?: { blocks: number; tokens: number; budget: number; percentUsed: number }
}) {
  const blocks = useQuery(api.blocks.listByZone, { sessionId, zone })
  const info = ZONE_INFO[zone]
  const { isDragOver, dropProps } = useFileDrop({
    sessionId,
    zone,
    onSuccess: () => {},
    onError: () => {},
  })

  const sortedBlocks = blocks ? [...blocks].sort((a, b) => a.position - b.position) : []
  const blockIds = sortedBlocks.map((b) => b._id)
  const isDanger = zoneMetrics && zoneMetrics.percentUsed > 95
  const isWarning = zoneMetrics && zoneMetrics.percentUsed > 80 && zoneMetrics.percentUsed <= 95

  return (
    <div className="flex flex-col h-full relative" {...dropProps}>
      <div className="mb-2">
        {zoneMetrics ? (
          <ZoneHeader
            zone={info.label}
            blockCount={zoneMetrics.blocks}
            tokens={zoneMetrics.tokens}
            budget={zoneMetrics.budget}
          />
        ) : (
          <h3 className="text-sm font-semibold">{info.label}</h3>
        )}
        {isDanger && (
          <div className="mt-1 p-1 rounded bg-destructive/10 text-destructive text-[10px]">
            {zoneMetrics?.percentUsed}% - consider archiving
          </div>
        )}
        {isWarning && (
          <div className="mt-1 p-1 rounded bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px]">
            {zoneMetrics?.percentUsed}% used
          </div>
        )}
      </div>

      <DroppableZone zone={zone} itemIds={blockIds}>
        <div className="flex-1 space-y-1.5 min-h-[60px] overflow-y-auto">
          {blocks === undefined ? (
            <div className="text-xs text-muted-foreground">Loading...</div>
          ) : sortedBlocks.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded">
              Drop here
            </div>
          ) : (
            sortedBlocks.map((block) => (
              <SortableBlock key={block._id} id={block._id} zone={block.zone} position={block.position}>
                <BlockCard
                  id={block._id}
                  content={block.content}
                  type={block.type}
                  zone={block.zone}
                  createdAt={block.createdAt}
                  tokens={block.tokens ?? undefined}
                />
              </SortableBlock>
            ))
          )}
        </div>
      </DroppableZone>

      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded z-10">
          <div className="text-xs font-medium text-primary">Drop file</div>
        </div>
      )}
    </div>
  )
}

// Zone layout
function ZoneLayout({ sessionId }: { sessionId: Id<"sessions"> }) {
  const metrics = useQuery(api.metrics.getZoneMetrics, { sessionId })

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1 min-h-0">
      {ZONES.map((zone) => (
        <div key={zone} className="rounded border border-border bg-card p-2 flex flex-col min-h-0 overflow-hidden">
          <ZoneColumn sessionId={sessionId} zone={zone} zoneMetrics={metrics?.zones[zone]} />
        </div>
      ))}
    </div>
  )
}

// No session message
function NoSessionSelected() {
  const { createSession } = useSession()
  return (
    <div className="text-center py-12">
      <h2 className="text-lg font-semibold mb-2">No Session Selected</h2>
      <p className="text-sm text-muted-foreground mb-4">Create a session to start.</p>
      <Button onClick={() => createSession("My First Session")}>Create Session</Button>
    </div>
  )
}

// Workflow step indicator with next step button
function WorkflowStepIndicator({ sessionId }: { sessionId: Id<"sessions"> }) {
  const navigate = useNavigate()
  const { switchSession } = useSession()
  const workflowContext = useQuery(api.sessions.getWorkflowContext, { sessionId })
  const goToNextStep = useMutation(api.sessions.goToNextStep)
  const [isAdvancing, setIsAdvancing] = useState(false)

  // Don't render if not part of a workflow
  if (!workflowContext) return null

  const handleNextStep = async () => {
    setIsAdvancing(true)
    try {
      const result = await goToNextStep({ sessionId })
      // Update localStorage synchronously (same fix as in SessionContext)
      localStorage.setItem("contextforge-session-id", result.sessionId)
      switchSession(result.sessionId)
      // Force a re-render by navigating to the same page
      navigate({ to: "/" })
    } finally {
      setIsAdvancing(false)
    }
  }

  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/50 border border-border text-xs">
      {/* Workflow name and step progress */}
      <Link
        to="/projects/$projectId"
        params={{ projectId: workflowContext.projectId }}
        className="text-muted-foreground hover:text-foreground"
      >
        {workflowContext.workflowName}
      </Link>
      <span className="text-muted-foreground">·</span>
      <span className="font-medium">
        Step {workflowContext.currentStepIndex + 1}/{workflowContext.totalSteps}
      </span>
      <span className="text-muted-foreground">·</span>
      <span>{workflowContext.currentStepName}</span>

      {/* Next step button */}
      {workflowContext.hasNextStep && (
        <>
          <span className="text-muted-foreground">·</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNextStep}
            disabled={isAdvancing}
            className="h-5 px-2 text-xs"
          >
            {isAdvancing ? "..." : `Next: ${workflowContext.nextStepName} →`}
          </Button>
        </>
      )}

      {/* Completed indicator */}
      {!workflowContext.hasNextStep && (
        <>
          <span className="text-muted-foreground">·</span>
          <span className="text-green-600 dark:text-green-400">✓ Final step</span>
        </>
      )}
    </div>
  )
}

// Home page
function HomePage() {
  const { sessionId, isLoading } = useSession()

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  }

  if (!sessionId) {
    return <NoSessionSelected />
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-120px)]">
      {/* Workflow step indicator (if session is part of workflow) */}
      <WorkflowStepIndicator sessionId={sessionId} />

      {/* Compact toolbar row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <SessionMetrics sessionId={sessionId} collapsed />
          <AddBlockForm sessionId={sessionId} />
        </div>
        <div className="flex items-center gap-2">
          <BrainstormPanel sessionId={sessionId} compact />
          <ToolsSection sessionId={sessionId} />
        </div>
      </div>

      {/* Zones take remaining space */}
      <ZoneLayout sessionId={sessionId} />
    </div>
  )
}

export const Route = createFileRoute("/")({
  component: HomePage,
})
