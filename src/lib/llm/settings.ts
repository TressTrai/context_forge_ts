/**
 * LLM provider settings management.
 * Stores API keys and endpoints in localStorage (client-side only).
 */

// localStorage keys
const KEYS = {
  OPENROUTER_API_KEY: "contextforge-openrouter-api-key",
  OPENROUTER_MODEL: "contextforge-openrouter-model",
  OLLAMA_URL: "contextforge-ollama-url",
  OLLAMA_MODEL: "contextforge-ollama-model",
  COMPRESSION_PROVIDER: "contextforge-compression-provider",
  BRAINSTORM_PROVIDER: "contextforge-brainstorm-provider",
  BRAINSTORM_MODEL: "contextforge-brainstorm-model",
  ROUTERAI_API_KEY: "contextforge-routerai-api-key",
  ROUTERAI_BASE_URL: "contextforge-routerai-base-url",
  ROUTERAI_MODEL: "contextforge-routerai-model",
} as const

// Compression provider types
export type CompressionProvider = "claude-code" | "ollama" | "openrouter" | "routerai"

// Default values
const DEFAULTS = {
  OPENROUTER_MODEL: "anthropic/claude-sonnet-4",
  OLLAMA_URL: "http://localhost:11434",
  OLLAMA_MODEL: "llama3.2:latest",
  COMPRESSION_PROVIDER: "claude-code" as CompressionProvider,
  ROUTERAI_BASE_URL: "https://routerai.ru/api/v1",
  ROUTERAI_MODEL: "openai/gpt-4o-mini",
} as const

/**
 * OpenRouter settings
 */
export const openrouter = {
  getApiKey(): string | null {
    return localStorage.getItem(KEYS.OPENROUTER_API_KEY)
  },

  setApiKey(key: string): void {
    localStorage.setItem(KEYS.OPENROUTER_API_KEY, key)
  },

  clearApiKey(): void {
    localStorage.removeItem(KEYS.OPENROUTER_API_KEY)
  },

  getModel(): string {
    return localStorage.getItem(KEYS.OPENROUTER_MODEL) || DEFAULTS.OPENROUTER_MODEL
  },

  setModel(model: string): void {
    localStorage.setItem(KEYS.OPENROUTER_MODEL, model)
  },

  isConfigured(): boolean {
    return !!this.getApiKey()
  },
}

/**
 * Ollama settings
 */
export const ollama = {
  getUrl(): string {
    return localStorage.getItem(KEYS.OLLAMA_URL) || DEFAULTS.OLLAMA_URL
  },

  setUrl(url: string): void {
    localStorage.setItem(KEYS.OLLAMA_URL, url)
  },

  getModel(): string {
    return localStorage.getItem(KEYS.OLLAMA_MODEL) || DEFAULTS.OLLAMA_MODEL
  },

  setModel(model: string): void {
    localStorage.setItem(KEYS.OLLAMA_MODEL, model)
  },
}

/**
 * Compression provider settings
 */
export const compression = {
  getProvider(): CompressionProvider {
    const provider = localStorage.getItem(KEYS.COMPRESSION_PROVIDER) as CompressionProvider | null
    return provider || DEFAULTS.COMPRESSION_PROVIDER
  },

  setProvider(provider: CompressionProvider): void {
    localStorage.setItem(KEYS.COMPRESSION_PROVIDER, provider)
  },
}

/**
 * Brainstorm provider/model preference
 */
export const brainstorm = {
  getProvider(): string {
    return localStorage.getItem(KEYS.BRAINSTORM_PROVIDER) || "claude"
  },

  setProvider(provider: string): void {
    localStorage.setItem(KEYS.BRAINSTORM_PROVIDER, provider)
  },

  getModel(): string | null {
    return localStorage.getItem(KEYS.BRAINSTORM_MODEL)
  },

  setModel(model: string | null): void {
    if (model) {
      localStorage.setItem(KEYS.BRAINSTORM_MODEL, model)
    } else {
      localStorage.removeItem(KEYS.BRAINSTORM_MODEL)
    }
  },
}

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

/**
 * Export all settings for debugging/testing
 */
export function getAllSettings(): Record<string, string | null> {
  return {
    openrouterApiKey: openrouter.getApiKey() ? "[CONFIGURED]" : null,
    openrouterModel: openrouter.getModel(),
    ollamaUrl: ollama.getUrl(),
    ollamaModel: ollama.getModel(),
    compressionProvider: compression.getProvider(),
    routeraiApiKey: routerai.getApiKey() ? "[CONFIGURED]" : null,
    routeraiBaseUrl: routerai.getBaseUrl(),
    routeraiModel: routerai.getModel(),
  }
}

/**
 * Clear all LLM settings
 */
export function clearAllSettings(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key))
}
