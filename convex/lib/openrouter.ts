/**
 * OpenRouter API client for accessing multiple LLMs via a unified API.
 * OpenRouter provides access to Claude, GPT-4, Llama, and many other models.
 *
 * API Documentation: https://openrouter.ai/docs
 */

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface OpenRouterStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: string
      content?: string
    }
    finish_reason: string | null
  }>
  // Usage is only included in final chunk when stream_options.include_usage is true
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenRouterChatResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface OpenRouterModel {
  id: string
  name: string
  description?: string
  context_length: number
  pricing: {
    prompt: string
    completion: string
  }
}

export interface StreamChatOptions {
  model?: string
  temperature?: number
  topP?: number
  maxTokens?: number
}

export interface StreamChatResult {
  text: string
  promptTokens?: number
  completionTokens?: number
  model?: string
}

// Default configuration
const OPENROUTER_URL = "https://openrouter.ai/api/v1"
const DEFAULT_MODEL = "anthropic/claude-3.5-sonnet" // Good default, can be overridden

function getApiKey(): string | undefined {
  return typeof process !== "undefined" ? process.env?.OPENROUTER_API_KEY : undefined
}

function getDefaultModel(): string {
  return typeof process !== "undefined" && process.env?.OPENROUTER_MODEL
    ? process.env.OPENROUTER_MODEL
    : DEFAULT_MODEL
}

function getSiteUrl(): string {
  return typeof process !== "undefined" && process.env?.OPENROUTER_SITE_URL
    ? process.env.OPENROUTER_SITE_URL
    : "http://localhost:5173"
}

function getSiteName(): string {
  return typeof process !== "undefined" && process.env?.OPENROUTER_SITE_NAME
    ? process.env.OPENROUTER_SITE_NAME
    : "ContextForge"
}

/**
 * Stream chat completion from OpenRouter.
 * Returns an async generator of text chunks.
 */
export async function* streamChat(
  messages: OpenRouterMessage[],
  options?: StreamChatOptions
): AsyncGenerator<string, StreamChatResult, unknown> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set")
  }

  const model = options?.model || getDefaultModel()

  const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": getSiteUrl(),
      "X-Title": getSiteName(),
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      max_tokens: options?.maxTokens,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OpenRouter error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  if (!response.body) {
    throw new Error("No response body from OpenRouter")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullText = ""
  let finalUsage: OpenRouterStreamChunk["usage"] | undefined
  let responseModel: string | undefined

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith("data: ")) continue

      const data = trimmed.slice(6) // Remove "data: " prefix
      if (data === "[DONE]") continue

      try {
        const chunk: OpenRouterStreamChunk = JSON.parse(data)
        responseModel = chunk.model

        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullText += content
          yield content
        }

        // Capture usage from final chunk if available
        if (chunk.usage) {
          finalUsage = chunk.usage
        }
      } catch {
        // Skip malformed JSON lines
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim() && buffer.trim().startsWith("data: ")) {
    const data = buffer.trim().slice(6)
    if (data !== "[DONE]") {
      try {
        const chunk: OpenRouterStreamChunk = JSON.parse(data)
        const content = chunk.choices[0]?.delta?.content
        if (content) {
          fullText += content
          yield content
        }
        if (chunk.usage) {
          finalUsage = chunk.usage
        }
      } catch {
        // Skip malformed JSON
      }
    }
  }

  return {
    text: fullText,
    promptTokens: finalUsage?.prompt_tokens,
    completionTokens: finalUsage?.completion_tokens,
    model: responseModel,
  }
}

/**
 * Non-streaming chat completion from OpenRouter.
 */
export async function chat(
  messages: OpenRouterMessage[],
  options?: StreamChatOptions
): Promise<OpenRouterChatResponse> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set")
  }

  const model = options?.model || getDefaultModel()

  const response = await fetch(`${OPENROUTER_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": getSiteUrl(),
      "X-Title": getSiteName(),
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
      max_tokens: options?.maxTokens,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `OpenRouter error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  return response.json()
}

/**
 * Check if OpenRouter is available and API key is configured.
 */
export async function checkHealth(): Promise<{
  ok: boolean
  configured: boolean
  error?: string
  model?: string
}> {
  const apiKey = getApiKey()

  if (!apiKey) {
    return {
      ok: false,
      configured: false,
      error: "OPENROUTER_API_KEY not configured",
    }
  }

  try {
    // Use the models endpoint to verify API key works
    const response = await fetch(`${OPENROUTER_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    })

    if (!response.ok) {
      return {
        ok: false,
        configured: true,
        error: `API error: ${response.status} ${response.statusText}`,
      }
    }

    return {
      ok: true,
      configured: true,
      model: getDefaultModel(),
    }
  } catch (error) {
    return {
      ok: false,
      configured: true,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * List available models from OpenRouter.
 */
export async function listModels(): Promise<OpenRouterModel[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is not set")
  }

  const response = await fetch(`${OPENROUTER_URL}/models`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as { data: OpenRouterModel[] }
  return data.data || []
}
