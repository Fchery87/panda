# Panda IDE Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Harden Panda's browser IDE by fixing the highest-risk security and
wiring gaps, then finish the remaining integration work in a prioritized
sequence.

**Architecture:** Consolidate Panda around a single authoritative IDE execution
path: one runtime path, one artifact executor, one job lifecycle, and one
permission/governance layer. Remove dead-end UI surfaces that are not part of
the intended product, and finish the partial flows that are already exposed in
the workbench.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Bun, Playwright.

### Task 1: Immediate Security Hardening

**Files:**

- Modify: `convex/specifications.ts`
- Modify: `convex/subagents.ts`
- Modify: `convex/mcpServers.ts`
- Test: `convex/specifications.auth.test.ts`
- Test: `convex/subagents.auth.test.ts`

**Step 1: Keep authz tests green and expand them when new endpoints are added**
Run: `bun test convex/specifications.auth.test.ts convex/subagents.auth.test.ts`
Expected: PASS

**Step 2: Enforce ownership checks for every specifications read/write path**
Required rules:

- project-scoped queries require project ownership
- chat-scoped queries require chat ownership
- run-scoped queries require run ownership
- spec-id operations resolve the spec then require ownership on its project

**Step 3: Enforce admin policy for MCP and subagents server-side** Required
rules:

- `allowUserMCP === false` blocks MCP mutations and hides list results
- `allowUserSubagents === false` blocks subagent mutations and hides list
  results

**Step 4: Re-run auth tests** Run:
`bun test convex/specifications.auth.test.ts convex/subagents.auth.test.ts`
Expected: PASS

### Task 2: Workbench Surface Consolidation

**Files:**

- Modify: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/e2e/workbench.e2e-spec.ts`
- Delete: `apps/web/components/workbench/Preview.tsx`
- Test: `apps/web/components/workbench/workbench.integration.test.ts`

**Step 1: Remove the preview tab completely** Required changes:

- remove the `Preview` import
- remove preview tab buttons from mobile and desktop
- remove preview-only tab state
- delete the unused preview component file

**Step 2: Ensure timeline uses active chat on desktop and mobile** Required
changes:

- pass `currentChatId` from project page in desktop workbench render
- keep mobile behavior aligned

**Step 3: Re-run workbench wiring tests** Run:
`bun test apps/web/components/workbench/workbench.integration.test.ts` Expected:
PASS

### Task 3: Settings Governance UX

**Files:**

- Modify: `apps/web/app/settings/page.tsx`
- Test: `apps/web/app/settings/settings-advanced-gates.test.ts`

**Step 1: Hide disabled advanced features in the UI** Required changes:

- show `MCPServerEditor` only when `allowUserMCP !== false`
- show `SubagentEditor` only when `allowUserSubagents !== false`
- render explanatory copy when disabled

**Step 2: Re-run settings gate tests** Run:
`bun test apps/web/app/settings/settings-advanced-gates.test.ts` Expected: PASS

### Task 4: Execution Path Consolidation

**Files:**

- Modify: `apps/web/components/artifacts/ArtifactPanel.tsx`
- Modify: `apps/web/hooks/useAutoApplyArtifacts.ts`
- Modify: `apps/web/components/workbench/Terminal.tsx`
- Modify: `apps/web/lib/agent/tools.ts`
- Add: shared execution helper under `apps/web/lib/agent/` or
  `apps/web/lib/jobs/`

**Step 1: Extract a single artifact/job executor** Required behavior:

- one helper handles file writes
- one helper handles command-run jobs
- manual apply and auto-apply call the same helper

**Step 2: Add job cancellation architecture** Required behavior:

- job ID included in `/api/jobs/execute` lifecycle
- server route maintains cancellable process registry
- cancel mutation can signal the running child process

**Step 3: Add integration tests around apply/cancel behavior** Suggested
commands:

- `bun test apps/web/app/api/jobs/execute/route.test.ts`
- add focused tests for artifact execution helper

### Task 5: Runtime and Spec Unification

**Files:**

- Modify: `apps/web/hooks/useAgent.ts`
- Modify: `apps/web/lib/agent/runtime.ts`
- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: relevant spec UI files under `apps/web/components/plan/` and
  `apps/web/components/chat/`

**Step 1: Pick one canonical runtime path** Recommendation: keep harness as
canonical, reduce legacy runtime fallback scope.

**Step 2: Handle spec events in `useAgent`** Required behavior:

- `spec_pending_approval`
- `spec_generated`
- `spec_verification`

**Step 3: Wire resume/checkpoint UX** Required behavior:

- run progress can trigger resume
- resumed sessions are visible in timeline and status

### Task 6: Acceptance-Level Verification

**Files:**

- Modify: `apps/web/e2e/workbench.e2e-spec.ts`
- Add: more focused E2E specs under `apps/web/e2e/`
- Reference: `docs/panda-ide-acceptance-matrix.md`

**Step 1: Add end-to-end flows for core IDE journeys**

- create project
- open file
- edit and save
- ask agent question
- generate artifact
- apply artifact
- run command
- cancel command
- inspect run history

**Step 2: Run full validation suite** Run:

- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `cd apps/web && bun test`
- `bun run build`

Expected: all green, zero warnings.
