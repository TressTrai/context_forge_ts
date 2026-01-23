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
} as const

// Default values
const DEFAULTS = {
  OPENROUTER_MODEL: "anthropic/claude-sonnet-4",
  OLLAMA_URL: "http://localhost:11434",
  OLLAMA_MODEL: "llama3.2:latest",
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
 * Export all settings for debugging/testing
 */
export function getAllSettings(): Record<string, string | null> {
  return {
    openrouterApiKey: openrouter.getApiKey() ? "[CONFIGURED]" : null,
    openrouterModel: openrouter.getModel(),
    ollamaUrl: ollama.getUrl(),
    ollamaModel: ollama.getModel(),
  }
}

/**
 * Clear all LLM settings
 */
export function clearAllSettings(): void {
  Object.values(KEYS).forEach((key) => localStorage.removeItem(key))
}
