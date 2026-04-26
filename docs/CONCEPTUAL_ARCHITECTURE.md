# Conceptual Architecture

A feature-oriented map of ContextForge: what the system can do, and which logical components deliver each capability. For technology stack and code-level decisions, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## What ContextForge Is

A workspace for **structured brainstorming with LLMs**. You compose a context out of typed blocks, organize them into priority zones, and brainstorm with a model that reads exactly that context. The system tracks cost, caches what it can, captures useful turns into memory, and lets you validate work against criteria before declaring it done.

## Logical Components

```
┌──────────────────────────────────────────────────────────────────┐
│                          Workspace                                │
│                                                                   │
│   ┌───────────────┐       ┌──────────────────┐  ┌──────────────┐ │
│   │ Block System  │──────▶│ Context Assembly │  │   Content    │ │
│   │ (14 types,    │       │ (PERMANENT/      │  │  Rendering   │ │
│   │  5 categories)│       │  STABLE/WORKING) │  │  (markdown)  │ │
│   └───────────────┘       └────────┬─────────┘  └──────────────┘ │
│           ▲                        │                              │
│           │                        ▼                              │
│   ┌───────────────┐       ┌──────────────────┐  ┌─────────────┐  │
│   │   Workflows   │       │  Brainstorm      │◀▶│  Providers  │  │
│   └───────┬───────┘       │  Engine          │  │ (4 backends)│  │
│           │               └────────┬─────────┘  └─────────────┘  │
│           ▼                        │                              │
│   ┌───────────────┐                │                              │
│   │ Entry         │                │                              │
│   │ Questions     │                │                              │
│   └───────────────┘                │                              │
│                ┌───────────────────┼─────────────────┐            │
│                ▼                   ▼                 ▼            │
│        ┌───────────────┐  ┌────────────────┐ ┌──────────────┐    │
│        │ Project       │  │ Validation     │ │ Research     │    │
│        │ Memory        │  │ Mode           │ │ Blocks       │    │
│        └───────────────┘  └────────────────┘ └──────────────┘    │
│                                                                   │
│   Cross-cutting: Self-Talk Detection · Session Resume · Compression │
│                  Duplicate Detection · Auth UX                    │
└──────────────────────────────────────────────────────────────────┘
```

## Block System

The atomic unit. Every piece of context is a **typed block** with a title, body, zone, and metadata.

**14 types across 5 categories:**

| Category | Types |
|----------|-------|
| **Core** | `system_prompt`, `note`, `code` |
| **Document** | `guideline`, `template`, `reference`, `document` |
| **Conversation** | `user_message`, `assistant_message`, `instruction` |
| **Meta** | `entry_brief`, `persona`, `framework` |
| **Skill** | `skill` |

Type drives default zone, icon, formatting, and how the assembler renders the block in the prompt. Blocks support drafts, linking (compose blocks from other blocks), and import/export through context-maps and SKILL.md files.

## Context Assembly

Blocks live in one of three **priority zones** that map to a token budget:

| Zone | Budget | Purpose |
|------|--------|---------|
| **PERMANENT** | 30K | Identity, hard constraints — included verbatim every turn |
| **STABLE** | 50K | Project knowledge that rarely changes — cached aggressively |
| **WORKING** | 40K | The active conversation, scratch notes — invalidated freely |

Total 150K against a ~160K compaction threshold. The assembler renders zones in order, applies anti-self-talk framing, and emits a single prompt that the brainstorm engine sends to the provider. See [CONTEXT_OPTIMIZATION_AND_CACHING.md](./CONTEXT_OPTIMIZATION_AND_CACHING.md).

## LLM Providers

Four backends, two delivery models:

| Provider | Mode | Notes |
|----------|------|-------|
| **Claude Code** | Convex action (Agent SDK subprocess) | Subscription auth, no API key, supports session resume |
| **Ollama** | Convex action (HTTP) | Local models, no cost tracking |
| **OpenRouter** | Browser-direct BYOK | Key in `localStorage`, retry with exponential backoff |
| **RouterAI** | Browser-direct BYOK | Key in `localStorage`, pricing read from `/models` |

OpenRouter and RouterAI are duck-typed siblings — same SSE wire shape, different vendor. Streaming, cost tracking, and abort handling work uniformly.

## Brainstorm Engine

The turn loop. Takes the assembled context plus the user's new message, opens a stream against the chosen provider, renders tokens as they arrive, tracks cost, and persists the final assistant message back as a block. Supports stop-generation mid-stream and captures provider-reported usage for the cost UI.

## Project Memory ✅

Long-lived per-project memory that survives across sessions. Each entry is **tagged**; the brainstorm engine scores entries against the current session's tags and surfaces relevant ones in a bottom drawer. Pinned entries always show. Schema templates make it cheap to capture recurring shapes (decisions, facts, gotchas). Entries can be created from a turn's output via "save to memory."

This is the answer to "the model forgot what we agreed last week." Memory is the system's institutional knowledge layer, distinct from the ephemeral WORKING zone.

## Validation Mode ✅

A purpose-built turn type: instead of "continue the brainstorm," the model **critiques the current state against explicit criteria**. The criteria can be drafted with LLM assistance, then locked in. Validation outputs are first-class — they can be saved to memory, converted into follow-up tasks, or discarded.

This closes the loop on "is this done?" Brainstorming generates options; validation mode tests them against the bar you set.

## Research Blocks

Blocks whose body is generated by a research agent rather than typed by hand. Web research runs through the Claude Agent SDK's web-search tool. Local filesystem research is gated behind a `LOCAL_RESEARCH_ENABLED` flag. The output lands as a normal block (typically `reference` or `document`) and joins the context like any other.

## Workflows

A workflow is a sequence of brainstorm steps with a defined goal. Steps carry a name, description, and ordering; advancing a step transitions the workspace into the next configured context. Workflows are the unit of "what are we doing right now" — distinct from a single brainstorm session, which is the unit of "what did we say."

## Entry Questions

A per-step prompt set: when the user enters a workflow step, the configured questions render in a dialog and the answers are captured into an `entry_brief` block in the STABLE zone *before* the model runs the first turn. This forces upfront framing, keeps the brief in cache for the whole step, and gives every later turn the same shared premise.

Entry Questions are deliberately a separate component from the Workflows engine itself — workflow steps work without them; questions add structured intake on top.

## Content Rendering

The visual layer for block bodies and assistant output. Renders markdown to HTML with syntax-highlighted code fences, GFM tables, task lists, and inline links. Used uniformly by the block editor preview, the brainstorm transcript, and memory entries — so what you see while editing matches what the model sees rendered back.

Treated as a separate component because the same rendering pipeline is consumed in three independent surfaces (block view, stream output, memory drawer); centralising it keeps formatting consistent and makes additions (e.g. mermaid, math) one-place changes.

## Self-Talk Detection

A streaming detector that watches for hallucinated role markers (`Human:`, `Assistant:`) in the model's output and aborts the stream the moment one appears. Prevents the classic "model continues the conversation as both sides" failure that wastes tokens and corrupts the saved transcript.

## Session Resume + Prompt Caching

For Claude Code turns, the engine captures the SDK `session_id` after turn 1 and resumes it on turn 2+, sending only the new message. The provider re-uses cached PERMANENT/STABLE content, cutting per-turn cost by ~90%. Any change to a PERMANENT or STABLE block invalidates the saved session ID, so the next turn starts fresh and re-caches.

## Compression

When WORKING approaches its budget, a compression strategy condenses older turns into a summary block. Strategies are pluggable: low-temp summarization via OpenRouter is the default, with Claude Code and Ollama as fallbacks. See [features/compression/](./features/compression/).

## Settings + Auth

Per-provider settings live in `localStorage` under namespaced keys (`openrouter.*`, `routerai.*`, `ollama.*`). The settings UI exposes API key entry, base URL (where applicable), default model, and a health check. Auth for Claude Code rides on the user's local Claude subscription — no key configuration in-app.

## How It Fits Together: A Typical Turn

1. User opens a workflow step → entry questions render → answers persisted as an `entry_brief` block (STABLE).
2. User types a message → assembler builds the prompt from PERMANENT + STABLE + WORKING zones, plus relevant memory entries.
3. Brainstorm engine streams against the chosen provider; self-talk detector watches the stream.
4. Tokens render live; final assistant message persists as an `assistant_message` block.
5. User can: save the turn into memory, kick off validation against criteria, spawn a research block, or continue brainstorming.
6. Next turn: if Claude Code and no PERMANENT/STABLE block changed, resume the session — only the new message goes over the wire.

## Status at a Glance

| Capability | Status |
|------------|--------|
| Block system (14 types, 5 categories) | ✅ Shipped |
| Context assembly + zones | ✅ Shipped |
| Four providers (Claude Code, Ollama, OpenRouter, RouterAI) | ✅ Shipped |
| Brainstorm streaming + cost tracking | ✅ Shipped |
| Project Memory (tagged, scored, pinned) | ✅ Shipped |
| Validation Mode | ✅ Shipped |
| Research blocks (web) | ✅ Shipped |
| Research blocks (local FS, flag-gated) | 🚧 Behind flag |
| Workflows | ✅ Shipped |
| Entry Questions (per-step intake → `entry_brief`) | ✅ Shipped |
| Content Rendering (markdown, code highlighting, GFM) | ✅ Shipped |
| Duplicate Detection (`contentHash`, template-source aware) | ✅ Shipped |
| Auth UX (per-field validation, error mapping, password toggle) | ✅ Shipped |
| Self-talk detection | ✅ Shipped |
| Claude SDK session resume | ✅ Shipped |
| Compression (semantic) | ✅ Shipped |
| Drafts, linked blocks, context-map import/export, SKILL.md import | ✅ Shipped |

For the technology stack, file layout, and lower-level patterns, continue to [ARCHITECTURE.md](./ARCHITECTURE.md).

