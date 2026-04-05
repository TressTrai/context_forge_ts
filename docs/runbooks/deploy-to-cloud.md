# Runbook: Deploy to Cloud (Vercel + Convex Cloud)

Production at https://www.contextforgets.com/app is hosted on:
- **Frontend**: Vercel (auto-deploys from `main` on push)
- **Backend**: Convex Cloud (manual deploy OR build-integrated — see below)

---

## The Problem We're Solving

By default, `git push` → Vercel rebuilds the frontend, **but Convex functions are NOT deployed**. This causes errors like `[CONVEX Q(research:getResearchBlock)] Server Error` when the frontend references new functions that don't exist on the Convex side.

Fix: integrate `convex deploy` into the Vercel build command (one-time setup, then fully automatic).

---

## One-Time Setup: Automate Convex Deploys via Vercel

### 1. Generate a production deploy key in Convex

1. Open Convex Dashboard → select the `contextforgets` project
2. Go to **Settings → Deploy Keys**
3. Pick the **Production** deployment → **Generate Production Deploy Key**
4. Copy the key (starts with `prod:...`)

### 2. Add env vars to Vercel

Vercel Dashboard → `contextforgets` project → Settings → Environment Variables. Add for the **Production** environment:

| Name | Value |
|------|-------|
| `CONVEX_DEPLOY_KEY` | The prod key from step 1 |

Also **remove** any hardcoded `VITE_CONVEX_URL` — the build command injects the correct one.

### 3. Override Vercel's build command

Vercel Dashboard → Settings → Build & Development Settings → **Build Command** (toggle override on):

```
npx convex deploy --cmd-url-env-var-name VITE_CONVEX_URL --cmd 'pnpm build'
```

What this does:
- `npx convex deploy` authenticates with `CONVEX_DEPLOY_KEY` and deploys functions
- `--cmd-url-env-var-name VITE_CONVEX_URL` tells convex to inject the URL as `VITE_CONVEX_URL` (Vite's convention)
- `--cmd 'pnpm build'` runs the frontend build AFTER Convex deploy succeeds

If the Convex deploy fails, Vercel fails the build — no desync possible.

### 4. Test

```bash
git commit --allow-empty -m "test: trigger deploy"
git push
```

Watch the Vercel build log — you should see the Convex deploy step before Vite builds.

---

## Manual Deploy (Fallback)

If you need to deploy Convex functions without a git push (e.g. hotfix env var change on Convex, or Vercel is down):

```bash
# From project root
CONVEX_DEPLOY_KEY=<prod-key> npx convex deploy
```

**Important**: there is **no `--prod` flag** on `convex deploy`. The target is determined by the deploy key.

Without `CONVEX_DEPLOY_KEY`, the CLI falls back to `.env.local`'s `CONVEX_DEPLOYMENT`. If that's a `local:` deployment (as ours is), `convex deploy` will deploy to the **prod deployment of that same project**. Either approach works; prefer `CONVEX_DEPLOY_KEY` for clarity.

---

## Troubleshooting

### "Server Error" on a new Convex function after push
Vercel built but Convex wasn't deployed. Either:
- Finish the one-time setup above (permanent fix), or
- Run the manual deploy command

### Vercel build fails at the Convex step
Check the build log. Common causes:
- `CONVEX_DEPLOY_KEY` not set in Vercel env vars
- Schema migration needed — Convex refuses deploy if schema change breaks existing data. Write + run a migration first (see `convex/migrations/`).

### Frontend calls still hit old Convex URL after successful deploy
Browser cache. Hard-reload (Cmd+Shift+R) or clear site data.

### How to find the current prod Convex URL
Convex Dashboard → `contextforgets` project → production deployment → URL at top of page. Should match `VITE_CONVEX_URL` that Vercel injects at build time.

---

## Related Runbooks

- [`deploy-to-vpn.md`](./deploy-to-vpn.md) — self-hosted Convex on VPN (separate deployment, different process)
