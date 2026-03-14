# Panda.ai

> Panda is a web-only AI coding workbench for planning, approving, building,
> resuming, and sharing software work from one browser workspace.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](./apps/web)

## Overview

Panda is a browser-native coding workspace built for AI-assisted development. It
combines chat-driven planning, plan approval, build execution, file editing,
artifact review, command permissions, resumable runs, and shared chat history in
one web app. The product is intentionally web-only: no desktop client, no mobile
app, no split platform story.

## Current Product Surface

- **Plan to Build workflow** with saved plan drafts and explicit review gates
- **Build-from-plan execution** with run progress and execution history
- **Browser-native file editing** with seeded file flows, artifacts, and diffs
- **Permission review** for risky commands directly in the web UI
- **Resumable runtime checkpoints** for paused or interrupted runs
- **Shared chat links** for public, read-only conversation review
- **Live project state** backed by Convex queries, mutations, and actions

## Tech Stack

| Layer           | Technology                         |
| --------------- | ---------------------------------- |
| Framework       | Next.js 16 (App Router)            |
| Runtime         | React 19 + TypeScript              |
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

Create `.env.local` with the required Convex and provider values:

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
├── docs/            # Product, architecture, and plan docs
└── packages/sdk/    # Shared SDK package
```

## Key Docs

- [AGENTS.md](./AGENTS.md) - Working rules for AI agents in this repo
- [docs/AGENTIC_HARNESS.md](./docs/AGENTIC_HARNESS.md) - Harness architecture
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - Deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) - Auth setup
- [docs/plans/2026-03-13-panda-web-stabilization-plan.md](./docs/plans/2026-03-13-panda-web-stabilization-plan.md) -
  Completed web stabilization plan
- [VALIDATION_TASKS.md](./VALIDATION_TASKS.md) - Current verification record

## Current Verification Snapshot

As of 2026-03-13:

- `bun run typecheck`: passing
- `bun run lint`: passing
- `bun run format:check`: passing
- `bun test`: passing
- `bun run test:e2e`: passing

## License

MIT
