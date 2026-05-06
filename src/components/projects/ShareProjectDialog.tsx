import { useState, useRef, useEffect, useCallback } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Id } from "../../../convex/_generated/dataModel"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import { dialogOverlay, dialogContent } from "@/lib/motion"
import { useGitExportForm } from "@/lib/git-export/useGitExportForm"
import { ProviderSelector, RepoFormFields, ExportSuccessView, ContextModeBadge } from "./GitExportShared"
import { renderBlockToMarkdown, buildBaseFilePath, uniqueFilename } from "@/lib/git-export/markdown"
import { extractBlockTitle } from "@/lib/skills/titleExtractor"
import { BLOCK_TYPE_METADATA } from "@/lib/blockTypes"
import type { BlockType } from "@/lib/blockTypes"

const ZONE_ORDER: Record<string, number> = { PERMANENT: 0, STABLE: 1, WORKING: 2 }
const ZONE_LABEL: Record<string, string> = { PERMANENT: "Permanent", STABLE: "Stable" }

interface BlockData {
  content: string
  type: string
  zone: string
  sessionName: string
  sessionIndex: number
  typeIndex: number
}

interface SessionBlocksSelectableProps {
  session: { _id: Id<"sessions">; name?: string }
  sessionIndex: number
  selectedIds: Set<string>
  onToggle: (id: string) => void
  onBulkSelect: (ids: string[], select: boolean) => void
  onBlockData: (id: string, data: BlockData) => void
}

function SessionBlocksSelectable({
  session,
  sessionIndex,
  selectedIds,
  onToggle,
  onBulkSelect,
  onBlockData,
}: SessionBlocksSelectableProps) {
  const blocks = useQuery(api.blocks.list, { sessionId: session._id })
  const [showOtherZones, setShowOtherZones] = useState(false)

  useEffect(() => {
    if (!blocks) return
    const typeCounters: Record<string, number> = {}
    const sorted = [...blocks].sort((a, b) => {
      const zd = (ZONE_ORDER[a.zone] ?? 9) - (ZONE_ORDER[b.zone] ?? 9)
      return zd !== 0 ? zd : a.position - b.position
    })
    for (const block of sorted) {
      const idx = typeCounters[block.type] ?? 0
      typeCounters[block.type] = idx + 1
      onBlockData(block._id, {
        content: block.content,
        type: block.type,
        zone: block.zone,
        sessionName: session.name ?? "",
        sessionIndex,
        typeIndex: idx,
      })
    }
  }, [blocks, session.name, sessionIndex, onBlockData])

  if (!blocks) return <p className="text-xs text-muted-foreground pl-1">Loading...</p>
  if (blocks.length === 0) return <p className="text-xs text-muted-foreground pl-1">No blocks</p>

  const working = blocks.filter((b) => b.zone === "WORKING").sort((a, b) => a.position - b.position)
  const otherBlocks = blocks.filter((b) => b.zone !== "WORKING")
  const otherGrouped = (["PERMANENT", "STABLE"] as const).map((zone) => ({
    zone,
    items: otherBlocks.filter((b) => b.zone === zone).sort((a, b) => a.position - b.position),
  })).filter((g) => g.items.length > 0)

  const renderRow = (block: NonNullable<typeof blocks>[number], i: number) => {
    const title = extractBlockTitle(block.content, block.type, i)
    const typeMeta = BLOCK_TYPE_METADATA[block.type as BlockType]
    return (
      <label key={block._id} className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={selectedIds.has(block._id)}
          onChange={() => onToggle(block._id)}
          className="rounded"
        />
        <span className="text-sm text-foreground truncate max-w-[220px]">{title}</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {typeMeta?.displayName ?? block.type}
        </span>
        <ContextModeBadge contextMode={block.contextMode} />
      </label>
    )
  }

  const workingIds = working.map((b) => b._id)
  const allWorkingSelected = workingIds.length > 0 && workingIds.every((id) => selectedIds.has(id))

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {session.name}
        </p>
        {workingIds.length > 0 && (
          <button
            onClick={() => onBulkSelect(workingIds, !allWorkingSelected)}
            className="text-xs text-primary hover:underline"
          >
            {allWorkingSelected ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>
      {working.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-1">No blocks in Working zone</p>
      ) : (
        working.map((block, i) => renderRow(block, i))
      )}

      {otherGrouped.length > 0 && (
        <div className="mt-2 pt-1">
          <button
            onClick={() => setShowOtherZones(!showOtherZones)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full"
          >
            <ChevronRight className={`h-3 w-3 transition-transform ${showOtherZones ? "rotate-90" : ""}`} />
            Permanent & Stable ({otherBlocks.length})
          </button>
          {showOtherZones && (
            <div className="mt-2 space-y-3">
              {otherGrouped.map(({ zone, items }) => (
                <div key={zone}>
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    {ZONE_LABEL[zone]}
                  </p>
                  <div className="space-y-1">
                    {items.map((block, i) => renderRow(block, i))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ShareProjectDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: Id<"projects">
  projectName: string
}

export function ShareProjectDialog({ isOpen, onClose, projectId, projectName }: ShareProjectDialogProps) {
  const project = useQuery(api.projects.get, { id: projectId })
  const form = useGitExportForm({ projectId, onClose })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [workingIds, setWorkingIds] = useState<string[]>([])
  const blockDataRef = useRef<Map<string, BlockData>>(new Map())

  const registerBlockData = useCallback((id: string, data: BlockData) => {
    blockDataRef.current.set(id, data)
    if (data.zone === "WORKING") {
      setWorkingIds((prev) => prev.includes(id) ? prev : [...prev, id])
    }
  }, [])

  const toggleId = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const bulkSelect = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (select) ids.forEach((id) => next.add(id))
      else ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const handleExport = async () => {
    const files: { path: string; content: string; blockId: string }[] = []
    const usedPaths = new Set<string>()

    for (const blockId of selectedIds) {
      const data = blockDataRef.current.get(blockId)
      if (!data) continue
      const basePath = buildBaseFilePath({
        content: data.content,
        blockType: data.type,
        typeIndex: data.typeIndex,
        folder: form.folder,
      })
      const path = uniqueFilename(basePath, ".md", usedPaths)
      usedPaths.add(path)
      files.push({
        path,
        blockId,
        content: renderBlockToMarkdown(
          { _id: blockId, content: data.content, type: data.type },
          data.sessionName
        ),
      })
    }

    await form.exportFiles(files, `ContextForge export: ${projectName}`)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={dialogOverlay.initial}
          animate={dialogOverlay.animate}
          exit={dialogOverlay.exit}
          transition={dialogOverlay.transition}
        >
          <motion.div
            className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            initial={dialogContent.initial}
            animate={dialogContent.animate}
            exit={dialogContent.exit}
            transition={dialogContent.transition}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Share Project to Git</h2>

            {!form.resultUrl && (
              <ProviderSelector provider={form.provider} setProvider={form.setProvider} />
            )}

            {form.resultUrl ? (
              <ExportSuccessView url={form.resultUrl} onClose={form.handleClose} />
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Blocks to export</Label>
                    {workingIds.length > 0 && (() => {
                      const allSelected = workingIds.every((id) => selectedIds.has(id))
                      return (
                        <button
                          onClick={() => setSelectedIds(allSelected ? new Set() : new Set(workingIds))}
                          className="text-xs text-primary hover:underline"
                        >
                          {allSelected ? "Deselect all" : "Select all"}
                        </button>
                      )
                    })()}
                  </div>
                  {!project ? (
                    <p className="text-sm text-muted-foreground">Loading project...</p>
                  ) : project.sessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sessions in this project.</p>
                  ) : (
                    <div className="border border-border rounded-md divide-y divide-border">
                      {project.sessions.map((session, i) => (
                        <div key={session._id} className="p-3">
                          <SessionBlocksSelectable
                            session={session}
                            sessionIndex={i}
                            selectedIds={selectedIds}
                            onToggle={toggleId}
                            onBulkSelect={bulkSelect}
                            onBlockData={registerBlockData}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <RepoFormFields
                  provider={form.provider}
                  repoUrl={form.repoUrl}
                  setRepoUrl={form.setRepoUrl}
                  folder={form.folder}
                  setFolder={form.setFolder}
                  branch={form.branch}
                  setBranch={form.setBranch}
                  idPrefix="share"
                />

                {form.error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{form.error}</p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={form.handleClose} disabled={form.isLoading}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleExport}
                    disabled={form.isLoading || selectedIds.size === 0 || !form.repoUrl.trim()}
                  >
                    {form.isLoading
                      ? "Exporting..."
                      : selectedIds.size > 0
                        ? `Export (${selectedIds.size})`
                        : "Export"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
