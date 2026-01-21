/**
 * Dialog for applying a template to the current session.
 */

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import type { Id } from "../../../convex/_generated/dataModel"

interface ApplyTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  sessionId: Id<"sessions">
  onSuccess?: () => void
}

export function ApplyTemplateDialog({
  isOpen,
  onClose,
  sessionId,
  onSuccess,
}: ApplyTemplateDialogProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<"templates"> | null>(null)
  const [clearExisting, setClearExisting] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const templates = useQuery(api.templates.list)
  const applyToSession = useMutation(api.templates.applyToSession)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId) return

    setIsLoading(true)
    setError(null)

    try {
      await applyToSession({
        templateId: selectedTemplateId,
        sessionId,
        clearExisting,
      })
      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply template")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSelectedTemplateId(null)
    setClearExisting(true)
    setError(null)
    onClose()
  }

  const selectedTemplate = templates?.find((t) => t._id === selectedTemplateId)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Apply Template</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Load a template's blocks and system prompt into the current session.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="template-select" className="block text-sm font-medium mb-1">
              Select Template
            </label>
            {templates === undefined ? (
              <div className="text-sm text-muted-foreground">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border border-dashed border-border rounded-md text-center">
                No templates yet. Save your current session as a template first.
              </div>
            ) : (
              <select
                id="template-select"
                value={selectedTemplateId ?? ""}
                onChange={(e) => setSelectedTemplateId(e.target.value as Id<"templates">)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.blocks.length} blocks)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Template preview */}
          {selectedTemplate && (
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <div className="text-sm font-medium mb-1">{selectedTemplate.name}</div>
              {selectedTemplate.description && (
                <div className="text-xs text-muted-foreground mb-2">
                  {selectedTemplate.description}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {selectedTemplate.blocks.length} blocks
                {selectedTemplate.systemPrompt && " • Has system prompt"}
              </div>
              <div className="mt-2 flex gap-2 flex-wrap">
                {["PERMANENT", "STABLE", "WORKING"].map((zone) => {
                  const count = selectedTemplate.blocks.filter((b) => b.zone === zone).length
                  if (count === 0) return null
                  return (
                    <span
                      key={zone}
                      className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                    >
                      {zone}: {count}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="clear-existing"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="clear-existing" className="text-sm">
              Clear existing blocks (recommended)
            </label>
          </div>

          {!clearExisting && (
            <div className="p-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 text-xs">
              Template blocks will be added to existing content. This may cause duplicates.
            </div>
          )}

          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedTemplateId || isLoading || templates?.length === 0}
            >
              {isLoading ? "Applying..." : "Apply Template"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
