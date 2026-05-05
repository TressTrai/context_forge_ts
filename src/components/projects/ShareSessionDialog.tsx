import { useState, useRef, useEffect } from "react"
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
  typeIndex: number
}

interface ShareSessionDialogProps {
  isOpen: boolean
  onClose: () => void
  sessionId: Id<"sessions">
  sessionName: string
  projectId?: Id<"projects">
}

export function ShareSessionDialog({
  isOpen,
  onClose,
  sessionId,
  sessionName,
  projectId,
}: ShareSessionDialogProps) {
  const blocks = useQuery(api.blocks.list, { sessionId })
  const form = useGitExportForm({ projectId, onClose })

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showOtherZones, setShowOtherZones] = useState(false)
  const blockDataRef = useRef<Map<string, BlockData>>(new Map())

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
      blockDataRef.current.set(block._id, {
        content: block.content,
        type: block.type,
        typeIndex: idx,
      })
    }
  }, [blocks])

  const toggleId = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

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
          sessionName
        ),
      })
    }

    await form.exportFiles(files, `ContextForge export: ${sessionName}`)
  }

  const renderBlockRow = (block: NonNullable<typeof blocks>[number], i: number) => {
    const title = extractBlockTitle(block.content, block.type, i)
    const typeMeta = BLOCK_TYPE_METADATA[block.type as BlockType]
    return (
      <label key={block._id} className="flex items-center gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={selectedIds.has(block._id)}
          onChange={() => toggleId(block._id)}
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
            <h2 className="text-lg font-semibold">Share Session to Git</h2>

            {!form.resultUrl && (
              <ProviderSelector provider={form.provider} setProvider={form.setProvider} />
            )}

            {form.resultUrl ? (
              <ExportSuccessView url={form.resultUrl} onClose={form.handleClose} />
            ) : (
              <>
                <div className="space-y-2">
                  {(() => {
                    const workingBlocks = blocks?.filter((b) => b.zone === "WORKING") ?? []
                    const allSelected = workingBlocks.length > 0 && workingBlocks.every((b) => selectedIds.has(b._id))
                    const toggleAll = () =>
                      setSelectedIds(allSelected ? new Set() : new Set(workingBlocks.map((b) => b._id)))
                    return (
                      <div className="flex items-center justify-between">
                        <Label>Blocks to export</Label>
                        {workingBlocks.length > 0 && (
                          <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                            {allSelected ? "Deselect all" : "Select all"}
                          </button>
                        )}
                      </div>
                    )
                  })()}

                  {!blocks ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : (
                    <div className="border border-border rounded-md p-3 space-y-1">
                      {blocks.filter((b) => b.zone === "WORKING").length === 0 ? (
                        <p className="text-xs text-muted-foreground">No blocks in Working zone.</p>
                      ) : (
                        blocks
                          .filter((b) => b.zone === "WORKING")
                          .sort((a, b) => a.position - b.position)
                          .map((block, i) => renderBlockRow(block, i))
                      )}

                      {(() => {
                        const otherBlocks = blocks.filter((b) => b.zone !== "WORKING")
                        if (otherBlocks.length === 0) return null
                        const grouped = (["PERMANENT", "STABLE"] as const).map((zone) => ({
                          zone,
                          items: otherBlocks
                            .filter((b) => b.zone === zone)
                            .sort((a, b) => a.position - b.position),
                        })).filter((g) => g.items.length > 0)

                        return (
                          <div className="border-t border-border mt-2 pt-2">
                            <button
                              onClick={() => setShowOtherZones(!showOtherZones)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full"
                            >
                              <ChevronRight className={`h-3 w-3 transition-transform ${showOtherZones ? "rotate-90" : ""}`} />
                              Permanent & Stable ({otherBlocks.length})
                            </button>
                            {showOtherZones && (
                              <div className="mt-2 space-y-3">
                                {grouped.map(({ zone, items }) => (
                                  <div key={zone}>
                                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                                      {ZONE_LABEL[zone]}
                                    </p>
                                    <div className="space-y-1">
                                      {items.map((block, i) => renderBlockRow(block, i))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })()}
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
                  idPrefix="ss"
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
