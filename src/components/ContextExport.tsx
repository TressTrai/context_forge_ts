/**
 * Context export component - copy assembled context to clipboard.
 */

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import type { Id } from "../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"

type ExportFormat = "plain" | "markdown" | "xml"

interface ContextExportProps {
  sessionId: Id<"sessions">
  className?: string
}

export function ContextExport({ sessionId, className }: ContextExportProps) {
  const [format, setFormat] = useState<ExportFormat>("plain")
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const assembled = useQuery(api.context.getAssembled, {
    sessionId,
    format,
    includePromptPlaceholder: true,
  })

  const handleCopy = async () => {
    if (!assembled?.text) return

    try {
      await navigator.clipboard.writeText(assembled.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const formatTokens = (n: number): string => {
    if (n >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return n.toLocaleString()
  }

  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">Export Context</h3>
        {assembled && (
          <span className="text-xs text-muted-foreground font-mono">
            {formatTokens(assembled.tokens)} tokens
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <label htmlFor="export-format" className="text-sm text-muted-foreground">
          Format:
        </label>
        <select
          id="export-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as ExportFormat)}
          className="rounded-md border border-input bg-background px-2 py-1 text-sm"
        >
          <option value="plain">Plain Text</option>
          <option value="markdown">Markdown</option>
          <option value="xml">XML (Claude-style)</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleCopy}
          disabled={!assembled?.text}
          className="flex-1"
        >
          {copied ? "Copied!" : "Copy to Clipboard"}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPreview(!showPreview)}
          disabled={!assembled?.text}
        >
          {showPreview ? "Hide" : "Preview"}
        </Button>
      </div>

      {showPreview && assembled?.text && (
        <div className="mt-3 p-3 rounded-md bg-muted/50 border border-border max-h-[300px] overflow-auto">
          <pre className="text-xs whitespace-pre-wrap font-mono text-foreground">
            {assembled.text}
          </pre>
        </div>
      )}
    </div>
  )
}
