import { useState, useEffect } from "react"
import { getProviderSettings, pushWithProvider } from "./adapter"
import type { GitProviderType } from "./adapter"
import { getSyncMeta, setSyncMeta } from "./settings"

export function useGitExportForm({
  projectId,
  onClose,
}: {
  projectId?: string
  onClose: () => void
}) {
  const [provider, setProvider] = useState<GitProviderType>("github")
  const [repoUrl, setRepoUrl] = useState(() => {
    const s = getProviderSettings("github")
    return projectId ? s.getProjectRepoUrl(projectId) : s.getDefaultRepoUrl()
  })
  const [folder, setFolder] = useState(() => {
    const s = getProviderSettings("github")
    return projectId ? s.getProjectFolder(projectId) : s.getDefaultFolder()
  })
  const [branch, setBranch] = useState("main")
  const [isLoading, setIsLoading] = useState(false)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const settings = getProviderSettings(provider)

  useEffect(() => {
    const s = getProviderSettings(provider)
    setRepoUrl(projectId ? s.getProjectRepoUrl(projectId) : s.getDefaultRepoUrl())
    setFolder(projectId ? s.getProjectFolder(projectId) : s.getDefaultFolder())
    setBranch(provider === "github" ? "main" : "master")
  }, [provider, projectId])

  const exportFiles = async (
    files: { path: string; content: string; blockId: string }[],
    commitMessage: string
  ) => {
    const pat = settings.getPat()
    if (!pat) {
      setError(
        `${provider === "github" ? "GitHub" : "GitLab"} token not configured. Set it in Settings → Git Integration.`
      )
      return
    }
    if (!repoUrl.trim()) {
      setError("Repository URL is required.")
      return
    }
    if (files.length === 0) {
      setError("Select at least one block.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await pushWithProvider(provider, {
        repoUrl: repoUrl.trim(),
        pat,
        branch: branch.trim() || (provider === "github" ? "main" : "master"),
        files,
        commitMessage,
      })

      if (projectId) {
        settings.setProjectRepoUrl(projectId, repoUrl.trim())
        settings.setProjectFolder(projectId, folder)

        const existingMeta = getSyncMeta(projectId)
        const existingBlocks = existingMeta?.blocks ?? {}
        const updatedBlocks = { ...existingBlocks }
        for (const file of files) {
          updatedBlocks[file.blockId] = { path: file.path }
        }
        setSyncMeta(projectId, {
          provider,
          repoUrl: repoUrl.trim(),
          branch: branch.trim() || (provider === "github" ? "main" : "master"),
          folder,
          blocks: updatedBlocks,
        })
      }

      setResultUrl(result.repoUrl)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setResultUrl(null)
    setError(null)
    onClose()
  }

  return {
    provider,
    setProvider,
    repoUrl,
    setRepoUrl,
    folder,
    setFolder,
    branch,
    setBranch,
    isLoading,
    resultUrl,
    error,
    exportFiles,
    handleClose,
  }
}
