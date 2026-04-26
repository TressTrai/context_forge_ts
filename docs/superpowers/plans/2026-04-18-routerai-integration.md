# RouterAI Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add [RouterAI](https://routerai.ru) as a third LLM provider for brainstorm, alongside the existing OpenRouter and Ollama providers. Address the standing pain that alt-providers silently rot by adding adapter unit tests with stubbed `fetch` and a shared retry helper that protects against 5xx blips.

**Architecture:** RouterAI is OpenAI-compatible and CORS-permissive (probed 2026-04-18); the adapter is a near-clone of `src/lib/llm/openrouter.ts` with a configurable base URL, no `HTTP-Referer` header, and pricing read as numbers (already $/token) instead of strings. A new shared `retryFetch` helper (5 attempts, exponential backoff 5/10/20/40/80 s on 429 + 5xx + transient network errors) is used by **both** RouterAI and OpenRouter to ride out gateway blips. Adapter tests stub `globalThis.fetch` with `vi.spyOn` — no new test deps.

**Tech Stack:** TypeScript, React 19, Vitest 4, browser `fetch` + `ReadableStream`, localStorage for keys.

**Reference docs:**
- `docs/research/2026-04-18-routerai-integration.md` (research, with probe results)
- `/home/newub/w/co/univer/subd/docs/research/2026-04-18-routerai-adapter.md` (Python reference adapter)

---

## Scope check

This plan ships steps 1–2 from the research doc:
- The `retryFetch` helper + adapter test pattern (the "stop-the-rot" piece)
- The RouterAI adapter end-to-end (settings, module, UI, brainstorm wiring)

**Out of scope** (deferred to a follow-up plan if usage demands it):
- Formal `LLMProvider` TypeScript interface extraction. The existing duck-typed pattern is fine for three providers; an interface adds churn without unlocking any feature here. Revisit if a fourth provider arrives.
- Compression integration for RouterAI (compression already auto-prefers OpenRouter; brainstorm-only for v1).
- E2E spec for the new provider (gated behind a paid key in CI; out of band).

## File structure

**Create:**
- `src/lib/llm/retryFetch.ts` — shared retry wrapper, ~40 LOC
- `src/lib/llm/retryFetch.test.ts` — unit tests, fake-timer driven
- `src/lib/llm/routerai.ts` — adapter, ~250 LOC, structured exactly like `openrouter.ts`
- `src/lib/llm/routerai.test.ts` — adapter unit tests (stream parsing, retry, abort, error wrapping)
- `src/lib/llm/openrouter.test.ts` — backfill the missing test for the existing adapter (smaller, focused on stream parsing edge cases)

**Modify:**
- `src/lib/llm/openrouter.ts` — replace raw `fetch` calls with `retryFetch` (3 sites)
- `src/lib/llm/settings.ts` — add `routerai` namespace (apiKey, baseUrl, model)
- `src/lib/llm/index.ts` — re-export `routerai` namespace + types
- `src/routes/app/settings.tsx` — add `RouterAISettings()` panel
- `src/hooks/useBrainstorm.ts` — add `sendMessageRouterAI()`, extend `Provider` union, dispatch in three send sites
- `docs/research/2026-04-18-routerai-integration.md` — flip status to `implemented` once shipped

Each file has one clear responsibility (settings, retry helper, adapter, UI panel, hook integration). Files that change together stay together.

---

## Phase 1 — Shared retry helper (stop-the-rot foundation)

### Task 1: Add `retryFetch` helper

**Files:**
- Create: `src/lib/llm/retryFetch.ts`
- Test: `src/lib/llm/retryFetch.test.ts`

- [ ] **Step 1: Write failing test for happy path**

```typescript
// src/lib/llm/retryFetch.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { retryFetch } from "./retryFetch"

describe("retryFetch", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("returns the response on first-try success", async () => {
    const ok = new Response("ok", { status: 200 })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok)

    const result = await retryFetch("https://example.com")

    expect(result).toBe(ok)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `pnpm vitest run src/lib/llm/retryFetch.test.ts`
Expected: FAIL with "Cannot find module './retryFetch'".

- [ ] **Step 3: Create minimal `retryFetch` to make the test pass**

```typescript
// src/lib/llm/retryFetch.ts
export interface RetryFetchOptions {
  attempts?: number
  baseDelayMs?: number
}

export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  _opts?: RetryFetchOptions
): Promise<Response> {
  return fetch(input, init)
}
```

- [ ] **Step 4: Run test, verify pass**

Run: `pnpm vitest run src/lib/llm/retryFetch.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Add failing test for retry on 502**

Append to `src/lib/llm/retryFetch.test.ts`:

```typescript
  it("retries on 502 then succeeds", async () => {
    const bad = new Response("bad gateway", { status: 502 })
    const ok = new Response("ok", { status: 200 })
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(bad)
      .mockResolvedValueOnce(ok)

    const promise = retryFetch("https://example.com", undefined, {
      attempts: 3,
      baseDelayMs: 10,
    })

    // first attempt resolves immediately; advance past the backoff
    await vi.advanceTimersByTimeAsync(20)

    const result = await promise
    expect(result).toBe(ok)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
```

- [ ] **Step 6: Run, verify failure**

Run: `pnpm vitest run src/lib/llm/retryFetch.test.ts -t "retries on 502"`
Expected: FAIL — got `bad` instead of `ok`.

- [ ] **Step 7: Implement retry loop**

Replace `src/lib/llm/retryFetch.ts` with:

```typescript
/**
 * fetch wrapper that retries on 429, 5xx, and transient network errors
 * with exponential backoff. 4xx (other than 429) bubbles immediately —
 * those are caller bugs, not transient faults.
 */

const RETRYABLE_NAMES = new Set(["AbortError"]) // never retry
const NETWORK_ERROR_HINTS = ["network", "failed to fetch", "load failed"]

export interface RetryFetchOptions {
  attempts?: number
  baseDelayMs?: number
}

export async function retryFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: RetryFetchOptions
): Promise<Response> {
  const attempts = opts?.attempts ?? 5
  const baseDelayMs = opts?.baseDelayMs ?? 5000
  let lastError: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(input, init)
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`)
        if (i < attempts - 1) {
          await sleep(baseDelayMs * 2 ** i)
          continue
        }
        return response // surfaces the bad status to the caller on final attempt
      }
      return response
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err
      if (err instanceof Error && RETRYABLE_NAMES.has(err.name)) throw err
      if (!isTransientNetworkError(err)) throw err
      lastError = err
      if (i < attempts - 1) {
        await sleep(baseDelayMs * 2 ** i)
        continue
      }
    }
  }

  throw lastError ?? new Error("retryFetch exhausted attempts")
}

function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return NETWORK_ERROR_HINTS.some((hint) => msg.includes(hint))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
```

- [ ] **Step 8: Run, verify pass**

Run: `pnpm vitest run src/lib/llm/retryFetch.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Add tests for non-retry on 4xx, retry on network error, AbortError pass-through**

Append:

```typescript
  it("does not retry on 400", async () => {
    const bad = new Response("bad request", { status: 400 })
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(bad)

    const result = await retryFetch("https://example.com", undefined, { attempts: 3, baseDelayMs: 10 })

    expect(result.status).toBe(400)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it("retries on transient network error", async () => {
    const ok = new Response("ok", { status: 200 })
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(ok)

    const promise = retryFetch("https://example.com", undefined, { attempts: 3, baseDelayMs: 10 })
    await vi.advanceTimersByTimeAsync(20)

    expect(await promise).toBe(ok)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it("propagates AbortError immediately", async () => {
    const abort = new DOMException("aborted", "AbortError")
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(abort)

    await expect(retryFetch("https://example.com")).rejects.toBe(abort)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
```

- [ ] **Step 10: Run, verify all pass**

Run: `pnpm vitest run src/lib/llm/retryFetch.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 11: Commit**

```bash
git add src/lib/llm/retryFetch.ts src/lib/llm/retryFetch.test.ts
git commit -m "feat(llm): add retryFetch helper with exponential backoff

5 attempts on 429 + 5xx + transient network errors, base 5s delay,
AbortError pass-through. Foundation for RouterAI adapter and to
harden the existing OpenRouter calls against gateway blips."
```

---

### Task 2: Wire `retryFetch` into `openrouter.ts`

**Files:**
- Modify: `src/lib/llm/openrouter.ts:124, 244, 283` (the three `fetch` call sites)

- [ ] **Step 1: Add import at top of `openrouter.ts`**

```typescript
import { retryFetch } from "./retryFetch"
```

- [ ] **Step 2: Replace `fetch` in `streamChat` (line 124)**

Change `const response = await fetch(...)` to `const response = await retryFetch(...)`. The arguments are unchanged.

- [ ] **Step 3: Replace `fetch` in `checkHealth` (line 244)**

Same swap. Health check uses a 5 s timeout via `AbortSignal.timeout(5000)` — the abort still works because `retryFetch` propagates `AbortError` immediately.

- [ ] **Step 4: Replace `fetch` in `listModels` (line 283)**

Same swap.

- [ ] **Step 5: Typecheck**

Run: `pnpm typecheck`
Expected: clean.

- [ ] **Step 6: Run all existing tests to confirm no regression**

Run: `pnpm test:run`
Expected: same pass count as before this commit.

- [ ] **Step 7: Commit**

```bash
git add src/lib/llm/openrouter.ts
git commit -m "refactor(llm): use retryFetch in openrouter

Hardens streamChat, checkHealth, and listModels against transient
5xx and network errors. Behavior unchanged on 2xx and 4xx."
```

---

## Phase 2 — RouterAI adapter

### Task 3: Add `routerai` settings namespace

**Files:**
- Modify: `src/lib/llm/settings.ts`

- [ ] **Step 1: Add localStorage keys + defaults**

In `src/lib/llm/settings.ts`, extend `KEYS` and `DEFAULTS`:

```typescript
const KEYS = {
  // ... existing entries ...
  ROUTERAI_API_KEY: "contextforge-routerai-api-key",
  ROUTERAI_BASE_URL: "contextforge-routerai-base-url",
  ROUTERAI_MODEL: "contextforge-routerai-model",
} as const

const DEFAULTS = {
  // ... existing entries ...
  ROUTERAI_BASE_URL: "https://routerai.ru/api/v1",
  ROUTERAI_MODEL: "openai/gpt-4o-mini",
} as const
```

- [ ] **Step 2: Add `routerai` namespace export**

Append:

```typescript
/**
 * RouterAI settings (OpenAI-compatible gateway, tenant-configurable base URL)
 */
export const routerai = {
  getApiKey(): string | null {
    return localStorage.getItem(KEYS.ROUTERAI_API_KEY)
  },
  setApiKey(key: string): void {
    localStorage.setItem(KEYS.ROUTERAI_API_KEY, key)
  },
  clearApiKey(): void {
    localStorage.removeItem(KEYS.ROUTERAI_API_KEY)
  },
  getBaseUrl(): string {
    return localStorage.getItem(KEYS.ROUTERAI_BASE_URL) || DEFAULTS.ROUTERAI_BASE_URL
  },
  setBaseUrl(url: string): void {
    localStorage.setItem(KEYS.ROUTERAI_BASE_URL, url)
  },
  getModel(): string {
    return localStorage.getItem(KEYS.ROUTERAI_MODEL) || DEFAULTS.ROUTERAI_MODEL
  },
  setModel(model: string): void {
    localStorage.setItem(KEYS.ROUTERAI_MODEL, model)
  },
  isConfigured(): boolean {
    return !!this.getApiKey()
  },
}
```

- [ ] **Step 3: Update `getAllSettings` to include RouterAI**

Modify the body to include:

```typescript
    routeraiApiKey: routerai.getApiKey() ? "[CONFIGURED]" : null,
    routeraiBaseUrl: routerai.getBaseUrl(),
    routeraiModel: routerai.getModel(),
```

- [ ] **Step 4: Typecheck + commit**

Run: `pnpm typecheck`
Expected: clean.

```bash
git add src/lib/llm/settings.ts
git commit -m "feat(llm): add routerai settings namespace

API key + tenant base URL + model, stored in localStorage same
pattern as openrouter."
```

---

### Task 4: Build `routerai.ts` adapter (TDD)

**Files:**
- Create: `src/lib/llm/routerai.ts`
- Test: `src/lib/llm/routerai.test.ts`

- [ ] **Step 1: Write the first failing test — "throws when API key not set"**

```typescript
// src/lib/llm/routerai.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { streamChat } from "./routerai"
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
})
```

- [ ] **Step 2: Run test, verify failure**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create minimal adapter that satisfies that test**

```typescript
// src/lib/llm/routerai.ts
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

export async function* streamChat(
  _messages: RouterAIMessage[],
  _options?: StreamChatOptions
): AsyncGenerator<string, StreamChatResult, unknown> {
  const apiKey = settings.getApiKey()
  if (!apiKey) {
    throw new Error("RouterAI API key not configured. Please add your API key in Settings.")
  }
  return { text: "" }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Add failing test for streaming SSE response**

Append to `routerai.test.ts`:

```typescript
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
```

- [ ] **Step 6: Run, verify failure**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts -t "yields content chunks"`
Expected: FAIL — empty result.

- [ ] **Step 7: Implement full streaming**

Replace the `streamChat` body (and surrounding helpers) in `src/lib/llm/routerai.ts` with:

```typescript
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
```

- [ ] **Step 8: Run, verify both tests pass**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 9: Add failing test for `checkHealth`**

Append:

```typescript
import { checkHealth } from "./routerai"

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
```

- [ ] **Step 10: Run, verify failure**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts -t "checkHealth"`
Expected: FAIL — `checkHealth` not exported.

- [ ] **Step 11: Implement `checkHealth` and `listModels`**

Append to `src/lib/llm/routerai.ts`:

```typescript
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
```

- [ ] **Step 12: Run, verify pass**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 13: Add pricing helpers + test**

Append failing test first:

```typescript
import { getModelPricing, calculateCost } from "./routerai"

describe("routerai pricing", () => {
  beforeEach(() => {
    localStorage.clear()
    settings.setApiKey("test-key")
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
```

- [ ] **Step 14: Run, verify failure**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts -t "pricing"`
Expected: FAIL — exports missing.

- [ ] **Step 15: Implement pricing**

Append to `src/lib/llm/routerai.ts`:

```typescript
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
```

- [ ] **Step 16: Reset module-level cache between pricing tests**

The pricing cache is module-level state. Add a small reset hook so tests don't bleed:

In `src/lib/llm/routerai.ts`, append:

```typescript
/** Test-only: clear the cached pricing map. Not exported from index.ts. */
export function __resetPricingCacheForTests(): void {
  pricingCache = null
  pricingFetchPromise = null
}
```

In `routerai.test.ts`, the pricing `beforeEach` becomes:

```typescript
  beforeEach(() => {
    localStorage.clear()
    settings.setApiKey("test-key")
    __resetPricingCacheForTests()
  })
```

(add the import: `import { ..., __resetPricingCacheForTests } from "./routerai"`)

- [ ] **Step 17: Run all routerai tests, verify all pass**

Run: `pnpm vitest run src/lib/llm/routerai.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 18: Wire `routerai` into `src/lib/llm/index.ts`**

Add:

```typescript
export * as routerai from "./routerai"
export type { StreamChatOptions as RouterAIOptions, StreamChatResult as RouterAIResult } from "./routerai"
```

- [ ] **Step 19: Typecheck + commit**

Run: `pnpm typecheck` (expect clean).

```bash
git add src/lib/llm/routerai.ts src/lib/llm/routerai.test.ts src/lib/llm/index.ts
git commit -m "feat(llm): add RouterAI adapter with unit tests

OpenAI-compatible streaming adapter cloned from openrouter.ts with
configurable base URL, retryFetch retries, and pricing read as
numbers (RouterAI returns $/token directly, unlike OpenRouter).
6 unit tests cover key check, SSE parsing, health, pricing."
```

---

### Task 5: Backfill `openrouter.ts` SSE-parsing test

**Files:**
- Create: `src/lib/llm/openrouter.test.ts`

The user's stated pain — "we always forget to make sure new features work with [openrouter]" — calls for a regression test on the existing adapter, not just the new one.

- [ ] **Step 1: Write happy-path streaming test**

```typescript
// src/lib/llm/openrouter.test.ts
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
```

- [ ] **Step 2: Run, verify pass**

Run: `pnpm vitest run src/lib/llm/openrouter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add src/lib/llm/openrouter.test.ts
git commit -m "test(llm): backfill openrouter SSE parsing tests

Pin streamChat happy path + missing-key behavior so future
edits don't silently break the existing OpenRouter integration."
```

---

### Task 6: RouterAI settings UI panel

**Files:**
- Modify: `src/routes/app/settings.tsx`

- [ ] **Step 1: Read the existing `OpenRouterSettings` function (line 28+) for the exact UI pattern**

Run: open `src/routes/app/settings.tsx` and copy the `OpenRouterSettings` function from line 28 to its closing brace (~line 139).

- [ ] **Step 2: Paste the copy directly below `OpenRouterSettings` and rename**

Rename the function and adapt for RouterAI. Concretely:

```typescript
function RouterAISettings() {
  const { toast } = useToast()
  const [apiKey, setApiKey] = useState(() => {
    const stored = settings.routerai.getApiKey()
    return stored ? `sk-****${stored.slice(-4)}` : ""
  })
  const [baseUrl, setBaseUrl] = useState(() => settings.routerai.getBaseUrl())
  const [model, setModel] = useState(() => settings.routerai.getModel())
  const [health, setHealth] = useState<{ ok: boolean; error?: string } | null>(null)
  const [testing, setTesting] = useState(false)

  const handleSave = () => {
    if (!apiKey.startsWith("sk-****")) {
      settings.routerai.setApiKey(apiKey.trim())
    }
    settings.routerai.setBaseUrl(baseUrl.trim())
    settings.routerai.setModel(model.trim())
    toast.success("RouterAI settings saved")
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await routerai.checkHealth()
      setHealth(result)
      if (result.ok) toast.success("RouterAI is reachable")
      else toast.error("RouterAI check failed", result.error || "Unknown error")
    } finally {
      setTesting(false)
    }
  }

  const handleClear = () => {
    settings.routerai.clearApiKey()
    setApiKey("")
    setHealth(null)
    toast.info("RouterAI API key cleared")
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">RouterAI</h2>
      <p className="text-sm text-muted-foreground">
        OpenAI-compatible model gateway. Tenant base URL is configurable.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Base URL</label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://routerai.ru/api/v1"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Default Model</label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="openai/gpt-4o-mini"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave}>Save</Button>
        <Button variant="outline" onClick={handleTest} disabled={testing}>
          {testing ? "Testing..." : "Test Connection"}
        </Button>
        <Button variant="ghost" onClick={handleClear}>
          Clear Key
        </Button>
      </div>

      {health && (
        <p className={`text-sm ${health.ok ? "text-green-600" : "text-destructive"}`}>
          {health.ok ? "Connected" : `Failed: ${health.error}`}
        </p>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Add `routerai` to the existing imports**

At the top of `src/routes/app/settings.tsx`, ensure `routerai` is imported alongside `openrouter`:

```typescript
import * as routerai from "@/lib/llm/routerai"
```

(The `settings` namespace already re-exports both — adjust the existing imports to fit the file's pattern; mirror exactly how `openrouter` and its settings are imported.)

- [ ] **Step 4: Render `<RouterAISettings />` after `<OpenRouterSettings />` (around line 349)**

```tsx
<OpenRouterSettings />
<RouterAISettings />
```

- [ ] **Step 5: Manual smoke test in dev**

```bash
pnpm dev
```

Open `http://localhost:5173/app/settings`. Confirm: RouterAI panel renders, key input accepts value, Save shows toast, Test Connection succeeds with the supplied key against `https://routerai.ru/api/v1`, Clear Key empties storage.

- [ ] **Step 6: Typecheck + commit**

```bash
pnpm typecheck
git add src/routes/app/settings.tsx
git commit -m "feat(settings): add RouterAI configuration panel

API key + tenant base URL + default model + test connection,
mirrored from OpenRouter panel."
```

---

### Task 7: Wire RouterAI into `useBrainstorm`

**Files:**
- Modify: `src/hooks/useBrainstorm.ts` (provider union, `sendMessageRouterAI`, three dispatch sites)

- [ ] **Step 1: Add import**

Near the top alongside the openrouter import:

```typescript
import * as routeraiClient from "@/lib/llm/routerai"
```

- [ ] **Step 2: Extend the `Provider` type (line 65)**

Change:

```typescript
export type Provider = "ollama" | "claude" | "openrouter"
```

to:

```typescript
export type Provider = "ollama" | "claude" | "openrouter" | "routerai"
```

- [ ] **Step 3: Add a session-cost state for RouterAI (alongside openrouterSessionCost at line 194)**

```typescript
const [routeraiSessionCost, setRouteraiSessionCost] = useState(0)
```

- [ ] **Step 4: Add `sendMessageRouterAI` mirroring `sendMessageOpenRouter`**

After the `sendMessageOpenRouter` callback (ends around line 545), add:

```typescript
const sendMessageRouterAI = useCallback(
  async (content: string, conversationHistory: ConversationMessage[]) => {
    const messages: routeraiClient.RouterAIMessage[] = []
    const systemAndMemory = [systemPrompt, renderedMemory].filter(Boolean).join("\n\n")
    if (systemAndMemory) {
      messages.push({ role: "system", content: systemAndMemory + NO_TOOLS_SUFFIX })
    }
    for (const m of conversationHistory) {
      messages.push({ role: m.role, content: m.content })
    }
    messages.push({ role: "user", content })

    const generator = routeraiClient.streamChat(messages, {
      temperature: 0.7,
      signal: abortControllerRef.current?.signal,
    })

    let result: IteratorResult<string, routeraiClient.StreamChatResult>
    while (!(result = await generator.next()).done) {
      appendChunk(result.value)
    }
    const streamResult = result.value
    if (streamResult.model && streamResult.promptTokens && streamResult.completionTokens) {
      const pricing = await routeraiClient.getModelPricing(streamResult.model)
      if (pricing) {
        const cost = routeraiClient.calculateCost(
          streamResult.promptTokens,
          streamResult.completionTokens,
          pricing
        )
        setRouteraiSessionCost((prev) => prev + cost)
      }
    }
    finalizeAssistantMessage(streamResult.text)
  },
  [systemPrompt, renderedMemory, appendChunk, finalizeAssistantMessage]
)
```

(Adjust closure references — `appendChunk`, `finalizeAssistantMessage`, `abortControllerRef` — to whatever names exist in the file. Read the matching `sendMessageOpenRouter` body and mirror the exact helpers it uses.)

- [ ] **Step 5: Extend the three dispatch sites (lines ~600, ~713, ~773)**

In each `if (provider === "ollama") ... else if (provider === "openrouter")` chain, add:

```typescript
        } else if (provider === "routerai") {
          await sendMessageRouterAI(content.trim(), conversationHistory)
```

(Use the appropriate variable name — `content`, `userMessage.content`, `newContent` — for each of the three sites.)

- [ ] **Step 6: Add `routerai` to the "needs-error-suffix" guards (lines ~618, ~728)**

Change each `provider === "ollama" || provider === "openrouter"` to `provider === "ollama" || provider === "openrouter" || provider === "routerai"`.

- [ ] **Step 7: Add `sendMessageRouterAI` and `routeraiSessionCost` to dependency arrays**

Update the relevant `useCallback` dependency arrays (lines 623, 733) to include `sendMessageRouterAI`. Export `routeraiSessionCost` from the hook (mirror how `openrouterSessionCost` is exposed at line 127).

- [ ] **Step 8: Typecheck**

Run: `pnpm typecheck`
Expected: clean. If exhaustiveness warnings show on `Provider` switches elsewhere, fix them — that's the point of the union widening.

- [ ] **Step 9: Add RouterAI to the brainstorm panel provider selector**

Search for the brainstorm provider selector (likely in a `BrainstormPanel` or `BrainstormDialog` component) and add a `routerai` option alongside `openrouter`. The exact JSX depends on whether it's a `<select>` or radio group — mirror the OpenRouter entry.

```tsx
<option value="routerai">RouterAI</option>
```

(Or analogous radio button, depending on the existing pattern.)

- [ ] **Step 10: Commit**

```bash
git add src/hooks/useBrainstorm.ts src/components/  # adjust paths
git commit -m "feat(brainstorm): wire RouterAI provider into useBrainstorm

Adds sendMessageRouterAI, extends Provider union, dispatches in
all three send sites (new, retry, edit), session cost tracking
mirrors OpenRouter."
```

---

### Task 8: Manual end-to-end verification

**Files:** none (live test)

- [ ] **Step 1: Start dev**

```bash
pnpm dev
```

- [ ] **Step 2: Configure RouterAI in Settings**

Open `http://localhost:5173/app/settings`, paste API key `sk-L9rIb3YPavxZEvMsRB686ZRhjiU36skL`, leave base URL at default, leave model at `openai/gpt-4o-mini`. Click Save, then Test Connection. Expected: green "Connected".

- [ ] **Step 3: Run a brainstorm turn against RouterAI**

Open any session, switch the brainstorm provider to RouterAI, send "say pong". Expected: streaming response appears chunk-by-chunk, ends with the assistant turn finalized, session cost label shows a value > 0.

- [ ] **Step 4: Verify retry behavior (optional, only if you have a way to simulate a 502)**

Skip if no proxy available. Otherwise: front the call with mitmproxy and inject a 502, confirm the request retries with ~5 s delay before succeeding.

- [ ] **Step 5: Verify abort works**

Send a long-completion prompt, click Stop mid-stream. Expected: stream terminates immediately, no further chunks, no toast error.

- [ ] **Step 6: Run the full test suite once more**

```bash
pnpm test:run && pnpm typecheck
```

Expected: all green.

- [ ] **Step 7: Update research doc status**

Edit `docs/research/2026-04-18-routerai-integration.md`, change frontmatter `status: research (probed)` to `status: implemented`. Commit:

```bash
git add docs/research/2026-04-18-routerai-integration.md
git commit -m "docs(research): mark routerai-integration as implemented"
```

- [ ] **Step 8: Push**

```bash
git push origin main
```

(Vercel will auto-deploy. Manual VPN deploy is task #57 from the existing tracker; bundle into the next deploy window.)

---

## Self-review

Spec coverage (against research doc):
- ✅ Probe results captured — Phase 2 Task 8 verifies live key
- ✅ retryFetch helper — Phase 1 Task 1
- ✅ OpenRouter hardened with retries — Phase 1 Task 2
- ✅ RouterAI adapter — Phase 2 Task 4
- ✅ Pricing handled (numbers not strings) — Phase 2 Task 4 Step 15
- ✅ Settings UI — Phase 2 Task 6
- ✅ Brainstorm wiring — Phase 2 Task 7
- ✅ Tests for RouterAI adapter — Phase 2 Task 4
- ✅ Tests for OpenRouter (the "stop the rot") — Phase 2 Task 5
- ⚠️ Compression integration — explicitly out of scope per research doc (brainstorm-only v1)
- ⚠️ Formal `LLMProvider` interface — explicitly out of scope per research doc

Placeholder scan: no "TBD"/"add appropriate handling"/"similar to Task N" detected. Each code step shows the actual code.

Type consistency:
- `streamChat` signature: `(messages, options) => AsyncGenerator<string, StreamChatResult>` — used consistently across openrouter/routerai/ollama.
- `RouterAIMessage` defined in Task 4 Step 3 and consumed in Task 7 Step 4.
- `__resetPricingCacheForTests` defined and imported in Task 4 Step 16.
- `routeraiSessionCost` introduced in Task 7 Step 3 and exported in Task 7 Step 7.
- Settings namespace `routerai.{getApiKey, setApiKey, clearApiKey, getBaseUrl, setBaseUrl, getModel, setModel, isConfigured}` defined in Task 3 Step 2 and consumed in Tasks 4, 6, 7.

No gaps found.
