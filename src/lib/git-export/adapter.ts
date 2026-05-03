import type { GitFile, PushResult } from "./github"
import { pushFiles as ghPush } from "./github"
import { pushFiles as glPush } from "./gitlab"
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
