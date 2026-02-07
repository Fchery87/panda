# Discuss Brainstorming Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add an optional brainstorming protocol in Discuss mode that improves
prompt intake while preserving existing Plan/Build flow.

**Architecture:** Add a feature-flagged Discuss brainstorming protocol via
prompt instructions, parse a machine-readable phase marker from assistant
output, and only persist Discuss output to Plan Draft after the phase reaches
`validated_plan`. Expose a small UI toggle in the chat input to enable/disable
brainstorming per session.

**Tech Stack:** Next.js/React, TypeScript, Bun tests, Convex-backed chat flow.

### Task 1: Brainstorm phase parsing and plan-draft gating helpers

**Files:**

- Create: `apps/web/lib/chat/brainstorming.ts`
- Modify: `apps/web/lib/chat/planDraft.ts`
- Test: `apps/web/lib/chat/planDraft.test.ts`

**Step 1: Write failing tests**

- Add tests for parsing `Brainstorm phase: <phase>`.
- Add tests verifying `deriveNextPlanDraft` only updates when `validated_plan`
  is present while brainstorming gate is enabled.

**Step 2: Run tests to verify failure**

- Run `bun test apps/web/lib/chat/planDraft.test.ts`.

**Step 3: Implement minimal helper and gating**

- Implement phase parser and content sanitizer.
- Update `deriveNextPlanDraft` to accept a brainstorming gate option and strip
  metadata before persisting plan content.

**Step 4: Re-run tests to verify pass**

- Run `bun test apps/web/lib/chat/planDraft.test.ts`.

### Task 2: Discuss prompt protocol wiring

**Files:**

- Modify: `apps/web/lib/agent/prompt-library.ts`
- Modify: `apps/web/hooks/useAgent.ts`

**Step 1: Write failing test**

- Add/adjust tests for discuss prompt generation when brainstorming protocol is
  enabled.

**Step 2: Run test to verify failure**

- Run target test file for prompt logic.

**Step 3: Implement prompt and context wiring**

- Add brainstorming protocol appendix to Discuss prompt, requiring phase marker
  and one-question flow.
- Pass enablement from `useAgent` through `PromptContext.customInstructions`.

**Step 4: Re-run tests**

- Run target prompt test file.

### Task 3: Chat panel toggle and page wiring

**Files:**

- Modify: `apps/web/components/chat/ChatInput.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- (Optional) Test: `apps/web/components/chat/*.test.tsx`

**Step 1: Implement UI toggle**

- Add a compact `Brainstorm` toggle in Discuss mode only.
- Keep brutalist styling conventions.

**Step 2: Wire state to submit flow**

- Add per-page boolean state defaulting from env flag.
- Pass through ChatInput and into `useAgent` for prompt behavior.
- Use the same boolean to gate plan draft auto-persist.

**Step 3: Verify behavior**

- Confirm no regression in existing chat send/build flow and mode switching.

### Task 4: Validation

**Files:**

- No source changes expected.

**Step 1: Run focused tests**

- `bun test apps/web/lib/chat/planDraft.test.ts`
- `bun test apps/web/lib/agent/runtime.plan-mode.test.ts`

**Step 2: Run project quality gates**

- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun test`
