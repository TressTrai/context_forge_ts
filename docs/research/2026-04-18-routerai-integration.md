---
date: 2026-04-18
status: research (probed)
related:
  - /home/newub/w/co/univer/subd/docs/research/2026-04-18-routerai-adapter.md (reference adapter from safe-llm pilot)
---

# Adding RouterAI as a third LLM provider

## Probe results (2026-04-18, tenant: `https://routerai.ru/api/v1`)

Three live probes against the supplied key:

- **Auth + `/models`** — HTTP 200, ~2.2 s, returns `{ data: [...354 models...] }`.
- **CORS preflight** from `Origin: https://contextforgets.com` — HTTP 204, `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Headers: Authorization, Content-Type, Accept, X-Requested-With`. **Browser-direct calls work; no Convex proxy needed.** Architecture matches OpenRouter exactly.
- **Streaming chat** (`openai/gpt-4o-mini`) — SSE format byte-identical to OpenRouter: `data: {chunk}\n\n` lines, `[DONE]` terminator, final chunk carries `usage: { prompt_tokens, completion_tokens, total_tokens }`. Each chunk also carries a `provider` field (e.g. `"OpenAI"`) — extra metadata, harmless.
- **Pricing IS available** on the `/models` endpoint as numbers (already $/token, not strings as OpenRouter returns). The reference doc's "no pricing endpoint" warning does not apply to this tenant. Cost tracking works out of the box; we just skip the `parseFloat()` step.

**Net effect: the wire shape is so close to OpenRouter that the adapter really is a near-clone, and there are no architectural surprises.** The CORS unknown that was the biggest open question is resolved positively.

## Goal

Add [RouterAI](https://routerai.com) alongside the existing OpenRouter and Ollama providers. RouterAI is another OpenAI-compatible model gateway (DeepSeek, Qwen, GPT-proxy, etc.) — same wire shape as OpenRouter, different vendor.

Secondary goal — and probably the more important one — is to **stop the "alt providers silently rot" problem**. Today OpenRouter is "poorly tested and we always forget to make sure new features work with it." Adding a third provider without addressing this guarantees the same fate.

## Current state

Three call sites use the LLM providers:

- `src/hooks/useBrainstorm.ts:462` — `sendMessageOpenRouter()` (cost-tracked streaming)
- `src/lib/compression/strategies/semantic.ts:108` — `compressWithOpenRouter()` (low-temp summarisation)
- `src/routes/app/settings.tsx:28` — `OpenRouterSettings()` UI (key + model + health check)

Provider modules at `src/lib/llm/`:
- `openrouter.ts` — fetch + SSE streaming, pricing cache from `/models`, key in localStorage
- `ollama.ts` — same shape, native `/api/chat`, no pricing
- `settings.ts` — per-provider localStorage namespace

There is **no shared interface**. Modules are duck-typed: `streamChat()` returns `AsyncGenerator<string, StreamChatResult>` in both, but TS can't enforce that. The compression strategy at `compressionService.ts:64` auto-falls-back via `settings.openrouter.isConfigured()`.

## RouterAI vs OpenRouter — what actually differs

Almost nothing on the wire (both are OpenAI-compatible `/chat/completions`). The differences that matter:

| Concern | OpenRouter | RouterAI |
|---|---|---|
| Base URL | `https://openrouter.ai/api/v1` (constant) | tenant-specific, env var (`ROUTERAI_BASE_URL`) — **must be user-configurable** |
| Auth header | `Bearer <key>` | `Bearer <key>` |
| Vanity headers | `HTTP-Referer`, `X-Title` (encouraged for attribution) | none required |
| Model namespace | `provider/model` | `provider/model` |
| Pricing endpoint | `/models` returns pricing as strings → cost UI works | `/models` returns pricing as **numbers** (already $/token) — works, just don't `parseFloat` |
| Streaming SSE | yes, identical format | yes, identical format |
| Failure modes | 429/5xx; client retries already exist via `fetch` errors bubbling | **502s observed during 2026-04-17 outage**, reference adapter does 5-attempt exponential backoff (5/10/20/40/80 s) — our `openrouter.ts` does **none** |

The reference doc's biggest takeaway is the retry policy. Our `openrouter.ts` has no retry — a single 502 throws to the caller. Worth fixing for both providers when we add the third.

## Proposed adapter

A near-clone of `openrouter.ts`. Estimated 250 LOC, mostly mechanical:

```
src/lib/llm/routerai.ts        # streamChat, checkHealth, listModels(?)
src/lib/llm/settings.ts        # add `routerai` namespace: apiKey, baseUrl, model
src/routes/app/settings.tsx    # RouterAISettings() — key + base URL + model + test
src/hooks/useBrainstorm.ts     # add sendMessageRouterAI() branch
src/lib/compression/strategies/semantic.ts   # add compressWithRouterAI()
src/lib/compression/compressionService.ts    # extend CompressionProvider type + selector
```

Pricing: reuse the OpenRouter `/models` cache pattern. The only adjustment is dropping `parseFloat()` since RouterAI returns numbers directly. Cost tracking works on day one.

Retry: factor a tiny `retryFetch(url, init, { attempts, base })` helper into `src/lib/llm/util.ts` and use it in **both** RouterAI and OpenRouter. Reference policy (5 attempts, 5/10/20/40/80 s) is fine; cap total wall time at ~2.5 min.

## Provider abstraction — do it now or punt?

Adding a third sibling makes the duck-typed pattern smell. Options:

- **Punt.** Copy the openrouter pattern again, three modules with matching signatures, no interface. Cheapest path. Risk: divergence accumulates, future refactor is harder.
- **Extract a `LLMProvider` interface now** (`streamChat`, `checkHealth`, optional `listModels`, optional `getPricing`). Force all three modules through it. Adds ~30 LOC of types but makes "did we test the new feature against every provider?" mechanical (loop the registry).

Recommendation: **extract the interface as part of this work**. The "always forget to test against alt providers" pain is exactly what a registry solves — write feature code against `provider: LLMProvider` and the alt-provider testing question becomes a `for (const p of providers)` loop in tests.

## Testing — the actual important part

Today: zero OpenRouter-specific tests. Adding RouterAI without a test pattern just doubles the silent-rot surface.

Minimum proposed:

- **Adapter unit tests** with `msw` (mock service worker) hitting fake `/chat/completions`. Cover: happy path, SSE stream parsing (the buffer-split logic at `openrouter.ts:166-192` has subtle edge cases — empty lines, `[DONE]`, partial chunks across reads), 429 retry, 5xx retry, 4xx no-retry, abort signal.
- **Provider parametrised contract test** — once the interface exists, one test file iterates all registered providers against a mocked backend and asserts identical observable behaviour (streaming yields, final usage shape, error wrapping).
- **One brainstorm e2e** in `e2e/brainstorm.spec.ts` per provider, gated by a feature flag so CI without keys skips it. Hit a cheap model (`google/gemini-flash-1.5` on OpenRouter, equivalent on RouterAI), single short turn.

This addresses the user's stated pain directly. Without it, RouterAI rots within a release cycle.

## Open questions (post-probe)

- **Compression: does it need RouterAI?** Compression already auto-prefers OpenRouter when configured. Adding RouterAI means a 3-way preference. Simpler: keep compression on `claude-code | ollama | openrouter`, leave RouterAI brainstorm-only for v1, expand if asked.
- **Default model.** OpenRouter defaults to `anthropic/claude-sonnet-4`. RouterAI's catalog leans heavily Russian/Chinese (Qwen, DeepSeek, GLM); the OpenAI/Anthropic models are present but proxied. Pick a sensible default — `openai/gpt-4o-mini` is a good cheap probe target, `deepseek/deepseek-v3.2` is a strong cost/quality default per the reference doc.
- **`provider` field per chunk.** RouterAI tags every chunk with the upstream provider (`"OpenAI"`, `"DeepSeek"`, etc.). Could surface this in the cost UI ("via OpenAI") to make routing transparent. Nice-to-have, not blocking.
- **Russian model descriptions.** The `/models` endpoint returns `description` in Russian. If we ever surface descriptions in the model picker, this matters; today we only show `id` + `name`, so it doesn't.

## Recommendation

Three-step rollout, each independently shippable:

- **Step 1** — Extract `LLMProvider` interface, refactor existing OpenRouter + Ollama modules through it, add the `retryFetch` helper, write the adapter unit-test harness with `msw`. No user-visible change. Backfills the test gap.
- **Step 2** — Add `routerai.ts` + settings + UI + brainstorm wiring behind the new interface. CORS probe first; if blocked, route via Convex action and adjust settings storage.
- **Step 3** — (Optional) extend compression to RouterAI; add provider-parametrised e2e.

Steps 1 and 2 are the meat. Step 3 only if usage data shows people want it.

## Out of scope

- Tool calling, JSON mode, prompt caching — none of the existing providers use these in this codebase.
- Backend-side per-user key storage. Current localStorage model is fine for a single-tenant developer tool; revisit if/when ContextForge becomes multi-user SaaS.
- Streaming for the Claude provider (it's polling-based by design — backend session-resume requires it).
