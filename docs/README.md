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
  elements (tool chips, plan checklist), inspector boundaries, and redaction
  rules
- [docs/CHAT_MODE_ARCHITECTURE.md](./CHAT_MODE_ARCHITECTURE.md) - active mode,
  routing, and tool-call hardening architecture notes
- [docs/PLAN_DOCUMENT_FORMAT.md](./PLAN_DOCUMENT_FORMAT.md) - current `.plan.md`
  frontmatter, Mermaid, task metadata, and clean generated-plan document format
- [docs/WORKBENCH.md](./WORKBENCH.md) - current workbench-owned file opening,
  generated-file review, inspector rail, Run/recovery, and mobile workspace
  contract
- [docs/CUSTOM_SKILLS_AND_SUBAGENTS_PLAN.md](./CUSTOM_SKILLS_AND_SUBAGENTS_PLAN.md) -
  implementation plan for Custom Skills, Custom Subagents, skill activation,
  capability presets, and run visibility
- [docs/plans/2026-05-23-panda-subagents-v2-architecture.md](./plans/2026-05-23-panda-subagents-v2-architecture.md) -
  completed/current implementation record for Panda Subagents v2, first-class
  child runs, run-tree UI, patch-proposal previews, retention cleanup, and the
  decision to keep Subagents out of the main mode selector
- [docs/plans/layered-harness-policy-implementation.md](./plans/layered-harness-policy-implementation.md) -
  completed implementation record for layered Harness Policy, command-family
  governance, permission audit decisions, Subagent summaries, Unattended
  Execution, MCP policy alignment, and settings/docs surfacing
- [docs/plans/2026-05-22-workbench-owned-file-opening-plan.md](./plans/2026-05-22-workbench-owned-file-opening-plan.md) -
  completed implementation record for workbench-owned file opening,
  generated-file review, clean `.plan.md` rendering, Mermaid plan diagrams,
  central Review Diff, and the historical `Proof` / `Changes` / `Context`
  support rail before the current `Run` / `Changes` / `Context` vocabulary
- [docs/DEPLOYMENT.md](./DEPLOYMENT.md) - production deployment guide
- [docs/GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md) - Google OAuth setup
- [docs/GITHUB_APP_SETUP.md](./GITHUB_APP_SETUP.md) - GitHub App setup for
  GitHub-backed Panda projects
- [docs/DELIVERY_HANDOFF_POLICY.md](./DELIVERY_HANDOFF_POLICY.md) - product
  boundary for deployment, export, and GitHub-backed review handoff
- [convex/README.md](../convex/README.md) - backend schema and function map

## Historical And Planning Records

The docs directory has been cleaned to prefer current source-of-truth documents
over stale implementation-plan snapshots. Historical plans and reviews that were
clearly superseded by the current architecture contract and workbench-owned IA
were removed.

Remaining historical or planning records are intentionally retained when they
still describe current policy, an ADR decision, or an active follow-up area.

- [docs/development-commands.json](./development-commands.json) - source of
  truth for commands rendered in Workspace Home and README
- [docs/convex-collect-audit.json](./convex-collect-audit.json) -
  machine-readable ceiling for audited production Convex `.collect()` calls
- [VALIDATION_TASKS.md](../VALIDATION_TASKS.md) - historical verification
  snapshot; refresh or remove if CI/task-local status is authoritative
- Date-stamped planning records; historical by default unless explicitly
  promoted to active authority or completed/current implementation evidence.

## Current Product Surface

Panda is a browser-first, editor-centric AI coding IDE with server-backed
fallback and:

- landing and education pages
- project list and project workbench routes
- workbench-owned per-project workspace with persistent editor+chat layout and
  central Review Diff
- login and shared-chat routes
- admin console pages for users, analytics, system, and security
- Convex-backed persistence for chat, files, runs, delivery state, and sharing
- optional browser-side project command execution through WebContainer
- server-backed execution when browser-side execution is unsupported or fails
- live LLM provider and model metadata from `models.dev`
- deterministic Ask / Plan / Agent mode selection backed by `ask` / `plan` /
  `code` / `build` runtime compatibility values, with requested and resolved
  mode audit data
- inspector rail surfaces: `Run`, `Changes`, and `Context`
- mobile workspace destinations: `Editor`, `Chat`, `Run`, and `Changes`
- typed execution receipts rendered from bounded run summaries for completed,
  failed, and stopped runs
- collapsed tool-chip summaries (Cursor-style) and plan checklists
  (Windsurf-style) in the chat transcript
- Convex-backed Custom Subagents as delegated child workers with first-class
  child runs, run-tree visibility, diagnostics, patch-proposal previews, and
  bounded retention cleanup; they are not top-level mode-selector options

## Authority And Archive Policy

Reader: maintainers deciding which documentation is active, historical, or safe
to remove.

Post-read action: use active docs for implementation decisions, treat dated
plans as historical unless explicitly marked current, and remove runtime
artifacts only after maintainer approval.

### Keep Active

| File                                       | Reason                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `README.md`                                | Project overview, setup, workflow, and current runtime invariants.                              |
| `AGENTS.md`                                | Repo-wide AI agent operating contract.                                                          |
| `CLAUDE.md`                                | Claude-compatible alias for agent instructions if still used by local tooling.                  |
| `convex/README.md`                         | Backend schema, function map, and receipt persistence notes.                                    |
| `docs/README.md`                           | Documentation index and cleanup guidance.                                                       |
| `docs/ARCHITECTURE_CONTRACT.md`            | Canonical vocabulary, source-of-truth map, and docs authority.                                  |
| `docs/SECURITY_TRUST_BOUNDARIES.md`        | Authorization, redaction, sharing, token, MCP, and telemetry policy.                            |
| `docs/CONVEX_BACKEND_GOVERNANCE.md`        | Convex ownership, query-shape, retention, and legacy API rules.                                 |
| `docs/AGENTIC_HARNESS.md`                  | Harness architecture, planning workflow, runtime checkpoints, and execution state.              |
| `docs/CHAT_TRANSCRIPT_POLICY.md`           | Defines chat transcript elements (tool chips, plan checklist) and inspector/receipt boundaries. |
| `docs/CHAT_MODE_ARCHITECTURE.md`           | Still useful as the architecture record for mode hardening and routing evolution.               |
| `docs/WORKBENCH.md`                        | Current workbench-owned file opening and support-rail behavior.                                 |
| `docs/PLAN_DOCUMENT_FORMAT.md`             | Current generated plan document format and renderer behavior.                                   |
| `docs/CUSTOM_SKILLS_AND_SUBAGENTS_PLAN.md` | Current implementation plan for Custom Skills and Custom Subagent composition.                  |
| `docs/WEBCONTAINER_RUNTIME.md`             | Current browser execution setup and fallback behavior.                                          |
| `docs/LLM_PROVIDER_CATALOG.md`             | Current provider/model catalog behavior.                                                        |
| `docs/DEPLOYMENT.md`                       | Deployment guide.                                                                               |
| `docs/GOOGLE_OAUTH_SETUP.md`               | Auth setup guide.                                                                               |
| `docs/GITHUB_APP_SETUP.md`                 | GitHub App setup guide for repository-backed projects.                                          |
| `docs/DELIVERY_HANDOFF_POLICY.md`          | Current boundary for deployment, export, and review handoff decisions.                          |
| `.impeccable.md`                           | Active design context for visual work if the design workflow is still used.                     |

### Keep As Historical Plans

These files are retained because they still describe current policy, a durable
architecture decision, or an active follow-up area. They are not higher
authority than the active contracts unless they explicitly say so.

| File                                                         | Reason                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `docs/adr/*.md`                                              | Durable architecture decision records.                                                               |
| `docs/PANDA_CLEANUP_REFACTOR_PROGRAM.md`                     | Strategic cleanup program; still relevant as a north-star audit record.                              |
| `docs/PANDA_RUNTIME_AND_WORKSPACE_MODERNIZATION_PLAN.md`     | Current multi-phase runtime/workspace modernization context.                                         |
| `docs/plans/2026-05-22-workbench-owned-file-opening-plan.md` | Current completed record for workbench-owned file opening, plan rendering, and support-rail cleanup. |
| `docs/plans/layered-harness-policy-implementation.md`        | Completed/current harness policy implementation record.                                              |
| `docs/revise/*.md`                                           | Runtime steering / stop-replace phase records retained until Phase 7 is resolved or replaced.        |

### Review For Removal Or Archive

Do not delete these automatically. Confirm ownership first:

| File                              | Recommendation                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VALIDATION_TASKS.md`             | Historical health snapshot. Keep current with CI/task-local gates or remove if CI fully owns verification records.                               |
| `SPEC.md`, `PLAN.md`, `STATUS.md` | Runtime artifacts for the current agent task. Keep only until reviewed, then remove unless the team wants them committed as audit evidence.      |
| `.agents/skills/**/*.md`          | Project-local skill docs. Keep if the local skill system is intentional; otherwise move them out of product docs rather than deleting piecemeal. |

### Removed In The Docs Cleanup

Clearly superseded implementation-plan snapshots and old review records were
removed instead of archived. If historical context is needed, recover it from
git history.

Removed categories:

- old chat-first/session-first workspace IA plans
- old workspace overhaul/finalization plans
- old workbench modernization briefs superseded by the current workbench-owned
  IA
- one-off review snapshots that no longer define current implementation work

Temporary root task artifacts may also be removed after active work is accepted,
if they are not intended to be committed as audit evidence.
