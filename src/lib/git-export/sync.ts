import { getSyncMeta, setSyncMeta, patchSyncBlock } from "./settings"
import { pullWithProvider, getProviderSettings } from "./adapter"
import { stripFrontmatter } from "./markdown"

export interface SyncChange {
  blockId: string
  currentContent: string
  remoteContent: string
  path: string
}

export interface SyncResult {
  changes: SyncChange[]
  notFound: string[]
}

export async function checkForUpdates(
  projectId: string,
  convexBlocks: Array<{ _id: string; content: string }>
): Promise<SyncResult> {
  const meta = getSyncMeta(projectId)
  if (!meta || Object.keys(meta.blocks).length === 0) return { changes: [], notFound: [] }

  const settings = getProviderSettings(meta.provider)
  const pat = settings.getPat()
  if (!pat) throw new Error(`${meta.provider === "github" ? "GitHub" : "GitLab"} PAT not configured`)

  const blockIds = Object.keys(meta.blocks)
  const paths = blockIds.map((id) => meta.blocks[id].path)

  const { files: remoteFiles, notFound } = await pullWithProvider(meta.provider, {
    repoUrl: meta.repoUrl,
    pat,
    branch: meta.branch,
    paths,
  })

  const remoteByPath = new Map(remoteFiles.map((f) => [f.path, f]))
  const convexByBlockId = new Map(convexBlocks.map((b) => [b._id, b]))

  const changes: SyncChange[] = []
  const yieldedPaths = new Set<string>()

  for (const blockId of blockIds) {
    const blockMeta = meta.blocks[blockId]
    if (yieldedPaths.has(blockMeta.path)) continue

    const remote = remoteByPath.get(blockMeta.path)
    if (!remote) continue

    const remoteBody = stripFrontmatter(remote.content)
    const convexBlock = convexByBlockId.get(blockId)
    if (!convexBlock) continue

    if (remoteBody.trim() === convexBlock.content.trim()) continue
    if (blockMeta.rejectedRemoteContent === remoteBody) continue

    yieldedPaths.add(blockMeta.path)
    changes.push({
      blockId,
      currentContent: convexBlock.content,
      remoteContent: remoteBody,
      path: blockMeta.path,
    })
  }

  return { changes, notFound }
}

export function rejectChange(projectId: string, blockId: string, remoteContent: string): void {
  patchSyncBlock(projectId, blockId, { rejectedRemoteContent: remoteContent })
}

export function clearRejection(projectId: string, blockId: string): void {
  const meta = getSyncMeta(projectId)
  if (!meta?.blocks[blockId]) return
  const { rejectedRemoteContent: _removed, ...rest } = meta.blocks[blockId]
  meta.blocks[blockId] = rest
  setSyncMeta(projectId, meta)
}
