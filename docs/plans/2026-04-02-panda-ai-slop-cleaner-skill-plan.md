# Panda AI Slop Cleaner Skill Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add a Panda-native, model-agnostic `ai-slop-cleaner` workflow skill
that detects cleanup/refactor requests, injects structured cleanup guidance into
the agent prompt, and exposes the skill activation in Panda's run progress
timeline.

**Architecture:** Implement a lightweight Panda skills layer inside
`apps/web/lib/agent/` rather than the deeper harness plugin system. The first
slice adds a typed skill definition, a matcher that resolves the skill from the
active prompt context, prompt-library injection for model-agnostic workflow
guidance, and runtime progress events that make the skill visible in the
existing timeline UI.

**Tech Stack:** TypeScript, Bun tests, Panda agent runtime, prompt library,
existing run progress events.

### Task 1: Add failing tests for skill matching

**Files:**

- Create: `apps/web/lib/agent/skills/matcher.test.ts`
- Create: `apps/web/lib/agent/skills/catalog/index.ts`
- Create: `apps/web/lib/agent/skills/catalog/ai-slop-cleaner.ts`
- Create: `apps/web/lib/agent/skills/types.ts`
- Create: `apps/web/lib/agent/skills/matcher.ts`

**Step 1: Write the failing test**

Add tests that assert:

- cleanup/refactor/deslop prompts match `ai-slop-cleaner`
- the skill does not match ordinary Q&A prompts
- the skill does not match `ask` mode

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/skills/matcher.test.ts`

Expected: FAIL because the new skills modules do not exist yet.

**Step 3: Write minimal implementation**

Create the skills types, the Panda-specific `ai-slop-cleaner` definition, and
the matcher logic with conservative heuristics.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/skills/matcher.test.ts`

Expected: PASS

### Task 2: Add failing tests for prompt injection

**Files:**

- Modify: `apps/web/lib/agent/prompt-library.test.ts`
- Modify: `apps/web/lib/agent/prompt-library.ts`

**Step 1: Write the failing test**

Add tests that assert:

- build/code cleanup requests inject the Panda `ai-slop-cleaner` system guidance
- non-cleanup requests do not inject that guidance
- injected guidance is model-agnostic and Panda-specific

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/prompt-library.test.ts`

Expected: FAIL because the prompt library does not yet inject skill guidance.

**Step 3: Write minimal implementation**

Update `getPromptForMode()` to resolve matched skills from the current prompt
context and append a dedicated skill instruction section to the system prompt.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/prompt-library.test.ts`

Expected: PASS

### Task 3: Add failing tests for runtime progress visibility

**Files:**

- Modify: `apps/web/lib/agent/runtime.progress.test.ts`
- Modify: `apps/web/lib/agent/runtime.ts`

**Step 1: Write the failing test**

Add a test that asserts a cleanup request emits a `progress_step` event with
content indicating `Skill matched: ai-slop-cleaner`.

**Step 2: Run test to verify it fails**

Run: `bun test apps/web/lib/agent/runtime.progress.test.ts`

Expected: FAIL because the runtime does not yet emit skill activation progress
events.

**Step 3: Write minimal implementation**

Resolve matched skills once at run start and emit a bounded analysis progress
event for each matched skill before the main iteration loop.

**Step 4: Run test to verify it passes**

Run: `bun test apps/web/lib/agent/runtime.progress.test.ts`

Expected: PASS

### Task 4: Refine the Panda-specific skill content

**Files:**

- Modify: `apps/web/lib/agent/skills/catalog/ai-slop-cleaner.ts`

**Step 1: Write the implementation**

Structure the skill definition so it includes:

- clean `name` and trigger-only `description`
- Panda-specific overview
- explicit workflow constraints
- pass ordering
- file-scope behavior
- output/report requirements
- red flags and common mistakes

**Step 2: Run focused tests**

Run:
`bun test apps/web/lib/agent/skills/matcher.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/runtime.progress.test.ts`

Expected: PASS

### Task 5: Verify the integrated slice

**Files:**

- Modify: `apps/web/lib/agent/index.ts`

**Step 1: Export the new skills surface if needed**

Expose the new skills modules only if the rest of the runtime benefits from
shared imports.

**Step 2: Run broader verification**

Run:

- `bun run typecheck`
- `bun run lint`
- `bun run format:check`
- `bun test apps/web/lib/agent/skills/matcher.test.ts apps/web/lib/agent/prompt-library.test.ts apps/web/lib/agent/runtime.progress.test.ts`

Expected: all pass with zero warnings.
