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
})
