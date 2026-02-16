# Local VPN Deployment — Design

## Goal

Deploy ContextForge on a local VPN server (`192.168.87.58`) for PM team usage.
Fully self-contained — no cloud dependencies except BYOK LLM providers.

## Architecture

```
192.168.87.58 (Ubuntu 22.04, 4 CPU, 12 GB RAM)
│
├── Convex Backend (self-hosted binary, pm2)
│   ├── :3210 — API (client connections)
│   ├── :3211 — HTTP actions (auth callbacks)
│   └── SQLite storage in ~/contextforge/convex-data/
│
├── Convex Dashboard (standalone Next.js, pm2)
│   └── :6791 — admin UI
│
├── ContextForge Frontend (Vite preview or static server, pm2)
│   └── :8080 — PM-facing web app
│
└── Claude Code CLI at ~/.local/bin/claude
    └── accessible to Convex backend actions natively
```

## Key Decisions

- **No Docker** — source code cloned on server, built locally. Convex runs
  as host process for native Claude Code access.
- **pm2** — process manager for all 3 services. Auto-restart, log management.
- **Open signup** — PMs self-register via Convex Auth (password provider).
  Accounts are isolated from prod/test.
- **LLM is BYOK** — PMs configure OpenRouter/Ollama keys in Settings page.
  No server-side LLM config needed.
- **Claude Code** — available to Convex actions via `CLAUDE_CODE_PATH` env var
  set on the backend process.

## Services

### 1. Convex Backend (binary)

Download prebuilt binary from
[convex-backend releases](https://github.com/get-convex/convex-backend/releases).

```bash
# Generate instance secret
./convex-local-backend generate-secret
# → outputs hex string

# Generate admin key
./convex-local-backend generate-admin-key --instance-name contextforge --instance-secret <SECRET>
# → outputs admin key

# Run
./convex-local-backend \
  --instance-name contextforge \
  --instance-secret <SECRET> \
  --local-storage ~/contextforge/convex-data \
  --origin http://192.168.87.58:3210 \
  --site-origin http://192.168.87.58:3211
```

Push code from dev machine or server:
```bash
CONVEX_SELF_HOSTED_URL=http://192.168.87.58:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY=<key> \
npx convex deploy
```

Backend env vars (set via CLI after deploy):
```bash
# Auth (required)
npx convex env set AUTH_ISSUER_URL http://192.168.87.58:3211
npx convex env set SITE_URL http://192.168.87.58:8080

# Feature flags
npx convex env set CLAUDE_CODE_ENABLED true
npx convex env set CLAUDE_CODE_PATH /home/ubuntu/.local/bin/claude
npx convex env set OAUTH_ENABLED false
npx convex env set SKILL_SCAN_ENABLED false
```

### 2. Convex Dashboard

Run from the self-hosted Docker image OR clone the dashboard repo and run
standalone. Environment:
```
NEXT_PUBLIC_DEPLOYMENT_URL=http://192.168.87.58:3210
```

### 3. ContextForge Frontend

```bash
cd ~/contextforge/ContextForgeTS
VITE_CONVEX_URL=http://192.168.87.58:3210 pnpm build
pnpm preview --host 0.0.0.0 --port 8080
```

## pm2 Setup

```bash
npm i -g pm2

# Start all services
pm2 start ecosystem.config.cjs

# Save for auto-restart
pm2 save
pm2 startup  # generates systemd hook for pm2 itself
```

`ecosystem.config.cjs` in the repo at `deploy/local/`:
```js
module.exports = {
  apps: [
    {
      name: "convex-backend",
      script: "/home/ubuntu/contextforge/convex-local-backend",
      args: "--instance-name contextforge --instance-secret <SECRET> ...",
      cwd: "/home/ubuntu/contextforge/convex-data",
    },
    {
      name: "contextforge-frontend",
      script: "pnpm",
      args: "preview --host 0.0.0.0 --port 8080",
      cwd: "/home/ubuntu/contextforge/ContextForgeTS",
    },
    {
      name: "convex-dashboard",
      script: "node_modules/.bin/next",
      args: "start -p 6791",
      cwd: "/home/ubuntu/contextforge/convex-dashboard",
      env: {
        NEXT_PUBLIC_DEPLOYMENT_URL: "http://192.168.87.58:3210",
      },
    },
  ],
};
```

## Server Prep

Existing tooling on server:
- Node v20.19.5 (nvm) ✓
- pnpm ✓
- Claude Code at ~/.local/bin/claude ✓
- Need to install: pm2

Ports used by other services (verified free):
- 3210, 3211, 6791, 8080 — all available

## PM Access

- App: `http://192.168.87.58:8080`
- Dashboard (admin): `http://192.168.87.58:6791`
- Requires VPN connection

## Out of Scope (for now)

- HTTPS/TLS (internal VPN, not needed)
- CI/CD pipeline (manual git pull + rebuild)
- Backups (can add later with SQLite file copy)
- Scaling (single machine is fine for PM team)
