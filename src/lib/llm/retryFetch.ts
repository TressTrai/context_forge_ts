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
  input: string | URL,
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
