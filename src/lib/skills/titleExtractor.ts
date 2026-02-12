/**
 * Title extraction and filename generation for skill export.
 *
 * Extracts a human-readable title from block content,
 * sanitizes it for use as a filename, and handles collisions.
 */

/**
 * Extract a title from block content.
 * Priority: first markdown heading > first non-empty line > fallback.
 */
export function extractBlockTitle(
  content: string,
  blockType: string,
  index: number
): string {
  const lines = content.split("\n")

  // Try first markdown heading
  for (const line of lines) {
    const match = line.match(/^#+\s+(.+)/)
    if (match) return match[1].trim()
  }

  // Try first non-empty line (truncated)
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed) {
      return trimmed.length > 60 ? trimmed.slice(0, 60) : trimmed
    }
  }

  // Fallback
  return `${blockType}-${index}`
}

/**
 * Sanitize a title for use as a filename.
 * Lowercase, spaces to hyphens, strip special chars, truncate.
 */
export function sanitizeFilename(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50) || "untitled"
}

/**
 * Generate a unique filename by appending a numeric suffix on collision.
 */
export function uniqueFilename(
  base: string,
  ext: string,
  existing: Set<string>
): string {
  const candidate = `${base}${ext}`
  if (!existing.has(candidate)) return candidate

  for (let i = 1; i < 1000; i++) {
    const numbered = `${base}-${i}${ext}`
    if (!existing.has(numbered)) return numbered
  }

  return `${base}-${Date.now()}${ext}`
}
