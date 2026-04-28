# Panda.ai

> Panda is a browser-only AI coding workbench for planning, approving, building,
> resuming, and sharing software work from one workspace.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](./apps/web)

## Overview

Panda is a browser-native coding workspace built for AI-assisted development. It
combines a chat-first workspace, canonical 4-mode workflow (`ask`, `plan`,
`code`, `build`), structured plan approval, build execution, file editing,
runtime checkpoints, shared chat history, and admin controls in one web app.

The current workspace is organized around one session timeline. User intent
enters through chat, Panda routes it, work executes, proof accumulates, and the
user reviews the result through focused `Run`, `Changes`, `Context`, and
`Preview` surfaces. Mobile keeps the same contract through `Work`, `Chat`,
`Proof`, and `Preview` destinations.

The current agent runtime includes deterministic routing, bounded session
summaries, and typed execution receipts. Routing records both the user-requested
mode and the resolved execution mode, while receipts provide a bounded audit
trail for context, tools, commands, approvals, token usage, execution duration,
and result status.

## Current Product Surface

- Landing page plus an education page that explains the workbench workflow
- Project list and per-project chat-first workbench routes
- Structured planning sessions with approved build-from-plan runs
- Browser-native file editing, diffs, artifacts, previews, and terminal jobs
- Permission review for risky commands in the web UI
- Deterministic mode routing with `requestedMode` and `resolvedMode` audit data
- Run timeline summaries in chat with structured execution receipts in proof
  surfaces
- Quiet session rail state for active, blocked, review-ready, running, and
  completed work
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

Workspace surfaces:

- Chat is the primary session timeline and composer surface.
- `Run` shows progress, validation evidence, recovery state, and receipts.
- `Changes` shows artifacts, diffs, generated files, and review actions.
- `Context` shows planning, memory, specifications, and context audit state.
- `Preview` shows the browser/runtime preview when available.
- Mobile navigation exposes `Work`, `Chat`, `Proof`, and `Preview` without
  changing the underlying workspace contract.

Modes:

- `ask` - read-only Q&A
- `plan` - planning and review
- `code` - direct code changes
- `build` - full-access execution

Routing is rules-first and deterministic. Manual mode selection remains
authoritative for composer sends, while programmatic sends can resolve to a more
appropriate mode when a clear intent is detected. WebContainer readiness does
not globally block `code` or `build`; Panda falls back to the server-backed path
when browser execution is unavailable.

## Execution Receipts

Every terminal agent run can persist a typed receipt alongside the final run
state. Receipts are designed for auditability and Convex bandwidth safety:

- versioned and validated in Convex
- persisted atomically when runs complete, fail, or stop
- bounded to avoid unbounded live-query payloads
- command summaries redact common secret forms before storage or rendering
- WebContainer and native/server execution are reported separately
- approval decisions are captured when present in the run event stream

Run timeline rows in chat are derived from the same bounded run model as the
proof surfaces. The visible stages are intent, routing, planning, execution,
validation, receipt, and next action. Low-level tool events remain available in
inspection surfaces instead of becoming the default transcript experience.

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
- Keep routing deterministic unless a future LLM classifier is explicitly added
  behind a feature flag.
- Keep execution receipt fields typed, bounded, and redacted before they enter
  Convex.
- Keep the workspace chat-first: chat is primary, proof is focused, and the
  editor supports inspection and spot edits rather than replacing the session
  timeline.
- Keep proof tabs consolidated as `Run`, `Changes`, `Context`, and `Preview`.
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
- [docs/CHAT_TRANSCRIPT_POLICY.md](./docs/CHAT_TRANSCRIPT_POLICY.md) - chat vs
  inspector boundaries for progress, tools, and receipts
- [docs/plans/2026-04-26-chat-first-workspace-ia.md](./docs/plans/2026-04-26-chat-first-workspace-ia.md) -
  current chat-first workspace information architecture and implementation notes
- [docs/LLM_PROVIDER_CATALOG.md](./docs/LLM_PROVIDER_CATALOG.md) - live LLM
  provider and model catalog behavior
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) - deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./docs/GOOGLE_OAUTH_SETUP.md) - auth setup
- [docs/plans/2026-04-23-convex-bandwidth-optimization.md](./docs/plans/2026-04-23-convex-bandwidth-optimization.md) -
  Convex bandwidth remediation plan and payload-shape invariants

## Verification Records

Historical verification snapshots may exist in
[VALIDATION_TASKS.md](./VALIDATION_TASKS.md). Treat the current CI output and
the latest task-local validation notes as authoritative when they differ.

The chat-first workspace redesign was last verified with:

- `bun run typecheck && bun run lint && bun run format:check && bun test`
- `npx convex dev --once`
- `bun run test:e2e`

## License

MIT
