# Panda Skill Registry Profile Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add a minimal Panda-native skill registry and profile layer
(`off | soft_guidance | strict_workflow`) so workflow skills can scale beyond a
single hardcoded `ai-slop-cleaner` path.

**Architecture:** Keep the design intentionally small. Introduce a shared skill
resolver that centralizes the built-in catalog, profile selection, and
matched-skill activation. Existing prompt injection and runtime trace paths
should consume that shared result instead of each importing matcher logic
directly. The first profile behavior remains lightweight: `off` disables
activation, `soft_guidance` injects guidance and traceability, and
`strict_workflow` strengthens instruction wording without adding a separate
execution engine.

**Tech Stack:** TypeScript, Bun tests, Panda agent runtime, prompt library,
existing run progress events.

### Task 1: Add failing tests for profile resolution

**Files:**

- Create: `apps/web/lib/agent/skills/resolver.test.ts`
- Create: `apps/web/lib/agent/skills/resolver.ts`
- Modify: `apps/web/lib/agent/skills/types.ts`

**Step 1: Write the failing test**

Add tests that assert:

- the default profile resolves to `soft_guidance`
- profile `off` disables skill activation even when the request matches
- profile `strict_workflow` preserves the skill match and exposes the strict
  profile in the resolved output

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/skills/resolver.test.ts`

Expected: FAIL because the resolver module and profile types do not exist yet.

**Step 3: Write minimal implementation**

Create the shared resolver and profile type definitions with a built-in default
profile.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/skills/resolver.test.ts`

Expected: PASS

### Task 2: Add failing tests for prompt-library profile behavior

**Files:**

- Modify: `apps/web/lib/agent/prompt-library.test.ts`
- Modify: `apps/web/lib/agent/prompt-library.ts`

**Step 1: Write the failing test**

Add tests that assert:

- `skillProfile: 'off'` suppresses Panda skill injection
- `skillProfile: 'strict_workflow'` injects stronger mandatory workflow wording

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/prompt-library.test.ts`

Expected: FAIL because prompt injection does not yet consume a shared
profile-aware resolver.

**Step 3: Write minimal implementation**

Refactor prompt injection to resolve skills through the shared resolver and
append profile-aware instruction text.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/prompt-library.test.ts`

Expected: PASS

### Task 3: Add failing tests for runtime trace profile behavior

**Files:**

- Modify: `apps/web/lib/agent/runtime.progress.test.ts`
- Modify: `apps/web/lib/agent/runtime.ts`

**Step 1: Write the failing test**

Add a test that asserts:

- `skillProfile: 'off'` produces no skill matched progress event
- `skillProfile: 'strict_workflow'` still emits the skill matched event

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/runtime.progress.test.ts`

Expected: FAIL because the runtime still resolves skills directly without
profile control.

**Step 3: Write minimal implementation**

Refactor the runtime to use the shared resolver and only emit activation events
when the resolved profile is not `off`.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/runtime.progress.test.ts`

Expected: PASS

### Task 4: Introduce the built-in skill registry

**Files:**

- Modify: `apps/web/lib/agent/skills/catalog/index.ts`
- Modify: `apps/web/lib/agent/skills/matcher.ts`
- Create: `apps/web/lib/agent/skills/registry.ts`

**Step 1: Write the implementation**

Move the built-in skill list into a dedicated registry module so future Panda
workflow skills have a single registration surface.

**Step 2: Run targeted tests**

Run:
`bun test apps/web/lib/agent/skills/resolver.test.ts apps/web/lib/agent/skills/matcher.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/runtime.progress.test.ts`

Expected: PASS

### Task 5: Verify the integrated slice

**Files:**

- Modify: `apps/web/lib/agent/index.ts` (only if shared exports are useful)

**Step 1: Run verification**

Run:

- `bun run typecheck`
- `bun run lint`
- `bun test apps/web/lib/agent/skills/resolver.test.ts apps/web/lib/agent/skills/matcher.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/runtime.progress.test.ts`
- `bun test`
- `bun run build`

Expected: all pass. If `bun run format:check` fails, distinguish change-set
formatting issues from unrelated pre-existing repo drift.
