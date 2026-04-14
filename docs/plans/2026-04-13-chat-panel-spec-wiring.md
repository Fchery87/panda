# Chat Panel Spec Wiring & Overlap Consolidation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the three critical gaps in Panda's SpecNative system (spec-prompt injection, LLM classification, LLM-judge verification), consolidate the three overlapping spec UI surfaces into a single coherent surface, and unify `automationMode` + `chatMode` into one policy resolver so Panda reaches tier-1 agentic-IDE parity with Cursor 3 / Windsurf / Devin as of April 2026.

**Architecture:** Four-phase sequential refactor. Phase 1 removes dead code that creates false mental models. Phase 2 wires the existing (but disconnected) spec infrastructure end-to-end so the agent can see, execute against, and be verified against its own spec. Phase 3 collapses three competing spec-surface components into one state-driven component and unifies the two "mode" concepts into one policy function. Phase 4 activates drift detection, adds real structured-output LLM calls, and introduces parallel spec execution to close the gap with Cursor 3's best-of-N.

**Tech Stack:** Next.js 15 (apps/web), React 19, Convex (real-time backend), TypeScript strict, Bun test runner, Framer Motion (AnimatePresence), Anthropic/OpenAI/Z.AI/Crof.AI providers via `LLMProvider` interface, Tailwind.

**Invariant Rules:**
- Never break the checkpoint/resume contract — `state.activeSpec` must survive resumes
- Never ship UI that surfaces controls the agent cannot honor (e.g. spec approval banner in architect mode)
- Every LLM call must be abortable via `abortSignal`
- Run `bun test apps/web/lib/agent/spec/` after every spec-system task
- Run `bun test apps/web/lib/agent/harness/` after every harness-system task
- Commit after each bite-sized task — no batching

---

## Phase 1: Delete Dead Weight

Goal: Remove competing/ghost systems so every subsequent task has a single source of truth.

### Task 1.1: Delete `SpecContext.tsx`

**Files:**
- Delete: `apps/web/components/chat/SpecContext.tsx`
- Verify: No remaining imports via `rg "from.*SpecContext"` returning nothing

**Step 1: Verify it's actually dead**

Run: `rg "SpecProvider|useSpecContext|useCurrentSpec|usePendingSpec|useSpecTier" apps/web --type ts --type tsx | grep -v "SpecContext.tsx"`

Expected: No results. Confirms zero callers.

**Step 2: Delete the file**

Run: `rm "apps/web/components/chat/SpecContext.tsx"`

**Step 3: Build to verify nothing broke**

Run: `cd apps/web && bun run build 2>&1 | tail -20`

Expected: Build succeeds. If any type error cites `SpecContext`, grep again for stragglers.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(chat): remove unused SpecContext parallel state system"
```

### Task 1.2: Delete `MODE_OPTIONS` static duplicate

**Files:**
- Modify: `apps/web/components/chat/AgentSelector.tsx` — remove lines exporting `MODE_OPTIONS`
- Modify: `apps/web/components/chat/ModeSelector.tsx` — stop re-exporting `MODE_OPTIONS`

**Step 1: Find consumers**

Run: `rg "MODE_OPTIONS" apps/web --type ts --type tsx`

Expected: Only the two files above. If external consumers exist, migrate them to `getPrimaryChatModeSurfaceOptions()` first.

**Step 2: Remove the export from AgentSelector.tsx**

Delete the `export const MODE_OPTIONS = [...]` block (lines ~187-209).

**Step 3: Clean ModeSelector.tsx re-export**

Remove `MODE_OPTIONS` from the export line so it reads:
```ts
export { AgentSelector as ModeSelector, AgentSelector } from './AgentSelector'
```

**Step 4: Verify build + tests**

Run: `cd apps/web && bun run build && bun test apps/web/components/chat/selectors-overflow.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore(chat): drop static MODE_OPTIONS duplicate, use chat-mode-surface source of truth"
```

### Task 1.3: Remove dead `specTier` props from `ChatInput`

**Files:**
- Modify: `apps/web/components/chat/ChatInput.tsx` — remove `specTier`, `onSpecTierChange` from `ChatInputProps` and destructuring
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx` — stop passing them to `ChatInput`

**Step 1: Find all ChatInput callers**

Run: `rg "ChatInput[^A-Za-z]" apps/web --type tsx`

**Step 2: Remove `specTier` and `onSpecTierChange` from `ChatInputProps` interface**

In `apps/web/components/chat/ChatInput.tsx`, delete these lines from the interface:
```ts
specTier?: SpecTier | 'auto'
onSpecTierChange?: (tier: SpecTier | 'auto') => void
```

Also remove the unused `SpecTier` import.

**Step 3: Remove from destructuring**

Delete `specTier: _specTier,` and `onSpecTierChange: _onSpecTierChange,` from the function signature.

**Step 4: Remove props from ProjectChatPanel**

In `apps/web/components/projects/ProjectChatPanel.tsx`, delete the two lines that forward `specTier={specTier}` and `onSpecTierChange={onSpecTierChange}` to `ChatInput`. Keep them on `ChatInputProps` only if page.tsx still routes them — check next task.

**Step 5: Verify chat input wiring test still passes**

Run: `bun test apps/web/components/chat/chat-input-wiring.test.ts`

Expected: PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "chore(chat): drop unused specTier props from ChatInput"
```

### Task 1.4: Fix `resolveBackgroundExecutionPolicy` to honor chatMode

**Files:**
- Modify: `apps/web/lib/chat/backgroundExecution.ts`
- Test: `apps/web/lib/chat/backgroundExecution.test.ts` (create if missing)

**Step 1: Write the failing test**

Create `apps/web/lib/chat/backgroundExecution.test.ts`:
```ts
import { describe, it, expect } from 'bun:test'
import { resolveBackgroundExecutionPolicy } from './backgroundExecution'

describe('resolveBackgroundExecutionPolicy', () => {
  it('disables inline spec review for architect mode (spec engine is off there)', () => {
    const policy = resolveBackgroundExecutionPolicy('architect')
    expect(policy.showInlineSpecReview).toBe(false)
  })

  it('enables inline spec review for code mode', () => {
    const policy = resolveBackgroundExecutionPolicy('code')
    expect(policy.showInlineSpecReview).toBe(true)
  })

  it('enables inline plan review for architect mode', () => {
    const policy = resolveBackgroundExecutionPolicy('architect')
    expect(policy.showInlinePlanReview).toBe(true)
  })
})
```

**Step 2: Run to confirm failure**

Run: `bun test apps/web/lib/chat/backgroundExecution.test.ts`

Expected: FAIL on the architect assertion (policy currently always returns `true`).

**Step 3: Fix the implementation**

In `apps/web/lib/chat/backgroundExecution.ts`, change the signature to actually use `mode`:
```ts
export function resolveBackgroundExecutionPolicy(mode: ChatMode): BackgroundExecutionPolicy {
  const specEngineEnabled = mode !== 'architect'
  return {
    harnessSpecApprovalMode: 'auto_approve',
    autoOpenInspectorOnExecutionStart: false,
    autoOpenInspectorOnPlanExecution: false,
    showInlinePlanReview: true,
    showInlineSpecReview: specEngineEnabled,
    showInlineRunTimeline: true,
  }
}
```

**Step 4: Confirm test passes**

Run: `bun test apps/web/lib/chat/backgroundExecution.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "fix(chat): backgroundExecutionPolicy honors chatMode, hides spec review in architect"
```

---

## Phase 2: Wire the Three Critical Spec Connections

Goal: Make the SpecNative system functionally end-to-end so specs actually influence agent behavior and verification.

### Task 2.1: Thread `activeSpec` through `buildAgentPromptContext`

**Files:**
- Modify: `apps/web/lib/agent/session-controller.ts` — add `activeSpec` arg, forward it to `PromptContext`
- Test: `apps/web/lib/agent/session-controller.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test'
import { buildAgentPromptContext } from './session-controller'

describe('buildAgentPromptContext', () => {
  it('forwards activeSpec into PromptContext', () => {
    const spec = { id: 's1', intent: { goal: 'test' } } as any
    const ctx = buildAgentPromptContext({
      projectId: 'p1' as any, chatId: 'c1' as any, userId: 'u1' as any,
      mode: 'code', provider: 'openai', previousMessages: [], userContent: 'hi',
      activeSpec: spec,
    })
    expect(ctx.activeSpec).toBe(spec)
  })
})
```

**Step 2: Run to verify failure**

Run: `bun test apps/web/lib/agent/session-controller.test.ts`

Expected: FAIL — `activeSpec` not in args.

**Step 3: Add the parameter**

In `apps/web/lib/agent/session-controller.ts`:
- Add import: `import type { FormalSpecification } from './spec/types'`
- Add to `buildAgentPromptContext` args type: `activeSpec?: FormalSpecification`
- Add to returned object: `activeSpec: args.activeSpec`

**Step 4: Verify test passes**

Run: `bun test apps/web/lib/agent/session-controller.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(agent): thread activeSpec through buildAgentPromptContext"
```

### Task 2.2: Inject approved spec as system message at spec_generated event

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts` — in spec generation flow, inject a system message containing spec summary into `this.state.messages` after approval/generation
- Test: `apps/web/lib/agent/harness/runtime-spec-injection.test.ts` (create)

**Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'bun:test'
import { buildActiveSpecSystemMessage } from './runtime'
import type { FormalSpecification } from '../spec/types'

describe('buildActiveSpecSystemMessage', () => {
  it('produces a system message with goal, constraints, acceptance, plan', () => {
    const spec: FormalSpecification = {
      id: 's1',
      intent: { goal: 'Add auth' },
      constraints: [{ type: 'security', description: 'no plaintext passwords' }],
      acceptanceCriteria: [{ description: 'login works', priority: 'high' }],
      plan: { steps: [{ description: 'add login route' }] },
      status: 'executing', tier: 'explicit',
    } as any
    const msg = buildActiveSpecSystemMessage(spec)
    expect(msg.role).toBe('system')
    expect(msg.content).toContain('Add auth')
    expect(msg.content).toContain('no plaintext passwords')
    expect(msg.content).toContain('login works')
    expect(msg.content).toContain('add login route')
  })
})
```

**Step 2: Run to confirm failure**

Run: `bun test apps/web/lib/agent/harness/runtime-spec-injection.test.ts`

Expected: FAIL — `buildActiveSpecSystemMessage` not exported.

**Step 3: Implement and export the helper**

In `apps/web/lib/agent/harness/runtime.ts`, add:
```ts
export function buildActiveSpecSystemMessage(spec: FormalSpecification): Message {
  const body = [
    '## Active Specification',
    `**Goal:** ${spec.intent.goal}`,
    `**Status:** ${spec.status} (Tier: ${spec.tier})`,
    '',
    '**Constraints:**',
    ...spec.constraints.map((c) => `- [${c.type}] ${c.description}`),
    '',
    '**Acceptance Criteria:**',
    ...spec.acceptanceCriteria.map((a) => `- ${a.description} (${a.priority})`),
    '',
    '**Execution Plan:**',
    ...spec.plan.steps.map((s, i) => `${i + 1}. ${s.description}`),
    '',
    '**Scope Rule:** Only modify files in plan scope. Out-of-scope writes will be flagged.',
  ].join('\n')

  return {
    id: ascending(),
    role: 'system',
    parts: [{ type: 'text', content: body }],
    createdAt: Date.now(),
  } as Message
}
```

**Step 4: Call it in the spec generation flow**

In the same file, inside the method that yields `spec_generated` (around line 470 after `registerActiveSpec`), push the message into `this.state.messages` BEFORE yielding:
```ts
this.state.messages.push(buildActiveSpecSystemMessage(finalSpec))
```

Only push when spec is in `executing` or `approved` status.

**Step 5: Run spec tests**

Run: `bun test apps/web/lib/agent/harness/ apps/web/lib/agent/spec/`

Expected: PASS.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(harness): inject active spec as system message on spec_generated"
```

### Task 2.3: Replace heuristic-only classifier with real LLM classification

**Files:**
- Modify: `apps/web/lib/agent/spec/classifier.ts` — implement `performLLMClassification` using `provider.complete` with JSON schema
- Test: `apps/web/lib/agent/spec/classifier.test.ts`

**Step 1: Write failing test with fake provider**

```ts
import { describe, it, expect } from 'bun:test'
import { classifyIntent } from './classifier'

const fakeProvider: any = {
  complete: async () => ({
    content: JSON.stringify({
      tier: 'explicit', confidence: 0.85,
      scope: 'multi-file', risk: 'write', complexity: 'complex',
      reasoning: 'cross-cutting refactor',
    }),
  }),
}

describe('classifyIntent LLM fallback', () => {
  it('uses LLM when heuristics are low-confidence', async () => {
    const result = await classifyIntent(
      'Rewire the whole auth flow across user service and the gateway',
      { provider: fakeProvider }
    )
    expect(result.tier).toBe('explicit')
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })
})
```

**Step 2: Run to confirm failure**

Run: `bun test apps/web/lib/agent/spec/classifier.test.ts`

Expected: FAIL — current stub returns a heuristic guess that doesn't match.

**Step 3: Implement real LLM classification**

Replace the stub body of `performLLMClassification` in `apps/web/lib/agent/spec/classifier.ts`:
```ts
async function performLLMClassification(
  message: string,
  context: ClassificationContext,
  heuristicResult: ClassificationResult
): Promise<ClassificationResult> {
  if (!context.provider) return heuristicResult

  const systemPrompt = `Classify the user intent for an AI coding agent.
Return STRICT JSON matching: { tier: "instant"|"ambient"|"explicit", confidence: 0-1, scope: "single-file"|"multi-file"|"system-wide", risk: "read-only"|"write"|"destructive", complexity: "simple"|"medium"|"complex", reasoning: string }.
Guidance:
- instant: Q&A, explanations, trivial fixes (typos, renames).
- ambient: refactors, error handling, small features, auto-approvable changes.
- explicit: multi-file features, breaking changes, destructive ops, anything the user should review.`

  try {
    const response = await context.provider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0.1,
      maxTokens: 250,
    })

    const parsed = JSON.parse(response.content)
    return {
      tier: parsed.tier,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      factors: {
        scope: parsed.scope,
        risk: parsed.risk,
        complexity: parsed.complexity,
      },
    }
  } catch {
    return heuristicResult
  }
}
```

**Step 4: Verify test passes**

Run: `bun test apps/web/lib/agent/spec/classifier.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(spec): real LLM classification with structured JSON output"
```

### Task 2.4: Replace keyword-match verifier with LLM-judge

**Files:**
- Modify: `apps/web/lib/agent/spec/verifier.ts` — implement per-criterion LLM judge call, parallelize
- Test: `apps/web/lib/agent/spec/verifier.test.ts`

**Step 1: Write failing test**

```ts
import { describe, it, expect } from 'bun:test'
import { verifySpec } from './verifier'

const judgeProvider: any = {
  complete: async (req: any) => {
    const criterion = req.messages[1].content
    const passed = criterion.includes('login')
    return {
      content: JSON.stringify({
        passed, confidence: 0.9,
        evidence: passed ? 'Login route exists' : 'No evidence found',
      }),
    }
  },
}

describe('verifySpec', () => {
  it('passes when LLM judge returns passed=true for all criteria', async () => {
    const spec: any = {
      id: 's1', intent: { goal: 'Add auth' },
      acceptanceCriteria: [
        { id: 'a1', description: 'login works', priority: 'high' },
      ],
      constraints: [],
    }
    const results: any = { filesModified: ['src/login.ts'], output: 'ok' }
    const report = await verifySpec(spec, results, { provider: judgeProvider })
    expect(report.passed).toBe(true)
  })
})
```

**Step 2: Run to confirm failure**

Run: `bun test apps/web/lib/agent/spec/verifier.test.ts`

Expected: FAIL.

**Step 3: Implement parallelized LLM judge**

Replace verification logic in `apps/web/lib/agent/spec/verifier.ts`:
```ts
async function judgeCriterion(
  provider: LLMProvider,
  criterion: AcceptanceCriterion,
  results: ExecutionResults
): Promise<VerificationResult> {
  const systemPrompt = `You are a verification judge. Decide if execution satisfies the criterion.
Return STRICT JSON: { passed: boolean, confidence: 0-1, evidence: string }.`

  const userPrompt = [
    `Criterion: ${criterion.description}`,
    `Files modified: ${results.filesModified?.join(', ') ?? 'none'}`,
    `Output: ${(results.output ?? '').slice(0, 2000)}`,
    `Errors: ${results.errors?.join('; ') ?? 'none'}`,
  ].join('\n')

  try {
    const response = await provider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      responseFormat: { type: 'json_object' },
      temperature: 0,
      maxTokens: 300,
    })
    const parsed = JSON.parse(response.content)
    return {
      criterionId: criterion.id,
      passed: Boolean(parsed.passed),
      confidence: Number(parsed.confidence),
      evidence: String(parsed.evidence),
    }
  } catch {
    return {
      criterionId: criterion.id,
      passed: false,
      confidence: 0,
      evidence: 'Judge failed — defaulting to failed',
    }
  }
}
```

Wire it into `verifySpec`:
```ts
const criterionResults = await Promise.all(
  spec.acceptanceCriteria.map((c) => judgeCriterion(context.provider!, c, results))
)
```

**Step 4: Run tests**

Run: `bun test apps/web/lib/agent/spec/verifier.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(spec): LLM-judge verification with parallel per-criterion calls"
```

### Task 2.5: Pass provider to classifier + verifier from harness runtime

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts` — call sites at ~L373 (classify) and ~L2760 (verify) must forward `this.provider`

**Step 1: Find the call sites**

Run: `rg "specEngine.classify|specEngine.verify" apps/web/lib/agent/harness/runtime.ts -n`

**Step 2: Forward provider**

At the classify site, pass `provider: this.provider` in the ClassificationContext.
At the verify site, wrap `executionResults` call with `{ provider: this.provider }`.

**Step 3: Run harness tests**

Run: `bun test apps/web/lib/agent/harness/`

Expected: PASS.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(harness): forward provider to spec classifier and verifier"
```

### Task 2.6: Wire activeSpec to outer runtime prompt build

**Files:**
- Modify: `apps/web/hooks/useAgent.ts` — pass `agent.currentSpec` through `buildAgentPromptContext` on each resume/continuation

**Step 1: Locate the call in useAgent.ts around L614**

The `buildAgentPromptContext({...})` call needs a new arg: `activeSpec: currentSpec` (currentSpec comes from `useSpecManagement`).

**Step 2: Add the arg**

In `useAgent.ts`, inside `sendMessageInternal`, add to the `buildAgentPromptContext` call:
```ts
activeSpec: currentSpec ?? undefined,
```

Note: on first message of a run this is null. The intra-run injection from Task 2.2 handles the spec becoming active mid-run.

**Step 3: Verify builds**

Run: `cd apps/web && bun run build 2>&1 | tail -20`

Expected: No errors.

**Step 4: Commit**

```bash
git add -A
git commit -m "feat(agent): forward currentSpec into prompt context for continuations"
```

---

## Phase 3: Consolidate UI Overlap

Goal: Collapse competing UI surfaces into one coherent flow.

### Task 3.1: Create unified `resolveAgentPolicy` composing chatMode + automationMode

**Files:**
- Create: `apps/web/lib/chat/agentPolicy.ts`
- Test: `apps/web/lib/chat/agentPolicy.test.ts`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` — replace scattered conditionals

**Step 1: Write failing test**

```ts
import { describe, it, expect } from 'bun:test'
import { resolveAgentPolicy } from './agentPolicy'

describe('resolveAgentPolicy', () => {
  it('manual + code → interactive spec approval, show review', () => {
    const p = resolveAgentPolicy({ chatMode: 'code', automationMode: 'manual' })
    expect(p.specApprovalMode).toBe('interactive')
    expect(p.showSpecReview).toBe(true)
  })

  it('auto + code → auto_approve, show review', () => {
    const p = resolveAgentPolicy({ chatMode: 'code', automationMode: 'auto' })
    expect(p.specApprovalMode).toBe('auto_approve')
    expect(p.showSpecReview).toBe(true)
  })

  it('manual + architect → spec review hidden (spec engine off)', () => {
    const p = resolveAgentPolicy({ chatMode: 'architect', automationMode: 'manual' })
    expect(p.showSpecReview).toBe(false)
  })
})
```

**Step 2: Run to confirm failure**

Run: `bun test apps/web/lib/chat/agentPolicy.test.ts`

Expected: FAIL — file doesn't exist.

**Step 3: Implement**

```ts
// apps/web/lib/chat/agentPolicy.ts
import type { ChatMode } from '@/lib/agent/prompt-library'

export type AutomationMode = 'manual' | 'auto'

export interface AgentPolicy {
  specApprovalMode: 'interactive' | 'auto_approve'
  planApprovalMode: 'interactive' | 'auto_approve'
  showSpecReview: boolean
  showPlanReview: boolean
  showRunTimeline: boolean
  autoOpenInspectorOnExecutionStart: boolean
}

export function resolveAgentPolicy(args: {
  chatMode: ChatMode
  automationMode: AutomationMode
}): AgentPolicy {
  const specEngineEnabled = args.chatMode !== 'architect'
  const isAuto = args.automationMode === 'auto'

  return {
    specApprovalMode: isAuto ? 'auto_approve' : 'interactive',
    planApprovalMode: isAuto ? 'auto_approve' : 'interactive',
    showSpecReview: specEngineEnabled,
    showPlanReview: true,
    showRunTimeline: true,
    autoOpenInspectorOnExecutionStart: !isAuto,
  }
}
```

**Step 4: Confirm tests pass**

Run: `bun test apps/web/lib/chat/agentPolicy.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(chat): unified resolveAgentPolicy composing chatMode + automationMode"
```

### Task 3.2: Migrate page.tsx off `resolveBackgroundExecutionPolicy` + ad-hoc `automationMode` conditionals

**Files:**
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx` (lines ~380, ~937, ~1244, ~1249)

**Step 1: Find the call sites**

Run: `rg "resolveBackgroundExecutionPolicy|automationMode === 'auto'" apps/web/app --type tsx -n`

**Step 2: Replace**

In page.tsx:
1. Add import: `import { resolveAgentPolicy } from '@/lib/chat/agentPolicy'`
2. Replace `backgroundExecutionPolicy = useMemo(() => resolveBackgroundExecutionPolicy(chatMode), [chatMode])` with:
```tsx
const agentPolicy = useMemo(
  () => resolveAgentPolicy({ chatMode, automationMode }),
  [chatMode, automationMode]
)
```
3. Replace all `backgroundExecutionPolicy.showInlinePlanReview` with `agentPolicy.showPlanReview`
4. Replace all `backgroundExecutionPolicy.showInlineSpecReview` with `agentPolicy.showSpecReview`
5. Replace the `specApprovalMode: automationMode === 'auto' ? 'auto_approve' : 'interactive'` at L380 with `specApprovalMode: agentPolicy.specApprovalMode`

**Step 3: Verify build**

Run: `cd apps/web && bun run build 2>&1 | tail -20`

Expected: No errors.

**Step 4: Smoke test in browser**

```bash
cd apps/web && bun run dev
```

Navigate to a project, flip between Review/Auto on the ModeToggle. Flip chatMode between architect/code/build. Confirm spec banner hides in architect, shows in code+build.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(page): replace backgroundExecutionPolicy with unified agentPolicy"
```

### Task 3.3: Delete `resolveBackgroundExecutionPolicy` once no callers remain

**Files:**
- Delete: `apps/web/lib/chat/backgroundExecution.ts` (only if no other callers)
- Modify: `apps/web/lib/agent/session-controller.ts` — drop its import

**Step 1: Find callers**

Run: `rg "resolveBackgroundExecutionPolicy" apps/web --type ts --type tsx`

**Step 2: Migrate remaining callers**

In `session-controller.ts`, the `harnessSpecApprovalMode` fallback needs to go via `resolveAgentPolicy({ chatMode: args.mode, automationMode: 'manual' }).specApprovalMode`, OR the fallback should be removed and caller required to pass `specApprovalMode` explicitly.

Chosen approach: **require** `specApprovalMode` from caller. Drop the fallback.

**Step 3: Delete the file**

Run: `rm apps/web/lib/chat/backgroundExecution.ts`
Remove its test file if it exists.

**Step 4: Build + test**

Run: `cd apps/web && bun run build && bun test apps/web/lib/chat/`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore(chat): delete superseded resolveBackgroundExecutionPolicy"
```

### Task 3.4: Unify spec display surfaces into single state-driven `SpecSurface`

**Files:**
- Create: `apps/web/components/chat/SpecSurface.tsx`
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx` — replace inline SpecPanel with `SpecSurface`
- Modify: `apps/web/components/projects/ProjectWorkspaceLayout.tsx` — remove `SpecDrawer` call; `SpecSurface` handles "active" case
- Modify: `apps/web/hooks/useProjectWorkspaceUi.ts` — collapse `isSpecDrawerOpen` + `isSpecPanelOpen` into `specSurfaceMode: 'closed' | 'approval' | 'inspect'`
- Test: `apps/web/components/chat/SpecSurface.test.tsx`

**Step 1: Write failing test**

```tsx
// apps/web/components/chat/SpecSurface.test.tsx
import { describe, it, expect } from 'bun:test'
import { render } from '@testing-library/react'
import { SpecSurface } from './SpecSurface'

describe('SpecSurface', () => {
  it('renders nothing when mode is closed', () => {
    const { container } = render(
      <SpecSurface mode="closed" spec={null} onClose={() => {}} onApprove={() => {}} onEdit={() => {}} onCancel={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders approval UI when mode is approval + pendingSpec provided', () => {
    const spec: any = { id: 's1', intent: { goal: 'test' }, acceptanceCriteria: [], constraints: [], plan: { steps: [] }, status: 'draft', tier: 'explicit' }
    const { getByText } = render(
      <SpecSurface mode="approval" spec={spec} onClose={() => {}} onApprove={() => {}} onEdit={() => {}} onCancel={() => {}} />
    )
    expect(getByText(/Execute|Approve/i)).toBeTruthy()
  })
})
```

**Step 2: Run to confirm failure**

Run: `bun test apps/web/components/chat/SpecSurface.test.tsx`

Expected: FAIL — file doesn't exist.

**Step 3: Create SpecSurface**

```tsx
// apps/web/components/chat/SpecSurface.tsx
'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { SpecPanel } from '@/components/plan/SpecPanel'
import { SpecDrawer } from './SpecDrawer'
import type { FormalSpecification } from '@/lib/agent/spec/types'

export type SpecSurfaceMode = 'closed' | 'approval' | 'inspect'

interface SpecSurfaceProps {
  mode: SpecSurfaceMode
  spec: FormalSpecification | null
  onApprove: (spec: FormalSpecification) => void
  onEdit: (spec: FormalSpecification) => void
  onCancel: () => void
  onClose: () => void
}

export function SpecSurface({ mode, spec, onApprove, onEdit, onCancel, onClose }: SpecSurfaceProps) {
  if (mode === 'closed' || !spec) return null

  if (mode === 'approval') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="fixed inset-x-0 bottom-0 z-40 max-h-[90vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:border"
        >
          <SpecPanel spec={spec} onEdit={onEdit} onExecute={onApprove} onCancel={onCancel} onClose={onClose} />
        </motion.div>
      </AnimatePresence>
    )
  }

  // mode === 'inspect'
  return <SpecDrawer spec={spec} isOpen onClose={onClose} />
}
```

**Step 4: Migrate ProjectChatPanel**

Remove the inline `<SpecPanel>` slide-up block and its backdrop button (lines ~545-575). Keep `ChatActionBar` — that one triggers the mode change.

Route `onSpecEdit={() => setSpecSurfaceMode('approval')}` from page.tsx.

**Step 5: Migrate ProjectWorkspaceLayout**

Remove the `<SpecDrawer>` at line ~480. Move it into `SpecSurface` (already handled).

**Step 6: Update useProjectWorkspaceUi**

Replace:
```ts
const [isSpecDrawerOpen, setIsSpecDrawerOpen] = useState(false)
const [isSpecPanelOpen, setIsSpecPanelOpen] = useState(false)
```
with:
```ts
const [specSurfaceMode, setSpecSurfaceMode] = useState<SpecSurfaceMode>('closed')
```

Expose helpers:
```ts
const openSpecApproval = useCallback(() => setSpecSurfaceMode('approval'), [])
const openSpecInspect = useCallback(() => setSpecSurfaceMode('inspect'), [])
const closeSpecSurface = useCallback(() => setSpecSurfaceMode('closed'), [])
```

**Step 7: Update all call sites in page.tsx**

- `setIsSpecPanelOpen(true)` → `openSpecApproval()`
- `setIsSpecPanelOpen(false)` → `closeSpecSurface()`
- `setIsSpecDrawerOpen(true)` → `openSpecInspect()`
- `setIsSpecDrawerOpen(false)` → `closeSpecSurface()`

**Step 8: Run tests + build**

Run: `bun test apps/web/components/chat/ && cd apps/web && bun run build`

Expected: PASS.

**Step 9: Smoke test**

`bun run dev` — trigger a spec in manual mode, verify:
- Banner appears → Edit opens approval surface → Execute moves to executing state
- Status bar spec badge → opens inspect surface
- Only one surface can be open at a time

**Step 10: Commit**

```bash
git add -A
git commit -m "refactor(chat): unify SpecDrawer + SpecPanel into single SpecSurface component"
```

### Task 3.5: Rename ModeToggle → OversightToggle, differentiate visual treatment

**Files:**
- Rename: `apps/web/components/chat/ModeToggle.tsx` → `OversightToggle.tsx` (keep ModeToggle.tsx as a thin re-export for one release, then delete)
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx` — import/use `OversightToggle`

**Step 1: Copy file to new name**

```bash
cp apps/web/components/chat/ModeToggle.tsx apps/web/components/chat/OversightToggle.tsx
```

**Step 2: Rename the exported component**

In `OversightToggle.tsx`:
- Rename `ModeToggle` → `OversightToggle`
- Rename prop `mode` → `level` and type `'manual' | 'auto'` → `'review' | 'autopilot'`
- Update labels: "Review" stays, "Auto" → "Autopilot"
- Add stronger visual hint (pill shape or different border) to distinguish from AgentSelector

**Step 3: Update ProjectChatPanel + page.tsx**

Replace `<ModeToggle mode={automationMode} onModeChange={onAutomationModeChange} />` with `<OversightToggle level={oversightLevel} onChange={setOversightLevel} />`.

Rename `automationMode` state in page.tsx to `oversightLevel`.

**Step 4: Update ModeToggle.tsx to re-export for compat**

```ts
// apps/web/components/chat/ModeToggle.tsx
export { OversightToggle as ModeToggle } from './OversightToggle'
```

**Step 5: Build + smoke**

Run: `cd apps/web && bun run build`

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(chat): rename ModeToggle to OversightToggle with distinct visual"
```

---

## Phase 4: Advance to Tier-1 Features

Goal: Close the April-2026 feature gap vs Cursor 3 / Devin / Windsurf.

### Task 4.1: Enable drift detection by default

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts` — ensure `enableDriftDetection: true` flows through DEFAULT_RUNTIME_CONFIG into runtime config
- Modify: `apps/web/components/chat/RunProgressPanel.tsx` — add drift warning badge when runtime emits `drift_detected` event

**Step 1: Verify drift firing path**

Run: `rg "drift_detected|enableDriftDetection|reconciliation" apps/web/lib/agent/harness/runtime.ts -n`

**Step 2: Add event type to RuntimeEventType**

If not present, add `'drift_detected'` to the `RuntimeEventType` union at ~L175.

**Step 3: Yield the event**

In the drift check block at ~L1560, after `checkFilesForDrift`, if any finding matches active spec, yield:
```ts
yield {
  type: 'drift_detected',
  drift: { specId: spec.id, findings: drift.findings },
}
```

**Step 4: Add handler in `useAgent-event-applier.ts`**

```ts
case 'drift_detected': {
  const warningStep: ProgressStep = buildDriftWarningProgressStep(event.drift)
  setProgressSteps((prev) => [...prev, warningStep].slice(-30))
  return true
}
```

**Step 5: Add drift badge to RunProgressPanel**

Display a yellow pill "Drift: 2 files out of scope" when drift steps exist in `progressSteps`.

**Step 6: Add unit test**

In `apps/web/lib/agent/spec/drift-detection.test.ts` (create if missing):
```ts
it('flags file writes outside spec plan scope', () => {
  const spec: any = { plan: { steps: [{ files: ['src/auth.ts'] }] } }
  registerActiveSpec(spec)
  const drift = checkFilesForDrift(['src/auth.ts', 'src/unrelated.ts'])
  expect(drift.findings.some((f) => f.path === 'src/unrelated.ts')).toBe(true)
})
```

**Step 7: Run tests**

Run: `bun test apps/web/lib/agent/spec/`

Expected: PASS.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(harness): emit drift_detected events + RunProgressPanel warning"
```

### Task 4.2: Add parallel spec variant execution (Best-of-N minimum viable)

**Files:**
- Create: `apps/web/lib/agent/parallelVariants.ts`
- Modify: `apps/web/components/chat/VariantSelector.tsx` — add "Run 2 variants" option
- Modify: `apps/web/hooks/useAgent.ts` — add `sendMessageWithVariants(count: number)` method

**Step 1: Design note**

"Variants" here means spawning N harness runtimes with different temperatures (0.2 and 0.8) from the same prompt/spec, collecting their outputs, and surfacing a diff selector. This is the minimal Best-of-N.

**Step 2: Write test for `spawnVariants` helper**

```ts
// apps/web/lib/agent/parallelVariants.test.ts
import { describe, it, expect } from 'bun:test'
import { spawnVariants } from './parallelVariants'

describe('spawnVariants', () => {
  it('runs N runtimes and returns an array of completions', async () => {
    const fakeRuntime = async function* () {
      yield { type: 'text', content: 'hello' }
      yield { type: 'complete', usage: {} }
    }
    const results = await spawnVariants({
      count: 2,
      makeRuntime: () => ({ run: fakeRuntime as any, abort: () => {} }),
      context: {} as any,
      config: {} as any,
    })
    expect(results.length).toBe(2)
    expect(results[0].content).toBe('hello')
  })
})
```

**Step 3: Run to verify failure**

Run: `bun test apps/web/lib/agent/parallelVariants.test.ts`

Expected: FAIL.

**Step 4: Implement**

```ts
// apps/web/lib/agent/parallelVariants.ts
import type { AgentRuntimeLike } from './index'

export interface VariantResult {
  content: string
  toolCalls: number
  elapsedMs: number
}

export async function spawnVariants(args: {
  count: number
  makeRuntime: (variantIndex: number) => AgentRuntimeLike
  context: unknown
  config: unknown
}): Promise<VariantResult[]> {
  const runs = Array.from({ length: args.count }, (_, i) =>
    runOne(args.makeRuntime(i), args.context, args.config)
  )
  return Promise.all(runs)
}

async function runOne(runtime: AgentRuntimeLike, ctx: unknown, cfg: unknown): Promise<VariantResult> {
  const start = Date.now()
  let content = ''
  let toolCalls = 0
  for await (const event of runtime.run(ctx as any, cfg as any)) {
    if (event.type === 'text') content += event.content ?? ''
    if (event.type === 'tool_call') toolCalls++
    if (event.type === 'complete' || event.type === 'error') break
  }
  return { content, toolCalls, elapsedMs: Date.now() - start }
}
```

**Step 5: Wire into useAgent (minimal viable path)**

Add `sendMessageWithVariants(rawContent: string, count: 2)` that calls `spawnVariants` and stores results in a new `variantResults` state. Gate behind env flag `NEXT_PUBLIC_PANDA_VARIANTS=1` initially.

**Step 6: Add UI affordance in VariantSelector**

Add a new selector value `parallel:2`. When selected, `ChatInput.onSendMessage` takes the variants path.

**Step 7: Build + test**

Run: `bun test apps/web/lib/agent/parallelVariants.test.ts && cd apps/web && bun run build`

Expected: PASS.

**Step 8: Commit**

```bash
git add -A
git commit -m "feat(agent): parallel variant execution (Best-of-N MVP, env-flagged)"
```

### Task 4.3: Spec-aware suggested actions after verification failure

**Files:**
- Modify: `apps/web/components/chat/SuggestedActions.tsx` — accept `failedCriteria` prop
- Modify: `apps/web/components/chat/MessageList.tsx` — thread `currentSpec` → failed criteria into SuggestedActions
- Test: `apps/web/components/chat/SuggestedActions.test.tsx`

**Step 1: Test**

```tsx
it('renders retry action for each failed acceptance criterion', () => {
  const failed = [{ id: 'a1', description: 'login works' }]
  const { getByText } = render(<SuggestedActions failedCriteria={failed} onSelect={() => {}} />)
  expect(getByText(/login works/i)).toBeTruthy()
})
```

**Step 2: Implementation**

In `SuggestedActions.tsx`, if `failedCriteria` provided and non-empty, render those first with the prefix "Fix:". Each action clicks through to `onSelect(prompt)` with a pre-built retry prompt like `Retry failed criterion: ${criterion.description}`.

**Step 3: Thread data through MessageList**

When `currentSpec?.status === 'failed'`, compute `failedCriteria = currentSpec.verificationResults.filter(r => !r.passed)` and pass to SuggestedActions.

**Step 4: Run tests**

Run: `bun test apps/web/components/chat/`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(chat): spec-aware suggested actions surface failed criteria as retry prompts"
```

### Task 4.4: Add structured output contract to provider interface

**Files:**
- Modify: `apps/web/lib/llm/types.ts` — ensure `CompletionOptions` includes `responseFormat?: { type: 'json_object' | 'json_schema', schema?: object }`
- Modify: provider adapters in `apps/web/lib/llm/providers/` to honor it

**Step 1: Check current surface**

Run: `rg "responseFormat|response_format" apps/web/lib/llm -n`

**Step 2: Add to types**

In `apps/web/lib/llm/types.ts` `CompletionOptions`:
```ts
responseFormat?: { type: 'json_object' } | { type: 'json_schema'; schema: object; name: string }
```

**Step 3: Wire through Anthropic/OpenAI/ZAI/Crof.AI adapters**

For each provider `complete` method, if `options.responseFormat`:
- OpenAI: pass directly as `response_format`
- Anthropic: inject a `\n\nRespond ONLY with JSON.` suffix to system, and validate with `JSON.parse` on return
- ZAI/Crof.AI: inspect provider docs; fall back to system suffix strategy

**Step 4: Run provider tests**

Run: `bun test apps/web/lib/llm/`

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(llm): first-class structured output support across providers"
```

---

## Phase 5: Validation & Docs

### Task 5.1: End-to-end manual smoke test

**Steps:**

1. Start `bun run dev`
2. Open a project, Code mode, Review (manual) oversight
3. Send: "Add a login form with email + password to src/components/LoginForm.tsx"
4. Verify: Spec banner appears → Edit opens `SpecPanel` → Execute runs
5. Verify: During run, system prompt has active spec (check via network tab or debug logs)
6. Verify: After execution, `spec_verification` event fires with LLM-judge reasoning
7. Flip to Autopilot → Send another request → Spec auto-approves, no banner
8. Switch to Architect mode → Send a question → No spec banner appears (gated by policy)
9. Enable NEXT_PUBLIC_PANDA_VARIANTS=1 → Send with parallel:2 → Two runs complete, results side-by-side

**Step 2: Document failures**

Any discrepancy → open a follow-up task in this plan.

### Task 5.2: Update CLAUDE/MEMORY.md project entries

**Files:**
- Modify: `/home/nochaserz/.claude/projects/-home-nochaserz-Documents-Coding-Projects-panda/memory/MEMORY.md`

Update the "Known gaps" list to strike the now-closed items:
- ~~Runtime never calls Convex mutations after spec events~~ (already wired)
- ~~Drift detection plugin registered but `enableDriftDetection: false`~~ (now on)
- ~~LLM classification in classifier.ts is stubbed~~ (now real)
- ~~LLM judge verification in verifier.ts is stubbed~~ (now real)
- ~~Active spec registration for drift detection is not wired~~ (now wired)
- ~~Spec injection into agent prompts not implemented~~ (now wired)

Add new known strengths section listing the unified policy, unified spec surface, and parallel variants.

### Task 5.3: Run full test suite, fix regressions

Run: `cd apps/web && bun test`

Expected: All green. If any prior-green test now fails, fix before merging.

### Task 5.4: Open PR

```bash
git push -u origin feat/chat-panel-spec-wiring
gh pr create --title "feat(chat): SpecNative wiring + UI consolidation + Tier-1 features" --body "$(cat <<'EOF'
## Summary
- Wires spec classification/verification/prompt-injection end-to-end (three critical gaps closed)
- Consolidates three overlapping spec UIs (SpecPanel, SpecDrawer, ChatActionBar banner) into single SpecSurface
- Unifies chatMode + automationMode into one resolveAgentPolicy function
- Enables drift detection with visible warnings
- Adds parallel Best-of-N variant execution (env-flagged)
- Adds spec-aware retry suggestions on verification failure

## Test plan
- [ ] Unit: bun test apps/web/lib/agent/spec/
- [ ] Unit: bun test apps/web/lib/agent/harness/
- [ ] Unit: bun test apps/web/components/chat/
- [ ] Manual: Phase 5.1 smoke flow in Code mode (manual + auto)
- [ ] Manual: Architect mode shows no spec banner
- [ ] Manual: Verification failure surfaces retry actions

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Order Summary

1. **Phase 1 (dead code)** — 4 tasks, ~30 min, zero risk
2. **Phase 2 (spec wiring)** — 6 tasks, ~2 hours, moderate risk (LLM call cost)
3. **Phase 3 (UI consolidation)** — 5 tasks, ~3 hours, visual risk (needs smoke)
4. **Phase 4 (tier-1 features)** — 4 tasks, ~4 hours, feature risk (behind flags)
5. **Phase 5 (validation)** — 4 tasks, ~1 hour

**Total:** 23 bite-sized tasks, ~10 hours of implementation. Each task is ≤5 minutes and ends with a commit.

## Critical Path Notes

- Phase 2 tasks depend on Phase 1 (clean ground)
- Task 2.2 (spec injection) must land before Task 2.6 (currentSpec forwarding)
- Task 3.1 (resolveAgentPolicy) must land before 3.2 (migrate page.tsx)
- Task 4.1 (drift) depends on Task 2.2 (spec injection gives agent scope awareness)
- Task 4.2 (variants) is independent and can be parallelized
- Task 4.4 (structured output) should ideally land before 2.3 and 2.4 but the current implementations fall back gracefully if `responseFormat` is unsupported by the adapter

## Rollback Strategy

Each phase is a clean commit range. If Phase 3 breaks UX, `git revert <first-commit>..<last-commit>` restores prior surfaces. Phase 2 changes are additive — old stubs return correct-shape results, so even if LLM classification fails per-call, heuristics still catch it.
