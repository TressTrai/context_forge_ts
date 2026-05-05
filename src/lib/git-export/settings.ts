const KEYS = {
  GITHUB_PAT: "contextforge-github-pat",
  GITHUB_DEFAULT_REPO_URL: "contextforge-github-repo-url",
  GITHUB_DEFAULT_FOLDER: "contextforge-github-folder",
  GITLAB_PAT: "contextforge-gitlab-pat",
  GITLAB_INSTANCE_URL: "contextforge-gitlab-instance-url",
  GITLAB_DEFAULT_REPO_URL: "contextforge-gitlab-repo-url",
  GITLAB_DEFAULT_FOLDER: "contextforge-gitlab-folder",
} as const

const projectRepoKey = (provider: string, projectId: string) =>
  `contextforge-${provider}-repo-${projectId}`
const projectFolderKey = (provider: string, projectId: string) =>
  `contextforge-${provider}-folder-${projectId}`

export const github = {
  getPat(): string | null {
    return localStorage.getItem(KEYS.GITHUB_PAT)
  },

  setPat(v: string): void {
    localStorage.setItem(KEYS.GITHUB_PAT, v)
  },

  clearPat(): void {
    localStorage.removeItem(KEYS.GITHUB_PAT)
  },

  getDefaultRepoUrl(): string {
    return localStorage.getItem(KEYS.GITHUB_DEFAULT_REPO_URL) ?? ""
  },

  setDefaultRepoUrl(v: string): void {
    localStorage.setItem(KEYS.GITHUB_DEFAULT_REPO_URL, v)
  },

  getDefaultFolder(): string {
    return localStorage.getItem(KEYS.GITHUB_DEFAULT_FOLDER) ?? ""
  },

  setDefaultFolder(v: string): void {
    localStorage.setItem(KEYS.GITHUB_DEFAULT_FOLDER, v)
  },

  getProjectRepoUrl(projectId: string): string {
    return localStorage.getItem(projectRepoKey("github", projectId)) ?? this.getDefaultRepoUrl()
  },

  setProjectRepoUrl(projectId: string, v: string): void {
    localStorage.setItem(projectRepoKey("github", projectId), v)
  },

  getProjectFolder(projectId: string): string {
    return localStorage.getItem(projectFolderKey("github", projectId)) ?? this.getDefaultFolder()
  },

  setProjectFolder(projectId: string, v: string): void {
    localStorage.setItem(projectFolderKey("github", projectId), v)
  },

  isConfigured(): boolean {
    return !!this.getPat()
  },
}

export const gitlab = {
  getPat(): string | null {
    return localStorage.getItem(KEYS.GITLAB_PAT)
  },

  setPat(v: string): void {
    localStorage.setItem(KEYS.GITLAB_PAT, v)
  },

  clearPat(): void {
    localStorage.removeItem(KEYS.GITLAB_PAT)
  },

  getInstanceUrl(): string {
    return localStorage.getItem(KEYS.GITLAB_INSTANCE_URL) ?? "https://gitlab.com"
  },

  setInstanceUrl(v: string): void {
    localStorage.setItem(KEYS.GITLAB_INSTANCE_URL, v)
  },

  getDefaultRepoUrl(): string {
    return localStorage.getItem(KEYS.GITLAB_DEFAULT_REPO_URL) ?? ""
  },

  setDefaultRepoUrl(v: string): void {
    localStorage.setItem(KEYS.GITLAB_DEFAULT_REPO_URL, v)
  },

  getDefaultFolder(): string {
    return localStorage.getItem(KEYS.GITLAB_DEFAULT_FOLDER) ?? ""
  },

  setDefaultFolder(v: string): void {
    localStorage.setItem(KEYS.GITLAB_DEFAULT_FOLDER, v)
  },

  getProjectRepoUrl(projectId: string): string {
    return localStorage.getItem(projectRepoKey("gitlab", projectId)) ?? this.getDefaultRepoUrl()
  },

  setProjectRepoUrl(projectId: string, v: string): void {
    localStorage.setItem(projectRepoKey("gitlab", projectId), v)
  },

  getProjectFolder(projectId: string): string {
    return localStorage.getItem(projectFolderKey("gitlab", projectId)) ?? this.getDefaultFolder()
  },

  setProjectFolder(projectId: string, v: string): void {
    localStorage.setItem(projectFolderKey("gitlab", projectId), v)
  },

  isConfigured(): boolean {
    return !!this.getPat()
  },
}

// ===================== Sync Metadata =====================

export interface SyncBlockMeta {
  path: string
  rejectedRemoteContent?: string
}

export interface SyncMeta {
  provider: "github" | "gitlab"
  repoUrl: string
  branch: string
  folder: string
  blocks: Record<string, SyncBlockMeta>
}

const syncMetaKey = (projectId: string) => `contextforge-sync-meta-${projectId}`

export function getSyncMeta(projectId: string): SyncMeta | null {
  const raw = localStorage.getItem(syncMetaKey(projectId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as SyncMeta
  } catch {
    return null
  }
}

export function setSyncMeta(projectId: string, meta: SyncMeta): void {
  localStorage.setItem(syncMetaKey(projectId), JSON.stringify(meta))
}

export function hasSyncMeta(projectId: string): boolean {
  return localStorage.getItem(syncMetaKey(projectId)) !== null
}

export function patchSyncBlock(
  projectId: string,
  blockId: string,
  patch: Partial<SyncBlockMeta>
): void {
  const meta = getSyncMeta(projectId)
  if (!meta) return
  meta.blocks[blockId] = { ...meta.blocks[blockId], ...patch }
  setSyncMeta(projectId, meta)
}
