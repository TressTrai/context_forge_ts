/**
 * Import Skill Dialog — UI for importing SKILL.md files.
 * Supports file upload, URL import, and local folder scan (feature-gated).
 */

import { useState, useRef, useCallback } from "react"
import { useQuery, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { DebouncedButton } from "@/components/ui/debounced-button"
import { useSkillImport } from "@/hooks/useSkillImport"
import type { Id } from "../../../convex/_generated/dataModel"
import { Puzzle, Upload, Link, FolderSearch, X, AlertCircle, CheckCircle2 } from "lucide-react"
import { ImportProjectConfirmDialog } from "./ImportProjectConfirmDialog"
import { cn } from "@/lib/utils"
import { AnimatePresence, motion } from "framer-motion"
import { dialogOverlay, dialogContent } from "@/lib/motion"

interface ImportSkillDialogProps {
  isOpen: boolean
  onClose: () => void
  sessionId: Id<"sessions">
}

interface ScanReference {
  filename: string
  content: string
  zone: string
  relativePath: string
  tokenEstimate: number
}

interface ScanResult {
  name: string
  description: string
  content: string
  folderPath: string
  tokenEstimate: number
  references?: ScanReference[]
}

export function ImportSkillDialog({
  isOpen,
  onClose,
  sessionId,
}: ImportSkillDialogProps) {
  const [url, setUrl] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [scanResults, setScanResults] = useState<ScanResult[] | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanPath, setScanPath] = useState("~/.claude/skills/")
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const flags = useQuery(api.features.getFlags)
  const showFolderScan = flags?.skillScanEnabled ?? false
  const scanFolder = useAction(api.skillsNode.scanFolder)
  const importFromScan = useAction(api.skillsNode.importFromScan)

  const {
    importFromFile,
    importFromUrl,
    isImporting,
    pendingProjectImport,
    confirmProjectImport,
    cancelProjectImport,
  } = useSkillImport({
    sessionId,
    onSuccess: (name, refCount) => {
      const refText = refCount ? ` (+ ${refCount} reference${refCount !== 1 ? "s" : ""})` : ""
      setSuccessMessage(`Imported skill: ${name}${refText}`)
      setError(null)
    },
    onError: (msg) => {
      setError(msg)
      setSuccessMessage(null)
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const lower = file.name.toLowerCase()
    if (!lower.endsWith(".md") && !lower.endsWith(".zip")) {
      setError("Only .md and .zip files are supported")
      return
    }
    setError(null)
    setSuccessMessage(null)
    await importFromFile(file)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const file = e.dataTransfer.files[0]
      if (!file) return
      const lower = file.name.toLowerCase()
      if (!lower.endsWith(".md") && !lower.endsWith(".zip")) {
        setError("Only .md and .zip files are supported")
        return
      }
      setError(null)
      setSuccessMessage(null)
      await importFromFile(file)
    },
    [importFromFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleUrlImport = async () => {
    if (!url.trim()) return
    setError(null)
    setSuccessMessage(null)
    await importFromUrl(url.trim())
    if (!error) setUrl("")
  }

  const handleScan = async () => {
    setIsScanning(true)
    setError(null)
    setScanResults(null)
    try {
      const result = await scanFolder({ folderPath: scanPath || undefined })
      if (result.error) {
        setError(result.error)
      } else if (result.skills.length === 0) {
        setError("No SKILL.md files found in the specified folder")
      } else {
        setScanResults(result.skills)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed")
    } finally {
      setIsScanning(false)
    }
  }

  const handleImportSelected = async (selected: ScanResult[]) => {
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await importFromScan({
        sessionId,
        skills: selected.map((s) => ({
          content: s.content,
          skillName: s.name,
          skillDescription: s.description,
          folderPath: s.folderPath,
          references: s.references?.map((r) => ({
            filename: r.filename,
            content: r.content,
            zone: r.zone,
            relativePath: r.relativePath,
          })),
        })),
      })
      const refText = result.references ? ` (+ ${result.references} references)` : ""
      setSuccessMessage(`Imported ${result.imported} skill${result.imported !== 1 ? "s" : ""}${refText}`)
      setScanResults(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    }
  }

  const handleClose = () => {
    setError(null)
    setSuccessMessage(null)
    setScanResults(null)
    setUrl("")
    onClose()
  }

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={dialogOverlay.initial} animate={dialogOverlay.animate} exit={dialogOverlay.exit} transition={dialogOverlay.transition}>
      <motion.div className="bg-card border border-border rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-y-auto" initial={dialogContent.initial} animate={dialogContent.animate} exit={dialogContent.exit} transition={dialogContent.transition} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Puzzle className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-semibold">Import Skill</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-5">
          {/* Section 1: File Upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Upload className="w-4 h-4 text-muted-foreground" />
              Upload SKILL.md or .zip
            </div>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".md,.zip"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-sm text-muted-foreground">
                {isDragOver ? "Drop file here" : "Click or drop a .md or .zip file here"}
              </p>
            </div>
          </div>

          {/* Section 2: URL Import */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link className="w-4 h-4 text-muted-foreground" />
              Import from URL
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUrlImport()
                }}
                placeholder="https://raw.githubusercontent.com/.../SKILL.md"
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <DebouncedButton
                onClick={handleUrlImport}
                disabled={!url.trim() || isImporting}
                debounceMs={500}
                size="sm"
              >
                Import
              </DebouncedButton>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a raw GitHub URL or any direct link to a SKILL.md file
            </p>
          </div>

          {/* Section 3: Folder Scan (feature-gated) */}
          {showFolderScan && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FolderSearch className="w-4 h-4 text-muted-foreground" />
                Scan Local Folder
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanPath}
                  onChange={(e) => setScanPath(e.target.value)}
                  placeholder="~/.claude/skills/"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <DebouncedButton
                  onClick={handleScan}
                  disabled={isScanning}
                  debounceMs={500}
                  size="sm"
                >
                  {isScanning ? "Scanning..." : "Scan"}
                </DebouncedButton>
              </div>

              {/* Scan Results */}
              {scanResults && (
                <ScanResultsList
                  results={scanResults}
                  onImport={handleImportSelected}
                  isImporting={isImporting}
                />
              )}
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          {successMessage && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              {successMessage}
            </div>
          )}
        </div>
      </motion.div>

      {pendingProjectImport && (
        <ImportProjectConfirmDialog
          pending={pendingProjectImport}
          onConfirm={confirmProjectImport}
          onCancel={cancelProjectImport}
          isImporting={isImporting}
        />
      )}
    </motion.div>
    )}
    </AnimatePresence>
  )
}

function ScanResultsList({
  results,
  onImport,
  isImporting,
}: {
  results: ScanResult[]
  onImport: (selected: ScanResult[]) => void
  isImporting: boolean
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(results.map((_, i) => i))
  )

  const toggleItem = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">
        Found {results.length} skill{results.length !== 1 ? "s" : ""}:
      </div>
      <div className="max-h-60 overflow-y-auto space-y-1">
        {results.map((skill, i) => (
          <label
            key={i}
            className={cn(
              "flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors",
              selected.has(i)
                ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/30"
                : "border-border hover:bg-muted/50"
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(i)}
              onChange={() => toggleItem(i)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{skill.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {skill.description}
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                ~{skill.tokenEstimate} tokens
                {skill.references && skill.references.length > 0 && (
                  <span className="ml-2">
                    · {skill.references.length} ref{skill.references.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>
      <DebouncedButton
        onClick={() => onImport(results.filter((_, i) => selected.has(i)))}
        disabled={selected.size === 0 || isImporting}
        debounceMs={500}
        className="w-full"
      >
        {isImporting
          ? "Importing..."
          : `Import ${selected.size} Skill${selected.size !== 1 ? "s" : ""}`}
      </DebouncedButton>
    </div>
  )
}
