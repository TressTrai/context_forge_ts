import type { GitFile, PushResult } from "./github"

function parseRepoUrl(repoUrl: string): { host: string; encodedPath: string; repoUrl: string } {
  const match = repoUrl.match(/^https?:\/\/([^/]+)\/(.+?)(?:\.git)?\/?$/)
  if (!match) throw new Error(`Invalid GitLab repo URL: ${repoUrl}`)
  return {
    host: match[1],
    encodedPath: encodeURIComponent(match[2]),
    repoUrl: `https://${match[1]}/${match[2]}`,
  }
}

async function glFetch(
  pat: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "PRIVATE-TOKEN": pat,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitLab API ${res.status}: ${body}`)
  }
  return res
}

async function fileExists(
  pat: string,
  apiBase: string,
  encodedPath: string,
  filePath: string,
  branch: string
): Promise<boolean> {
  const encodedFilePath = encodeURIComponent(filePath)
  const res = await fetch(
    `${apiBase}/projects/${encodedPath}/repository/files/${encodedFilePath}?ref=${branch}`,
    { headers: { "PRIVATE-TOKEN": pat } }
  )
  return res.ok
}

export async function pushFiles(params: {
  repoUrl: string
  pat: string
  branch: string
  files: GitFile[]
  commitMessage: string
}): Promise<PushResult> {
  const { host, encodedPath, repoUrl: normalizedUrl } = parseRepoUrl(params.repoUrl)
  const apiBase = `https://${host}/api/v4`

  // Verify repo is accessible
  await glFetch(params.pat, `${apiBase}/projects/${encodedPath}`)

  // Check which files already exist (parallel)
  const existsFlags = await Promise.all(
    params.files.map((f) =>
      fileExists(params.pat, apiBase, encodedPath, f.path, params.branch)
    )
  )

  const actions = params.files.map((file, i) => ({
    action: existsFlags[i] ? "update" : "create",
    file_path: file.path,
    content: file.content,
    encoding: "text",
  }))

  const res = await glFetch(
    params.pat,
    `${apiBase}/projects/${encodedPath}/repository/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        branch: params.branch,
        commit_message: params.commitMessage,
        actions,
      }),
    }
  )

  const data = await res.json()

  return {
    repoUrl: normalizedUrl,
    commitSha: data.id as string,
  }
}

export async function checkConnection(pat: string, instanceUrl: string): Promise<{ login: string }> {
  const apiBase = instanceUrl.replace(/\/$/, "")
  const res = await glFetch(pat, `${apiBase}/api/v4/user`)
  const data = await res.json()
  return { login: data.username as string }
}
