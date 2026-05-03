import { extractBlockTitle, sanitizeFilename } from "@/lib/skills/titleExtractor"

export { sanitizeFilename } from "@/lib/skills/titleExtractor"
export { uniqueFilename } from "@/lib/skills/titleExtractor"

function yamlStr(s: string): string {
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
}

export function renderBlockToMarkdown(block: {
  _id: string
  content: string
  type: string
}, sessionName: string): string {
  return [
    "---",
    `blockId: ${yamlStr(block._id)}`,
    `type: ${yamlStr(block.type)}`,
    `session: ${yamlStr(sessionName)}`,
    "---",
    "",
    block.content,
  ].join("\n")
}

const TYPE_DIR: Record<string, string> = {
  entry_brief: "entry-briefs",
  assistant_message: "assistant-messages",
  user_message: "user-messages",
  note: "notes",
  document: "documents",
  guideline: "guidelines",
  template: "templates",
  reference: "references",
  instruction: "instructions",
  system_prompt: "system-prompts",
  persona: "personas",
  framework: "frameworks",
  code: "code",
  skill: "skills",
}

export function buildBaseFilePath(params: {
  content: string
  blockType: string
  typeIndex: number
  folder: string
}): string {
  const { content, blockType, typeIndex, folder } = params

  const title = extractBlockTitle(content, blockType, typeIndex)
  const base = sanitizeFilename(title)
  const dir = TYPE_DIR[blockType] ?? blockType.replace(/_/g, "-") + "s"
  const prefix = folder.trim().replace(/\/$/, "")

  return prefix ? `${prefix}/${dir}/${base}` : `${dir}/${base}`
}
