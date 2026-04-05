# Runbook: Give Claude Code Access to Vercel & Convex Cloud

For Claude Code to run deploys, inspect logs, read/write env vars, or trigger redeploys on your behalf, it needs API tokens for each provider. Both tools ship CLIs that read tokens from env vars — once set, Claude just calls the CLIs.

---

## Convex Cloud

### What Claude can do with access
- Deploy functions: `npx convex deploy`
- Read/write Convex env vars: `npx convex env set FOO bar`, `npx convex env list`
- Run one-off functions (migrations, debug queries): `npx convex run <function>`
- Read logs: `npx convex logs`
- Read data: `npx convex data <table>`

### Token needed: `CONVEX_DEPLOY_KEY`

1. Convex Dashboard → `contextforgets` project → Settings → Deploy Keys
2. Pick the **Production** deployment → **Generate Production Deploy Key**
3. Copy the key (format: `prod:<deployment-slug>|<base64-token>`) — `<deployment-slug>` is Convex's internal identifier for your prod deployment (e.g. `next-chickadee-334`), not your project name

> You may want a separate key per purpose (one for Vercel CI, one for Claude Code on your machine) so you can revoke independently.

### How to give Claude access

Add to your shell profile or a project-level env file:

```bash
# ~/.bashrc or ~/.zshrc
export CONVEX_DEPLOY_KEY="prod:<deployment-slug>|<token>"
```

Or project-scoped in `.env.local` (already gitignored):

```
CONVEX_DEPLOY_KEY=prod:<deployment-slug>|<token>
```

Then source before starting Claude: `source .env.local && claude`.

---

## Vercel

### What Claude can do with access
- List/inspect deployments: `vercel list`, `vercel inspect <url>`
- Trigger a new deployment: `vercel deploy --prod`
- Promote a preview: `vercel promote <url>`
- Read/write env vars: `vercel env add/rm/ls`
- Read build logs: `vercel logs <url>`
- Roll back: `vercel rollback <url>`

### Token needed: `VERCEL_TOKEN` (+ org/project IDs)

1. Open https://vercel.com/account/tokens
2. **Create Token** → give it a name like `claude-code-local` → select scope (`Full Account` or a specific team) → set expiration
3. Copy the token (starts with `vercel_...`) — shown once, store it immediately

For non-interactive use, Claude also needs to know which project:

```bash
export VERCEL_TOKEN="vercel_..."
export VERCEL_ORG_ID="team_..."        # from Vercel → team settings → General
export VERCEL_PROJECT_ID="prj_..."     # from project settings → General
```

Alternative: `cd` into the project and run `vercel link` once interactively — this writes `.vercel/project.json` and you don't need the ID env vars. `.vercel/` is gitignored by default.

### Install the CLI

```bash
pnpm add -g vercel
vercel --version   # verify
```

---

## Security Notes

- **Treat both tokens as passwords.** They grant full deploy + env-var read access.
- **Use project/team-scoped tokens** over full-account when possible.
- **Set expirations** on Vercel tokens (30-90 days) and rotate.
- **Never commit `.env.local`** — already gitignored. Verify with `git check-ignore .env.local`.
- **Revoke immediately** if a token leaks:
  - Convex: Dashboard → Deploy Keys → Revoke
  - Vercel: https://vercel.com/account/tokens → Delete

## Verification

After setup, test each CLI works:

```bash
# Convex
CONVEX_DEPLOY_KEY=$CONVEX_DEPLOY_KEY npx convex env list    # should list prod env vars

# Vercel
vercel list                                                  # should list recent deployments
```

If both succeed, Claude Code can now manage both providers via Bash tool calls.

---

## Related
- [`deploy-to-cloud.md`](./deploy-to-cloud.md) — how production deploys work
- Vercel CLI docs: https://vercel.com/docs/cli
- Convex CLI docs: https://docs.convex.dev/cli
