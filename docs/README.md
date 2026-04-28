# Panda Docs Index

This directory contains the current source-of-truth docs for the Panda web app.

## Active Docs

- [AGENTS.md](../AGENTS.md) - repo-wide instructions for agents
- [README.md](../README.md) - project overview and quick start
- [VALIDATION_TASKS.md](../VALIDATION_TASKS.md) - historical verification
  snapshot; refresh or remove if CI/task-local status is authoritative
- [docs/AGENTIC_HARNESS.md](./AGENTIC_HARNESS.md) - harness architecture and
  delivery control plane
- [docs/WEBCONTAINER_RUNTIME.md](./WEBCONTAINER_RUNTIME.md) - WebContainer
  runtime setup, fallback behavior, and debugging checklist
- [docs/LLM_PROVIDER_CATALOG.md](./LLM_PROVIDER_CATALOG.md) - live `models.dev`
  provider catalog and hydrated model selector behavior
- [docs/PANDA_WORKBENCH_MODERNIZATION_BRIEF.md](./PANDA_WORKBENCH_MODERNIZATION_BRIEF.md) -
  historical modernization brief; superseded for workspace IA by the chat-first
  implementation record
- [docs/plans/2026-04-26-chat-first-workspace-ia.md](./plans/2026-04-26-chat-first-workspace-ia.md) -
  current chat-first workspace information architecture, implementation
  contract, and verification notes for the woven redesign
- [docs/CHAT_TRANSCRIPT_POLICY.md](./CHAT_TRANSCRIPT_POLICY.md) - transcript vs
  inspector behavior
- [docs/CHAT_MODE_ARCHITECTURE.md](./CHAT_MODE_ARCHITECTURE.md) - active mode,
  routing, and tool-call hardening architecture notes
- [docs/plans/2026-04-23-convex-bandwidth-optimization.md](./plans/2026-04-23-convex-bandwidth-optimization.md) -
  Convex payload-shape and bandwidth remediation plan
- [docs/DEPLOYMENT.md](./DEPLOYMENT.md) - production deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google OAuth setup
- [convex/README.md](../convex/README.md) - backend schema and function map

## Current Product Surface

Panda is a browser-only AI coding workbench with:

- landing and education pages
- project list and project workbench routes
- chat-first per-project workspace with the session timeline as the primary
  surface
- login and shared-chat routes
- admin console pages for users, analytics, system, and security
- Convex-backed persistence for chat, files, runs, delivery state, and sharing
- optional browser-side project command execution through WebContainer
- live LLM provider and model metadata from `models.dev`
- deterministic `ask` / `plan` / `code` / `build` routing with requested and
  resolved mode audit data
- consolidated proof surfaces: `Run`, `Changes`, `Context`, and `Preview`
- mobile workspace destinations: `Work`, `Chat`, `Proof`, and `Preview`
- typed execution receipts rendered from bounded run summaries for completed,
  failed, and stopped runs

## Documentation Review

Reader: maintainers deciding what documentation remains active after the
chat-first workspace, routing, session rail, and receipt implementation.

Post-read action: keep active docs discoverable, treat plans as historical
unless they are still guiding work, and remove only files that are explicitly
marked safe to delete.

### Keep Active

| File                                               | Reason                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `README.md`                                        | Project overview, setup, workflow, and current runtime invariants.                 |
| `AGENTS.md`                                        | Repo-wide AI agent operating contract.                                             |
| `CLAUDE.md`                                        | Claude-compatible alias for agent instructions if still used by local tooling.     |
| `convex/README.md`                                 | Backend schema, function map, and receipt persistence notes.                       |
| `docs/README.md`                                   | Documentation index and cleanup guidance.                                          |
| `docs/AGENTIC_HARNESS.md`                          | Harness architecture, planning workflow, runtime checkpoints, and execution state. |
| `docs/CHAT_TRANSCRIPT_POLICY.md`                   | Defines transcript vs inspector boundaries for tool and receipt detail.            |
| `docs/plans/2026-04-26-chat-first-workspace-ia.md` | Current workspace IA and implemented surface contract.                             |
| `docs/CHAT_MODE_ARCHITECTURE.md`                   | Still useful as the architecture record for mode hardening and routing evolution.  |
| `docs/WEBCONTAINER_RUNTIME.md`                     | Current browser execution setup and fallback behavior.                             |
| `docs/LLM_PROVIDER_CATALOG.md`                     | Current provider/model catalog behavior.                                           |
| `docs/DEPLOYMENT.md`                               | Deployment guide.                                                                  |
| `docs/GOOGLE_OAUTH_SETUP.md`                       | Auth setup guide.                                                                  |
| `.impeccable.md`                                   | Active design context for visual work if the design workflow is still used.        |

### Keep As Historical Plans

These files should remain unless the team moves historical plans into an archive
folder:

| File                                          | Reason                                                                                                     |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `docs/PANDA_CLEANUP_REFACTOR_PROGRAM.md`      | Strategic cleanup program; still relevant as a north-star audit record.                                    |
| `docs/PANDA_WORKBENCH_MODERNIZATION_BRIEF.md` | Historical product/design modernization brief; superseded by the chat-first IA for current shell behavior. |
| `docs/WORKBENCH_UX_PLAN.md`                   | Historical UX planning artifact; keep for refactor context, not as current workspace contract.             |
| `docs/IMPLEMENTATION_PLAN.md`                 | Historical harness/spec integration plan; archive once fully superseded.                                   |
| `docs/plans/*.md`                             | Date-stamped planning records; keep as historical context or move under an archive convention.             |

### Review For Removal Or Archive

Do not delete these automatically. Confirm ownership first:

| File                              | Recommendation                                                                                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDATION_TASKS.md`             | Health snapshot refreshed for the chat-first workspace pass. Keep current with CI/task-local gates or remove if CI fully owns verification records.            |
| `SPEC.md`, `PLAN.md`, `STATUS.md` | Runtime artifacts from the chat-first workspace redesign. Keep until merged or reviewed, then remove unless the team wants them committed as audit evidence.   |
| `.agents/skills/**/*.md`          | Project-local skill docs. Keep if the local skill system is intentional; otherwise move them out of product docs rather than deleting piecemeal.              |

### Remove Candidates

No tracked Markdown file is safe to delete without a maintainer decision. The
only clear cleanup action is to remove temporary root task artifacts after this
work is accepted, if they are not intended to be committed.
