import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { streamChat } from "./openrouter"
import { openrouter as settings } from "./settings"

function sseStream(events: string[]): Response {
  const body = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder()
      for (const ev of events) controller.enqueue(enc.encode(ev))
      controller.close()
    },
  })
  return new Response(body, { status: 200 })
}

describe("openrouter.streamChat", () => {
  beforeEach(() => {
    localStorage.clear()
    settings.setApiKey("test-key")
    Object.defineProperty(window, "location", { value: { origin: "http://localhost" }, writable: true })
  })
  afterEach(() => vi.restoreAllMocks())

  it("yields content chunks and returns usage", async () => {
    const events = [
      `data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"anthropic/claude-sonnet-4","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\n`,
      `data: {"id":"1","object":"chat.completion.chunk","created":1,"model":"anthropic/claude-sonnet-4","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1,"total_tokens":3}}\n\n`,
      `data: [DONE]\n\n`,
    ]
    vi.spyOn(globalThis, "fetch").mockResolvedValue(sseStream(events))

    const gen = streamChat([{ role: "user", content: "hi" }])
    const chunks: string[] = []
    let final
    while (true) {
      const r = await gen.next()
      if (r.done) { final = r.value; break }
      chunks.push(r.value)
    }
    expect(chunks).toEqual(["Hi"])
    expect(final).toMatchObject({ text: "Hi", promptTokens: 2, completionTokens: 1 })
  })

  it("throws when API key not configured", async () => {
    localStorage.clear()
    const gen = streamChat([{ role: "user", content: "hi" }])
    await expect(gen.next()).rejects.toThrow(/API key not configured/)
  })
})
