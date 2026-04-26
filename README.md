# Panda.ai

> Panda is a browser-only AI coding workbench for planning, approving, building,
> resuming, and sharing software work from one workspace.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](./apps/web)

## Overview

Panda is a browser-native coding workspace built for AI-assisted development. It
combines a canonical 4-mode workflow (`ask`, `plan`, `code`, `build`),
structured plan approval, build execution, file editing, runtime checkpoints,
shared chat history, and admin controls in one web app.

## Current Product Surface

- Landing page plus an education page that explains the workbench workflow
- Project list and per-project workbench routes
- Structured planning sessions with approved build-from-plan runs
- Browser-native file editing, diffs, artifacts, and terminal jobs
- Permission review for risky commands in the web UI
- Shared chat links for public, read-only conversation review
- Admin console pages for users, analytics, system controls, and security
- Convex-backed persistence for plans, messages, runs, checkpoints, specs, and
  sharing

## Tech Stack

| Layer           | Technology                         |
| --------------- | ---------------------------------- |
| Framework       | Next.js 16 (App Router)            |
| Runtime         | React 19 + TypeScript 5.9          |
| Backend         | Convex                             |
| Authentication  | Convex Auth + Google OAuth         |
| UI              | shadcn/ui + custom brutalist theme |
| Animation       | Framer Motion                      |
| Editor          | CodeMirror 6                       |
| Browser Runtime | WebContainer API                   |
| Model Catalog   | models.dev                         |
| Testing         | Bun test + Playwright              |
| Package Manager | Bun                                |
| Monorepo        | Turborepo                          |

## Quick Start

### Prerequisites

- Bun 1.2.0+
- Node.js 20+
- Git

### Installation

```bash
git clone https://github.com/Fchery87/panda.git
cd panda
bun install
bunx convex dev --init
bun run dev
```

### Environment

Create `apps/web/.env.local` with the required Convex and provider values:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud

# At least one model provider
OPENAI_API_KEY=sk-...
# or
OPENROUTER_API_KEY=sk-...

# Optional browser-side project execution
NEXT_PUBLIC_WEBCONTAINER_ENABLED=true
NEXT_PUBLIC_WEBCONTAINER_API_KEY=

# Optional auth configuration
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
CONVEX_AUTH_SECRET=your-random-secret
CONVEX_SITE_URL=https://<your-convex-site>.convex.site
```

## Development Commands

```bash
# App + backend
bun run dev

# Source verification
bun run typecheck
bun run lint
bun run format:check
bun test

# Focused browser acceptance
bun run test:e2e

# Production build
bun run build
```

## Canonical Workflow

Panda is optimized for this flow:

1. Direct the AI
2. Review the generated plan
3. Approve the plan
4. Watch execution happen
5. Inspect what changed

Modes:

- `ask` - read-only Q&A
- `plan` - planning and review
- `code` - direct code changes
- `build` - full-access execution

## Repository Shape

```text
panda/
├── apps/web/        # Next.js web app
├── convex/          # Convex backend
├── docs/            # Active docs + historical archive index
└── packages/sdk/    # Shared SDK package
```

## Notes For Contributors

- Treat `planningSessions` as the canonical planning system.
- Treat the 4-mode model as canonical across UI, runtime, and tests.
- Use Zustand for local shell/chat-session state and Convex for persisted
  product data.
- Keep Convex live queries narrow. Project boot should subscribe to metadata,
  summaries, and paginated results; fetch large file contents, transcript
  history, run event details, attachment URLs, and runtime checkpoints only when
  the UI needs them.
- Prefer bounded queries over `.collect()` on user- or chat-growing tables. If a
  broad query is unavoidable, document why and add a regression guard.
- Run `bun run typecheck && bun run lint && bun run format:check && bun test`
  before finishing changes.

## Key Docs

- [docs/README.md](./docs/README.md) - docs index and archive guidance
- [AGENTS.md](./AGENTS.md) - working rules for AI agents in this repo
- [docs/AGENTIC_HARNESS.md](./docs/AGENTIC_HARNESS.md) - harness architecture
- [docs/WEBCONTAINER_RUNTIME.md](./docs/WEBCONTAINER_RUNTIME.md) - browser-side
  execution runtime
- [docs/LLM_PROVIDER_CATALOG.md](./docs/LLM_PROVIDER_CATALOG.md) - live LLM
  provider and model catalog behavior
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) - auth setup
- [docs/plans/2026-04-23-convex-bandwidth-optimization.md](./docs/plans/2026-04-23-convex-bandwidth-optimization.md) -
  Convex bandwidth remediation plan and payload-shape invariants

## Current Verification Snapshot

See [VALIDATION_TASKS.md](./VALIDATION_TASKS.md) for the latest command-level
status and health score.

## License

MIT
