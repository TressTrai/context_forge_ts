import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import { AnimatePresence, motion } from "framer-motion"
import { diffWords } from "diff"
import type { Change } from "diff"
import { Button } from "@/components/ui/button"
import { dialogOverlay, dialogContent } from "@/lib/motion"
import { getSyncMeta } from "@/lib/git-export/settings"
import { checkForUpdates, rejectChange } from "@/lib/git-export/sync"
import type { SyncChange, SyncResult } from "@/lib/git-export/sync"

function DiffView({ before, after }: { before: string; after: string }) {
  const parts: Change[] = diffWords(before, after)

  return (
    <div className="grid grid-cols-2 border border-border rounded overflow-hidden text-sm">
      <div className="p-3 border-r border-border">
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Current
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">
          {parts.map((part, i) => {
            if (part.added) return null
            return (
              <span
                key={i}
                className={
                  part.removed
                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 line-through"
                    : undefined
                }
              >
                {part.value}
              </span>
            )
          })}
        </div>
      </div>
      <div className="p-3">
        <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
          Remote
        </div>
        <div className="whitespace-pre-wrap leading-relaxed">
          {parts.map((part, i) => {
            if (part.removed) return null
            return (
              <span
                key={i}
                className={
                  part.added
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                    : undefined
                }
              >
                {part.value}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function titleFromPath(path: string): string {
  const name = path.split("/").pop() ?? path
  return name.replace(/\.md$/, "").replace(/-/g, " ")
}

interface SyncDialogProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function SyncDialog({ isOpen, onClose, projectId }: SyncDialogProps) {
  const syncMeta = getSyncMeta(projectId)
  const blockIds = syncMeta ? Object.keys(syncMeta.blocks) : []

  const convexBlocksRaw = useQuery(
    api.blocks.getMany,
    blockIds.length > 0 ? { ids: blockIds as Id<"blocks">[] } : "skip"
  )
  const convexBlocks = convexBlocksRaw ?? []
  const isBlocksLoading = blockIds.length > 0 && convexBlocksRaw === undefined

  const [isChecking, setIsChecking] = useState(false)
  const [result, setResult] = useState<SyncResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const updateBlock = useMutation(api.blocks.update)

  const handleCheck = async () => {
    setIsChecking(true)
    setError(null)
    try {
      const syncResult = await checkForUpdates(projectId, convexBlocks)
      setResult(syncResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsChecking(false)
    }
  }

  const handleAccept = async (change: SyncChange) => {
    await updateBlock({ id: change.blockId as Id<"blocks">, content: change.remoteContent })
    setResult((prev) => prev ? { ...prev, changes: prev.changes.filter((c) => c.blockId !== change.blockId) } : null)
  }

  const handleReject = (change: SyncChange) => {
    rejectChange(projectId, change.blockId, change.remoteContent)
    setResult((prev) => prev ? { ...prev, changes: prev.changes.filter((c) => c.blockId !== change.blockId) } : null)
  }

  const handleClose = () => {
    setResult(null)
    setError(null)
    onClose()
  }

  if (!syncMeta) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          initial={dialogOverlay.initial}
          animate={dialogOverlay.animate}
          exit={dialogOverlay.exit}
          transition={dialogOverlay.transition}
          onClick={handleClose}
        >
          <motion.div
            className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            initial={dialogContent.initial}
            animate={dialogContent.animate}
            exit={dialogContent.exit}
            transition={dialogContent.transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Sync from Git</h2>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-muted-foreground truncate">
              {syncMeta.provider === "github" ? "GitHub" : "GitLab"}: {syncMeta.repoUrl}
              {syncMeta.branch ? ` · ${syncMeta.branch}` : ""}
            </p>

            {result === null ? (
              <div className="space-y-3">
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
                <div className="flex justify-center pt-2">
                  <Button onClick={handleCheck} disabled={isChecking || isBlocksLoading}>
                    {isChecking ? "Checking..." : "Check for updates"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {result.notFound.length > 0 && (
                  <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 px-3 py-2 text-sm text-yellow-800 dark:text-yellow-400">
                    <span className="font-medium">Not found in repository:</span>{" "}
                    {result.notFound.join(", ")}
                  </div>
                )}
                {result.changes.length === 0 ? (
                  <div className="py-4 text-center">
                    <p className="text-sm text-muted-foreground">No changes found.</p>
                    <Button variant="outline" className="mt-3" onClick={() => setResult(null)}>
                      Check again
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {result.changes.length} block{result.changes.length !== 1 ? "s" : ""} changed in the repository.
                    </p>
                    {result.changes.map((change) => (
                      <div key={change.blockId} className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium capitalize truncate">
                            {titleFromPath(change.path)}
                          </span>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => handleReject(change)}>
                              Reject
                            </Button>
                            <Button size="sm" onClick={() => handleAccept(change)}>
                              Accept
                            </Button>
                          </div>
                        </div>
                        <DiffView before={change.currentContent} after={change.remoteContent} />
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
