/**
 * Client-side context assembly for LLM conversations.
 * Assembles blocks into messages for OpenRouter/Ollama.
 */

import type { Zone } from "@/components/dnd/types"

/**
 * Anti-agent suffix to append to system prompts.
 * Prevents the model from pretending to have tool access.
 */
export const NO_TOOLS_SUFFIX = `

IMPORTANT: In this conversation you do NOT have access to tools, files, or code execution. Do NOT say "let me read that file" or "I'll search for that" - work only with information provided in this conversation.`

export interface ContextMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ConversationMessage {
  role: "user" | "assistant"
  content: string
}

/**
 * Minimal block interface for context assembly.
 * Works with blocks from Convex queries.
 */
export interface Block {
  content: string
  type: string
  zone: Zone | string
  position: number
  isDraft?: boolean
}

/**
 * Extract the active system prompt from blocks.
 * The first system_prompt block in the PERMANENT zone (by position) is active.
 *
 * @returns The active system prompt content, or undefined if none exists
 */
export function extractSystemPromptFromBlocks(blocks: Block[]): string | undefined {
  const systemPromptBlocks = blocks
    .filter((b) => b.type === "system_prompt" && b.zone === "PERMANENT" && !b.isDraft)
    .sort((a, b) => a.position - b.position)

  return systemPromptBlocks[0]?.content
}

/**
 * Assemble blocks into user context messages for LLM.
 * Order: PERMANENT -> STABLE -> WORKING -> User prompt
 *
 * IMPORTANT: This function does NOT include system_prompt blocks in output.
 * Callers should use extractSystemPromptFromBlocks() separately and pass
 * the system prompt to the provider via provider-specific options.
 *
 * @param blocks - All blocks for the session
 * @param userPrompt - The current user message
 */
export function assembleContext(blocks: Block[], userPrompt: string): ContextMessage[] {
  const messages: ContextMessage[] = []

  // Group blocks by zone, excluding system_prompt blocks
  const byZone: Record<Zone, Block[]> = {
    PERMANENT: [],
    STABLE: [],
    WORKING: [],
  }

  for (const block of blocks) {
    if (block.type === "system_prompt" || block.isDraft) {
      continue
    }
    const zone = block.zone as Zone
    if (byZone[zone]) {
      byZone[zone].push(block)
    }
  }

  // Sort each zone by position (ascending)
  for (const zone of Object.keys(byZone) as Zone[]) {
    byZone[zone].sort((a, b) => a.position - b.position)
  }

  // 1. PERMANENT zone as system message (most stable, cached)
  const permanentContent = byZone.PERMANENT.map((b) => b.content).join("\n\n")
  if (permanentContent) {
    messages.push({
      role: "system",
      content: permanentContent,
    })
  }

  // 2. STABLE zone as reference material
  const stableContent = byZone.STABLE.map((b) => b.content).join("\n\n")
  if (stableContent) {
    messages.push({
      role: "user",
      content: `Reference Material:\n\n${stableContent}`,
    })
  }

  // 3. WORKING zone as current context (dynamic, changes frequently)
  const workingContent = byZone.WORKING.map((b) => b.content).join("\n\n")
  if (workingContent) {
    messages.push({
      role: "user",
      content: `Current Context:\n\n${workingContent}`,
    })
  }

  // 4. Current user prompt (always last)
  messages.push({
    role: "user",
    content: userPrompt,
  })

  return messages
}

/**
 * Assemble blocks and conversation history into messages for brainstorming.
 * Order: PERMANENT -> STABLE -> WORKING -> Active Skills -> Conversation history -> New message
 *
 * Active skills are injected after WORKING to preserve prompt caching
 * (toggling a skill only invalidates the conversation suffix).
 *
 * @param blocks - All blocks for the session
 * @param conversationHistory - Previous messages in the conversation
 * @param newMessage - The new user message
 * @param activeSkillsContent - Optional formatted skill text to inject
 */
export function assembleContextWithConversation(
  blocks: Block[],
  conversationHistory: ConversationMessage[],
  newMessage: string,
  activeSkillsContent?: string
): ContextMessage[] {
  const messages: ContextMessage[] = []

  // Group blocks by zone, excluding system_prompt blocks
  const byZone: Record<Zone, Block[]> = {
    PERMANENT: [],
    STABLE: [],
    WORKING: [],
  }

  for (const block of blocks) {
    if (block.type === "system_prompt" || block.isDraft) {
      continue
    }
    const zone = block.zone as Zone
    if (byZone[zone]) {
      byZone[zone].push(block)
    }
  }

  // Sort each zone by position (ascending)
  for (const zone of Object.keys(byZone) as Zone[]) {
    byZone[zone].sort((a, b) => a.position - b.position)
  }

  // 1. PERMANENT zone as system message
  const permanentContent = byZone.PERMANENT.map((b) => b.content).join("\n\n")
  if (permanentContent) {
    messages.push({
      role: "system",
      content: permanentContent,
    })
  }

  // 2. STABLE zone as reference material
  const stableContent = byZone.STABLE.map((b) => b.content).join("\n\n")
  if (stableContent) {
    messages.push({
      role: "user",
      content: `Reference Material:\n\n${stableContent}`,
    })
  }

  // 3. WORKING zone as current context
  const workingContent = byZone.WORKING.map((b) => b.content).join("\n\n")
  if (workingContent) {
    messages.push({
      role: "user",
      content: `Current Context:\n\n${workingContent}`,
    })
  }

  // 4. Active skills (after WORKING, before conversation — cache-friendly)
  if (activeSkillsContent) {
    messages.push({
      role: "user",
      content: `Active Skills:\n\n${activeSkillsContent}`,
    })
  }

  // 5. Conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    })
  }

  // 6. New user message (always last)
  messages.push({
    role: "user",
    content: newMessage,
  })

  return messages
}

/**
 * Render matching memory entries into a structured text block for LLM context.
 * Mirrors the server-side logic in convex/lib/memoryRendering.ts.
 *
 * Entries with no tag overlap with sessionTags are excluded (score = 0).
 * Pinned entries are always included (score = Infinity).
 */
export interface MemoryEntryForRendering {
  type: string
  title: string
  content: string
  tags: string[]
  _id: string
}

export function renderMemoryBlock(
  entries: MemoryEntryForRendering[],
  sessionTags: string[],
  pinnedIds: Set<string>
): string {
  if (entries.length === 0) return ""

  const scored = entries
    .map((entry) => {
      if (pinnedIds.has(entry._id)) return { entry, score: Infinity }
      if (sessionTags.length === 0 || entry.tags.length === 0) return { entry, score: 0 }
      const sessionSet = new Set(sessionTags)
      const score = entry.tags.filter((t) => sessionSet.has(t)).length
      return { entry, score }
    })
    .filter((s) => s.score > 0)

  if (scored.length === 0) return ""

  const byType = new Map<string, Array<{ entry: MemoryEntryForRendering; score: number }>>()
  for (const s of scored) {
    const existing = byType.get(s.entry.type) ?? []
    existing.push(s)
    byType.set(s.entry.type, existing)
  }

  const sortedTypes = [...byType.entries()].sort((a, b) => {
    const scoreA = a[1].reduce((sum, s) => sum + (s.score === Infinity ? 1000 : s.score), 0)
    const scoreB = b[1].reduce((sum, s) => sum + (s.score === Infinity ? 1000 : s.score), 0)
    return scoreB - scoreA
  })

  const parts: string[] = ["## Project Memory"]
  for (const [type, items] of sortedTypes) {
    items.sort((a, b) => {
      if (a.score === Infinity && b.score === Infinity) return 0
      if (a.score === Infinity) return -1
      if (b.score === Infinity) return 1
      return b.score - a.score
    })
    parts.push(`\n### ${type}`)
    for (const { entry } of items) {
      parts.push(`**${entry.title}** — ${entry.content}`)
    }
  }

  return parts.join("\n")
}

/**
 * Calculate approximate token count for context.
 * Uses rough estimate of 4 characters per token.
 */
export function estimateTokenCount(messages: ContextMessage[]): number {
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
  return Math.ceil(totalChars / 4)
}

/**
 * Get context stats by zone.
 */
export function getContextStats(blocks: Block[]): {
  permanent: { count: number; chars: number }
  stable: { count: number; chars: number }
  working: { count: number; chars: number }
  total: { count: number; chars: number }
} {
  const stats = {
    permanent: { count: 0, chars: 0 },
    stable: { count: 0, chars: 0 },
    working: { count: 0, chars: 0 },
    total: { count: 0, chars: 0 },
  }

  for (const block of blocks) {
    if (block.isDraft) continue
    const zone = (block.zone as string).toLowerCase() as "permanent" | "stable" | "working"
    if (stats[zone]) {
      stats[zone].count++
      stats[zone].chars += block.content.length
    }
    stats.total.count++
    stats.total.chars += block.content.length
  }

  return stats
}
