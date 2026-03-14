# Panda Web Stabilization Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Stabilize Panda as a web-only coding platform by restoring repo
health, collapsing runtime duplication, hardening persistence and permissions,
and finishing the browser workbench flows that are already exposed.

**Architecture:** Keep Panda explicitly web-only. Do not add desktop, mobile, or
cross-client abstraction work that does not improve the existing Next.js +
Convex product. Consolidate around one browser-facing execution path: one
canonical runtime, one tool contract, one persisted run timeline, and one
project workspace shell.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Bun, Playwright,
Tailwind, Framer Motion.

## Scope Guardrails

- In scope:
  - web app runtime and workbench
  - Convex persistence and authz for browser flows
  - browser-first permissions, artifacts, jobs, and run history
  - test, lint, typecheck, formatting, build, and E2E verification
- Out of scope:
  - desktop packaging
  - mobile apps
  - browser-extension support
  - generalized multi-client platform work unless it directly simplifies the
    Panda web app

## Success Criteria

- `bun run typecheck` passes
- `bun run lint` passes with zero warnings
- `bun run format:check` passes
- `cd apps/web && bun test` passes using a fixed test command
- `bun run build` passes
- Browser E2E covers core workbench flows
- Panda uses one runtime path for web agent execution
- Share, resume, permissions, and run history are complete browser flows, not
  placeholders

### Task 1: Restore Repo Health Baseline

**Status:** Complete

**Files:**

- Modify: `apps/web/components/chat/PermissionDialog.tsx`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/harness/oracle.test.ts`
- Modify: `apps/web/lib/agent/runtime.build-mode.test.ts`
- Modify: `apps/web/lib/agent/runtime.harness-adapter.test.ts`
- Modify: `apps/web/lib/agent/runtime.plan-mode.test.ts`
- Modify: `apps/web/lib/agent/runtime.progress.test.ts`
- Modify: `apps/web/lib/agent/runtime.reasoning.test.ts`
- Modify: `apps/web/lib/agent/tools.search.test.ts`
- Modify: `apps/web/lib/agent/tools.ts`
- Modify: `apps/web/lib/agent/harness/tool-repair.ts`
- Modify: `apps/web/lib/llm/providers/anthropic.ts`
- Modify: `apps/web/lib/llm/stream-resilience.ts`
- Modify: `apps/web/package.json`

**Step 1: Fix the broken typecheck errors first** Run: `bun run typecheck`
Expected: FAIL with the current runtime, test, and `PermissionDialog` errors.

**Step 2: Repair the harness compile break** Required changes:

- either restore `executeToolAndAddToMessage` in
  `apps/web/lib/agent/harness/runtime.ts`
- or inline/replace that path with the current tool execution helper
- keep behavior identical to the current event model

**Step 3: Repair the tool context contract drift in tests** Required changes:

- add the required `applyPatch` stub to all `ToolContext` test fixtures
- keep test scope minimal; do not widen the type to hide real mismatches

**Step 4: Fix the UI type error in `PermissionDialog`** Required changes:

- narrow the currently rendered value to a real `ReactNode`
- do not pass raw `unknown` through JSX

**Step 5: Fix current lint errors, then remove the warnings touched by the above
changes** Run: `bun run lint` Expected: PASS with zero warnings.

**Step 6: Fix the broken web test command** Required changes:

- replace `bun test --exclude 'e2e/**'` with a command Bun actually honors in
  this repo
- prefer a positive include pattern over a non-matching exclude glob

**Step 7: Fix formatting drift** Run: `bun run format:check` Expected: PASS.

**Step 8: Re-run the baseline** Run:

- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `cd apps/web && bun test`

Expected: all PASS.

### Task 2: Collapse to One Canonical Runtime for the Web App

**Status:** Complete

**Files:**

- Modify: `apps/web/lib/agent/runtime.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/index.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/tools.ts`
- Modify: `apps/web/lib/agent/runtime.harness-adapter.test.ts`
- Modify: `apps/web/lib/agent/harness/runtime.test.ts`
- Modify: `apps/web/lib/agent/runtime.progress.test.ts`
- Modify: `apps/web/lib/agent/runtime.reasoning.test.ts`

**Step 1: Declare the canonical runtime** Recommendation:

- keep `apps/web/lib/agent/harness/runtime.ts` as the authoritative runtime
- reduce `apps/web/lib/agent/runtime.ts` to a thin compatibility wrapper or
  remove it

**Step 2: Inventory what the legacy runtime still owns** Required checklist:

- event translation
- tool execution wrappers
- rewrite retries
- spec approval hooks
- checkpoint/resume behavior

**Step 3: Move any still-needed behavior into the harness runtime** Required
rules:

- no behavior should exist only in the legacy runtime if the browser still
  depends on it
- do not preserve duplicate state machines

**Step 4: Simplify `useAgent` to talk to one runtime contract** Required
changes:

- one event shape consumed by the hook
- one runtime creation path
- one checkpoint/resume mechanism

**Step 5: Remove dead compatibility branches** Run:

- `bun test apps/web/lib/agent/harness/runtime.test.ts`
- `bun test apps/web/lib/agent/runtime.harness-adapter.test.ts`
- `bun test apps/web/lib/agent/runtime.progress.test.ts`
- `bun test apps/web/lib/agent/runtime.reasoning.test.ts`

Expected: PASS, with fewer adapter-only assertions.

### Task 3: Break Up the Browser Workspace Shell

**Status:** Complete

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/hooks/useAgent.ts`
- Add: `apps/web/components/project/ProjectWorkspaceShell.tsx`
- Add: `apps/web/components/project/ProjectChatPane.tsx`
- Add: `apps/web/components/project/ProjectInspectorPane.tsx`
- Add: `apps/web/components/project/useProjectPageState.ts`
- Add: focused tests under `apps/web/components/project/`
- Modify: `apps/web/components/workbench/Workbench.tsx`

**Step 1: Split the 1800+ line project page by responsibility** Target split:

- workspace shell and layout
- chat pane
- inspector pane
- page state hook

**Step 2: Split the 1800+ line `useAgent` hook by responsibility** Target split:

- runtime orchestration
- run event buffering/persistence
- usage metrics
- spec approval state

**Step 3: Keep the browser UX unchanged while moving code** Required rule:

- this is an extraction/refactor task, not a redesign task

**Step 4: Preserve the workbench contract** Required rule:

- `Workbench` remains the editor/file/terminal surface
- chat state and project orchestration move out of the page component

**Step 5: Add component-level regression tests** Suggested commands:

- `bun test apps/web/components/workbench/workbench.integration.test.ts`
- add focused tests for the new project shell pieces

Expected: PASS.

### Task 4: Harden Browser Tooling and Permission UX

**Status:** Complete

**Files:**

- Modify: `apps/web/lib/agent/tools.ts`
- Modify: `apps/web/lib/agent/harness/permissions.ts`
- Modify: `apps/web/components/chat/PermissionDialog.tsx`
- Modify: `apps/web/app/api/jobs/execute/route.ts`
- Modify: `apps/web/lib/agent/command-analysis.ts`
- Modify: `convex/settings.ts`
- Modify: `convex/schema.ts`
- Test: `apps/web/app/api/jobs/execute/route.test.ts`
- Test: `apps/web/lib/agent/command-analysis.test.ts`
- Test: add focused tests for `PermissionDialog`

**Step 1: Define the web-only tool contract** Required rules:

- tools exist to support the Panda browser workbench
- no tool design work for desktop-style terminal semantics
- keep `read_files`, `list_directory`, `search_code`, `write_files`,
  `apply_patch`, and `run_command` focused on browser flows

**Step 2: Make permission language user-facing and consistent** Required
changes:

- standardize labels between tool names, settings names, and dialog copy
- clearly separate file edits, command execution, and search/read permissions

**Step 3: Align command execution policy with the permission model** Required
changes:

- `command-analysis` determines risk
- `PermissionDialog` shows the exact reason for approval
- `/api/jobs/execute` enforces the same assumptions server-side

**Step 4: Persist only the browser-relevant permission defaults** Required
rules:

- store defaults needed by Panda web
- avoid speculative config fields for clients Panda will not build

**Step 5: Verify permission flows** Run:

- `bun test apps/web/app/api/jobs/execute/route.test.ts`
- `bun test apps/web/lib/agent/command-analysis.test.ts`

Expected: PASS.

### Task 5: Tighten Persistence Schemas and Run Event Ingestion

**Status:** Complete

**Files:**

- Modify: `convex/schema.ts`
- Modify: `convex/agentRuns.ts`
- Modify: `convex/messages.ts`
- Modify: `convex/artifacts.ts`
- Modify: `convex/checkpoints.ts`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/harness/convex-checkpoint-store.ts`
- Test: `apps/web/lib/agent/harness/runtime.test.ts`
- Test: add focused Convex tests where missing

**Step 1: Replace open-ended `v.any()` payloads where the shape is already
known** Priority targets:

- message annotations
- artifact actions
- run event usage payloads
- checkpoint envelopes

**Step 2: Introduce explicit versioned payload types** Required rule:

- every persisted run/checkpoint/event payload should have a versioned schema
  where feasible

**Step 3: Improve event ingestion** Required changes:

- reduce per-event hot-path overhead in `convex/agentRuns.ts`
- keep sequence ordering stable
- avoid changing the browser event contract

**Step 4: Keep degraded-mode behavior** Required rule:

- if Convex persistence fails temporarily, the browser still shows live progress
- persistence failures must be visible and resumable

**Step 5: Re-run runtime and persistence tests** Suggested commands:

- `bun test apps/web/lib/agent/harness/runtime.test.ts`
- add targeted tests for checkpoint serialization and run event persistence

Expected: PASS.

### Task 6: Finish the Exposed Browser Product Flows

**Status:** Complete

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/components/chat/RunProgressPanel.tsx`
- Modify: `apps/web/components/chat/SnapshotTimeline.tsx`
- Modify: `apps/web/components/chat/ShareButton.tsx`
- Modify: `convex/sharing.ts`
- Modify: `apps/web/app/s/[shareId]/page.tsx`
- Modify: any supporting components/tests under `apps/web/components/chat/`
- Test: `apps/web/e2e/workbench.e2e-spec.ts`
- Add: `apps/web/e2e/sharing.e2e-spec.ts`

**Step 1: Remove placeholder behavior from shipped browser flows** Immediate
target:

- replace the current “Share feature coming soon” stub in
  `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 2: Finish share as a first-class web flow** Required behavior:

- create shareable run/chat/project views appropriate for Panda web
- support view-only access with clear redaction rules
- ensure authz and ownership checks are enforced in Convex

**Step 3: Finish resume and run history UX** Required behavior:

- resume from recoverable runtime checkpoints in the browser
- show resumed state in run progress and timeline
- avoid orphaned or ambiguous run states

**Step 4: Make the inspector surfaces coherent** Required behavior:

- run progress
- snapshots
- evals
- plan/spec state

These should feel like one browser inspector, not unrelated drawers.

**Step 5: Verify with browser E2E** Run:

- `cd apps/web && bun run test:e2e --grep workbench`
- add and run sharing and resume scenarios

Expected: PASS.

### Task 7: Raise the Web-Only Acceptance Bar

**Status:** Complete

**Files:**

- Modify: `apps/web/e2e/workbench.e2e-spec.ts`
- Add: `apps/web/e2e/agent-run.e2e-spec.ts`
- Add: `apps/web/e2e/permissions.e2e-spec.ts`
- Add: `apps/web/e2e/sharing.e2e-spec.ts`
- Modify: root `package.json`
- Modify: `apps/web/package.json`
- Modify: `.github/workflows/` files if needed
- Modify: `VALIDATION_TASKS.md`

**Step 1: Define the minimum browser acceptance suite** Required journeys:

- create/open project
- open/edit/save file
- run agent request
- inspect tool calls
- approve/reject risky command
- persist run history
- resume recoverable run
- share view-only artifact or chat

**Step 2: Make the repo scripts match the intended quality bar** Required
changes:

- one reliable test command for unit/integration
- one reliable E2E command
- root verification docs and scripts must match actual behavior

**Step 3: Run the full web verification suite** Run:

- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `cd apps/web && bun test`
- `cd apps/web && bun run test:e2e`
- `bun run build`

Expected: all PASS.

**Step 4: Update the validation record** Required changes:

- refresh `VALIDATION_TASKS.md`
- remove stale failures that no longer apply
- record any remaining true blockers

## Recommended Phase Order

1. Task 1: restore repo health
2. Task 2: collapse to one runtime
3. Task 3: break up the browser workspace shell
4. Task 4: harden tooling and permission UX
5. Task 5: tighten persistence and ingestion
6. Task 6: finish exposed browser flows
7. Task 7: lock in acceptance and CI

## Recommended Milestones

- Milestone A: “Green Baseline”
  - Task 1 complete
- Milestone B: “Single Runtime”
  - Task 2 complete
- Milestone C: “Stable Browser Workspace”
  - Tasks 3 and 4 complete
- Milestone D: “Reliable Persistence”
  - Task 5 complete
- Milestone E: “Complete Web Product Flows”
  - Tasks 6 and 7 complete
