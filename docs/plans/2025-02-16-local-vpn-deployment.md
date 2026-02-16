# Local VPN Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy ContextForge on VPN server `192.168.87.58` with self-hosted Convex backend, frontend, and Claude Code integration for PM team usage.

**Architecture:** Convex backend runs as a native binary (for Claude Code access), frontend built from source and served via Vite preview, all managed by pm2. Dashboard runs as a single Docker container (optional).

**Tech Stack:** Convex self-hosted binary, pm2, pnpm, Vite, Node 20, Ubuntu 22.04

**Server:** `ssh ubuntu@192.168.87.58` — Node 20.19.5 (nvm), pnpm 10.29.3, Claude Code at `~/.local/bin/claude`, x86_64

---

### Task 1: Create deployment directory structure on server

**Step 1: SSH in and create directories**

Run on server:
```bash
ssh ubuntu@192.168.87.58
mkdir -p ~/contextforge/convex-data
mkdir -p ~/contextforge/bin
```

**Step 2: Verify**

```bash
ls -la ~/contextforge/
```
Expected: `convex-data/` and `bin/` directories exist.

---

### Task 2: Download and set up Convex backend binary

**Step 1: Download the prebuilt binary**

```bash
cd ~/contextforge/bin
curl -L -o convex-local-backend.zip \
  "https://github.com/get-convex/convex-backend/releases/download/precompiled-2026-02-10-4ef979b/convex-local-backend-x86_64-unknown-linux-gnu.zip"
unzip convex-local-backend.zip
chmod +x convex-local-backend
rm convex-local-backend.zip
```

**Step 2: Generate instance secret**

```bash
cd ~/contextforge/bin
./convex-local-backend generate-secret
```
Save the output hex string — this is `<INSTANCE_SECRET>`.

**Step 3: Generate admin key**

```bash
./convex-local-backend generate-admin-key \
  --instance-name contextforge \
  --instance-secret <INSTANCE_SECRET>
```
Save the output — this is `<ADMIN_KEY>` (format: `contextforge|<hex>`).

**Step 4: Test-run the backend**

```bash
./convex-local-backend \
  --instance-name contextforge \
  --instance-secret <INSTANCE_SECRET> \
  --local-storage ~/contextforge/convex-data \
  --port 3210 \
  --site-proxy-port 3211 \
  --origin http://192.168.87.58:3210 \
  --site-origin http://192.168.87.58:3211
```

**Step 5: Verify in another terminal**

```bash
curl http://192.168.87.58:3210/version
```
Expected: version JSON response.

Stop the test run (Ctrl+C).

---

### Task 3: Clone repo and build frontend

**Step 1: Clone the repository**

```bash
cd ~/contextforge
git clone https://github.com/opcheese/context_forge_ts.git ContextForgeTS
```

**Step 2: Install dependencies**

```bash
cd ~/contextforge/ContextForgeTS
# nvm must be loaded
source ~/.nvm/nvm.sh
pnpm install
```

**Step 3: Build frontend with VPN server URL**

```bash
VITE_CONVEX_URL=http://192.168.87.58:3210 pnpm build
```
Expected: `dist/` directory created with built assets.

**Step 4: Test preview server**

```bash
pnpm preview --host 0.0.0.0 --port 8080
```
Verify: open `http://192.168.87.58:8080` in browser — should see the app (won't work fully until Convex is running with code pushed).

Stop (Ctrl+C).

---

### Task 4: Create pm2 ecosystem config

**Files:**
- Create: `deploy/local/ecosystem.config.cjs`
- Create: `deploy/local/.env.example`
- Create: `deploy/local/README.md`

**Step 1: Create deploy/local directory in the repo**

On dev machine:
```bash
mkdir -p deploy/local
```

**Step 2: Create ecosystem.config.cjs**

Create `deploy/local/ecosystem.config.cjs`:
```js
// pm2 ecosystem config for local VPN deployment
// Copy to ~/contextforge/ on the server and fill in .env values
//
// Usage:
//   cp ecosystem.config.cjs ~/contextforge/
//   cp .env.local ~/contextforge/.env
//   cd ~/contextforge && pm2 start ecosystem.config.cjs

const path = require("path")
const dotenv = require("dotenv")

// Load .env from same directory as this config
dotenv.config({ path: path.join(__dirname, ".env") })

const INSTANCE_SECRET = process.env.CONVEX_INSTANCE_SECRET
const SERVER_IP = process.env.SERVER_IP || "192.168.87.58"

if (!INSTANCE_SECRET) {
  console.error("ERROR: CONVEX_INSTANCE_SECRET not set in .env")
  process.exit(1)
}

module.exports = {
  apps: [
    {
      name: "convex-backend",
      script: path.join(__dirname, "bin/convex-local-backend"),
      args: [
        "--instance-name", "contextforge",
        "--instance-secret", INSTANCE_SECRET,
        "--local-storage", path.join(__dirname, "convex-data"),
        "--port", "3210",
        "--site-proxy-port", "3211",
        "--origin", `http://${SERVER_IP}:3210`,
        "--site-origin", `http://${SERVER_IP}:3211`,
      ].join(" "),
      cwd: path.join(__dirname, "convex-data"),
      autorestart: true,
      max_restarts: 10,
    },
    {
      name: "contextforge-frontend",
      script: "pnpm",
      args: "preview --host 0.0.0.0 --port 8080",
      cwd: path.join(__dirname, "ContextForgeTS"),
      interpreter: "none",
      autorestart: true,
      env: {
        PATH: process.env.PATH,
      },
    },
    {
      name: "convex-dashboard",
      script: "docker",
      args: [
        "run", "--rm",
        "--name", "convex-dashboard",
        "-p", "6791:6791",
        "-e", `NEXT_PUBLIC_DEPLOYMENT_URL=http://${SERVER_IP}:3210`,
        "ghcr.io/get-convex/convex-dashboard:latest",
      ].join(" "),
      interpreter: "none",
      autorestart: true,
    },
  ],
}
```

**Step 3: Create .env.example**

Create `deploy/local/.env.example`:
```bash
# Local VPN deployment configuration
# Copy to ~/contextforge/.env and fill in values

# Convex instance secret (generated by: ./bin/convex-local-backend generate-secret)
CONVEX_INSTANCE_SECRET=

# Server IP on VPN (default: 192.168.87.58)
SERVER_IP=192.168.87.58

# Admin key (generated by: ./bin/convex-local-backend generate-admin-key ...)
# Not used by pm2, but save it here for reference
CONVEX_ADMIN_KEY=
```

**Step 4: Create README.md**

Create `deploy/local/README.md`:
```markdown
# Local VPN Deployment

Deploy ContextForge on a local VPN server for PM team usage.

## Prerequisites

- Ubuntu server with Node 20+ (nvm), pnpm, git
- pm2: `npm i -g pm2`
- Claude Code CLI (optional, for AI features)

## Quick Setup

```bash
# 1. Create directory structure
mkdir -p ~/contextforge/{bin,convex-data}

# 2. Download Convex backend binary
cd ~/contextforge/bin
curl -L -o convex-local-backend.zip \
  "https://github.com/get-convex/convex-backend/releases/download/precompiled-2026-02-10-4ef979b/convex-local-backend-x86_64-unknown-linux-gnu.zip"
unzip convex-local-backend.zip && chmod +x convex-local-backend && rm convex-local-backend.zip

# 3. Generate secrets
./convex-local-backend generate-secret
# Save the output as CONVEX_INSTANCE_SECRET

./convex-local-backend generate-admin-key --instance-name contextforge --instance-secret <SECRET>
# Save the output as CONVEX_ADMIN_KEY

# 4. Clone and build
cd ~/contextforge
git clone https://github.com/opcheese/context_forge_ts.git ContextForgeTS
cd ContextForgeTS
pnpm install
VITE_CONVEX_URL=http://192.168.87.58:3210 pnpm build

# 5. Copy deployment config
cp deploy/local/ecosystem.config.cjs ~/contextforge/
cp deploy/local/.env.example ~/contextforge/.env
# Edit ~/contextforge/.env — fill in CONVEX_INSTANCE_SECRET and CONVEX_ADMIN_KEY

# 6. Start services
cd ~/contextforge
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # auto-start on reboot

# 7. Push Convex functions (from dev machine or server)
cd ~/contextforge/ContextForgeTS
CONVEX_SELF_HOSTED_URL=http://192.168.87.58:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY=<ADMIN_KEY> \
npx convex deploy --yes

# 8. Set Convex environment variables
CONVEX_SELF_HOSTED_URL=http://192.168.87.58:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY=<ADMIN_KEY> \
npx convex env set AUTH_ISSUER_URL http://192.168.87.58:3211

# Repeat for each env var:
# SITE_URL=http://192.168.87.58:8080
# CLAUDE_CODE_ENABLED=true
# CLAUDE_CODE_PATH=/home/ubuntu/.local/bin/claude
# OAUTH_ENABLED=false
# SKILL_SCAN_ENABLED=false

# 9. Seed marketplace categories
CONVEX_SELF_HOSTED_URL=http://192.168.87.58:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY=<ADMIN_KEY> \
npx convex run marketplace:seedCategories
```

## Updating

```bash
cd ~/contextforge/ContextForgeTS
git pull
pnpm install
VITE_CONVEX_URL=http://192.168.87.58:3210 pnpm build
pm2 restart contextforge-frontend

# If backend functions changed:
CONVEX_SELF_HOSTED_URL=http://192.168.87.58:3210 \
CONVEX_SELF_HOSTED_ADMIN_KEY=<ADMIN_KEY> \
npx convex deploy --yes
```

## Access

- App: http://192.168.87.58:8080 (requires VPN)
- Convex Dashboard: http://192.168.87.58:6791 (requires VPN)

## Logs

```bash
pm2 logs                    # all logs
pm2 logs convex-backend     # backend only
pm2 logs contextforge-frontend  # frontend only
```
```

**Step 5: Commit**

```bash
git add deploy/local/
git commit -m "feat: add local VPN deployment config (pm2 + self-hosted Convex)"
```

---

### Task 5: Install pm2 and deploy on server

**Step 1: Install pm2 and pull dashboard image**

```bash
ssh ubuntu@192.168.87.58
source ~/.nvm/nvm.sh
npm i -g pm2
docker pull ghcr.io/get-convex/convex-dashboard:latest
```

**Step 2: Install dotenv for ecosystem config**

```bash
cd ~/contextforge/ContextForgeTS
pnpm add -D dotenv
```

Wait — the ecosystem config runs outside the project. Install globally or in ~/contextforge:

```bash
cd ~/contextforge
npm init -y
npm install dotenv
```

**Step 3: Copy deployment files**

```bash
cp ~/contextforge/ContextForgeTS/deploy/local/ecosystem.config.cjs ~/contextforge/
cp ~/contextforge/ContextForgeTS/deploy/local/.env.example ~/contextforge/.env
```

**Step 4: Fill in .env with real secrets**

Edit `~/contextforge/.env` and paste the CONVEX_INSTANCE_SECRET and CONVEX_ADMIN_KEY from Task 2.

**Step 5: Start services**

```bash
cd ~/contextforge
pm2 start ecosystem.config.cjs
```
Expected: three processes start — `convex-backend`, `contextforge-frontend`, and `convex-dashboard`.

**Step 6: Verify**

```bash
pm2 status
curl http://localhost:3210/version
curl -s http://localhost:8080 | head -5
```

**Step 7: Save and enable startup**

```bash
pm2 save
pm2 startup
```
Run the command pm2 prints (it generates a sudo command).

---

### Task 6: Push Convex functions and set env vars

**Step 1: Push functions from server**

```bash
cd ~/contextforge/ContextForgeTS
source ~/.nvm/nvm.sh

export CONVEX_SELF_HOSTED_URL=http://192.168.87.58:3210
export CONVEX_SELF_HOSTED_ADMIN_KEY=<ADMIN_KEY>

npx convex deploy --yes
```
Expected: functions deployed, indexes created.

**Step 2: Set environment variables**

```bash
npx convex env set AUTH_ISSUER_URL http://192.168.87.58:3211
npx convex env set SITE_URL http://192.168.87.58:8080
npx convex env set CLAUDE_CODE_ENABLED true
npx convex env set CLAUDE_CODE_PATH /home/ubuntu/.local/bin/claude
npx convex env set OAUTH_ENABLED false
npx convex env set SKILL_SCAN_ENABLED false
```

**Step 3: Generate auth keys**

Convex Auth needs JWT keys. These should be auto-generated on first auth attempt, but if not:
```bash
npx convex run auth:generateKeys
```
Or check if `JWT_PRIVATE_KEY` and `JWKS` need to be set manually.

**Step 4: Seed marketplace categories**

```bash
npx convex run marketplace:seedCategories
```

**Step 5: Verify**

Open `http://192.168.87.58:8080` in browser:
1. Should see the login/register page
2. Register a new account
3. Should be able to create templates and workflows
4. Check marketplace loads

---

### Task 7: End-to-end verification

**Step 1: Register a PM account**

Open `http://192.168.87.58:8080`, click Sign Up, create account.

**Step 2: Test core features**

- [ ] Create a template with blocks
- [ ] Create a workflow with steps
- [ ] Publish a template to marketplace
- [ ] Browse marketplace and import a template
- [ ] Configure OpenRouter key in Settings
- [ ] Test generation (if OpenRouter key set)

**Step 3: Test persistence**

```bash
pm2 restart all
```
Refresh browser — data should persist (SQLite in ~/contextforge/convex-data/).

**Step 4: Test auto-restart**

```bash
pm2 stop convex-backend
pm2 start convex-backend
```
Verify frontend recovers connection.

---

### Task 8: Commit and push all changes

```bash
git add deploy/local/
git commit -m "feat: add local VPN deployment config (pm2 + self-hosted Convex)"
git push
```
