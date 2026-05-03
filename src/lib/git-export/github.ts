export interface GitFile {
  path: string
  content: string
}

export interface PushResult {
  repoUrl: string
  commitSha: string
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/)
  if (!match) throw new Error(`Invalid GitHub repo URL: ${repoUrl}`)
  return { owner: match[1], repo: match[2] }
}

async function ghFetch(pat: string, path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API ${res.status}: ${body}`)
  }
  return res
}

export async function pushFiles(params: {
  repoUrl: string
  pat: string
  branch: string
  files: GitFile[]
  commitMessage: string
}): Promise<PushResult> {
  const { owner, repo } = parseRepoUrl(params.repoUrl)
  const base = `/repos/${owner}/${repo}`

  // Verify repo is accessible (throws with clear error if URL is wrong or no access)
  await ghFetch(params.pat, base)

  // Try to get existing branch ref; 404 here means empty repo or new branch
  let latestCommitSha: string | null = null
  let baseTreeSha: string | null = null

  const refRes = await fetch(`https://api.github.com${base}/git/ref/heads/${params.branch}`, {
    headers: {
      Authorization: `Bearer ${params.pat}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (refRes.ok) {
    const refData = await refRes.json()
    latestCommitSha = refData.object.sha as string

    const commitRes = await ghFetch(params.pat, `${base}/git/commits/${latestCommitSha}`)
    const commitData = await commitRes.json()
    baseTreeSha = commitData.tree.sha as string
  } else if (refRes.status !== 404) {
    const body = await refRes.text()
    throw new Error(`GitHub API ${refRes.status}: ${body}`)
  }
  // 404 → branch doesn't exist yet, will create root commit below

  // Create blobs for all files
  const treeItems = await Promise.all(
    params.files.map(async (file) => {
      const blobRes = await ghFetch(params.pat, `${base}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
      })
      const blob = await blobRes.json()
      return { path: file.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha as string }
    })
  )

  // Create tree (on top of base tree if branch exists, or fresh tree for empty repo)
  const treeBody: Record<string, unknown> = { tree: treeItems }
  if (baseTreeSha) treeBody.base_tree = baseTreeSha

  const treeRes = await ghFetch(params.pat, `${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify(treeBody),
  })
  const tree = await treeRes.json()

  // Create commit (with parent if branch exists, or root commit for empty repo)
  const newCommitRes = await ghFetch(params.pat, `${base}/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message: params.commitMessage,
      tree: tree.sha,
      parents: latestCommitSha ? [latestCommitSha] : [],
    }),
  })
  const newCommit = await newCommitRes.json()

  // Update existing branch ref or create new one
  if (latestCommitSha) {
    await ghFetch(params.pat, `${base}/git/refs/heads/${params.branch}`, {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommit.sha, force: true }),
    })
  } else {
    await ghFetch(params.pat, `${base}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${params.branch}`, sha: newCommit.sha }),
    })
  }

  return {
    repoUrl: `https://github.com/${owner}/${repo}`,
    commitSha: newCommit.sha as string,
  }
}

export async function pullFiles(params: {
  repoUrl: string
  pat: string
  paths: string[]
}): Promise<Array<{ path: string; content: string; sha: string }>> {
  const { owner, repo } = parseRepoUrl(params.repoUrl)

  const results = await Promise.allSettled(
    params.paths.map(async (filePath) => {
      const res = await ghFetch(
        params.pat,
        `/repos/${owner}/${repo}/contents/${encodeURIComponent(filePath)}`
      )
      const data = await res.json()
      return {
        path: filePath,
        content: atob((data.content as string).replace(/\n/g, "")),
        sha: data.sha as string,
      }
    })
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{ path: string; content: string; sha: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value)
}

export async function checkConnection(pat: string): Promise<{ login: string }> {
  const res = await ghFetch(pat, "/user")
  const data = await res.json()
  return { login: data.login as string }
}
