# Panda.ai

> Panda is a browser-first AI coding workbench with server fallback for
> planning, approving, building, resuming, and sharing software work from one
> workspace.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-Realtime-orange)](https://convex.dev)
[![Bun](https://img.shields.io/badge/Bun-1.2.0-purple)](https://bun.sh)
[![Tests](https://img.shields.io/badge/Tests-Unit%20%2B%20E2E-brightgreen)](./apps/web)

## Overview

Panda is a browser-first coding workspace built for AI-assisted development. It
combines a workbench-owned file surface, modern Ask / Plan / Agent workflow,
Agent autonomy levels (`Guided` and `Autopilot`), structured plan approval,
build execution, central file editing and diff review, runtime checkpoints,
shared chat history, and admin controls. Browser execution is preferred when
WebContainer is available; server-backed execution remains the fallback when
browser-side execution is unavailable.

Panda also supports user-scoped Custom Skills and Custom Subagents. Skills are
reusable workflow guidance that can auto-activate by intent; Subagents are
delegated workers with capability presets and optional attached Skills.

The current workspace is organized around a central workbench with supporting
chat and right-rail review surfaces. User intent enters through chat, Panda
routes it, plans can auto-open in the workbench, generated files appear in the
file tree and central Review Diff, proof accumulates, and the user reviews the
result through `Proof`, `Changes`, and `Context`. Mobile keeps the same contract
through `Work`, `Chat`, `Proof`, and `Changes` destinations.

The current agent runtime includes deterministic routing, automatic mode
switching, cross-mode handoff context, bounded session summaries, and typed
execution receipts. Routing records both the user-requested mode and the
resolved execution mode. When intent clearly changes, Panda can switch or
suggest switching modes according to the user's mode-routing preference. Receipts
provide a bounded audit trail for context, tools, commands, approvals, token
usage, execution duration, and result status.

## Current Product Surface

- Landing page plus an education page that explains the workbench workflow
- Project list and per-project workbench routes
- Structured planning sessions with approved build-from-plan runs and clean
  `.plan.md`-style documents
- Browser-native file editing, central diffs, generated-file review, artifacts,
  and terminal jobs
- Permission review for risky commands in the web UI
- Deterministic mode routing with `requestedMode` and `resolvedMode` audit data,
  confidence-aware auto-switching, visible auto-switch transcript chips, and a
  user preference for `Auto-switch`, `Suggest first`, or `Manual only`
- Run timeline summaries in chat with collapsed tool-chip and plan-checklist
  surfaces, and structured execution receipts in Proof surfaces
- Custom Skills that shape agent workflow and strict Skill preflight metadata
- Custom Subagents with capability presets, attached Skills, and delegated task
  Skill matching
- Quiet session rail state for active, blocked, review-ready, running, and
  completed work
- Shared chat links for public, read-only conversation review
- Admin console pages for users, analytics, system controls, and security
- Convex-backed persistence for plans, messages, runs, checkpoints, specs,
  indexed message/plan context chunks, and sharing

## Tech Stack

| Layer           | Technology                         |
| --------------- | ---------------------------------- |
| Framework       | Next.js 16 (App Router)            |
| Runtime         | React 19 + TypeScript 5.9          |
| Backend         | Convex                             |
| Authentication  | Convex Auth + Google OAuth         |
| UI              | shadcn/ui + Neutral Precision theme |
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

Create `apps/web/.env.local` with the required Convex, provider, and local-dev
values:

```env
NEXT_PUBLIC_CONVEX_URL=https://<your-project>.convex.cloud
CONVEX_SITE_URL=https://<your-convex-site>.convex.site

# Local E2E auth bypass. Production stays fail-closed.
E2E_AUTH_BYPASS_SECRET=

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

# Optional GitHub-backed projects
GITHUB_APP_SLUG=your-github-app-slug
```

The local E2E bypass is secret-gated via `E2E_AUTH_BYPASS_SECRET` and is not a
production-capable mechanism.

For repository-backed projects, create and install a GitHub App using
[docs/GITHUB_APP_SETUP.md](./docs/GITHUB_APP_SETUP.md).

## Development Commands

| Command                | When to use it                                    | What it proves                                                                                                    |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `bun run dev`          | Daily local development                           | Starts Convex dev and the Next.js workspace together.                                                             |
| `bun run typecheck`    | Before review or after data/model changes         | Verifies TypeScript, package boundaries, and generated Convex bindings.                                           |
| `bun run lint`         | Before review                                     | Enforces the shared ESLint rules across the monorepo.                                                             |
| `bun run format:check` | Before PR/CI                                      | Confirms Prettier formatting without mutating files.                                                              |
| `bun test`             | After runtime, Convex, hook, or component changes | Runs Bun unit and component coverage across the repo.                                                             |
| `bun run test:e2e`     | Before shipping workspace UX changes              | Runs focused Playwright acceptance for workbench, agent-run, permissions, and sharing flows.                      |
| `bun run build`        | Release gate                                      | Compiles the production app.                                                                                      |
| `bun run validate:web` | Full local web gate                               | Runs command drift checks, Convex collect audit, typecheck, lint, format check, web tests, and build in sequence. |

The command catalog source of truth is
[`docs/development-commands.json`](./docs/development-commands.json);
`bun run docs:commands:check` guards the README and workspace command deck
against drift.

Recommended proof loop:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

## Canonical Workflow

Panda is optimized for this flow:

1. Direct the AI
2. Review the generated plan
3. Approve the plan
4. Watch execution happen
5. Inspect what changed

Workspace surfaces:

- `Work` is the primary file/editing surface. Every explicit file click opens in
  the central workbench.
- `Chat` is the session timeline and composer surface.
- `Proof` shows progress, validation evidence, recovery state, receipts,
  walkthroughs, and checkpoints.
- `Changes` summarizes generated files and actions, then routes review into the
  central `Review Diff` surface.
- `Context` shows planning, memory, specifications, and context audit state.
- Mobile navigation exposes `Work`, `Chat`, `Proof`, and `Changes` without
  relying on a live-preview destination.

Modes:

```text
Ask      Plan      Agent
                  ├─ Guided
                  └─ Autopilot
```

Runtime compatibility is preserved internally:

- `ask` - Ask: read-only Q&A, review, research, and codebase inspection
- `plan` - Plan: read-only planning, clarification, and durable plan drafting
- `code` - Agent · Guided: implementation with review prompts for edits and commands
- `build` - Agent · Autopilot: broader execution that applies safe changes and
  interrupts for risky actions

Debug, Review, and Docs are secondary actions/task intents rather than primary
modes. Routing emits suggested skill hints for those intents so Panda can attach
the right workflow without expanding the top-level mode picker. Subagents are
also intentionally excluded from the main mode selector: the selector chooses
the parent run's intent and trust boundary, while Subagents are delegated child
workers surfaced through Settings, Agent Manager, Active Agents, Chat Inspector,
SubagentPanel run-tree views, and future explicit delegation affordances.

Routing is rules-first and deterministic. Manual mode overrides remain
authoritative. Otherwise Panda can automatically switch modes, suggest a switch,
or stay put based on confidence and the user's mode-routing preference:
`Auto-switch`, `Suggest first`, or `Manual only`. Auto-switches are recorded in
message annotations and rendered as visible transcript chips. WebContainer
readiness does not globally block Agent Guided or Agent Autopilot; Panda falls
back to the server-backed path when browser execution is unavailable.

Cross-mode handoff keeps task continuity across Ask → Plan → Agent flows. For
referential requests like “save this plan” or “use your audit findings,” Panda
resolves the latest approved plan, Plan-mode output, or Ask-mode findings and
injects that handoff as system context instead of fabricating user transcript
messages.

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
proof surfaces. The chat shows two collapsed inline elements:

- **Tool chips** (code + build): grouped tool-call summaries like `Edited 3 · Ran 2`
  that expand to per-tool details (file paths, durations, errors).
- **Plan checklist** (all modes when a plan exists): a progress badge like
  `Plan 2/4 · in progress` that expands to a step-by-step checklist.

Low-level tool events, full receipts, and snapshot data remain in the support
rail and Proof surface, not in the chat transcript.

## Custom Skills And Subagents

Custom Skills and Custom Subagents are separate extension points:

- Custom Skills are user-scoped workflow documents stored in Convex. They define
  trigger phrases, applicable modes, a soft or strict workflow profile,
  instructions, optional checklists, required validation guidance, suggested
  Subagents, and an auto-activation toggle.
- Custom Subagents are delegated workers. They define a name, description,
  prompt, capability preset, default attached Skills, and whether delegated task
  prompts can auto-match additional Skills.
- Admin settings can disable user Skills, Skill auto-activation, strict user
  Skills, import/export policy, user Subagents, and available Subagent
  capability presets.
- Runs persist bounded Applied Skill summaries so proof surfaces can explain
  which Skills shaped execution without storing full Skill bodies in compact
  progress rows or public projections.

The implemented foundation supports create/delete settings flows, deterministic
Skill matching, prompt composition, strict Skill preflight events, delegated
Subagent Skill composition, first-class child run persistence, run-tree UI,
parent stop propagation, fresh/fork child context filtering, structured
Subagent diagnostics, patch-proposal previews, and bounded retention cleanup.
Edit, duplicate, import/export, richer proof detail, parent-reviewed patch apply,
true snapshot/worktree isolation, saved chains, and full browser acceptance
coverage remain planned follow-up work.

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
- Treat Ask / Plan / Agent as the canonical user-facing mode model. Preserve
  `ask`, `plan`, `code`, and `build` as runtime/persisted compatibility values,
  where `code` is Agent · Guided and `build` is Agent · Autopilot.
- Keep routing deterministic unless a future LLM classifier is explicitly added
  behind a feature flag. Auto-switch behavior must remain confidence-aware,
  preference-aware, transcript-visible, and respectful of manual overrides.
- Keep cross-mode handoff context out of synthetic user messages; inject plan,
  audit, and approved-plan handoffs as system/developer context.
- Keep execution receipt fields typed, bounded, and redacted before they enter
  Convex.
- Keep the workspace workbench-owned: the central workbench owns file opening,
  editing, and Review Diff; chat remains the session timeline and composer.
- Keep the right support rail consolidated as `Proof`, `Changes`, and `Context`.
  Do not reintroduce a product-level live `Preview` destination unless the
  feature is intentionally rebuilt.
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
- [docs/ARCHITECTURE_CONTRACT.md](./docs/ARCHITECTURE_CONTRACT.md) - canonical
  vocabulary and source-of-truth map
- [docs/SECURITY_TRUST_BOUNDARIES.md](./docs/SECURITY_TRUST_BOUNDARIES.md) -
  authorization, redaction, sharing, token, and telemetry policy
- [docs/CONVEX_BACKEND_GOVERNANCE.md](./docs/CONVEX_BACKEND_GOVERNANCE.md) -
  Convex ownership, query-shape, retention, and legacy API rules
- [AGENTS.md](./AGENTS.md) - working rules for AI agents in this repo
- [docs/AGENTIC_HARNESS.md](./docs/AGENTIC_HARNESS.md) - harness architecture
- [docs/WEBCONTAINER_RUNTIME.md](./docs/WEBCONTAINER_RUNTIME.md) - browser-side
  execution runtime
- [docs/CHAT_MODE_ARCHITECTURE.md](./docs/CHAT_MODE_ARCHITECTURE.md) - Ask /
  Plan / Agent mode architecture, autonomy mapping, automatic mode switching,
  and cross-mode handoff contract
- [docs/CHAT_TRANSCRIPT_POLICY.md](./docs/CHAT_TRANSCRIPT_POLICY.md) - chat
  transcript elements (tool chips, plan checklist, auto-switch chips), inspector
  boundaries, handoff transcript policy, and redaction rules
- [docs/PLAN_DOCUMENT_FORMAT.md](./docs/PLAN_DOCUMENT_FORMAT.md) - `.plan.md`
  frontmatter, Mermaid, and clean generated-plan document format
- [docs/WORKBENCH.md](./docs/WORKBENCH.md) - current workbench-owned file
  opening, generated-file review, support rail, and mobile workspace contract
- [docs/plans/2026-05-22-workbench-owned-file-opening-plan.md](./docs/plans/2026-05-22-workbench-owned-file-opening-plan.md) -
  current workbench-owned file opening, plan rendering, and support-rail implementation record
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

The workbench-owned workspace redesign should be verified with:

- `bun run typecheck && bun run lint && bun run format:check && bun test`
- `npx convex dev --once`
- `bun run test:e2e`

## License

MIT
