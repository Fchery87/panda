# Panda.ai

> Panda is a browser-only AI coding workbench for planning, approving, building,
> resuming, and sharing software work from one workspace.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](./apps/web)

## Overview

Panda is a browser-native coding workspace built for AI-assisted development. It
combines chat-driven planning, plan approval, build execution, file editing,
delivery-state tracking, resume checkpoints, shared chat history, and admin
controls in one web app.

## Current Product Surface

- Landing page plus an education page that explains the four workbench surfaces
- Project list and per-project workbench routes
- Plan review before execution, with approved build-from-plan runs
- Browser-native file editing, diffs, artifacts, and terminal jobs
- Permission review for risky commands in the web UI
- Shared chat links for public, read-only conversation review
- Admin console pages for users, analytics, system controls, and security
- Convex-backed delivery state, QA, ship, and checkpoint history

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

## Repository Shape

```text
panda/
├── apps/web/        # Next.js web app
├── convex/          # Convex backend
├── docs/            # Active docs + historical archive index
└── packages/sdk/    # Shared SDK package
```

## Key Docs

- [docs/README.md](./docs/README.md) - docs index and archive guidance
- [AGENTS.md](./AGENTS.md) - working rules for AI agents in this repo
- [docs/AGENTIC_HARNESS.md](./docs/AGENTIC_HARNESS.md) - harness architecture
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) - auth setup
- [VALIDATION_TASKS.md](./VALIDATION_TASKS.md) - current verification record

## Current Verification Snapshot

See [VALIDATION_TASKS.md](./VALIDATION_TASKS.md) for the latest command-level
status and health score.

## License

MIT
