import { useState, useEffect, useMemo, useCallback } from "react"
import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "../../convex/_generated/api"
import { Button } from "@/components/ui/button"
import { BrainstormDialog } from "@/components/BrainstormDialog"
import { SaveToMemoryDialog } from "@/components/SaveToMemoryDialog"
import { useBrainstorm, type Zone } from "@/hooks/useBrainstorm"
import type { Id } from "../../convex/_generated/dataModel"
import * as ollamaClient from "@/lib/llm/ollama"
import * as openrouterClient from "@/lib/llm/openrouter"

interface ProviderHealth {
  ollama: { ok: boolean; error?: string } | null
  claude: { ok: boolean; error?: string; version?: string; disabled?: boolean } | null
  openrouter: { ok: boolean; configured?: boolean; error?: string; model?: string } | null
}

// Check provider health on mount (client-side for Ollama/OpenRouter, backend for Claude)
function useProviderHealth() {
  const [health, setHealth] = useState<ProviderHealth>({
    ollama: null,
    claude: null, // Null until health check completes - allows optimistic input enable
    openrouter: null,
  })
  const features = useQuery(api.features.getFlags)

  useEffect(() => {
    const checkHealth = async () => {
      // Check Ollama (client-side)
      const ollamaHealth = await ollamaClient.checkHealth()

      // Check OpenRouter (client-side)
      const openrouterHealth = await openrouterClient.checkHealth()

      // Check Claude Code (backend) - only if enabled
      let claudeHealth: { ok: boolean; error?: string; version?: string; disabled?: boolean } | null = null
      if (features?.claudeCodeEnabled) {
        try {
          const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined
          const baseUrl = convexUrl
            ? convexUrl.replace(":3210", ":3211")
            : "http://127.0.0.1:3211"

          const response = await fetch(`${baseUrl}/api/health/claude`)
          if (response.ok) {
            claudeHealth = await response.json()
          } else {
            claudeHealth = { ok: false, error: "Claude Code not available" }
          }
        } catch {
          claudeHealth = { ok: false, error: "Failed to check Claude Code" }
        }
      } else {
        // Claude Code is disabled via feature flag
        claudeHealth = { ok: false, disabled: true, error: "Disabled" }
      }

      setHealth({
        ollama: ollamaHealth,
        claude: claudeHealth,
        openrouter: openrouterHealth,
      })
    }

    // Only run health check once features are loaded
    if (features !== undefined) {
      checkHealth()
      // Re-check every 30 seconds
      const interval = setInterval(checkHealth, 30000)
      return () => clearInterval(interval)
    }
  }, [features])

  return health
}

interface BrainstormPanelProps {
  sessionId: Id<"sessions">
  compact?: boolean
}

export function BrainstormPanel({ sessionId, compact = false }: BrainstormPanelProps) {
  const health = useProviderHealth()
  const session = useQuery(api.sessions.get, { id: sessionId })

  const createBlock = useMutation(api.blocks.create)
  const updateBlock = useMutation(api.blocks.update)
  const createMemoryEntry = useMutation(api.memoryEntries.create)
  const claudeDraftMemoryEntry = useAction(api.claudeNode.draftMemoryEntry)
  const updateSessionTagsMutation = useMutation(api.sessions.updateSessionTags)

  // Memory schema for Save-to-Memory feature
  const memorySchema = useQuery(
    api.memorySchemas.getByProject,
    session?.projectId ? { projectId: session.projectId } : "skip"
  )
  const [saveToMemoryText, setSaveToMemoryText] = useState<string | null>(null)

  const handleClaudeDraft = useCallback(
    async (text: string, types: Array<{ name: string; icon: string }>) => {
      const raw = await claudeDraftMemoryEntry({ selectedText: text, types })
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
      try {
        const parsed = JSON.parse(cleaned)
        return {
          type: parsed.type ?? types[0]?.name ?? "note",
          title: parsed.title ?? "Untitled",
          content: parsed.content ?? text,
          tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        }
      } catch {
        return {
          type: types[0]?.name ?? "note",
          title: text.slice(0, 60).split("\n")[0].trim(),
          content: text,
          tags: [],
        }
      }
    },
    [claudeDraftMemoryEntry]
  )

  // Get blocks in PERMANENT zone to find system_prompt blocks
  const permanentBlocks = useQuery(api.blocks.listByZone, {
    sessionId,
    zone: "PERMANENT",
  })

  // Find the active system_prompt block (first by position in PERMANENT zone)
  const systemPromptBlock = useMemo(() => {
    if (!permanentBlocks) return null
    const systemPromptBlocks = permanentBlocks
      .filter((b) => b.type === "system_prompt")
      .sort((a, b) => a.position - b.position)
    return systemPromptBlocks[0] ?? null
  }, [permanentBlocks])

  // Get the active system prompt content
  const activeSystemPrompt = systemPromptBlock?.content ?? ""

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

  // Compact mode - just a button
  if (compact) {
    // Optimistic: if all health is still null (pending), allow opening
    const allPending = health.claude === null && health.ollama === null && health.openrouter === null
    const anyProviderAvailable = allPending || health.claude?.ok || health.ollama?.ok || health.openrouter?.ok
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => brainstorm.open()}
          disabled={!anyProviderAvailable}
        >
          {brainstorm.messages.length > 0
            ? `Brainstorm (${brainstorm.messages.length})`
            : "Brainstorm"}
        </Button>
        <BrainstormDialog
          isOpen={brainstorm.isOpen}
          onClose={brainstorm.close}
          messages={brainstorm.messages}
          hasUnsavedContent={brainstorm.hasUnsavedContent}
          isStreaming={brainstorm.isStreaming}
          streamingText={brainstorm.streamingText}
          provider={brainstorm.provider}
          onProviderChange={brainstorm.setProvider}
          onSendMessage={(content, options) => brainstorm.sendMessage(content, options)}
          hasCriteria={brainstorm.hasCriteria}
          onClearConversation={brainstorm.clearConversation}
          onSaveMessage={handleSaveMessage}
          onRetryMessage={(messageId) => brainstorm.retryMessage(messageId)}
          onEditMessage={(messageId, newContent) => brainstorm.editMessage(messageId, newContent)}
          error={brainstorm.error}
          providerHealth={health}
          systemPrompt={activeSystemPrompt}
          disableAgentBehavior={brainstorm.disableAgentBehavior}
          onDisableAgentBehaviorChange={brainstorm.setDisableAgentBehavior}
          preventSelfTalk={brainstorm.preventSelfTalk}
          onPreventSelfTalkChange={brainstorm.setPreventSelfTalk}
          onStopStreaming={brainstorm.stopStreaming}
          model={brainstorm.model}
          onModelChange={brainstorm.setModel}
          claudeResolvedModel={session?.claudeResolvedModel}
          activeSkills={brainstorm.activeSkills}
          onToggleSkill={brainstorm.toggleSkill}
          openrouterSessionCost={brainstorm.openrouterSessionCost}
          conversationRestored={brainstorm.conversationRestored}
          onSaveToMemory={memorySchema && session?.projectId ? setSaveToMemoryText : undefined}
          sessionTags={session?.sessionTags}
          onUpdateSessionTags={session ? (tags) => updateSessionTagsMutation({ sessionId, tags }) : undefined}
          availableMemoryTags={brainstorm.availableMemoryTags}
          systemPromptBlock={systemPromptBlock ? { content: systemPromptBlock.content } : null}
          onSaveSystemPrompt={async (content) => {
            if (systemPromptBlock) {
              await updateBlock({ id: systemPromptBlock._id, content })
            } else {
              await createBlock({ sessionId, content, type: "system_prompt", zone: "PERMANENT" })
            }
          }}
        />
        {memorySchema && session?.projectId && (
          <SaveToMemoryDialog
            isOpen={saveToMemoryText !== null}
            onClose={() => setSaveToMemoryText(null)}
            text={saveToMemoryText ?? ""}
            projectId={session.projectId}
            types={memorySchema.types}
            provider={brainstorm.provider}
            onDraft={brainstorm.provider === "claude" ? handleClaudeDraft : undefined}
          onCreateEntry={async (args) => {
              await createMemoryEntry(args)
              setSaveToMemoryText(null)
            }}
          />
        )}
      </>
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
            {/* Only show Claude if not disabled */}
            {!health.claude?.disabled && getProviderStatus("Claude", health.claude)}
            {getProviderStatus("OpenRouter", health.openrouter)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => brainstorm.open()}
            disabled={
              // Optimistic: allow opening while health checks are pending
              !(health.claude === null && health.ollama === null && health.openrouter === null) &&
              !health.claude?.ok && !health.ollama?.ok && !health.openrouter?.ok
            }
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
        hasUnsavedContent={brainstorm.hasUnsavedContent}
        isStreaming={brainstorm.isStreaming}
        streamingText={brainstorm.streamingText}
        provider={brainstorm.provider}
        onProviderChange={brainstorm.setProvider}
        onSendMessage={(content) => brainstorm.sendMessage(content)}
        onClearConversation={brainstorm.clearConversation}
        onSaveMessage={handleSaveMessage}
        onRetryMessage={(messageId) => brainstorm.retryMessage(messageId)}
        onEditMessage={(messageId, newContent) => brainstorm.editMessage(messageId, newContent)}
        error={brainstorm.error}
        providerHealth={health}
        systemPrompt={activeSystemPrompt}
        disableAgentBehavior={brainstorm.disableAgentBehavior}
        onDisableAgentBehaviorChange={brainstorm.setDisableAgentBehavior}
        preventSelfTalk={brainstorm.preventSelfTalk}
        onPreventSelfTalkChange={brainstorm.setPreventSelfTalk}
        onStopStreaming={brainstorm.stopStreaming}
        model={brainstorm.model}
        onModelChange={brainstorm.setModel}
        claudeResolvedModel={session?.claudeResolvedModel}
        activeSkills={brainstorm.activeSkills}
        onToggleSkill={brainstorm.toggleSkill}
        openrouterSessionCost={brainstorm.openrouterSessionCost}
        conversationRestored={brainstorm.conversationRestored}
        onSaveToMemory={memorySchema && session?.projectId ? setSaveToMemoryText : undefined}
      />
      {memorySchema && session?.projectId && (
        <SaveToMemoryDialog
          isOpen={saveToMemoryText !== null}
          onClose={() => setSaveToMemoryText(null)}
          text={saveToMemoryText ?? ""}
          projectId={session.projectId}
          types={memorySchema.types}
          provider={brainstorm.provider}
          onCreateEntry={async (args) => {
            await createMemoryEntry(args)
            setSaveToMemoryText(null)
          }}
        />
      )}
    </div>
  )
}
