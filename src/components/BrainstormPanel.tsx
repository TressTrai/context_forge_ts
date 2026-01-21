import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { BrainstormDialog } from "@/components/BrainstormDialog"
import { useBrainstorm, type Zone } from "@/hooks/useBrainstorm"
import type { Id } from "../../convex/_generated/dataModel"

interface ProviderHealth {
  ollama: { ok: boolean; error?: string } | null
  claude: { ok: boolean; error?: string; version?: string } | null
}

// Check provider health on mount
function useProviderHealth() {
  const [health, setHealth] = useState<ProviderHealth>({
    ollama: null,
    claude: null,
  })

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
        const baseUrl = convexUrl
          ? convexUrl.replace(":3210", ":3211")
          : "http://127.0.0.1:3211"

        const response = await fetch(`${baseUrl}/api/health`)
        const data = (await response.json()) as ProviderHealth
        setHealth(data)
      } catch (err) {
        console.error("Failed to check provider health:", err)
        setHealth({
          ollama: { ok: false, error: "Failed to check" },
          claude: { ok: false, error: "Failed to check" },
        })
      }
    }

    checkHealth()
    // Re-check every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return health
}

interface BrainstormPanelProps {
  sessionId: Id<"sessions">
}

export function BrainstormPanel({ sessionId }: BrainstormPanelProps) {
  const health = useProviderHealth()
  const [showSystemPrompt, setShowSystemPrompt] = useState(false)
  const [editedSystemPrompt, setEditedSystemPrompt] = useState("")
  const [isSavingPrompt, setIsSavingPrompt] = useState(false)

  // Get session to access system prompt
  const session = useQuery(api.sessions.get, { id: sessionId })
  const updateSession = useMutation(api.sessions.update)

  // Sync edited prompt with session data
  useEffect(() => {
    if (session?.systemPrompt !== undefined) {
      setEditedSystemPrompt(session.systemPrompt ?? "")
    }
  }, [session?.systemPrompt])

  const brainstorm = useBrainstorm({
    sessionId,
    onError: (err) => console.error("Brainstorm error:", err),
  })

  const handleSaveMessage = async (messageId: string, zone: Zone) => {
    try {
      await brainstorm.saveMessage(messageId, zone)
    } catch (err) {
      console.error("Failed to save message:", err)
    }
  }

  const handleSaveSystemPrompt = async () => {
    setIsSavingPrompt(true)
    try {
      await updateSession({
        id: sessionId,
        systemPrompt: editedSystemPrompt.trim() || undefined,
      })
    } finally {
      setIsSavingPrompt(false)
    }
  }

  // Get the current system prompt (either from session or edited)
  const currentSystemPrompt = session?.systemPrompt ?? ""

  // Provider status indicator
  const getProviderStatus = (name: string, status: { ok: boolean } | null) => {
    if (status === null) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
          {name}...
        </span>
      )
    }

    if (status.ok) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-green-600">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          {name}
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs text-destructive">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        {name}
      </span>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Brainstorm</h2>
          {/* Provider status indicators */}
          <div className="flex items-center gap-2">
            {getProviderStatus("Ollama", health.ollama)}
            {getProviderStatus("Claude", health.claude)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          >
            {showSystemPrompt ? "Hide" : "Show"} System Prompt
          </Button>
          <Button
            onClick={() => brainstorm.open()}
            disabled={!health.claude?.ok && !health.ollama?.ok}
          >
            {brainstorm.messages.length > 0
              ? `Continue (${brainstorm.messages.length} msgs)`
              : "Start Brainstorming"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mt-2">
        Have a multi-turn conversation with your context. Save valuable messages as blocks.
      </p>

      {/* System prompt editor */}
      {showSystemPrompt && (
        <div className="mt-4 p-4 rounded-md bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="system-prompt" className="text-sm font-medium">
              System Prompt (LLM Role)
            </label>
            {currentSystemPrompt && (
              <span className="text-xs text-green-600">Active</span>
            )}
          </div>
          <textarea
            id="system-prompt"
            value={editedSystemPrompt}
            onChange={(e) => setEditedSystemPrompt(e.target.value)}
            placeholder="Define the LLM's role and behavior. E.g., 'You are a game design expert specializing in narrative systems...'"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none font-mono"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">
              This prompt will be sent with every brainstorm message.
            </span>
            <Button
              size="sm"
              onClick={handleSaveSystemPrompt}
              disabled={isSavingPrompt || editedSystemPrompt === (session?.systemPrompt ?? "")}
            >
              {isSavingPrompt ? "Saving..." : "Save Prompt"}
            </Button>
          </div>
        </div>
      )}

      {/* Show recent messages preview */}
      {brainstorm.messages.length > 0 && (
        <div className="mt-4 p-3 rounded-md bg-muted/50 border border-border">
          <div className="text-xs text-muted-foreground mb-2">
            Recent messages ({brainstorm.messages.length} total)
          </div>
          <div className="space-y-1">
            {brainstorm.messages.slice(-3).map((msg) => (
              <div key={msg.id} className="text-sm truncate">
                <span className="font-medium">
                  {msg.role === "user" ? "You: " : "AI: "}
                </span>
                <span className="text-muted-foreground">
                  {msg.content.slice(0, 100)}
                  {msg.content.length > 100 ? "..." : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <BrainstormDialog
        isOpen={brainstorm.isOpen}
        onClose={brainstorm.close}
        messages={brainstorm.messages}
        isStreaming={brainstorm.isStreaming}
        streamingText={brainstorm.streamingText}
        provider={brainstorm.provider}
        onProviderChange={brainstorm.setProvider}
        onSendMessage={(content) => brainstorm.sendMessage(content, currentSystemPrompt || undefined)}
        onClearConversation={brainstorm.clearConversation}
        onSaveMessage={handleSaveMessage}
        error={brainstorm.error}
        providerHealth={health}
        systemPrompt={currentSystemPrompt}
      />
    </div>
  )
}
