# Panda Docs Index

This directory contains the current source-of-truth docs for the Panda web app.
When active docs disagree, use the authority order in
[Architecture Contract](./ARCHITECTURE_CONTRACT.md).

## Status Labels

Use these labels before following any document for implementation work:

- Active authority: current contracts that win when docs disagree.
- Current guide: operational setup or feature guidance that follows active
  authority docs.
- Historical record: useful context, not current authority unless it points back
  to an active authority doc.
- Proposed plan: not current implementation until accepted and verified.
- Completed milestone: implementation evidence, useful after checking the active
  contract it references.

## Active Authority And Current Guides

- [AGENTS.md](../AGENTS.md) - repo-wide instructions for agents
- [README.md](../README.md) - project overview and quick start
- [docs/ARCHITECTURE_CONTRACT.md](./ARCHITECTURE_CONTRACT.md) - canonical
  vocabulary, source-of-truth map, and docs authority
- [docs/SECURITY_TRUST_BOUNDARIES.md](./SECURITY_TRUST_BOUNDARIES.md) - backend
  authorization, redaction, sharing, provider-token, MCP, and telemetry rules
- [docs/CONVEX_BACKEND_GOVERNANCE.md](./CONVEX_BACKEND_GOVERNANCE.md) - Convex
  ownership classes, query shapes, retention policy, and legacy API handling
- [docs/AGENTIC_HARNESS.md](./AGENTIC_HARNESS.md) - harness architecture and
  delivery control plane
- [docs/WEBCONTAINER_RUNTIME.md](./WEBCONTAINER_RUNTIME.md) - WebContainer
  runtime setup, fallback behavior, and debugging checklist
- [docs/LLM_PROVIDER_CATALOG.md](./LLM_PROVIDER_CATALOG.md) - live `models.dev`
  provider catalog and hydrated model selector behavior
- [docs/PANDA_PRODUCT_SYSTEM_DESIGN_BRIEF.md](./PANDA_PRODUCT_SYSTEM_DESIGN_BRIEF.md) -
  shareable product, page, feature, and design-system brief for generating a
  complete Panda design project
- [docs/CHAT_TRANSCRIPT_POLICY.md](./CHAT_TRANSCRIPT_POLICY.md) - transcript
e  elements (tool chips, plan checklist), inspector boundaries, and redaction rules
- [docs/CHAT_MODE_ARCHITECTURE.md](./CHAT_MODE_ARCHITECTURE.md) - active mode,
  routing, and tool-call hardening architecture notes
- [docs/CUSTOM_SKILLS_AND_SUBAGENTS_PLAN.md](./CUSTOM_SKILLS_AND_SUBAGENTS_PLAN.md) -
  implementation plan for Custom Skills, Custom Subagents, skill activation,
  capability presets, and run visibility
- [docs/plans/2026-04-23-convex-bandwidth-optimization.md](./plans/2026-04-23-convex-bandwidth-optimization.md) -
  Convex payload-shape and bandwidth remediation plan
- [docs/plans/layered-harness-policy-implementation.md](./plans/layered-harness-policy-implementation.md) -
  completed implementation record for layered Harness Policy, command-family
  governance, permission audit decisions, Subagent summaries, Unattended
  Execution, MCP policy alignment, and settings/docs surfacing
- [docs/DEPLOYMENT.md](./DEPLOYMENT.md) - production deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google OAuth setup
- [docs/GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md) - GitHub App setup for
  GitHub-backed Panda projects
- [docs/DELIVERY_HANDOFF_POLICY.md](./DELIVERY_HANDOFF_POLICY.md) - product
  boundary for deployment, export, and GitHub-backed review handoff
- [convex/README.md](../convex/README.md) - backend schema and function map

## Historical And Planning Records

- [docs/development-commands.json](./development-commands.json) - source of
  truth for commands rendered in Workspace Home and README
- [docs/convex-collect-audit.json](./convex-collect-audit.json) -
  machine-readable ceiling for audited production Convex `.collect()` calls
- [docs/reviews/panda-codebase-workspace-review-2026-05-16.md](./reviews/panda-codebase-workspace-review-2026-05-16.md) -
  codebase/workspace review snapshot
- [docs/reviews/convex-collect-audit-2026-05-16.md](./reviews/convex-collect-audit-2026-05-16.md) -
  Convex `.collect()` risk register

- [VALIDATION_TASKS.md](../VALIDATION_TASKS.md) - historical verification
  snapshot; refresh or remove if CI/task-local status is authoritative
- [docs/PANDA_WORKBENCH_MODERNIZATION_BRIEF.md](./PANDA_WORKBENCH_MODERNIZATION_BRIEF.md) -
  historical modernization brief; superseded for workspace IA by the active
  architecture contract
- [docs/plans/2026-04-29-execution-session-upgrade.md](./plans/2026-04-29-execution-session-upgrade.md) -
  proposed/completed session-first workspace upgrade plan; verify current state
  against active contracts before using it
- [docs/plans/2026-04-29-execution-session-finalization.md](./plans/2026-04-29-execution-session-finalization.md) -
  proposed/completed vertical-slice plan for timeline, composer,
  support-surface, resumability, and browser-smoke work
- [docs/plans/2026-04-26-chat-first-workspace-ia.md](./plans/2026-04-26-chat-first-workspace-ia.md) -
  historical chat-first workspace implementation record; superseded for current
  IA decisions
- [docs/panda-executive-view-action-plan.md](./panda-executive-view-action-plan.md) -
  findings and action-plan input; not a canonical contract

## Current Product Surface

Panda is a browser-first AI coding workbench with server-backed fallback and:

- landing and education pages
- project list and project workbench routes
- session-first per-project workspace with the Execution Session as the primary
  surface
- login and shared-chat routes
- admin console pages for users, analytics, system, and security
- Convex-backed persistence for chat, files, runs, delivery state, and sharing
- optional browser-side project command execution through WebContainer
- server-backed execution when browser-side execution is unsupported or fails
- live LLM provider and model metadata from `models.dev`
- deterministic `ask` / `plan` / `code` / `build` routing with requested and
  resolved mode audit data
- consolidated proof surfaces: `Run`, `Changes`, `Context`, and `Preview`
- mobile workspace destinations: `Work`, `Chat`, `Proof`, and `Preview`
- typed execution receipts rendered from bounded run summaries for completed,
  failed, and stopped runs
- collapsed tool-chip summaries (Cursor-style) and plan checklists
  (Windsurf-style) in the chat transcript

## Authority And Archive Policy

Reader: maintainers deciding which documentation is active, historical, or safe
to remove.

Post-read action: use active docs for implementation decisions, treat dated
plans as historical unless explicitly marked current, and remove runtime
artifacts only after maintainer approval.

### Keep Active

| File                                       | Reason                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| `README.md`                                | Project overview, setup, workflow, and current runtime invariants.                 |
| `AGENTS.md`                                | Repo-wide AI agent operating contract.                                             |
| `CLAUDE.md`                                | Claude-compatible alias for agent instructions if still used by local tooling.     |
| `convex/README.md`                         | Backend schema, function map, and receipt persistence notes.                       |
| `docs/README.md`                           | Documentation index and cleanup guidance.                                          |
| `docs/ARCHITECTURE_CONTRACT.md`            | Canonical vocabulary, source-of-truth map, and docs authority.                     |
| `docs/SECURITY_TRUST_BOUNDARIES.md`        | Authorization, redaction, sharing, token, MCP, and telemetry policy.               |
| `docs/CONVEX_BACKEND_GOVERNANCE.md`        | Convex ownership, query-shape, retention, and legacy API rules.                    |
| `docs/AGENTIC_HARNESS.md`                  | Harness architecture, planning workflow, runtime checkpoints, and execution state. |
| `docs/CHAT_TRANSCRIPT_POLICY.md`           | Defines chat transcript elements (tool chips, plan checklist) and inspector/receipt boundaries.            |
| `docs/CHAT_MODE_ARCHITECTURE.md`           | Still useful as the architecture record for mode hardening and routing evolution.  |
| `docs/CUSTOM_SKILLS_AND_SUBAGENTS_PLAN.md` | Current implementation plan for Custom Skills and Custom Subagent composition.     |
| `docs/WEBCONTAINER_RUNTIME.md`             | Current browser execution setup and fallback behavior.                             |
| `docs/LLM_PROVIDER_CATALOG.md`             | Current provider/model catalog behavior.                                           |
| `docs/DEPLOYMENT.md`                       | Deployment guide.                                                                  |
| `docs/GOOGLE_OAUTH_SETUP.md`               | Auth setup guide.                                                                  |
| `docs/GITHUB_APP_SETUP.md`                 | GitHub App setup guide for repository-backed projects.                             |
| `docs/DELIVERY_HANDOFF_POLICY.md`          | Current boundary for deployment, export, and review handoff decisions.             |
| `.impeccable.md`                           | Active design context for visual work if the design workflow is still used.        |

### Keep As Historical Plans

These files are not current authority unless they explicitly link back to an
active contract doc or state that they are the current implementation record.
Keep them unless the team moves historical plans into an archive folder:

| File                                                      | Reason                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `docs/PANDA_CLEANUP_REFACTOR_PROGRAM.md`                  | Strategic cleanup program; still relevant as a north-star audit record.                                    |
| `docs/panda-executive-view-action-plan.md`                | Executive findings and action plan; keep as review input, not as the active architecture contract.         |
| `docs/PANDA_WORKBENCH_MODERNIZATION_BRIEF.md`             | Historical product/design modernization brief; superseded by the chat-first IA for current shell behavior. |
| `docs/WORKBENCH_UX_PLAN.md`                               | Historical UX planning artifact; keep for refactor context, not as current workspace contract.             |
| `docs/IMPLEMENTATION_PLAN.md`                             | Historical harness/spec integration plan; archive once fully superseded.                                   |
| `docs/plans/2026-04-29-execution-session-upgrade.md`      | Proposed/completed session-first workspace upgrade plan; verify against active contracts before use.       |
| `docs/plans/2026-04-29-execution-session-finalization.md` | Proposed/completed finalization plan; verify against active contracts before use.                          |
| `docs/plans/2026-04-26-chat-first-workspace-ia.md`        | Historical chat-first workspace record superseded for current IA decisions.                                |
| `docs/plans/*.md`                                         | Date-stamped planning records; historical by default unless a file says it is current.                     |

### Review For Removal Or Archive

Do not delete these automatically. Confirm ownership first:

| File                              | Recommendation                                                                                                                                      |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDATION_TASKS.md`             | Health snapshot refreshed for the chat-first workspace pass. Keep current with CI/task-local gates or remove if CI fully owns verification records. |
| `SPEC.md`, `PLAN.md`, `STATUS.md` | Runtime artifacts for the current agent task. Keep only until reviewed, then remove unless the team wants them committed as audit evidence.         |
| `.agents/skills/**/*.md`          | Project-local skill docs. Keep if the local skill system is intentional; otherwise move them out of product docs rather than deleting piecemeal.    |

### Remove Candidates

No tracked Markdown file is safe to delete without a maintainer decision. The
only clear cleanup action is to remove temporary root task artifacts after this
work is accepted, if they are not intended to be committed.
