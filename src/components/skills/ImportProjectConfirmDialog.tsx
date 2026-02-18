/**
 * Confirmation dialog for multi-context skill import.
 * Shows the workflow steps and asks user to confirm project creation.
 */

import { Button } from "@/components/ui/button"
import { X, FolderTree } from "lucide-react"
import type { PendingProjectImport } from "@/hooks/useSkillImport"
import { motion } from "framer-motion"
import { dialogOverlay, dialogContent } from "@/lib/motion"

interface ImportProjectConfirmDialogProps {
  pending: PendingProjectImport
  onConfirm: () => void
  onCancel: () => void
  isImporting: boolean
}

export function ImportProjectConfirmDialog({
  pending,
  onConfirm,
  onCancel,
  isImporting,
}: ImportProjectConfirmDialogProps) {
  const contexts = pending.contextMap.contexts

  return (
    <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={dialogOverlay.initial} animate={dialogOverlay.animate} exit={dialogOverlay.exit} transition={dialogOverlay.transition}>
      <motion.div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] flex flex-col" initial={dialogContent.initial} animate={dialogContent.animate} exit={dialogContent.exit} transition={dialogContent.transition} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FolderTree className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Import as Project</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isImporting}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <p className="text-sm text-muted-foreground">
            <strong>{pending.skillName}</strong> defines a{" "}
            {contexts.length}-step workflow:
          </p>

          <div className="space-y-2">
            {contexts.map((ctx, i) => {
              const refCount =
                ctx.permanent.length + ctx.stable.length + ctx.working.length
              return (
                <div
                  key={ctx.key}
                  className="border border-border rounded p-2.5"
                >
                  <div className="text-sm font-medium">
                    {i + 1}. {ctx.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {refCount} reference{refCount !== 1 ? "s" : ""}
                    {ctx.permanent.length > 0 &&
                      ` (${ctx.permanent.length} permanent)`}
                    {ctx.stable.length > 0 &&
                      ` (${ctx.stable.length} stable)`}
                    {ctx.working.length > 0 &&
                      ` (${ctx.working.length} working)`}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-muted/30 border-t border-border text-sm text-muted-foreground shrink-0">
          Your current session becomes step 1:{" "}
          <strong>{contexts[0]?.label}</strong>.{" "}
          {contexts.length > 1 &&
            `${contexts.length - 1} more step${contexts.length > 2 ? "s" : ""} will be created as a project workflow.`}
        </div>

        {/* Actions */}
        <div className="p-4 flex justify-end gap-2 border-t border-border shrink-0">
          <Button variant="outline" onClick={onCancel} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isImporting}>
            {isImporting ? "Importing..." : "Import as Project"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
