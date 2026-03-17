# Panda Harness Consolidation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Consolidate Panda's agentic harness, spec system, chat panel, and hook architecture into a clean, organized, production-grade system by fixing dead code, wiring incomplete integrations, decomposing oversized files, and eliminating prop drilling.

**Architecture:** Six phases executed sequentially. Phase 1 removes dead code and fixes broken wiring. Phase 2 decomposes the 1823-line useAgent God hook into focused sub-hooks. Phase 3 makes the spec system functional end-to-end. Phase 4 fixes the harness runtime's incomplete subsystems. Phase 5 eliminates prop drilling with React Context. Phase 6 adds missing test coverage. Each phase is independently shippable and testable.

**Tech Stack:** Next.js (App Router), React 19, Convex (real-time DB), TypeScript, Bun (test runner), custom LLM agent harness

**Codebase totals:** ~42,000 lines across 93 files in the agent system

---

## Phase 1: Dead Code Removal & Broken Wiring Fixes

> Remove unused code, fix misconfigured plugins, and correct stale documentation. Low risk, immediate cleanup.

---

### Task 1.1: Remove postWriteValidationPlugin Dead Code

**Files:**
- Modify: `apps/web/lib/agent/harness/plugins.ts:346-458`

**Context:** `postWriteValidationPlugin` is defined at line 346 but never registered in `defaultPlugins` (line 470). Its TypeScript and lint checks are also hardcoded to `passed: true` (lines 402, 421). It is double-dead: stubbed AND unused.

**Step 1: Delete the postWriteValidationPlugin definition**

Remove lines 346-458 entirely (the `postWriteValidationPlugin` const and all its hooks). This code is never registered, never imported, and does nothing.

**Step 2: Verify no imports reference postWriteValidationPlugin**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && grep -r "postWriteValidationPlugin" --include="*.ts" --include="*.tsx" apps/`
Expected: Only the definition in `plugins.ts` (which you just removed). Zero imports elsewhere.

**Step 3: Run existing harness tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/harness/`
Expected: All tests pass (this plugin was never tested because it was never used).

**Step 4: Commit**

```bash
git add apps/web/lib/agent/harness/plugins.ts
git commit -m "chore: remove dead postWriteValidationPlugin (stubbed + unregistered)"
```

---

### Task 1.2: Fix HarnessAgentRuntimeAdapter abort() No-Op

**Files:**
- Modify: `apps/web/lib/agent/runtime.ts:1028-1031`
- Test: `apps/web/lib/agent/runtime.harness-adapter.test.ts`

**Context:** The `abort()` method on `HarnessAgentRuntimeAdapter` (line 1028) is an empty function body. The comment says "abort is handled by internal abortController" but there's no external way to trigger it from the adapter. The `useAgent` hook calls `runtimeRef.current?.abort?.()` in its `stop()` function (useAgent.ts:525).

**Step 1: Write failing test for abort behavior**

Add a test to `runtime.harness-adapter.test.ts`:

```typescript
it('abort() should signal the runtime to stop', async () => {
  // Verify abort method exists and is callable
  const adapter = createTestHarnessAdapter()
  expect(typeof adapter.abort).toBe('function')
  // After calling abort, subsequent run iterations should stop
  adapter.abort()
  // The adapter should be in an aborted state
})
```

**Step 2: Run test to verify it exposes the gap**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/runtime.harness-adapter.test.ts -t "abort"`
Expected: Test passes trivially (abort is callable but does nothing) OR fails if we assert behavior.

**Step 3: Implement abort by exposing an AbortController on the adapter**

In `runtime.ts`, modify the `HarnessAgentRuntimeAdapter` class:

```typescript
class HarnessAgentRuntimeAdapter implements AgentRuntimeLike {
  private abortController: AbortController | null = null
  // ... existing fields ...

  abort(): void {
    this.abortController?.abort()
  }

  async *run(promptContext: PromptContext, config?: RuntimeConfig): AsyncGenerator<AgentEvent> {
    this.abortController = new AbortController()
    // ... existing setup code ...
    // Pass abort signal to harness runtime or check it in the event loop
    for await (const event of source) {
      if (this.abortController.signal.aborted) {
        return  // Stop processing events
      }
      // ... existing event mapping ...
    }
  }
}
```

**Step 4: Run all runtime tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/runtime.harness-adapter.test.ts`
Expected: All tests pass including the new abort test.

**Step 5: Commit**

```bash
git add apps/web/lib/agent/runtime.ts apps/web/lib/agent/runtime.harness-adapter.test.ts
git commit -m "fix: wire HarnessAgentRuntimeAdapter.abort() to stop event processing"
```

---

### Task 1.3: Update MEMORY.md to Remove Stale Bug Claims

**Files:**
- Modify: `/home/nochaserz/.claude/projects/-home-nochaserz-Documents-Coding-Projects-panda/memory/MEMORY.md`

**Context:** The memory doc claims several bugs that have been fixed:
- "max-step exhaustion yields error then unconditionally yields complete" -- FIXED: line 563 has `return` after error yield
- "UI state flips: setStatus('error') -> setStatus('complete')" -- FIXED: `reduceTerminalAgentEvent` guards this
- "Verification is informational only" -- PARTIALLY WRONG: verification gates completion at runtime.ts:577-589

**Step 1: Update the Known Bug section in MEMORY.md**

Replace the "Known Bug: Run Lifecycle State Machine" section with accurate information reflecting current code state. Remove claims about bugs that are fixed. Add accurate gaps (drift detection unwired, post-write validation removed, classifier LLM stubbed).

**Step 2: Commit**

```bash
git add -A
git commit -m "docs: update memory with accurate harness state after code review"
```

---

## Phase 2: useAgent Hook Decomposition

> Break the 1823-line God hook into focused, testable sub-hooks. Execute in dependency order: leaf hooks first, then hooks that depend on them.

---

### Task 2.1: Extract useProviderSettings Hook

**Files:**
- Create: `apps/web/hooks/useProviderSettings.ts`
- Create: `apps/web/hooks/useProviderSettings.test.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 404-469)

**Context:** Lines 404-469 of useAgent.ts handle: loading provider capabilities, building reasoning config, async loading available models, and computing context window resolution. These are read-only derived values with no coupling to the agent execution loop.

**Step 1: Write failing test for useProviderSettings**

Create `apps/web/hooks/useProviderSettings.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test'

describe('useProviderSettings', () => {
  it('should be importable', () => {
    // This will fail until we create the file
    expect(() => require('./useProviderSettings')).not.toThrow()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/hooks/useProviderSettings.test.ts`
Expected: FAIL - module not found

**Step 3: Create useProviderSettings.ts**

Extract from useAgent.ts lines 404-469 into a new hook:

```typescript
import { useState, useEffect, useMemo, useCallback } from 'react'
import type { LLMProvider, ModelInfo, ReasoningOptions } from '../lib/llm/types'
import { getDefaultProviderCapabilities, type ProviderType } from '../lib/llm/types'
import { resolveContextWindow } from '../lib/agent/session-controller'

interface ReasoningProviderConfig {
  showReasoningPanel?: boolean
  reasoningEnabled?: boolean
  reasoningBudget?: number
  reasoningMode?: string
}

export interface ProviderSettingsResult {
  providerModels: ModelInfo[]
  contextWindowResolution: { contextWindow: number; source: string }
  getReasoningRuntimeSettings: () => {
    showReasoningPanel: boolean
    reasoning?: ReasoningOptions
  }
}

export function useProviderSettings(
  provider: LLMProvider | null,
  model: string,
  settings: Record<string, unknown> | undefined
): ProviderSettingsResult {
  const [providerModels, setProviderModels] = useState<ModelInfo[]>([])

  const getReasoningRuntimeSettings = useCallback(() => {
    const providerType = (provider?.config?.provider || 'openai') as ProviderType
    const capabilities =
      provider?.config?.capabilities ?? getDefaultProviderCapabilities(providerType)

    const providerKey = settings?.defaultProvider || providerType
    const providerConfig = ((settings?.providerConfigs as Record<string, unknown>)?.[
      providerKey as string
    ] ?? {}) as ReasoningProviderConfig

    const showReasoningPanel = providerConfig.showReasoningPanel !== false
    const reasoningEnabled = Boolean(providerConfig.reasoningEnabled)
    const reasoningBudget = Number(providerConfig.reasoningBudget ?? 6000)
    const reasoningMode = String(providerConfig.reasoningMode ?? 'auto')

    let reasoning: ReasoningOptions | undefined
    if (capabilities.supportsReasoning && reasoningEnabled) {
      reasoning = {
        enabled: true,
        ...(Number.isFinite(reasoningBudget) && reasoningBudget > 0
          ? { budgetTokens: reasoningBudget }
          : {}),
      }
      if (reasoningMode === 'low' || reasoningMode === 'medium' || reasoningMode === 'high') {
        reasoning.effort = reasoningMode
      }
    }

    return { showReasoningPanel, reasoning }
  }, [provider, settings])

  useEffect(() => {
    let cancelled = false
    if (provider?.listModels) {
      provider.listModels().then((models) => {
        if (!cancelled) setProviderModels(models)
      }).catch(() => {
        if (!cancelled) setProviderModels([])
      })
    }
    return () => { cancelled = true }
  }, [provider])

  const providerType = (provider?.config?.provider || 'openai') as ProviderType
  const contextWindowResolution = useMemo(
    () => resolveContextWindow(providerType, model, providerModels),
    [providerType, model, providerModels]
  )

  return { providerModels, contextWindowResolution, getReasoningRuntimeSettings }
}
```

**Step 4: Update useAgent.ts to use the new hook**

Replace lines 404-469 with:

```typescript
const { providerModels, contextWindowResolution, getReasoningRuntimeSettings } =
  useProviderSettings(provider, model, settings)
```

Remove the now-unused local state, effects, and callbacks that were extracted.

**Step 5: Run all tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/hooks/`
Expected: All pass

**Step 6: Commit**

```bash
git add apps/web/hooks/useProviderSettings.ts apps/web/hooks/useProviderSettings.test.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useProviderSettings from useAgent (lines 404-469)"
```

---

### Task 2.2: Extract useTokenUsageMetrics Hook

**Files:**
- Create: `apps/web/hooks/useTokenUsageMetrics.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 471-501)

**Context:** Lines 471-501 are pure computation: combine session usage + current run usage, compute context metrics. Zero coupling to the execution loop.

**Step 1: Create useTokenUsageMetrics.ts**

Extract from useAgent.ts lines 471-501. The hook takes `persistedModeUsage`, `currentRunUsage`, and `contextWindowResolution` as inputs and returns `sessionUsage` and `usageMetrics`.

**Step 2: Replace lines 471-501 in useAgent.ts with hook call**

**Step 3: Run tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/hooks/`
Expected: All pass

**Step 4: Commit**

```bash
git add apps/web/hooks/useTokenUsageMetrics.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useTokenUsageMetrics from useAgent (lines 471-501)"
```

---

### Task 2.3: Extract useMemoryBank Hook

**Files:**
- Create: `apps/web/hooks/useMemoryBank.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 293-297)

**Context:** Simple Convex query + mutation wrapper for memory bank content. Only needs projectId.

**Step 1: Create useMemoryBank.ts**

```typescript
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { useCallback } from 'react'

export function useMemoryBank(projectId: Id<'projects'> | undefined) {
  const memoryBankContent = useQuery(
    api.memoryBank.get,
    projectId ? { projectId } : 'skip'
  )

  const updateMemoryBankMutation = useMutation(api.memoryBank.update)

  const updateMemoryBank = useCallback(
    async (content: string) => {
      if (!projectId) return
      await updateMemoryBankMutation({ projectId, content })
    },
    [projectId, updateMemoryBankMutation]
  )

  return { memoryBankContent, updateMemoryBank }
}
```

**Step 2: Replace in useAgent.ts and run tests**

**Step 3: Commit**

```bash
git add apps/web/hooks/useMemoryBank.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useMemoryBank from useAgent (lines 293-297)"
```

---

### Task 2.4: Extract useProjectContext Hook

**Files:**
- Create: `apps/web/hooks/useProjectContext.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 303-329)

**Context:** Convex files query + project overview generation. Used for prompt context building. Low coupling.

**Step 1: Create useProjectContext.ts**

Extract the `projectFiles` query (lines 303-306) and `projectOverviewContent` useMemo (lines 309-329) into a new hook.

**Step 2: Replace in useAgent.ts and run tests**

**Step 3: Commit**

```bash
git add apps/web/hooks/useProjectContext.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useProjectContext from useAgent (lines 303-329)"
```

---

### Task 2.5: Extract useMessageHistory Hook

**Files:**
- Create: `apps/web/hooks/useMessageHistory.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 270-274, 342, 609-668)

**Context:** Convex paginated messages query, local messages state, and the hydration effect that normalizes persisted messages on load. Medium coupling (needs `mode` for normalization).

**Step 1: Create useMessageHistory.ts**

Extract:
- `persistedMessages` paginated query (lines 270-274)
- `messages` useState (line 342)
- Message hydration effect (lines 609-668) including mode normalization and annotation extraction

The hook takes `chatId` and `mode` and returns `{ messages, setMessages, persistedMessages, messagesPaginationStatus }`.

**Step 2: Replace in useAgent.ts**

**Step 3: Run all tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/hooks/`
Expected: All pass

**Step 4: Commit**

```bash
git add apps/web/hooks/useMessageHistory.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useMessageHistory from useAgent (lines 270-274, 609-668)"
```

---

### Task 2.6: Extract useSpecManagement Hook

**Files:**
- Create: `apps/web/hooks/useSpecManagement.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 288-290, 353-354, 579-601)

**Context:** Spec-related state (currentSpec, pendingSpec), Convex mutations (createSpec, updateSpec), persistence ref, and approval/cancel/edit functions. Medium coupling: the event handlers in sendMessageInternal (lines 1163-1272) also modify spec state, but those stay in useAgent and call the setters from this hook.

**Step 1: Create useSpecManagement.ts**

Extract:
- `createSpecMutation`, `updateSpecMutation` (lines 288-289)
- `specPersistenceRef` (line 290)
- `currentSpec`, `pendingSpec` state (lines 353-354)
- `approvePendingSpec`, `updatePendingSpecDraft`, `cancelPendingSpec` (lines 579-601)

The hook takes `{ projectId, chatId, runtimeRef }` and returns all spec state + mutation functions.

**Step 2: Replace in useAgent.ts**

**Step 3: Run all tests**

**Step 4: Commit**

```bash
git add apps/web/hooks/useSpecManagement.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useSpecManagement from useAgent (spec state + approval flow)"
```

---

### Task 2.7: Extract useRunLifecycle Hook

**Files:**
- Create: `apps/web/hooks/useRunLifecycle.ts`
- Modify: `apps/web/hooks/useAgent.ts` (lines 773-834)

**Context:** The three finalization functions (`finalizeRunCompleted`, `finalizeRunFailed`, `finalizeRunStopped`) plus terminal event reduction. Currently defined inside sendMessageInternal as closures. They share `runFinalized` and `terminalAgentStatus` local variables.

**Step 1: Create useRunLifecycle.ts**

Extract the finalization pattern into a reusable hook that returns:
- `createRunFinalizer()` — returns an object with `{ finalizeCompleted, finalizeFailed, finalizeStopped, shouldProcessTerminalEvent }` bound to a specific run
- Uses `reduceTerminalAgentEvent` from `useAgent-terminal-events.ts`

**Step 2: Replace the closure definitions in sendMessageInternal with the hook's returned functions**

**Step 3: Run all tests**

**Step 4: Commit**

```bash
git add apps/web/hooks/useRunLifecycle.ts apps/web/hooks/useAgent.ts
git commit -m "refactor: extract useRunLifecycle from useAgent (run finalization state machine)"
```

---

### Task 2.8: Verify useAgent Reduction and Run Full Test Suite

**Files:**
- Read: `apps/web/hooks/useAgent.ts`

**Step 1: Count remaining lines**

Run: `wc -l "/home/nochaserz/Documents/Coding Projects/panda/apps/web/hooks/useAgent.ts"`
Expected: ~1000-1100 lines (reduced from 1823)

**Step 2: Run full test suite**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/`
Expected: All tests pass

**Step 3: Run TypeScript type check**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -50`
Expected: No new type errors

**Step 4: Commit with verification note**

```bash
git commit --allow-empty -m "chore: verify useAgent decomposition complete - reduced from 1823 to ~1100 lines"
```

---

## Phase 3: Make Spec System Functional End-to-End

> Wire the spec system's disconnected pieces so specs actually constrain, verify, and detect drift during execution.

---

### Task 3.1: Wire Active Spec Registration for Drift Detection

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts` (after line 414)
- Modify: `apps/web/lib/agent/spec/drift-detection.ts` (verify registerActiveSpec API)
- Test: `apps/web/lib/agent/harness/runtime.test.ts`

**Context:** When a spec is approved and set as `activeSpec` (runtime.ts line 414), drift detection's `registerActiveSpec()` is never called. The drift detection plugin IS registered in defaultPlugins (plugins.ts:474), but it has no specs to monitor because registration never happens.

**Step 1: Write failing test**

Add test to `runtime.test.ts` that verifies: when a spec reaches 'executing' status, it is registered with drift detection.

**Step 2: Run test to verify failure**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/harness/runtime.test.ts -t "drift"`
Expected: FAIL

**Step 3: Wire registerActiveSpec in runtime.ts**

After line 414 where `this.state.activeSpec = finalSpec`, add:

```typescript
// Register spec with drift detection system
import { registerActiveSpec } from '../spec/drift-detection'
// ...
this.state.activeSpec = finalSpec
if (finalSpec.status === 'executing' || finalSpec.status === 'approved') {
  registerActiveSpec(finalSpec)
}
```

**Step 4: Run test to verify pass**

**Step 5: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "fix: wire registerActiveSpec when spec becomes active for drift detection"
```

---

### Task 3.2: Enable Drift Detection in Default Config

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts` (line 232)
- Modify: `apps/web/lib/agent/spec/engine.ts` (line 83)

**Context:** `enableDriftDetection` is `false` in both the harness runtime default config (runtime.ts:232) and the spec engine defaults (engine.ts:83). The plugin is registered and wired (Task 3.1), but config-disabled.

**Step 1: Set enableDriftDetection to true in both defaults**

In `runtime.ts` line 232, change `enableDriftDetection: false` to `enableDriftDetection: true`.
In `engine.ts` line 83, change `enableDriftDetection: false` to `enableDriftDetection: true`.

**Step 2: Run tests to check for regressions**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/`
Expected: All pass (drift detection was already a no-op, enabling it just lets the plugin's hooks fire)

**Step 3: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/spec/engine.ts
git commit -m "feat: enable drift detection by default in harness and spec engine config"
```

---

### Task 3.3: Emit Drift Events from Runtime After Tool Execution

**Files:**
- Modify: `apps/web/lib/agent/harness/runtime.ts` (after tool result processing, ~line 700+)
- Test: `apps/web/lib/agent/harness/runtime.test.ts`

**Context:** The drift detection plugin creates drift reports and stores them in `state.pendingDrifts`, but the runtime never retrieves them or emits them as events. The `spec.drift.detected` hook exists (plugins.ts:327) but is never triggered from runtime code.

**Step 1: Write failing test**

Test that after a write_files tool call modifies a file outside spec scope, a drift-related event or hook is fired.

**Step 2: Add drift check after tool execution**

After tool results are processed in the runtime's step execution, check for pending drifts:

```typescript
import { getPendingDrifts, clearPendingDrifts } from '../spec/drift-detection'

// After tool result is processed:
if (this.state.activeSpec && this.config.specEngine?.enableDriftDetection) {
  const drifts = getPendingDrifts(this.state.activeSpec.id)
  for (const drift of drifts) {
    await this.executeHook(
      'spec.drift.detected',
      { sessionID, step: this.state.step, agent, messageID },
      { specId: drift.specId, filePath: drift.filePath, reason: drift.reason }
    )
  }
  if (drifts.length > 0) {
    clearPendingDrifts(this.state.activeSpec.id)
  }
}
```

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.test.ts
git commit -m "feat: emit drift detection events from runtime after tool execution"
```

---

### Task 3.4: Replace Stubbed LLM Classification with Real Provider Call

**Files:**
- Modify: `apps/web/lib/agent/spec/classifier.ts` (lines 319-433, `performLLMClassification`)
- Test: `apps/web/lib/agent/spec/__tests__/classifier.test.ts`

**Context:** `performLLMClassification()` at line 319 says "In production, this would call an LLM. For now, we use enhanced heuristics." It never calls an LLM. The spec engine has access to the LLM provider through the harness runtime.

**Step 1: Design the LLM classification interface**

The classifier needs to accept an optional LLM provider. When available, it sends a structured prompt asking the LLM to classify intent tier (instant/ambient/explicit) with reasoning. When unavailable, falls back to existing heuristics.

**Step 2: Write test for LLM classification path**

Test with a mock provider that returns a structured JSON response.

**Step 3: Implement LLM classification**

Update `performLLMClassification` to:
1. Accept an optional `provider` parameter
2. Build a classification prompt with the user message and scoring context
3. Call the provider for a structured response
4. Parse the response to extract tier + confidence
5. Fall back to heuristics if the LLM call fails

**Step 4: Thread the provider through from runtime**

The `SpecEngine.classify()` method needs access to the LLM provider. Pass it from the harness runtime's constructor.

**Step 5: Run tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/spec/`
Expected: All pass

**Step 6: Commit**

```bash
git add apps/web/lib/agent/spec/classifier.ts apps/web/lib/agent/spec/engine.ts apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/spec/__tests__/classifier.test.ts
git commit -m "feat: replace stubbed LLM classification with real provider call + heuristic fallback"
```

---

### Task 3.5: Replace Stubbed LLM Judge Verification with Real Provider Call

**Files:**
- Modify: `apps/web/lib/agent/spec/verifier.ts` (lines 269-306, `verifyLLMJudgeCriterion`)
- Test: `apps/web/lib/agent/spec/__tests__/verifier.test.ts`

**Context:** `verifyLLMJudgeCriterion` at line 269 does keyword matching instead of actual LLM evaluation. It splits the behavior description into 4+ letter words and checks if they appear in the output. This is not verification.

**Step 1: Write test for LLM judge verification**

Test with a mock provider that evaluates a criterion against execution output.

**Step 2: Implement real LLM judge**

Update `verifyLLMJudgeCriterion` to:
1. Accept an optional LLM provider
2. Build a verification prompt: "Given this acceptance criterion: [criterion]. And this execution output: [output]. Did the execution satisfy the criterion? Respond with JSON: { passed: boolean, confidence: number, reasoning: string }"
3. Parse the structured response
4. Fall back to keyword heuristics if LLM unavailable

**Step 3: Thread provider through verifier**

Update `verifySpec()` to accept an optional provider parameter, passed from the spec engine.

**Step 4: Run tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/spec/__tests__/verifier.test.ts`
Expected: All pass

**Step 5: Commit**

```bash
git add apps/web/lib/agent/spec/verifier.ts apps/web/lib/agent/spec/engine.ts apps/web/lib/agent/spec/__tests__/verifier.test.ts
git commit -m "feat: replace stubbed LLM judge verification with real provider call"
```

---

### Task 3.6: Inject Active Spec into Agent Prompt

**Files:**
- Modify: `apps/web/lib/agent/prompt-library.ts` (around line 252)
- Test: `apps/web/lib/agent/prompt-library.test.ts` (if exists) or create one

**Context:** Specs are generated and approved, but never injected into the agent's system prompt. The agent doesn't know it's operating under a specification. The spec scope enforcement (getSpecScopeViolation) blocks out-of-scope writes, but the agent has no prompt-level awareness of what it should or shouldn't do.

**Step 1: Add spec context to prompt construction**

In `prompt-library.ts`, modify the prompt builder to include active spec information when available:

```typescript
// After existing system prompt construction:
if (promptContext.activeSpec) {
  const spec = promptContext.activeSpec
  const specSection = [
    `\n## Active Specification`,
    `**Goal:** ${spec.intent.goal}`,
    `**Constraints:**`,
    ...spec.constraints.map(c => `- [${c.type}] ${c.description}`),
    `**Acceptance Criteria:**`,
    ...spec.acceptanceCriteria.map(a => `- ${a.description}`),
    `**Scope:** Only modify files listed in the execution plan. Out-of-scope writes will be blocked.`,
  ].join('\n')
  // Append to system message
}
```

**Step 2: Thread activeSpec through PromptContext type**

Add `activeSpec?: FormalSpecification` to the `PromptContext` interface.

**Step 3: Pass activeSpec from runtime when building prompt context**

In `runtime.ts` or `session-controller.ts`, include the active spec in prompt context construction.

**Step 4: Run tests**

**Step 5: Commit**

```bash
git add apps/web/lib/agent/prompt-library.ts apps/web/lib/agent/session-controller.ts
git commit -m "feat: inject active spec into agent system prompt for execution awareness"
```

---

## Phase 4: Harness Runtime Fixes

> Fix the remaining harness issues: permission system modernization, plugin error surfacing, and specApprovalMode default.

---

### Task 4.1: Modernize Permission Polling to Promise-Based

**Files:**
- Modify: `apps/web/lib/agent/harness/permissions.ts` (lines 166+, the polling section)
- Test: `apps/web/lib/agent/harness/permissions.test.ts` (if exists)

**Context:** The permission `request()` method uses `setInterval` at 100ms polling + `setTimeout` for timeout. This can leak timers. Replace with a Promise that resolves when `respond()` is called, with AbortController for timeout.

**Step 1: Refactor request() to use Promise + resolve pattern**

Replace the polling implementation with:

```typescript
async request(sessionID, messageID, toolName, pattern, options): Promise<PermissionResult> {
  // ... existing permission check logic ...

  // For 'ask' decisions, create a Promise that resolves when respond() is called
  return new Promise((resolve) => {
    const timeoutMs = options?.timeoutMs ?? 60000
    const controller = new AbortController()

    const pendingRequest = {
      id: requestId,
      sessionID,
      toolName,
      pattern,
      resolve: (decision: PermissionDecision) => {
        controller.abort()
        resolve(decision)
      },
    }

    this.pendingRequests.set(requestId, pendingRequest)
    this.emit('permission.requested', pendingRequest)

    // Timeout handler
    const timeoutId = setTimeout(() => {
      if (this.pendingRequests.has(requestId)) {
        this.pendingRequests.delete(requestId)
        resolve({ granted: false, reason: 'Permission request timed out' })
      }
    }, timeoutMs)

    // Cleanup on abort
    controller.signal.addEventListener('abort', () => clearTimeout(timeoutId))
  })
}
```

**Step 2: Update respond() to resolve the pending Promise**

```typescript
respond(requestId: string, decision: 'allow' | 'deny', reason?: string): void {
  const pending = this.pendingRequests.get(requestId)
  if (!pending) return
  this.pendingRequests.delete(requestId)
  pending.resolve({ granted: decision === 'allow', reason })
}
```

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add apps/web/lib/agent/harness/permissions.ts
git commit -m "refactor: replace permission polling with Promise-based resolution"
```

---

### Task 4.2: Surface Plugin Hook Errors to Runtime Events

**Files:**
- Modify: `apps/web/lib/agent/harness/plugins.ts` (lines 121-129)
- Modify: `apps/web/lib/agent/harness/runtime.ts` (executeHook calls)

**Context:** Plugin hook errors are caught and logged (plugins.ts:127-129) but never surfaced to the user or the runtime event stream. A silently failing plugin gives zero feedback.

**Step 1: Modify executeHooks to collect and return errors**

```typescript
async executeHooks<T>(hookType: HookType, context: HookContext, data: T): Promise<{ result: T; errors: Array<{ plugin: string; error: Error }> }> {
  const errors: Array<{ plugin: string; error: Error }> = []
  let result = data

  for (const entry of entries) {
    try {
      const hookResult = await entry.handler(context, result)
      if (hookResult !== undefined) result = hookResult as T
    } catch (error) {
      appLog.error(`[PluginManager] Hook error in ${entry.plugin}:`, error)
      errors.push({ plugin: entry.plugin, error: error instanceof Error ? error : new Error(String(error)) })
    }
  }

  return { result, errors }
}
```

**Step 2: Update all `executeHook` call sites in runtime.ts to handle returned errors**

Log them as warnings in the runtime event stream so they're visible in the UI progress panel.

**Step 3: Run tests**

**Step 4: Commit**

```bash
git add apps/web/lib/agent/harness/plugins.ts apps/web/lib/agent/harness/runtime.ts
git commit -m "fix: surface plugin hook errors in runtime event stream instead of silent logging"
```

---

### Task 4.3: Change specApprovalMode Default to 'interactive'

**Files:**
- Modify: `apps/web/lib/agent/runtime.ts` (line 1039)

**Context:** `specApprovalMode` defaults to `'auto_approve'` (line 1039), meaning the spec approval UI path is never exercised unless explicitly configured. The SpecPanel approval UI exists but is bypassed by default.

**Step 1: Change default**

Change line 1039 from:
```typescript
const specApprovalMode = config?.harnessSpecApprovalMode ?? 'auto_approve'
```
to:
```typescript
const specApprovalMode = config?.harnessSpecApprovalMode ?? 'interactive'
```

**Step 2: Verify spec approval UI works**

The `spec_pending_approval` event handler in useAgent.ts (line 1163) already sets `pendingSpec` and shows the SpecPanel. With interactive mode, the `onSpecApproval` callback in runtime.ts (line 1111) will create a Promise that waits for user action instead of auto-approving.

**Step 3: Run tests**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/`
Expected: Some tests may need updating if they assumed auto-approve. Fix those to explicitly set the mode.

**Step 4: Commit**

```bash
git add apps/web/lib/agent/runtime.ts
git commit -m "feat: default specApprovalMode to interactive so spec approval UI is exercised"
```

---

## Phase 5: Chat Panel Prop Drilling Elimination

> Introduce React Context to eliminate the 44-prop ProjectChatPanel and reduce coupling.

---

### Task 5.1: Create ChatStateContext for Core Chat State

**Files:**
- Create: `apps/web/components/chat/ChatStateContext.tsx`

**Context:** `ProjectChatPanel` receives 44+ props, many of which are passed through to children. The core chat state (messages, status, mode, streaming, spec state, plan state) should be provided via context.

**Step 1: Define the context**

```typescript
'use client'

import { createContext, useContext } from 'react'
import type { ChatMode } from '@/lib/agent/prompt-library'
import type { FormalSpecification, SpecTier } from '@/lib/agent/spec/types'
import type { PlanStatus } from '@/components/chat/types'

interface ChatStateContextValue {
  // Core state
  isStreaming: boolean
  mode: ChatMode
  onModeChange: (mode: ChatMode) => void

  // Plan state
  planStatus: PlanStatus | null
  planDraft: string
  onPlanReview: () => void
  onPlanApprove: () => void
  onBuildFromPlan: () => void

  // Spec state
  currentSpec: FormalSpecification | null
  pendingSpec: FormalSpecification | null
  specTier: SpecTier | 'auto'
  onSpecApprove: (spec?: FormalSpecification) => void
  onSpecEdit: () => void
  onSpecCancel: () => void
}

const ChatStateContext = createContext<ChatStateContextValue | null>(null)

export function ChatStateProvider({ children, value }: { children: React.ReactNode; value: ChatStateContextValue }) {
  return <ChatStateContext.Provider value={value}>{children}</ChatStateContext.Provider>
}

export function useChatState() {
  const ctx = useContext(ChatStateContext)
  if (!ctx) throw new Error('useChatState must be used within ChatStateProvider')
  return ctx
}
```

**Step 2: Commit**

```bash
git add apps/web/components/chat/ChatStateContext.tsx
git commit -m "feat: add ChatStateContext to eliminate prop drilling in chat panel"
```

---

### Task 5.2: Wrap ProjectChatPanel with ChatStateProvider

**Files:**
- Modify: `apps/web/components/projects/ProjectChatPanel.tsx`
- Modify: Parent component that renders ProjectChatPanel (likely ProjectPage)

**Context:** The parent creates the `ChatStateProvider` with values from useAgent, and ProjectChatPanel consumes them via `useChatState()` instead of props.

**Step 1: Add ChatStateProvider in the parent**

Wrap `<ProjectChatPanel>` with `<ChatStateProvider value={{...}}>` using values from useAgent.

**Step 2: Remove matching props from ProjectChatPanel's interface**

Replace the 15-20 props that are now in context with `useChatState()` calls inside the component.

**Step 3: Run TypeScript check**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && npx tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -50`
Expected: No type errors (or fix any that appear)

**Step 4: Commit**

```bash
git add apps/web/components/projects/ProjectChatPanel.tsx apps/web/components/chat/ChatStateContext.tsx
git commit -m "refactor: ProjectChatPanel consumes ChatStateContext, reducing props from 44 to ~25"
```

---

### Task 5.3: Propagate Context to ChatActionBar and ChatInput

**Files:**
- Modify: `apps/web/components/chat/ChatActionBar.tsx` (23 props)
- Modify: `apps/web/components/chat/ChatInput.tsx` (18 props)

**Context:** Both components receive many props that are now available via context. ChatActionBar has 23 props (plan + spec state). ChatInput has 18 props (mode, model, spec tier).

**Step 1: Update ChatActionBar to use useChatState()**

Replace plan and spec props with context consumption. The component should go from 23 props to ~5 (className, custom callbacks not in context).

**Step 2: Update ChatInput to use useChatState()**

Replace mode, specTier, isStreaming props with context consumption. Reduce from 18 to ~8 props.

**Step 3: Run TypeScript check and verify UI works**

**Step 4: Commit**

```bash
git add apps/web/components/chat/ChatActionBar.tsx apps/web/components/chat/ChatInput.tsx
git commit -m "refactor: ChatActionBar and ChatInput consume ChatStateContext"
```

---

## Phase 6: Test Coverage for Critical Gaps

> Add tests for the systems most likely to regress: spec lifecycle, drift detection, permission resolution, and terminal event handling.

---

### Task 6.1: Add Spec Lifecycle Integration Test

**Files:**
- Create or modify: `apps/web/lib/agent/spec/__tests__/lifecycle.test.ts`

**Context:** Test the full spec lifecycle: classify -> generate -> validate -> approve -> execute -> verify. The existing integration test (580 lines) doesn't cover the end-to-end path with the runtime.

**Step 1: Write integration test**

Test: given a user message, verify that:
1. Classifier determines correct tier
2. Spec is generated with constraints and acceptance criteria
3. Validation passes
4. Approval transitions spec to 'executing'
5. Verification runs after execution and gates completion

**Step 2: Run test**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/spec/__tests__/lifecycle.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add apps/web/lib/agent/spec/__tests__/lifecycle.test.ts
git commit -m "test: add spec lifecycle integration test covering classify->verify path"
```

---

### Task 6.2: Add Drift Detection Wiring Test

**Files:**
- Create: `apps/web/lib/agent/spec/__tests__/drift-wiring.test.ts`

**Context:** Test that after Task 3.1-3.3, the drift detection pipeline works end-to-end: active spec registered -> write outside scope -> drift detected -> event emitted.

**Step 1: Write test**

```typescript
describe('drift detection wiring', () => {
  it('emits drift event when write_files targets a file outside spec scope', async () => {
    // 1. Create runtime with active spec
    // 2. Execute write_files to a path NOT in spec's execution plan
    // 3. Verify spec.drift.detected hook was called
    // 4. Verify drift report contains the out-of-scope file
  })
})
```

**Step 2: Run test**

**Step 3: Commit**

```bash
git add apps/web/lib/agent/spec/__tests__/drift-wiring.test.ts
git commit -m "test: add drift detection wiring test for end-to-end pipeline"
```

---

### Task 6.3: Add Permission Promise Resolution Test

**Files:**
- Create or modify: `apps/web/lib/agent/harness/permissions.test.ts`

**Context:** After Task 4.1, test the new Promise-based permission system: request -> respond -> resolve, and request -> timeout -> deny.

**Step 1: Write tests**

```typescript
describe('Promise-based permission resolution', () => {
  it('resolves when respond() is called', async () => {
    const result = permissions.request(sessionID, msgID, 'write_files', '*', { interrupt: true })
    permissions.respond(requestId, 'allow')
    expect(await result).toEqual({ granted: true })
  })

  it('rejects on timeout', async () => {
    const result = permissions.request(sessionID, msgID, 'write_files', '*', {
      interrupt: true,
      timeoutMs: 100,
    })
    // Don't call respond()
    expect(await result).toEqual({ granted: false, reason: expect.stringContaining('timed out') })
  })

  it('cleans up timeout when respond() is called before timeout', async () => {
    // Verify no timer leaks
  })
})
```

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add apps/web/lib/agent/harness/permissions.test.ts
git commit -m "test: add Promise-based permission resolution tests"
```

---

### Task 6.4: Add Terminal Event Guard Tests

**Files:**
- Modify: `apps/web/hooks/useAgent-terminal-events.test.ts`

**Context:** The existing test file (58 lines) tests `reduceTerminalAgentEvent`. Add tests for the new `useRunLifecycle` hook from Task 2.7.

**Step 1: Add tests for double-fire prevention**

```typescript
describe('run lifecycle finalization', () => {
  it('prevents double finalization when complete fires after error', () => {
    // First event (error) should process
    // Second event (complete) should be skipped
  })

  it('prevents double finalization when error fires after complete', () => {
    // First event (complete) should process
    // Second event (error) should be skipped
  })
})
```

**Step 2: Run tests**

**Step 3: Commit**

```bash
git add apps/web/hooks/useAgent-terminal-events.test.ts
git commit -m "test: add terminal event double-fire guard tests"
```

---

## Phase Summary

| Phase | Tasks | Lines Changed | Risk | Outcome |
|-------|-------|---------------|------|---------|
| 1. Dead Code & Fixes | 3 | ~150 removed, ~50 modified | Low | Clean foundation |
| 2. useAgent Decomposition | 8 | ~700 extracted to 6 new hooks | Medium | 1823 -> ~1100 lines |
| 3. Spec System E2E | 6 | ~400 new/modified | Medium | Specs classify, constrain, verify, detect drift |
| 4. Harness Fixes | 3 | ~200 modified | Low | Permissions modernized, errors surfaced, approval interactive |
| 5. Prop Drilling | 3 | ~300 modified | Low | 44-prop component -> context-based |
| 6. Test Coverage | 4 | ~400 new tests | Low | Critical paths covered |

**Total: 27 tasks across 6 phases**

**Dependency order:** Phase 1 first (cleanup), then Phase 2 (decomposition) and Phase 4 (harness fixes) can run in parallel, Phase 3 depends on Phase 4.3, Phase 5 is independent, Phase 6 depends on Phases 3-4.
