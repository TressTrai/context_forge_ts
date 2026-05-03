/**
 * Settings page for configuring LLM providers.
 */

import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { DebouncedButton } from "@/components/ui/debounced-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { openrouter, ollama, routerai } from "@/lib/llm"
import { openrouter as openrouterSettings, ollama as ollamaSettings, compression as compressionSettings, routerai as routeraiSettings, type CompressionProvider } from "@/lib/llm/settings"
import { github as githubSettings, gitlab as gitlabSettings } from "@/lib/git-export/settings"
import { checkConnection as ghCheckConnection } from "@/lib/git-export/github"
import { checkConnection as glCheckConnection } from "@/lib/git-export/gitlab"

// Provider health status
interface ProviderStatus {
  checking: boolean
  ok: boolean
  error?: string
  model?: string
}

// Helper to get initial masked API key
function getInitialApiKeyDisplay(): string {
  const key = openrouterSettings.getApiKey()
  return key ? "sk-****" + key.slice(-4) : ""
}

function OpenRouterSettings() {
  const [apiKey, setApiKey] = useState(getInitialApiKeyDisplay)
  const [model, setModel] = useState(() => openrouterSettings.getModel())
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<ProviderStatus>({ checking: false, ok: false })

  const handleSave = () => {
    if (apiKey && !apiKey.startsWith("sk-****")) {
      openrouterSettings.setApiKey(apiKey)
    }
    openrouterSettings.setModel(model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setStatus({ checking: true, ok: false })
    const result = await openrouter.checkHealth()
    setStatus({
      checking: false,
      ok: result.ok,
      error: result.error,
      model: result.model,
    })
  }

  const handleClear = () => {
    openrouterSettings.clearApiKey()
    setApiKey("")
    setStatus({ checking: false, ok: false })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">OpenRouter</h3>
          <p className="text-sm text-muted-foreground">
            Access Claude, GPT-4, Llama, and 100+ models via unified API
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.ok && (
            <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
          )}
          {status.error && (
            <span className="text-sm text-red-600 dark:text-red-400">{status.error}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="openrouter-key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="openrouter-key"
              type="password"
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              openrouter.ai/keys
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openrouter-model">Model</Label>
          <Input
            id="openrouter-model"
            placeholder="anthropic/claude-sonnet-4"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            See{" "}
            <a
              href="https://openrouter.ai/models"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              available models
            </a>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <DebouncedButton onClick={handleSave} disabled={!apiKey} debounceMs={500}>
          {saved ? "Saved!" : "Save"}
        </DebouncedButton>
        <Button variant="outline" onClick={handleTest} disabled={status.checking}>
          {status.checking ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}

function RouterAISettings() {
  const [apiKey, setApiKey] = useState(() => {
    const stored = routeraiSettings.getApiKey()
    return stored ? "sk-****" + stored.slice(-4) : ""
  })
  const [baseUrl, setBaseUrl] = useState(() => routeraiSettings.getBaseUrl())
  const [model, setModel] = useState(() => routeraiSettings.getModel())
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<ProviderStatus>({ checking: false, ok: false })

  const handleSave = () => {
    if (apiKey && !apiKey.startsWith("sk-****")) {
      routeraiSettings.setApiKey(apiKey)
    }
    routeraiSettings.setBaseUrl(baseUrl)
    routeraiSettings.setModel(model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setStatus({ checking: true, ok: false })
    const result = await routerai.checkHealth()
    setStatus({
      checking: false,
      ok: result.ok,
      error: result.error,
      model: result.model,
    })
  }

  const handleClear = () => {
    routeraiSettings.clearApiKey()
    setApiKey("")
    setStatus({ checking: false, ok: false })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">RouterAI</h3>
          <p className="text-sm text-muted-foreground">
            OpenAI-compatible model gateway with configurable tenant base URL
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.ok && (
            <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
          )}
          {status.error && (
            <span className="text-sm text-red-600 dark:text-red-400">{status.error}</span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="routerai-key">API Key</Label>
          <div className="flex gap-2">
            <Input
              id="routerai-key"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="routerai-base-url">Base URL</Label>
          <Input
            id="routerai-base-url"
            placeholder="https://routerai.ru/api/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Default: https://routerai.ru/api/v1
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="routerai-model">Model</Label>
          <Input
            id="routerai-model"
            placeholder="openai/gpt-4o-mini"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <DebouncedButton onClick={handleSave} disabled={!apiKey} debounceMs={500}>
          {saved ? "Saved!" : "Save"}
        </DebouncedButton>
        <Button variant="outline" onClick={handleTest} disabled={status.checking}>
          {status.checking ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}

function OllamaSettings() {
  const [url, setUrl] = useState(() => ollamaSettings.getUrl())
  const [model, setModel] = useState(() => ollamaSettings.getModel())
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<ProviderStatus>({ checking: false, ok: false })

  const handleSave = () => {
    ollamaSettings.setUrl(url)
    ollamaSettings.setModel(model)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    setStatus({ checking: true, ok: false })
    const result = await ollama.checkHealth()
    setStatus({
      checking: false,
      ok: result.ok,
      error: result.error,
      model: result.model,
    })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Ollama</h3>
          <p className="text-sm text-muted-foreground">
            Run LLMs locally on your machine or network
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.ok && (
            <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
          )}
          {status.error && (
            <span className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
              {status.error}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="ollama-url">Server URL</Label>
          <Input
            id="ollama-url"
            placeholder="http://localhost:11434"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Default: http://localhost:11434. For network access, use your machine's IP address.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ollama-model">Model</Label>
          <Input
            id="ollama-model"
            placeholder="llama3.2:latest"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Run <code className="bg-muted px-1 rounded">ollama list</code> to see available models
          </p>
        </div>

        <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>CORS Required:</strong> To access Ollama from a browser, start it with:
          </p>
          <code className="block mt-1 text-xs bg-amber-100 dark:bg-amber-900/50 px-2 py-1 rounded">
            OLLAMA_ORIGINS="*" ollama serve
          </code>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <DebouncedButton onClick={handleSave} debounceMs={500}>
          {saved ? "Saved!" : "Save"}
        </DebouncedButton>
        <Button variant="outline" onClick={handleTest} disabled={status.checking}>
          {status.checking ? "Testing..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}

function ClaudeCodeSettings() {
  return (
    <div className="rounded-lg border border-border p-6 space-y-4 opacity-60">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Claude Code</h3>
          <p className="text-sm text-muted-foreground">
            Use Claude via local Claude Code CLI
          </p>
        </div>
        <span className="text-sm text-muted-foreground">Backend Only</span>
      </div>

      <p className="text-sm text-muted-foreground">
        Claude Code runs on the backend and requires the Claude CLI to be installed.
        No configuration needed here.
      </p>
    </div>
  )
}

function CompressionProviderSettings() {
  const [provider, setProvider] = useState<CompressionProvider>(() => compressionSettings.getProvider())
  const [saved, setSaved] = useState(false)

  const handleProviderChange = (value: CompressionProvider) => {
    setProvider(value)
    compressionSettings.setProvider(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const providers: Array<{ value: CompressionProvider; label: string; description: string }> = [
    {
      value: "claude-code",
      label: "Claude Code (Recommended)",
      description: "Uses Claude Code CLI on the backend (fastest, most reliable)",
    },
    {
      value: "openrouter",
      label: "OpenRouter",
      description: "Uses OpenRouter API (requires API key configuration above)",
    },
    {
      value: "ollama",
      label: "Ollama",
      description: "Uses local Ollama server (requires Ollama setup above)",
    },
  ]

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Compression Provider</h3>
        <p className="text-sm text-muted-foreground">
          Choose which LLM provider to use for block compression
        </p>
      </div>

      <div className="space-y-3">
        <Label>Provider</Label>
        {providers.map((p) => (
          <div key={p.value} className="flex items-start space-x-3">
            <input
              type="radio"
              id={`provider-${p.value}`}
              name="compression-provider"
              value={p.value}
              checked={provider === p.value}
              onChange={(e) => handleProviderChange(e.target.value as CompressionProvider)}
              className="mt-1"
            />
            <div className="flex-1">
              <label
                htmlFor={`provider-${p.value}`}
                className="text-sm font-medium cursor-pointer"
              >
                {p.label}
              </label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {saved && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Compression provider saved!
        </p>
      )}
    </div>
  )
}

function GitHubSettings() {
  const [pat, setPat] = useState(() => {
    const stored = githubSettings.getPat()
    return stored ? "ghp_****" + stored.slice(-4) : ""
  })
  const [repoUrl, setRepoUrl] = useState(() => githubSettings.getDefaultRepoUrl())
  const [folder, setFolder] = useState(() => githubSettings.getDefaultFolder())
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<ProviderStatus>({ checking: false, ok: false })

  const handleSave = () => {
    if (pat && !pat.startsWith("ghp_****")) {
      githubSettings.setPat(pat)
    }
    githubSettings.setDefaultRepoUrl(repoUrl)
    githubSettings.setDefaultFolder(folder)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    const currentPat = pat.startsWith("ghp_****") ? githubSettings.getPat() : pat
    if (!currentPat) return
    setStatus({ checking: true, ok: false })
    try {
      const { login } = await ghCheckConnection(currentPat)
      setStatus({ checking: false, ok: true, model: login })
    } catch (e) {
      setStatus({ checking: false, ok: false, error: String(e) })
    }
  }

  const handleClear = () => {
    githubSettings.clearPat()
    setPat("")
    setStatus({ checking: false, ok: false })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">GitHub</h3>
          <p className="text-sm text-muted-foreground">
            Export project results to a GitHub repository for team review
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.ok && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Connected as {status.model}
            </span>
          )}
          {status.error && (
            <span className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
              {status.error}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="github-pat">Personal Access Token</Label>
          <div className="flex gap-2">
            <Input
              id="github-pat"
              type="password"
              placeholder="ghp_..."
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
          <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How to get a token:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Go to{" "}
                <span className="font-mono bg-muted px-1 rounded">
                  github.com → Settings → Developer settings → Personal access tokens → Tokens (classic)
                </span>
              </li>
              <li>Click <span className="font-medium">Generate new token (classic)</span></li>
              <li>
                Select the{" "}
                <code className="bg-muted px-1 rounded font-mono">repo</code>{" "}
                scope — required for both private and public repositories
              </li>
              <li>Copy the token — it is shown only once</li>
            </ol>
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              Use <span className="font-mono">Tokens (classic)</span>, not Fine-grained tokens
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="github-repo">Default Repository URL</Label>
          <Input
            id="github-repo"
            placeholder="https://github.com/your-org/project-reviews"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="github-folder">Default Folder in Repo</Label>
          <Input
            id="github-folder"
            placeholder="team-reviews/q2"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Optional. Leave empty to put files in repo root.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <DebouncedButton onClick={handleSave} disabled={!pat} debounceMs={500}>
          {saved ? "Saved!" : "Save"}
        </DebouncedButton>
        <Button variant="outline" onClick={handleTest} disabled={status.checking || !pat}>
          {status.checking ? "Checking..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}

function GitLabSettings() {
  const [pat, setPat] = useState(() => {
    const stored = gitlabSettings.getPat()
    return stored ? "glpat-****" + stored.slice(-4) : ""
  })
  const [instanceUrl, setInstanceUrl] = useState(() => gitlabSettings.getInstanceUrl())
  const [repoUrl, setRepoUrl] = useState(() => gitlabSettings.getDefaultRepoUrl())
  const [folder, setFolder] = useState(() => gitlabSettings.getDefaultFolder())
  const [saved, setSaved] = useState(false)
  const [status, setStatus] = useState<ProviderStatus>({ checking: false, ok: false })

  const handleSave = () => {
    if (pat && !pat.startsWith("glpat-****")) {
      gitlabSettings.setPat(pat)
    }
    gitlabSettings.setInstanceUrl(instanceUrl)
    gitlabSettings.setDefaultRepoUrl(repoUrl)
    gitlabSettings.setDefaultFolder(folder)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleTest = async () => {
    const currentPat = pat.startsWith("glpat-****") ? gitlabSettings.getPat() : pat
    if (!currentPat) return
    setStatus({ checking: true, ok: false })
    try {
      const { login } = await glCheckConnection(currentPat, instanceUrl)
      setStatus({ checking: false, ok: true, model: login })
    } catch (e) {
      setStatus({ checking: false, ok: false, error: String(e) })
    }
  }

  const handleClear = () => {
    gitlabSettings.clearPat()
    setPat("")
    setStatus({ checking: false, ok: false })
  }

  return (
    <div className="rounded-lg border border-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">GitLab</h3>
          <p className="text-sm text-muted-foreground">
            Export project results to a GitLab repository for team review
          </p>
        </div>
        <div className="flex items-center gap-2">
          {status.ok && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Connected as {status.model}
            </span>
          )}
          {status.error && (
            <span className="text-sm text-red-600 dark:text-red-400 max-w-xs truncate">
              {status.error}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="gitlab-pat">Personal Access Token</Label>
          <div className="flex gap-2">
            <Input
              id="gitlab-pat"
              type="password"
              placeholder="glpat-..."
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" size="sm" onClick={handleClear}>
              Clear
            </Button>
          </div>
          <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">How to get a token:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Go to{" "}
                <span className="font-mono bg-muted px-1 rounded">
                  gitlab.com → top-right avatar → Edit profile → Access Tokens
                </span>
              </li>
              <li>Click <span className="font-medium">Add new token</span></li>
              <li>
                Select scope{" "}
                <code className="bg-muted px-1 rounded font-mono">api</code>
                {" "}— required for reading and writing files
              </li>
              <li>Copy the token — it is shown only once</li>
            </ol>
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              For self-hosted GitLab — use your instance URL in the field below, the steps are the same
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gitlab-instance">Instance URL</Label>
          <Input
            id="gitlab-instance"
            placeholder="https://gitlab.com"
            value={instanceUrl}
            onChange={(e) => setInstanceUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Change this for self-hosted GitLab instances.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gitlab-repo">Default Repository URL</Label>
          <Input
            id="gitlab-repo"
            placeholder="https://gitlab.com/your-org/project-reviews"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gitlab-folder">Default Folder in Repo</Label>
          <Input
            id="gitlab-folder"
            placeholder="team-reviews/q2"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <DebouncedButton onClick={handleSave} disabled={!pat} debounceMs={500}>
          {saved ? "Saved!" : "Save"}
        </DebouncedButton>
        <Button variant="outline" onClick={handleTest} disabled={status.checking || !pat}>
          {status.checking ? "Checking..." : "Test Connection"}
        </Button>
      </div>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your LLM providers
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">LLM Providers</h2>
        <p className="text-sm text-muted-foreground">
          API keys and settings are stored locally in your browser. They are never sent to our servers.
        </p>

        <div className="grid gap-4">
          <OpenRouterSettings />
          <RouterAISettings />
          <OllamaSettings />
          <ClaudeCodeSettings />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Compression Settings</h2>
        <CompressionProviderSettings />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Git Integration</h2>
        <p className="text-sm text-muted-foreground">
          Share project results with teammates via Git. Tokens are stored locally and never sent to our servers.
        </p>
        <p className="text-xs text-muted-foreground">
          Windows only: if cloned files appear as modified without changes, add{" "}
          <code className="font-mono bg-muted px-1 rounded">* text=auto eol=lf</code>{" "}
          to your repo's <code className="font-mono bg-muted px-1 rounded">.gitattributes</code>.
        </p>
        <GitHubSettings />
        <GitLabSettings />
      </div>

      <div className="rounded-lg border border-border p-6 space-y-2">
        <h3 className="text-lg font-semibold">About</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Commit: <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{__GIT_COMMIT__}</code></p>
          <p>Built: <span className="text-xs">{new Date(__BUILD_TIME__).toLocaleString()}</span></p>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
})
