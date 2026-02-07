# Panda.ai Deployment Guide (Convex + Next.js + Vercel)

> Last updated: February 7, 2026
>
> Scope: Production deployment for this repository (`panda-ai`) with Convex
> backend and Next.js frontend.

## 1. Architecture and deployment model

This project is split into:

- Frontend: Next.js app in `apps/web`
- Backend: Convex functions in `convex/`

Production requires both parts to be configured correctly:

1. Convex production deployment is live and has required backend secrets
2. Frontend deployment has `NEXT_PUBLIC_CONVEX_URL` pointing to the production
   Convex deployment

Relevant repo files:

- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`
- `apps/web/next.config.ts`
- `apps/web/app/providers.tsx`
- `convex/auth.config.ts`
- `README.md`
- `docs/GOOGLE_OAUTH_SETUP.md`

## 2. Prerequisites

- Bun `1.2.0+`
- Node.js `20+`
- Convex account and project
- Vercel account
- GitHub repository connected to Vercel and/or GitHub Actions
- Google OAuth credentials if using login in production

Install dependencies:

```bash
bun install
```

## 3. Required environment variables

## 3.1 Frontend (Vercel project env vars)

Required:

- `NEXT_PUBLIC_CONVEX_URL=https://<your-prod-deployment>.convex.cloud`

Why required:

- Used by `ConvexReactClient` in `apps/web/app/providers.tsx`
- Re-exported in `apps/web/next.config.ts` for app runtime

Optional (feature/provider specific):

- Any frontend-visible `NEXT_PUBLIC_*` variables you add for UI/runtime behavior

## 3.2 Convex production env vars (set in Convex dashboard/CLI)

For Google auth and Convex Auth production:

- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `CONVEX_AUTH_SECRET`
- `SITE_URL=https://<your-frontend-domain>`

`convex/auth.config.ts` uses:

- `CONVEX_SITE_URL`/provider domain wiring in auth configuration

Set Convex env vars with CLI:

```bash
npx convex env set AUTH_GOOGLE_ID "<value>"
npx convex env set AUTH_GOOGLE_SECRET "<value>"
npx convex env set CONVEX_AUTH_SECRET "<value>"
npx convex env set SITE_URL "https://<your-frontend-domain>"
```

## 3.3 GitHub Actions secrets (if using the included deploy workflow)

From `.github/workflows/deploy.yml`:

- `CONVEX_DEPLOY_KEY` (required for Convex deploy job)
- `CONVEX_PROD_URL` (used for production build env in frontend job)

If you uncomment the Vercel Action block:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## 4. Recommended production path (Vercel Git integration + Convex deploy)

This path aligns with current Vercel and Convex docs and keeps deployment
simple.

1. Create/import Vercel project from your GitHub repo.
2. For monorepo selection, deploy `apps/web` as the web project.
3. Set Vercel production env var:
   - `NEXT_PUBLIC_CONVEX_URL` = prod Convex cloud URL
4. In Convex dashboard, generate production deploy key (`CONVEX_DEPLOY_KEY`).
5. Deploy Convex backend from CI or CLI:
   - `bunx convex deploy`
6. Ensure Google OAuth redirect URI includes:
   - `https://<your-deployment>.convex.site/api/auth/callback/google`
7. Deploy frontend by pushing to `main` (Vercel auto-deploy).

Verification:

- Open `/login`, complete Google sign-in, confirm redirect into app
- Confirm app can read/write Convex data in production

## 5. Alternative path (repo’s GitHub Actions `deploy.yml`)

Current workflow behavior:

- Job 1: `deploy-convex`
  - Runs `bunx convex deploy` with `CONVEX_DEPLOY_KEY`
- Job 2: `deploy-frontend`
  - Runs `bun run build` with
    `NEXT_PUBLIC_CONVEX_URL=${{ secrets.CONVEX_PROD_URL }}`
  - Vercel deploy step is present but commented out

To fully automate frontend deploy in this workflow, either:

1. Keep Vercel Git integration (recommended): no action changes needed
2. Or uncomment and configure Vercel action with required secrets

## 6. Step-by-step production checklist

1. Run quality gates locally:
   - `bun run typecheck && bun run lint && bun run format:check && bun test`
2. Ensure Convex production env vars are set.
3. Ensure Vercel project env var `NEXT_PUBLIC_CONVEX_URL` is set for production
   (and preview if needed).
4. Ensure Google OAuth redirect URI matches production Convex site URL.
5. Deploy Convex:
   - `bunx convex deploy`
6. Deploy frontend:
   - Push to `main` for Vercel auto deploy, or trigger your chosen CI deployment
     flow.
7. Smoke test production:
   - Login flow
   - Project list loads
   - Chat can read/write messages
   - No missing env var runtime errors

## 7. Staging/preview strategy

Convex supports:

- One shared production deployment per project
- Per-developer dev deployments

For stable staging, use a separate Convex project and corresponding Vercel env
vars:

- Staging Vercel: `NEXT_PUBLIC_CONVEX_URL=<staging convex cloud URL>`
- Staging Convex: staging-specific auth/env values

This avoids accidental promotion of staging runtime config to production.

## 8. Monorepo notes for Vercel

For Turborepo monorepos on Vercel:

- Vercel supports importing monorepos and setting per-project root directories
- Ensure project points to `apps/web` (or equivalent frontend root)
- If build output depends on env values, keep env vars consistent across targets

## 9. Common failure modes and fixes

## 9.1 `NEXT_PUBLIC_CONVEX_URL` missing

Symptoms:

- App renders Convex config warning or fails to connect

Fix:

- Set `NEXT_PUBLIC_CONVEX_URL` in Vercel env vars
- Redeploy frontend

## 9.2 Google auth redirect mismatch

Symptoms:

- `redirect_uri_mismatch` from Google

Fix:

- Update Google OAuth redirect URI to:
  - `https://<deployment>.convex.site/api/auth/callback/google`

## 9.3 Convex deploy fails in CI

Symptoms:

- Deploy job errors about missing deploy key

Fix:

- Ensure `CONVEX_DEPLOY_KEY` secret is present in CI environment

## 9.4 Frontend points to wrong backend

Symptoms:

- Production frontend talks to dev/staging Convex

Fix:

- Verify `NEXT_PUBLIC_CONVEX_URL` per environment (`production`, `preview`,
  `development`)
- Redeploy after correction

## 10. Operational recommendations

- Keep production and staging Convex projects separate
- Rotate `CONVEX_DEPLOY_KEY` and auth secrets regularly
- Enforce branch protection + required CI checks
- Add post-deploy smoke tests (auth + critical data paths)
- Keep deployment docs in sync when workflow/env names change

## 11. Reference commands

```bash
# Install
bun install

# Local dev (Convex + web)
bun run dev

# Build
bun run build

# Convex production deploy
bunx convex deploy

# Full quality gate
bun run typecheck && bun run lint && bun run format:check && bun test
```

## 12. Sources

Official docs used to craft this runbook:

- Convex: Deploying to production
  - https://docs.convex.dev/production
- Convex + Vercel hosting
  - https://docs.convex.dev/production/hosting/vercel
- Convex deployment URLs / `NEXT_PUBLIC_CONVEX_URL`
  - https://docs.convex.dev/client/react/deployment-urls
- Next.js deployment guidance (v16 docs)
  - https://github.com/vercel/next.js/blob/v16.1.5/docs/01-app/01-getting-started/17-deploying.mdx
  - https://github.com/vercel/next.js/blob/v16.1.5/docs/01-app/02-guides/environment-variables.mdx
- Vercel monorepo + Turborepo docs
  - https://vercel.com/docs/monorepos
  - https://vercel.com/docs/monorepos/turborepo

Repository-specific deployment context:

- `.github/workflows/deploy.yml`
- `.github/workflows/ci.yml`
- `README.md`
- `docs/GOOGLE_OAUTH_SETUP.md`
