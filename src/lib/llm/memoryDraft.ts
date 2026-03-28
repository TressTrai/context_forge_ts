/**
 * Client-side memory entry drafting via OpenRouter or Ollama.
 * Sends selected text to an LLM and returns a structured draft.
 */

import { openrouter as orSettings, ollama as ollamaSettings } from "./settings"

export interface MemoryDraftResult {
  type: string
  title: string
  content: string
  tags: string[]
  duplicateWarning?: string
}

function buildSystemPrompt(types: Array<{ name: string; icon: string }>): string {
  const typeList = types.map((t) => `- ${t.name} (${t.icon})`).join("\n")
  return `You are a memory entry drafting assistant. Given text from a conversation, create a structured memory entry for a project knowledge base.

Available memory types:
${typeList}

Rules:
- Pick the most appropriate type from the list above
- Write a concise, specific title (not just the first line)
- Distill the insight — don't copy verbatim
- Use lowercase, #-prefixed tags (e.g. #decision, #backend, #ch3)
- Write the title and content in the same language as the input text

Respond with ONLY valid JSON, no markdown fences:
{"type": "...", "title": "...", "content": "...", "tags": ["#...", "#..."]}`
}

function resolveProvider(provider: string): "openrouter" | "ollama" {
  if (provider === "openrouter") return "openrouter"
  if (provider === "ollama") return "ollama"
  // Fallback for other providers (e.g. "claude"): prefer openrouter if configured
  return orSettings.isConfigured() ? "openrouter" : "ollama"
}

export async function draftMemoryEntry(
  selectedText: string,
  types: Array<{ name: string; icon: string }>,
  provider: string
): Promise<MemoryDraftResult> {
  const resolvedProvider = resolveProvider(provider)
  const systemPrompt = buildSystemPrompt(types)
  const userPrompt = `Draft a memory entry from this text:\n\n${selectedText}`

  let responseText = ""

  if (resolvedProvider === "openrouter") {
    const apiKey = orSettings.getApiKey()
    if (!apiKey) throw new Error("OpenRouter API key not configured")
    const model = orSettings.getModel()

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    })
    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`)
    const data = await res.json()
    responseText = data.choices?.[0]?.message?.content ?? ""
  } else {
    const url = ollamaSettings.getUrl()
    const model = ollamaSettings.getModel()

    const res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      }),
    })
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    const data = await res.json()
    responseText = data.message?.content ?? ""
  }

  try {
    const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned)
    return {
      type: parsed.type ?? types[0]?.name ?? "note",
      title: parsed.title ?? "Untitled",
      content: parsed.content ?? selectedText,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      duplicateWarning: parsed.duplicateWarning ?? undefined,
    }
  } catch {
    // Fallback: manual form with raw text
    return {
      type: types[0]?.name ?? "note",
      title: selectedText.slice(0, 60).split("\n")[0].trim(),
      content: selectedText,
      tags: [],
    }
  }
}
