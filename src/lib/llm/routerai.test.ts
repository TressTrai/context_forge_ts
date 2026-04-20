import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  streamChat,
  checkHealth,
  getModelPricing,
  calculateCost,
  __resetPricingCacheForTests,
} from "./routerai"
import { routerai as settings } from "./settings"

function consumeAll(gen: AsyncGenerator<string, unknown>) {
  return (async () => {
    const chunks: string[] = []
    let result
    while (true) {
      const r = await gen.next()
      if (r.done) {
        result = r.value
        break
      }
      chunks.push(r.value)
    }
    return { chunks, result }
  })()
}

function sseStream(events: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      for (const ev of events) controller.enqueue(encoder.encode(ev))
      controller.close()
    },
  })
  return new Response(body, { status: 200, headers: { "Content-Type": "text/event-stream" } })
}

describe("routerai.streamChat", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("throws when API key not configured", async () => {
    const gen = streamChat([{ role: "user", content: "hi" }])
    await expect(gen.next()).rejects.toThrow(/API key not configured/)
  })

  it("yields content chunks and returns usage from SSE stream", async () => {
    settings.setApiKey("test-key")
    const events = [
      `data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4o-mini","provider":"OpenAI","choices":[{"index":0,"delta":{"content":"Hel"},"finish_reason":null}]}\n\n`,
      `data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4o-mini","provider":"OpenAI","choices":[{"index":0,"delta":{"content":"lo"},"finish_reason":null}]}\n\n`,
      `data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4o-mini","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}\n\n`,
      `data: [DONE]\n\n`,
    ]
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sseStream(events))

    const { chunks, result } = await consumeAll(streamChat([{ role: "user", content: "hi" }]))

    expect(chunks).toEqual(["Hel", "lo"])
    expect(result).toMatchObject({
      text: "Hello",
      promptTokens: 3,
      completionTokens: 2,
      model: "openai/gpt-4o-mini",
      provider: "OpenAI",
    })
  })
})

describe("routerai.checkHealth", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns ok=false, configured=false when no key", async () => {
    const result = await checkHealth()
    expect(result).toEqual({ ok: false, configured: false })
  })

  it("returns ok=true when /models responds 200", async () => {
    settings.setApiKey("test-key")
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ data: [] }), { status: 200 })
    )
    const result = await checkHealth()
    expect(result.ok).toBe(true)
    expect(result.configured).toBe(true)
  })
})

describe("routerai pricing", () => {
  beforeEach(() => {
    localStorage.clear()
    settings.setApiKey("test-key")
    __resetPricingCacheForTests()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns pricing as numbers (already $/token, no parseFloat needed)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: "openai/gpt-4o-mini",
              name: "GPT-4o-mini",
              context_length: 128000,
              pricing: { prompt: 0.00000015, completion: 0.0000006 },
            },
          ],
        }),
        { status: 200 }
      )
    )
    const pricing = await getModelPricing("openai/gpt-4o-mini")
    expect(pricing).toEqual({ prompt: 0.00000015, completion: 0.0000006 })
  })

  it("calculateCost multiplies and sums", () => {
    expect(calculateCost(1000, 500, { prompt: 0.001, completion: 0.002 })).toBeCloseTo(2.0)
  })
})
