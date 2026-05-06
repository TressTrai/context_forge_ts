import type { GitFile, PushResult, PullResult } from "./github"
import { pushFiles as ghPush, pullFiles as ghPull, listDirectory as ghListDir } from "./github"
import { pushFiles as glPush, pullFiles as glPull, listDirectory as glListDir } from "./gitlab"
import { github, gitlab } from "./settings"

export type GitProviderType = "github" | "gitlab"

export function getProviderSettings(provider: GitProviderType) {
  return provider === "github" ? github : gitlab
}

export async function pushWithProvider(
  provider: GitProviderType,
  params: {
    repoUrl: string
    pat: string
    branch: string
    files: GitFile[]
    commitMessage: string
  }
): Promise<PushResult> {
  return provider === "github" ? ghPush(params) : glPush(params)
}

export type { PullResult }

export async function pullWithProvider(
  provider: GitProviderType,
  params: {
    repoUrl: string
    pat: string
    branch: string
    paths: string[]
  }
): Promise<PullResult> {
  return provider === "github"
    ? ghPull({ repoUrl: params.repoUrl, pat: params.pat, paths: params.paths, branch: params.branch })
    : glPull(params)
}

export async function listAnchorFiles(
  provider: GitProviderType,
  params: { repoUrl: string; pat: string; branch: string }
): Promise<Array<{ blockId: string; path: string }>> {
  const listDir = provider === "github" ? ghListDir : glListDir
  const files = await listDir({ ...params, dirPath: ".contextforge/meta" })
  const jsonFiles = files.filter((f) => f.name.endsWith(".json"))
  if (jsonFiles.length === 0) return []

  const { files: fetched } = await pullWithProvider(provider, {
    ...params,
    paths: jsonFiles.map((f) => f.path),
  })

  const anchors: Array<{ blockId: string; path: string }> = []
  for (const file of fetched) {
    try {
      const data = JSON.parse(file.content) as { blockId?: unknown; path?: unknown }
      if (typeof data.blockId === "string" && typeof data.path === "string") {
        anchors.push({ blockId: data.blockId, path: data.path })
      }
    } catch {
      // ignore malformed anchors
    }
  }
  return anchors
}
