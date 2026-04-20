/**
 * Client-side RouterAI API client.
 * Calls RouterAI directly from the browser using user's API key.
 *
 * RouterAI is OpenAI-compatible. CORS is permissive (Allow-Origin: *).
 * API base URL is tenant-configurable via settings.
 */

import { routerai as settings } from "./settings"
import { retryFetch } from "./retryFetch"

export interface RouterAIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface StreamChatOptions {
  model?: string
  temperature?: number
  topP?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface StreamChatResult {
  text: string
  promptTokens?: number
  completionTokens?: number
  model?: string
  provider?: string
}

export interface RouterAIModel {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: number
    completion: number
  }
}

interface RouterAIStreamChunk {
  id: string
  model: string
  provider?: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string }
    finish_reason: string | null
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export async function* streamChat(
  messages: RouterAIMessage[],
  options?: StreamChatOptions
): AsyncGenerator<string, StreamChatResult, unknown> {
  const apiKey = settings.getApiKey()
  if (!apiKey) {
    throw new Error("RouterAI API key not configured. Please add your API key in Settings.")
  }
  const baseUrl = settings.getBaseUrl()
  const model = options?.model || settings.getModel()

  const response = await retryFetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      max_tokens: options?.maxTokens,
    }),
    signal: options?.signal,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`RouterAI error: ${response.status} ${response.statusText} - ${errorText}`)
  }
  if (!response.body) throw new Error("No response body from RouterAI")

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let finalUsage: RouterAIStreamChunk["usage"] | undefined
  let responseModel: string | undefined
  let responseProvider: string | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue
      const data = trimmed.slice(6)
      if (data === "[DONE]") continue
      try {
        const chunk: RouterAIStreamChunk = JSON.parse(data)
        responseModel = chunk.model
        if (chunk.provider) responseProvider = chunk.provider
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullText += content
          yield content
        }
        if (chunk.usage) finalUsage = chunk.usage
      } catch {
        // skip malformed
      }
    }
  }

  return {
    text: fullText,
    promptTokens: finalUsage?.prompt_tokens,
    completionTokens: finalUsage?.completion_tokens,
    model: responseModel,
    provider: responseProvider,
  }
}

export async function checkHealth(): Promise<{
  ok: boolean
  configured: boolean
  error?: string
  model?: string
}> {
  const apiKey = settings.getApiKey()
  if (!apiKey || apiKey.trim() === "") {
    return { ok: false, configured: false }
  }
  try {
    const response = await retryFetch(
      `${settings.getBaseUrl()}/models`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000),
      },
      { attempts: 1 }
    )
    if (!response.ok) {
      return { ok: false, configured: true, error: `API error: ${response.status} ${response.statusText}` }
    }
    return { ok: true, configured: true, model: settings.getModel() }
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function listModels(): Promise<RouterAIModel[]> {
  const apiKey = settings.getApiKey()
  if (!apiKey) throw new Error("RouterAI API key not configured")
  const response = await retryFetch(`${settings.getBaseUrl()}/models`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!response.ok) {
    throw new Error(`RouterAI error: ${response.status} ${response.statusText}`)
  }
  const data = (await response.json()) as { data: RouterAIModel[] }
  return data.data || []
}

// Cached model pricing: modelId -> { prompt: $/token, completion: $/token }
let pricingCache: Map<string, { prompt: number; completion: number }> | null = null
let pricingFetchPromise: Promise<void> | null = null

export async function getModelPricing(
  modelId: string
): Promise<{ prompt: number; completion: number } | null> {
  if (!pricingCache) {
    if (!pricingFetchPromise) pricingFetchPromise = fetchAndCachePricing()
    await pricingFetchPromise
  }
  return pricingCache?.get(modelId) ?? null
}

async function fetchAndCachePricing(): Promise<void> {
  try {
    const models = await listModels()
    pricingCache = new Map()
    for (const model of models) {
      // RouterAI returns pricing as numbers — no parseFloat needed (unlike OpenRouter)
      pricingCache.set(model.id, {
        prompt: model.pricing.prompt || 0,
        completion: model.pricing.completion || 0,
      })
    }
  } catch {
    pricingCache = new Map()
  }
}

export function calculateCost(
  promptTokens: number,
  completionTokens: number,
  pricing: { prompt: number; completion: number }
): number {
  return promptTokens * pricing.prompt + completionTokens * pricing.completion
}

/** Test-only: clear the cached pricing map. Not exported from index.ts. */
export function __resetPricingCacheForTests(): void {
  pricingCache = null
  pricingFetchPromise = null
}
