/**
 * Client-side LLM modules.
 *
 * These modules call LLM providers directly from the browser:
 * - OpenRouter: requires API key in localStorage
 * - Ollama: requires CORS-enabled Ollama server
 *
 * Usage:
 * ```typescript
 * import { openrouter, ollama, context, settings } from "@/lib/llm"
 *
 * // Configure settings
 * settings.openrouter.setApiKey("sk-...")
 * settings.ollama.setUrl("http://localhost:11434")
 *
 * // Assemble context
 * const messages = context.assembleContext(blocks, userPrompt)
 *
 * // Stream from OpenRouter
 * for await (const chunk of openrouter.streamChat(messages)) {
 *   console.log(chunk)
 * }
 *
 * // Stream from Ollama
 * for await (const chunk of ollama.streamChat(messages)) {
 *   console.log(chunk)
 * }
 * ```
 */

export * as openrouter from "./openrouter"
export * as ollama from "./ollama"
export * as context from "./context"
export * as settings from "./settings"

// Re-export commonly used types
export type { ContextMessage, ConversationMessage, Block } from "./context"
export type { StreamChatOptions as OpenRouterOptions, StreamChatResult as OpenRouterResult } from "./openrouter"
export type { StreamChatOptions as OllamaOptions, StreamChatResult as OllamaResult } from "./ollama"
