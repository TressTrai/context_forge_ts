/**
 * Skill directory parser — extracts SKILL.md + references/ files.
 * Pure function, used by both ZIP upload (client) and folder scan (server).
 *
 * Zone mapping convention for references/:
 *   references/permanent/** → PERMANENT
 *   references/stable/**    → STABLE
 *   references/working/**   → WORKING
 *   references/*.md (root)  → STABLE (default)
 *   references/<other>/**   → STABLE (default)
 */

import type { Zone } from "@/components/dnd/types"
import { parseSkillMd, type ParsedSkill } from "./parser"

export interface ReferenceFile {
  filename: string
  content: string
  zone: Zone
  relativePath: string
}

export interface ParsedSkillDirectory {
  skill: ParsedSkill
  references: ReferenceFile[]
}

/**
 * Determine zone from a reference file's relative path.
 */
function zoneFromPath(relativePath: string): Zone {
  const lower = relativePath.toLowerCase()
  if (lower.startsWith("references/permanent/")) return "PERMANENT"
  if (lower.startsWith("references/working/")) return "WORKING"
  if (lower.startsWith("references/stable/")) return "STABLE"
  return "STABLE"
}

/**
 * Extract filename from a path (last segment).
 */
function filenameFromPath(filePath: string): string {
  const parts = filePath.split("/")
  return parts[parts.length - 1]
}

/**
 * Parse a skill directory from a map of file paths to contents.
 *
 * The file map can come from:
 * - A ZIP file extracted in the browser
 * - A folder scan on the server (Node action)
 *
 * Paths should be relative to the skill root directory.
 * Example: { "SKILL.md": "...", "references/persona.md": "...", "references/permanent/rules.md": "..." }
 *
 * @param files - Map of relative path → file content
 * @param fallbackName - Optional fallback name for the skill (e.g., directory name)
 * @returns ParsedSkillDirectory with skill and reference files
 */
export function parseSkillDirectory(
  files: Map<string, string>,
  fallbackName?: string
): ParsedSkillDirectory {
  // Find SKILL.md (case-insensitive, at root)
  let skillMdContent: string | undefined
  let skillMdKey: string | undefined

  for (const [path, content] of files) {
    const filename = filenameFromPath(path)
    // SKILL.md at root level (no directory prefix, or just the filename)
    if (
      filename.toLowerCase() === "skill.md" &&
      !path.includes("references/")
    ) {
      skillMdContent = content
      skillMdKey = path
      break
    }
  }

  if (!skillMdContent) {
    // Re-use the parser's error for consistency
    throw new Error(
      "No SKILL.md found in directory"
    )
  }

  const skill = parseSkillMd(skillMdContent, fallbackName)

  // Collect reference .md files
  const references: ReferenceFile[] = []

  for (const [filePath, content] of files) {
    if (filePath === skillMdKey) continue
    const lower = filePath.toLowerCase()
    if (!lower.startsWith("references/")) continue
    if (!lower.endsWith(".md")) continue

    references.push({
      filename: filenameFromPath(filePath),
      content,
      zone: zoneFromPath(filePath),
      relativePath: filePath,
    })
  }

  // Sort references by path for consistent ordering
  references.sort((a, b) => a.relativePath.localeCompare(b.relativePath))

  return { skill, references }
}
