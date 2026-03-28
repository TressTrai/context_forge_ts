/**
 * Dialog for saving brainstorm text as a memory entry.
 * Calls the configured LLM (OpenRouter or Ollama) to draft the entry,
 * then shows CreateEntryForm pre-filled with the draft for review.
 */

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { dialogOverlay, dialogContent } from "@/lib/motion"
import { CreateEntryForm } from "@/components/memory/CreateEntryForm"
import { draftMemoryEntry, type MemoryDraftResult } from "@/lib/llm/memoryDraft"
import type { Id } from "../../convex/_generated/dataModel"

interface SaveToMemoryDialogProps {
  isOpen: boolean
  onClose: () => void
  text: string
  projectId: Id<"projects">
  types: Array<{ name: string; color: string; icon: string }>
  provider: string
  onCreateEntry: (args: {
    projectId: Id<"projects">
    type: string
    title: string
    content: string
    tags: string[]
  }) => Promise<unknown>
  /** Override drafting for providers that need server-side calls (e.g. Claude Code CLI) */
  onDraft?: (text: string, types: Array<{ name: string; icon: string }>) => Promise<MemoryDraftResult>
}

export function SaveToMemoryDialog({
  isOpen,
  onClose,
  text,
  projectId,
  types,
  provider,
  onCreateEntry,
  onDraft,
}: SaveToMemoryDialogProps) {
  const [isDrafting, setIsDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<{
    type?: string
    title?: string
    content?: string
    tags?: string[]
  } | null>(null)

  useEffect(() => {
    if (!isOpen || !text) return

    let cancelled = false
    setIsDrafting(true)
    setDraftError(null)
    setInitialValues(null)

    const typesMapped = types.map((t) => ({ name: t.name, icon: t.icon }))
    const draft = onDraft
      ? onDraft(text, typesMapped)
      : draftMemoryEntry(text, typesMapped, provider)

    draft
      .then((result) => {
        if (!cancelled) {
          setInitialValues({
            type: result.type,
            title: result.title,
            content: result.content,
            tags: result.tags,
          })
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDraftError(err instanceof Error ? err.message : "Failed to draft entry")
          // Still show form with raw text as fallback
          setInitialValues({
            type: types[0]?.name,
            title: text.slice(0, 60).split("\n")[0].trim(),
            content: text,
            tags: [],
          })
        }
      })
      .finally(() => {
        if (!cancelled) setIsDrafting(false)
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, text, provider, types])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          initial={dialogOverlay.initial}
          animate={dialogOverlay.animate}
          exit={dialogOverlay.exit}
          transition={dialogOverlay.transition}
          onClick={onClose}
        >
          <motion.div
            className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg"
            initial={dialogContent.initial}
            animate={dialogContent.animate}
            exit={dialogContent.exit}
            transition={dialogContent.transition}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-border">
              <h2 className="text-base font-semibold">Save to Memory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review and edit the drafted entry before saving.
              </p>
            </div>

            <div className="p-4 space-y-3">
              {/* Source text preview */}
              <div className="text-xs text-muted-foreground rounded-md bg-muted/50 border border-border px-3 py-2 max-h-[80px] overflow-y-auto">
                <span className="font-medium">Source: </span>
                {text.slice(0, 300)}{text.length > 300 ? "…" : ""}
              </div>

              {isDrafting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                  <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  Drafting with AI...
                </div>
              )}

              {draftError && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                  AI drafting failed — filled with raw text. {draftError}
                </div>
              )}

              {!isDrafting && initialValues && (
                <CreateEntryForm
                  projectId={projectId}
                  types={types}
                  onSubmit={onCreateEntry}
                  onCancel={onClose}
                  initialValues={initialValues}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
