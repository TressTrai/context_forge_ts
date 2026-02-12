/**
 * Hook for handling native file drops to create blocks.
 *
 * SKILL.md and .zip files are routed through the skill import flow.
 * Other .md/.txt files create plain blocks in the target zone.
 */

import { useState, useCallback } from "react"
import { useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Zone } from "@/components/dnd"
import type { Id } from "../../convex/_generated/dataModel"
import { useSkillImport } from "./useSkillImport"

// Map zone to default block type for plain file drops
const ZONE_TO_BLOCK_TYPE: Record<Zone, string> = {
  PERMANENT: "SYSTEM",
  STABLE: "NOTE",
  WORKING: "NOTE",
}

function isSkillFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name === "skill.md" || name.endsWith(".zip")
}

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase()
  return name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".zip")
}

interface UseFileDropOptions {
  sessionId: Id<"sessions">
  zone: Zone
  onSuccess?: (fileName: string) => void
  onError?: (error: string) => void
}

export function useFileDrop({ sessionId, zone, onSuccess, onError }: UseFileDropOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const createBlock = useMutation(api.blocks.create)

  const { importFromFile } = useSkillImport({
    sessionId,
    onSuccess: (name) => onSuccess?.(`Imported skill: ${name}`),
    onError: (msg) => onError?.(msg),
  })

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Check if dragging files
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const validFiles = files.filter(isSupportedFile)

      if (validFiles.length === 0) {
        onError?.("Only .txt, .md, and .zip files are supported")
        return
      }

      for (const file of validFiles) {
        try {
          if (isSkillFile(file)) {
            await importFromFile(file, zone)
          } else {
            const content = await file.text()
            const blockType = ZONE_TO_BLOCK_TYPE[zone]
            await createBlock({ sessionId, content, type: blockType, zone })
            onSuccess?.(file.name)
          }
        } catch {
          onError?.(`Failed to add file: ${file.name}`)
        }
      }
    },
    [sessionId, zone, createBlock, importFromFile, onSuccess, onError]
  )

  return {
    isDragOver,
    dropProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    },
  }
}
