# Agentic Harness Hardening And Runtime Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Make the new agentic harness a real runnable path behind a feature
flag and fix the highest-risk correctness/safety gaps identified in review.

**Architecture:** Keep the existing agent runtime as the default path, add a
harness-backed compatibility adapter that emits the existing `AgentEvent` stream
shape, and harden the harness core modules (`runtime`, `permissions`,
`compaction`) so the feature-flagged path is usable. Prioritize minimal changes
and focused tests for runtime correctness and permission behavior.

**Tech Stack:** Next.js/React, TypeScript, Bun test runner, existing
`apps/web/lib/agent/*` runtime/tooling.

### Task 1: Harness correctness tests (RED)

**Files:**

- Create: `apps/web/lib/agent/harness/runtime.test.ts`
- Create: `apps/web/lib/agent/harness/permissions.test.ts`

**Steps:**

1. Write a failing test for plugin hook mutation of `llm.request` options.
2. Write a failing test proving compaction results are applied to runtime state
   (no compaction loop/no-op).
3. Write a failing test for session-scoped permission cache behavior and timeout
   decision event emission.

### Task 2: Harness core fixes (GREEN)

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts`
- Modify: `apps/web/lib/agent/harness/compaction.ts`
- Modify: `apps/web/lib/agent/harness/permissions.ts`
- Modify: `apps/web/lib/agent/harness/agents.ts`

**Steps:**

1. Return compacted messages from compaction and apply them in runtime.
2. Preserve plugin hook return values and apply them to LLM/tool execution
   inputs.
3. Include built-in tool definitions in harness tool exposure and per-target
   permission checks.
4. Scope cached permission decisions to session and emit timeout
   `permission.decided` events.
5. Add a `code` primary agent for UI/runtime mode parity.

### Task 3: Runtime integration behind feature flag

**Files:**

- Modify: `apps/web/lib/agent/runtime.ts`

**Steps:**

1. Add a feature-flagged harness compatibility adapter that maps harness events
   to `AgentEvent`.
2. Reuse existing prompt/tool context with minimal translation.
3. Keep old runtime as fallback when the flag is disabled.

### Task 4: Verification

**Files:**

- N/A

**Steps:**

1. Run targeted Bun tests for new harness tests.
2. Run typecheck for affected package if time permits.
3. Document remaining parity gaps (if any) before broader rollout.
