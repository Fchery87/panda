# Spec ↔ Forge Alignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the harness enforce that a run only completes when the SpecNative verifier AND the Forge gate system agree, unify duplicated acceptance-criteria types, make tier selection observable in the UI, add phase-aware tool gating, harden the LLM paths for classifier/verifier, and lock all of it behind a CI invariant test.

**Architecture:** Introduce a thin `SpecForgeReconciler` module inside the harness that (a) reads Forge gate status from the runtime's `forgeContextPack` (extended with gate snapshot) and (b) blocks the terminal `complete` event when spec status and Forge gate status disagree. Bridge `AcceptanceCriterion` ↔ `ForgeAcceptanceCriterion` via a pure mapping module so spec-generated criteria can be written into Forge tasks without type drift. Extend `SpecBadge` to show tier + classification reasoning. Add phase-aware tool filtering in `runtime.runLoop`. Add a feature flag + telemetry around LLM classifier/verifier calls. Lock the integration with one invariant test that runs as part of `bun test`.

**Tech Stack:**

- TypeScript strict (existing monorepo rules)
- Next.js 16 / React 19 frontend
- Convex backend (`convex/` root)
- Bun test runner (`bun test`) with Bun-compat shims in `apps/web/bun-test-*.d.ts`
- Existing harness at `apps/web/lib/agent/harness/`
- Existing Forge at `apps/web/lib/forge/` and `convex/forge.ts`
- Logger: `@/lib/logger` (appLog)

**Conventions to follow:**

- Brutalist design system: `rounded-none`, `font-mono`, `shadow-sharp-*`, semantic color tokens (see AGENTS.md)
- Zero ESLint warnings, zero TS errors — `bun run validate:web` must pass at the end
- Every task ends in a commit with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` trailer
- No new documentation files unless explicitly required

---

## Phase 1 — Bridge Acceptance-Criteria Types

Today `spec/types.ts → AcceptanceCriterion` and `forge/types.ts → ForgeAcceptanceCriterion` are near-duplicates with different enums. We must map explicitly so a spec-generated criterion can populate a Forge task criterion without losing information.

### Task 1: Add the bridge module with a failing round-trip test

**Files:**

- Create: `apps/web/lib/agent/spec/acceptance-bridge.ts`
- Create: `apps/web/lib/agent/spec/acceptance-bridge.test.ts`

**Step 1: Write the failing test**

```ts
// apps/web/lib/agent/spec/acceptance-bridge.test.ts
import { describe, expect, it } from 'bun:test'
import type { AcceptanceCriterion } from './types'
import type { ForgeAcceptanceCriterion } from '../../forge/types'
import { toForgeAcceptance, toSpecAcceptance } from './acceptance-bridge'

describe('acceptance-bridge', () => {
  it('maps spec automated → forge unit by default', () => {
    const spec: AcceptanceCriterion = {
      id: 'ac-1',
      trigger: 'user submits form',
      behavior: 'the system validates input',
      verificationMethod: 'automated',
      status: 'pending',
    }
    const forge = toForgeAcceptance(spec)
    expect(forge.id).toBe('ac-1')
    expect(forge.text).toContain('user submits form')
    expect(forge.text).toContain('the system validates input')
    expect(forge.verificationMethod).toBe('unit')
    expect(forge.status).toBe('pending')
  })

  it('maps spec llm-judge → forge review', () => {
    const spec: AcceptanceCriterion = {
      id: 'ac-2',
      trigger: 'a PR is opened',
      behavior: 'reviewer summary is generated',
      verificationMethod: 'llm-judge',
      status: 'passed',
    }
    const forge = toForgeAcceptance(spec)
    expect(forge.verificationMethod).toBe('review')
    expect(forge.status).toBe('passed')
  })

  it('maps spec manual → forge manual', () => {
    const spec: AcceptanceCriterion = {
      id: 'ac-3',
      trigger: 'release cut',
      behavior: 'operator confirms ship',
      verificationMethod: 'manual',
      status: 'skipped',
    }
    expect(toForgeAcceptance(spec).verificationMethod).toBe('manual')
    // Spec 'skipped' has no Forge equivalent; bridge must coerce to 'waived'.
    expect(toForgeAcceptance(spec).status).toBe('waived')
  })

  it('round-trips forge → spec → forge preserving method and text', () => {
    const forge: ForgeAcceptanceCriterion = {
      id: 'ac-4',
      text: 'WHEN a build completes THEN the system SHALL emit artifacts',
      status: 'passed',
      verificationMethod: 'integration',
    }
    const roundTrip = toForgeAcceptance(toSpecAcceptance(forge))
    expect(roundTrip.id).toBe(forge.id)
    expect(roundTrip.verificationMethod).toBe('integration')
    expect(roundTrip.status).toBe('passed')
    expect(roundTrip.text).toBe(forge.text)
  })
})
```

**Step 2: Run the test to verify it fails**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun test apps/web/lib/agent/spec/acceptance-bridge.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the bridge**

```ts
// apps/web/lib/agent/spec/acceptance-bridge.ts
import type { AcceptanceCriterion } from './types'
import type {
  ForgeAcceptanceCriterion,
  AcceptanceCriterionStatus,
  VerificationMethod,
} from '../../forge/types'

const SPEC_TO_FORGE_METHOD: Record<
  AcceptanceCriterion['verificationMethod'],
  VerificationMethod
> = {
  automated: 'unit',
  'llm-judge': 'review',
  manual: 'manual',
}

const FORGE_TO_SPEC_METHOD: Record<
  VerificationMethod,
  AcceptanceCriterion['verificationMethod']
> = {
  unit: 'automated',
  integration: 'automated',
  e2e: 'automated',
  review: 'llm-judge',
  manual: 'manual',
}

const SPEC_TO_FORGE_STATUS: Record<
  AcceptanceCriterion['status'],
  AcceptanceCriterionStatus
> = {
  pending: 'pending',
  passed: 'passed',
  failed: 'failed',
  skipped: 'waived',
}

const FORGE_TO_SPEC_STATUS: Record<
  AcceptanceCriterionStatus,
  AcceptanceCriterion['status']
> = {
  pending: 'pending',
  passed: 'passed',
  failed: 'failed',
  waived: 'skipped',
}

export function toForgeAcceptance(spec: AcceptanceCriterion): ForgeAcceptanceCriterion {
  return {
    id: spec.id,
    text: `WHEN ${spec.trigger} THEN the system SHALL ${spec.behavior}`,
    status: SPEC_TO_FORGE_STATUS[spec.status],
    verificationMethod: SPEC_TO_FORGE_METHOD[spec.verificationMethod],
  }
}

export function toSpecAcceptance(forge: ForgeAcceptanceCriterion): AcceptanceCriterion {
  const { trigger, behavior } = splitEarsText(forge.text)
  return {
    id: forge.id,
    trigger,
    behavior,
    verificationMethod: FORGE_TO_SPEC_METHOD[forge.verificationMethod],
    status: FORGE_TO_SPEC_STATUS[forge.status],
  }
}

function splitEarsText(text: string): { trigger: string; behavior: string } {
  const match = /^WHEN\s+(.*?)\s+THEN the system SHALL\s+(.*)$/i.exec(text.trim())
  if (!match) {
    return { trigger: '', behavior: text.trim() }
  }
  return { trigger: match[1].trim(), behavior: match[2].trim() }
}
```

Note: the round-trip test accepts any integration/unit/e2e Forge method collapsing to `automated` on the way back — to keep the test above round-trip stable, the initial example uses `integration` and the assertion checks that the Forge side is still `integration`. Because `FORGE_TO_SPEC_METHOD['integration'] = 'automated'` and `SPEC_TO_FORGE_METHOD['automated'] = 'unit'`, the literal round-trip would fail. Fix by recording the original Forge method on the spec side in a non-breaking way:

Update `apps/web/lib/agent/spec/acceptance-bridge.ts` to additionally export a `bridgeWithHint` path used by the round-trip test:

```ts
export interface BridgedAcceptance {
  spec: AcceptanceCriterion
  forgeMethodHint?: VerificationMethod
}

export function fromForgeWithHint(forge: ForgeAcceptanceCriterion): BridgedAcceptance {
  return { spec: toSpecAcceptance(forge), forgeMethodHint: forge.verificationMethod }
}

export function toForgeAcceptanceWithHint(
  bridged: BridgedAcceptance
): ForgeAcceptanceCriterion {
  const base = toForgeAcceptance(bridged.spec)
  return bridged.forgeMethodHint ? { ...base, verificationMethod: bridged.forgeMethodHint } : base
}
```

Then update the round-trip test to use `fromForgeWithHint` → `toForgeAcceptanceWithHint`.

**Step 4: Run the tests to verify they pass**

Run: `bun test apps/web/lib/agent/spec/acceptance-bridge.test.ts`
Expected: 4/4 PASS.

**Step 5: Commit**

```bash
git add apps/web/lib/agent/spec/acceptance-bridge.ts apps/web/lib/agent/spec/acceptance-bridge.test.ts
git commit -m "$(cat <<'EOF'
feat(spec): add acceptance-criteria bridge between spec and forge types

Explicit mapping module so FormalSpecification criteria can populate
ForgeAcceptanceCriterion without type drift, with a hint channel for
non-lossy round-trips.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Forge Gate Snapshot on WorkerContextPack

The runtime already injects `WorkerContextPack`, but it doesn't carry gate status, so the harness can't reconcile. We extend the pack non-breakingly.

### Task 2: Extend WorkerContextPack with optional gate snapshot + test

**Files:**

- Modify: `apps/web/lib/forge/types.ts` (add optional `gates` + `phase` fields)
- Modify: `apps/web/lib/forge/context-pack.ts`
- Test: `apps/web/lib/forge/context-pack.test.ts`

**Step 1: Inspect current test file**

Run: `cat apps/web/lib/forge/context-pack.test.ts | head -40`

**Step 2: Append a failing test**

Add to `apps/web/lib/forge/context-pack.test.ts`:

```ts
describe('buildWorkerContextPack — gate snapshot', () => {
  it('includes current phase and gate snapshot from delivery state', () => {
    const snapshot = buildSnapshotWithGates({
      phase: 'review',
      gates: {
        architecture_review: 'passed',
        implementation_review: 'pending',
        qa_review: 'not_required',
        ship_review: 'not_required',
      },
    })
    const pack = buildWorkerContextPack({
      snapshot,
      taskId: snapshot.taskBoard.tasks[0].id,
      role: 'builder',
    })
    expect(pack.phase).toBe('review')
    expect(pack.gates?.implementation_review).toBe('pending')
  })
})
```

(Add the `buildSnapshotWithGates` helper or reuse any existing fixture factory in the same file.)

**Step 3: Run the test to verify it fails**

Run: `bun test apps/web/lib/forge/context-pack.test.ts -t "gate snapshot"`
Expected: FAIL — `phase` / `gates` undefined.

**Step 4: Extend the types**

In `apps/web/lib/forge/types.ts`, add to `WorkerContextPack`:

```ts
export interface WorkerContextPack {
  // ...existing fields...
  phase?: ForgePhase
  gates?: Record<ForgeGateType, ForgeGateStatus>
}
```

In `apps/web/lib/forge/context-pack.ts`, add `phase: args.snapshot.state.phase` and `gates: args.snapshot.state.gates` to the returned pack.

**Step 5: Run the test to verify it passes**

Run: `bun test apps/web/lib/forge/context-pack.test.ts`
Expected: all PASS.

**Step 6: Run typecheck**

Run: `cd apps/web && bun run typecheck`
Expected: 0 errors.

**Step 7: Commit**

```bash
git add apps/web/lib/forge/types.ts apps/web/lib/forge/context-pack.ts apps/web/lib/forge/context-pack.test.ts
git commit -m "feat(forge): expose phase and gate snapshot on WorkerContextPack

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 3 — Spec/Forge Reconciler

Blocks the terminal `complete` event when spec and Forge disagree.

### Task 3: Write failing reconciler unit tests

**Files:**

- Create: `apps/web/lib/agent/spec/forge-reconciler.ts`
- Create: `apps/web/lib/agent/spec/forge-reconciler.test.ts`

**Step 1: Write the failing tests**

```ts
// apps/web/lib/agent/spec/forge-reconciler.test.ts
import { describe, expect, it } from 'bun:test'
import type { FormalSpecification, SpecStatus } from './types'
import type { ForgeGateStatus, ForgeGateType, ForgePhase } from '../../forge/types'
import { reconcileSpecAndForge } from './forge-reconciler'

const baseSpec: FormalSpecification = {
  id: 'spec_x',
  version: 1,
  tier: 'explicit',
  status: 'verified',
  intent: { goal: 'g', rawMessage: 'r', constraints: [], acceptanceCriteria: [] },
  plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
  validation: { preConditions: [], postConditions: [], invariants: [] },
  provenance: { model: 'm', promptHash: 'h', timestamp: 0, chatId: 'c' },
  createdAt: 0,
  updatedAt: 0,
}
const gates = (over?: Partial<Record<ForgeGateType, ForgeGateStatus>>) =>
  ({
    architecture_review: 'not_required',
    implementation_review: 'not_required',
    qa_review: 'not_required',
    ship_review: 'not_required',
    ...(over ?? {}),
  }) as Record<ForgeGateType, ForgeGateStatus>

describe('reconcileSpecAndForge', () => {
  it('aligned when no forge context is present', () => {
    expect(reconcileSpecAndForge({ spec: baseSpec })).toEqual({
      aligned: true,
      reason: 'no-forge-context',
    })
  })

  it('aligned when spec verified and all required gates passed', () => {
    const result = reconcileSpecAndForge({
      spec: baseSpec,
      forge: { phase: 'ship', gates: gates({ qa_review: 'passed', ship_review: 'passed' }) },
    })
    expect(result.aligned).toBe(true)
  })

  it('misaligned when spec verified but qa_review still pending', () => {
    const result = reconcileSpecAndForge({
      spec: baseSpec,
      forge: { phase: 'qa', gates: gates({ qa_review: 'pending' }) },
    })
    expect(result.aligned).toBe(false)
    expect(result.reason).toBe('gate-not-passed')
    expect(result.gate).toBe('qa_review')
  })

  it('misaligned when spec failed but gates are passed', () => {
    const failed: FormalSpecification = { ...baseSpec, status: 'failed' as SpecStatus }
    const result = reconcileSpecAndForge({
      spec: failed,
      forge: { phase: 'ship', gates: gates({ ship_review: 'passed' }) },
    })
    expect(result.aligned).toBe(false)
    expect(result.reason).toBe('spec-not-verified')
  })

  it('misaligned when shipping but spec drifted', () => {
    const drifted: FormalSpecification = { ...baseSpec, status: 'drifted' }
    const result = reconcileSpecAndForge({
      spec: drifted,
      forge: { phase: 'ship', gates: gates({ ship_review: 'passed' }) },
    })
    expect(result.aligned).toBe(false)
    expect(result.reason).toBe('spec-not-verified')
  })
})
```

**Step 2: Run the test to verify it fails**

Run: `bun test apps/web/lib/agent/spec/forge-reconciler.test.ts`
Expected: FAIL — module not found.

**Step 3: Implement the reconciler**

```ts
// apps/web/lib/agent/spec/forge-reconciler.ts
import type { FormalSpecification } from './types'
import type { ForgeGateStatus, ForgeGateType, ForgePhase } from '../../forge/types'

export interface ForgeReconcileInput {
  phase?: ForgePhase
  gates?: Record<ForgeGateType, ForgeGateStatus>
}

export type ReconcileReason =
  | 'no-forge-context'
  | 'spec-not-verified'
  | 'gate-not-passed'
  | 'aligned'

export interface ReconcileResult {
  aligned: boolean
  reason: ReconcileReason
  gate?: ForgeGateType
  detail?: string
}

const SHIP_READY_SPEC_STATUSES = new Set(['verified', 'archived'])

/**
 * Phases where we require a matching gate status before a run may complete.
 * Earlier phases let the spec verifier be the sole arbiter.
 */
const GATE_REQUIRED_PHASES: Partial<Record<ForgePhase, ForgeGateType>> = {
  review: 'implementation_review',
  qa: 'qa_review',
  ship: 'ship_review',
}

export function reconcileSpecAndForge(args: {
  spec: FormalSpecification
  forge?: ForgeReconcileInput
}): ReconcileResult {
  const { spec, forge } = args

  if (!forge || !forge.phase || !forge.gates) {
    return { aligned: true, reason: 'no-forge-context' }
  }

  if (!SHIP_READY_SPEC_STATUSES.has(spec.status)) {
    return {
      aligned: false,
      reason: 'spec-not-verified',
      detail: `Spec status is ${spec.status} but phase is ${forge.phase}`,
    }
  }

  const gateKey = GATE_REQUIRED_PHASES[forge.phase]
  if (gateKey) {
    const gateStatus = forge.gates[gateKey]
    if (gateStatus !== 'passed' && gateStatus !== 'waived' && gateStatus !== 'not_required') {
      return {
        aligned: false,
        reason: 'gate-not-passed',
        gate: gateKey,
        detail: `Gate ${gateKey} is ${gateStatus}`,
      }
    }
  }

  return { aligned: true, reason: 'aligned' }
}
```

**Step 4: Run the tests to verify they pass**

Run: `bun test apps/web/lib/agent/spec/forge-reconciler.test.ts`
Expected: 5/5 PASS.

**Step 5: Commit**

```bash
git add apps/web/lib/agent/spec/forge-reconciler.ts apps/web/lib/agent/spec/forge-reconciler.test.ts
git commit -m "feat(spec): add spec/forge reconciler with phase-aware gate checks

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Wire the reconciler into harness runtime completion gate

**Files:**

- Modify: `apps/web/lib/agent/harness/runtime.ts` (around existing completion gate at lines ~720-747)
- Test: `apps/web/lib/agent/harness/runtime.reconciler.test.ts`

**Step 1: Write the failing integration test**

Create `apps/web/lib/agent/harness/runtime.reconciler.test.ts`. Model it on `apps/web/lib/agent/harness/runtime.test.ts` fixtures. The test must:

- Drive a runtime to completion with `skipSpecVerification: false`
- Provide an `activeSpec` with `status === 'verified'` after verification
- Supply a `forgeContextPack` with `phase: 'qa'` and `gates.qa_review: 'pending'`
- Assert that the emitted terminal event is `type: 'error'` containing `Spec ↔ Forge misalignment`

Use the existing mock provider helper pattern from `runtime.test.ts` (`createMockProvider(...)`).

**Step 2: Run the test to verify it fails**

Run: `bun test apps/web/lib/agent/harness/runtime.reconciler.test.ts`
Expected: FAIL — the runtime currently emits `complete` regardless of Forge gates.

**Step 3: Wire the reconciler into the completion path**

In `apps/web/lib/agent/harness/runtime.ts`, between the existing `verificationOutcome.passed` branch (~line 730) and the `yield { type: 'complete' ... }` line, add:

```ts
if (verificationOutcome.passed && this.state.activeSpec) {
  const { reconcileSpecAndForge } = await import('../spec/forge-reconciler')
  const reconcile = reconcileSpecAndForge({
    spec: this.state.activeSpec,
    forge: this.state.forgeContextPack
      ? {
          phase: this.state.forgeContextPack.phase,
          gates: this.state.forgeContextPack.gates,
        }
      : undefined,
  })
  if (!reconcile.aligned) {
    yield {
      type: 'error',
      error: `Spec ↔ Forge misalignment: ${reconcile.reason}${
        reconcile.gate ? ` (gate: ${reconcile.gate})` : ''
      } — ${reconcile.detail ?? ''}`.trim(),
    }
    await this.saveCheckpoint(agent.name, 'error')
    return
  }
}
```

**Step 4: Run the test to verify it passes**

Run: `bun test apps/web/lib/agent/harness/runtime.reconciler.test.ts`
Expected: PASS.

**Step 5: Run the full harness test suite**

Run: `bun test apps/web/lib/agent/harness/`
Expected: all PASS.

**Step 6: Commit**

```bash
git add apps/web/lib/agent/harness/runtime.ts apps/web/lib/agent/harness/runtime.reconciler.test.ts
git commit -m "feat(harness): gate run completion on spec/forge reconciliation

Blocks terminal 'complete' when an active spec contradicts the current
Forge phase/gate status. Uses reconcileSpecAndForge; pure additive check
that is a no-op when no forgeContextPack is attached.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 4 — Phase-Aware Tool Gating

Forge's `in_review` / `qa_pending` phases should not permit fresh `write_files`. We piggyback on the existing permission system.

### Task 5: Add a phase-aware permission rule set

**Files:**

- Modify: `apps/web/lib/agent/permission/mode-rulesets.ts`
- Test: `apps/web/lib/agent/permission/mode-rulesets.test.ts` (create if missing)

**Step 1: Inspect existing file and find the `build` / `execute` preset**

Run: `grep -n "build\|execute\|write_files" apps/web/lib/agent/permission/mode-rulesets.ts | head -40`

**Step 2: Write the failing test**

```ts
// apps/web/lib/agent/permission/mode-rulesets.test.ts
import { describe, expect, it } from 'bun:test'
import { resolveRulesForPhase } from './mode-rulesets'

describe('resolveRulesForPhase', () => {
  it('denies write_files when forge phase is review', () => {
    const rules = resolveRulesForPhase('execute', { forgePhase: 'review' })
    const writeRule = rules.find((r) => r.pattern === 'write_files')
    expect(writeRule?.decision).toBe('deny')
  })

  it('denies run_command destructive patterns during qa phase', () => {
    const rules = resolveRulesForPhase('execute', { forgePhase: 'qa' })
    expect(rules.some((r) => r.pattern.startsWith('run_command') && r.decision === 'deny')).toBe(
      true
    )
  })

  it('permits write_files during execute phase', () => {
    const rules = resolveRulesForPhase('execute', { forgePhase: 'execute' })
    const writeRule = rules.find((r) => r.pattern === 'write_files')
    expect(writeRule?.decision).not.toBe('deny')
  })
})
```

**Step 3: Run the test to verify it fails**

Run: `bun test apps/web/lib/agent/permission/mode-rulesets.test.ts`
Expected: FAIL.

**Step 4: Implement `resolveRulesForPhase`**

In `apps/web/lib/agent/permission/mode-rulesets.ts`, export:

```ts
import type { ForgePhase } from '../../forge/types'
import type { PermissionRule } from '../harness/permission/types'

export function resolveRulesForPhase(
  mode: string,
  context: { forgePhase?: ForgePhase }
): PermissionRule[] {
  const base = getRulesForMode(mode) // existing resolver — rename if different
  if (!context.forgePhase) return base

  if (context.forgePhase === 'review' || context.forgePhase === 'qa' || context.forgePhase === 'ship') {
    return [
      { pattern: 'write_files', decision: 'deny', source: `forge-phase:${context.forgePhase}` },
      { pattern: 'run_command:*rm*', decision: 'deny', source: `forge-phase:${context.forgePhase}` },
      ...base,
    ]
  }
  return base
}
```

(Match existing export/naming conventions — read file first and adapt.)

**Step 5: Run the test to verify it passes**

Run: `bun test apps/web/lib/agent/permission/mode-rulesets.test.ts`
Expected: PASS.

**Step 6: Call `resolveRulesForPhase` from the runtime permission build path**

Trace the call: the runtime config carries a permission rule list. In `apps/web/lib/agent/runtime.ts` (the outer adapter) where rules are assembled for the harness, replace `getRulesForMode(mode)` with `resolveRulesForPhase(mode, { forgePhase: forgeContextPack?.phase })`. Run existing tests to confirm no regression:

Run: `bun test apps/web/lib/agent/runtime.*.test.ts`
Expected: all PASS.

**Step 7: Commit**

```bash
git add apps/web/lib/agent/permission/mode-rulesets.ts apps/web/lib/agent/permission/mode-rulesets.test.ts apps/web/lib/agent/runtime.ts
git commit -m "feat(permissions): phase-aware tool gating via forge phase

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 5 — Tier Observability in SpecBadge

### Task 6: Show tier + classification reasoning in SpecBadge

**Files:**

- Modify: `apps/web/components/workbench/SpecBadge.tsx`
- Modify: callers that render the badge — find with: `grep -rln "SpecBadge" apps/web/components apps/web/hooks`
- Test: `apps/web/components/workbench/SpecBadge.test.tsx` (create if missing; otherwise append)

**Step 1: Write the failing component test**

```tsx
// apps/web/components/workbench/SpecBadge.test.tsx
import { describe, expect, it } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { SpecBadge } from './SpecBadge'

describe('SpecBadge tier visibility', () => {
  it('shows tier label', () => {
    render(<SpecBadge status="executing" tier="explicit" classificationReasoning="system-wide" />)
    expect(screen.getByText(/explicit/i)).toBeTruthy()
  })

  it('exposes reasoning via title attribute for hover', () => {
    render(
      <SpecBadge status="executing" tier="ambient" classificationReasoning="multi-file write" />
    )
    const badge = screen.getByRole('button')
    expect(badge.getAttribute('title')).toContain('multi-file write')
  })
})
```

(If the project doesn't have `@testing-library/react` set up for Bun, degrade to a pure function test: export a helper `buildSpecBadgeLabel(status, tier)` and test the pure helper instead. Confirm which by running `ls apps/web/node_modules/@testing-library`.)

**Step 2: Run the test**

Run: `bun test apps/web/components/workbench/SpecBadge.test.tsx`
Expected: FAIL.

**Step 3: Extend the component**

Add to `SpecBadgeProps` in `apps/web/components/workbench/SpecBadge.tsx`:

```ts
interface SpecBadgeProps {
  status: SpecStatus
  tier?: SpecTier
  classificationReasoning?: string
  constraintsMet?: number
  constraintsTotal?: number
  onClick?: () => void
  className?: string
}
```

Add import: `import type { SpecTier } from '@/lib/agent/spec/types'`.
In the rendered JSX, include:

```tsx
<button
  type="button"
  title={props.classificationReasoning}
  // ... existing props
>
  {config.icon}
  <span className="flex items-center gap-1">
    <span className={cn(config.animate && 'animate-pulse')}>{/* existing label */}</span>
    {props.tier && (
      <span className="text-muted-foreground">• {props.tier}</span>
    )}
    {/* constraints */}
  </span>
</button>
```

**Step 4: Pass tier from callers**

For each render site, thread `spec.tier` and `spec.provenance?.classificationReasoning` (add that field to `SpecProvenance` if absent — it isn't today, so instead thread the last classification reasoning from the runtime via `spec_generated` event; the UI layer already has the ClassificationResult if you store it on the workbench spec slice).

Pragmatic shortcut: wire `tier` only in this pass and leave `classificationReasoning` prop optional. Update the test to drop the reasoning assertion if wiring it is out of scope.

**Step 5: Run tests + typecheck**

Run: `bun test apps/web/components/workbench/SpecBadge.test.tsx && cd apps/web && bun run typecheck`
Expected: PASS, 0 errors.

**Step 6: Commit**

```bash
git add apps/web/components/workbench/SpecBadge.tsx apps/web/components/workbench/SpecBadge.test.tsx <caller files>
git commit -m "feat(workbench): show spec tier in SpecBadge

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 6 — LLM Classifier/Verifier Hardening

The code paths exist but are silent on whether they fire. Add a feature flag + telemetry so we can confirm in prod.

### Task 7: Add feature flag + appLog calls around LLM paths

**Files:**

- Modify: `apps/web/lib/agent/spec/classifier.ts` (around `performLLMClassification`)
- Modify: `apps/web/lib/agent/spec/verifier.ts` (around `verifyLLMJudgeCriterion`)
- Test: reuse existing `apps/web/lib/agent/spec/__tests__/integration.test.ts` patterns — add small targeted tests or rely on manual log verification

**Step 1: Add appLog imports + guarded flag check**

In `classifier.ts`, at the top:

```ts
import { appLog } from '@/lib/logger'

const LLM_CLASSIFIER_FLAG = 'PANDA_SPEC_LLM_CLASSIFIER'
function llmClassifierEnabled(): boolean {
  return process.env[LLM_CLASSIFIER_FLAG] !== '0'
}
```

In `performLLMClassification`, before the provider call:

```ts
if (!llmClassifierEnabled()) {
  appLog.debug('[classifier] LLM path disabled by flag', { flag: LLM_CLASSIFIER_FLAG })
  return performHeuristicScoring(message, context, heuristicResult)
}
appLog.debug('[classifier] invoking LLM classifier', {
  model: context.provider?.config.defaultModel,
})
```

After success:

```ts
appLog.debug('[classifier] LLM classification result', {
  tier: result.tier,
  confidence: result.confidence,
})
```

Do the symmetric thing in `verifier.ts` `verifyLLMJudgeCriterion` using flag `PANDA_SPEC_LLM_VERIFIER`.

**Step 2: Lightweight test — flag disable returns heuristic path**

Add to `apps/web/lib/agent/spec/__tests__/integration.test.ts` (or new file if cleaner):

```ts
it('respects PANDA_SPEC_LLM_CLASSIFIER=0 flag', async () => {
  const original = process.env.PANDA_SPEC_LLM_CLASSIFIER
  process.env.PANDA_SPEC_LLM_CLASSIFIER = '0'
  try {
    const result = await classifyIntent('refactor all of auth', {
      provider: mockProviderThatThrows(), // should never be called
    })
    expect(['instant', 'ambient', 'explicit']).toContain(result.tier)
  } finally {
    process.env.PANDA_SPEC_LLM_CLASSIFIER = original
  }
})
```

**Step 3: Run the test**

Run: `bun test apps/web/lib/agent/spec/__tests__/integration.test.ts -t "PANDA_SPEC_LLM_CLASSIFIER"`
Expected: PASS.

**Step 4: Commit**

```bash
git add apps/web/lib/agent/spec/classifier.ts apps/web/lib/agent/spec/verifier.ts apps/web/lib/agent/spec/__tests__/integration.test.ts
git commit -m "chore(spec): add feature flags + telemetry around LLM classifier/verifier paths

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 7 — CI Invariant Test

One test that encodes the whole contract. If this test stays green, the integration is real.

### Task 8: Add the invariant test

**Files:**

- Create: `apps/web/lib/agent/spec/__tests__/spec-forge-invariant.test.ts`

**Step 1: Write the test**

```ts
import { describe, expect, it } from 'bun:test'
import type { FormalSpecification } from '../types'
import type { WorkerContextPack } from '../../../forge/types'
import { reconcileSpecAndForge } from '../forge-reconciler'

/**
 * INVARIANT: For every run eligible to emit 'complete':
 *   spec.status ∈ {verified, archived}
 *   AND (no forge context present OR forge gate for current phase is passed/waived/not_required)
 *
 * This test enumerates representative (spec status × phase × gate) combinations
 * and asserts the reconciler's decision matches the invariant.
 */
describe('spec ↔ forge invariant', () => {
  const makeSpec = (status: FormalSpecification['status']): FormalSpecification => ({
    id: 's',
    version: 1,
    tier: 'explicit',
    status,
    intent: { goal: 'g', rawMessage: 'r', constraints: [], acceptanceCriteria: [] },
    plan: { steps: [], dependencies: [], risks: [], estimatedTools: [] },
    validation: { preConditions: [], postConditions: [], invariants: [] },
    provenance: { model: 'm', promptHash: 'h', timestamp: 0, chatId: 'c' },
    createdAt: 0,
    updatedAt: 0,
  })

  const statuses = ['draft', 'validated', 'approved', 'executing', 'verified', 'drifted', 'failed', 'archived'] as const
  const phases = ['intake', 'plan', 'execute', 'review', 'qa', 'ship'] as const
  const gateStates = ['not_required', 'pending', 'passed', 'failed', 'waived'] as const

  for (const status of statuses) {
    for (const phase of phases) {
      for (const gate of gateStates) {
        it(`status=${status} phase=${phase} gate=${gate}`, () => {
          const result = reconcileSpecAndForge({
            spec: makeSpec(status),
            forge: {
              phase,
              gates: {
                architecture_review: 'not_required',
                implementation_review: phase === 'review' ? gate : 'not_required',
                qa_review: phase === 'qa' ? gate : 'not_required',
                ship_review: phase === 'ship' ? gate : 'not_required',
              },
            },
          })

          const specOk = status === 'verified' || status === 'archived'
          const gateOk = gate === 'passed' || gate === 'waived' || gate === 'not_required'
          const phaseNeedsGate = phase === 'review' || phase === 'qa' || phase === 'ship'
          const expectedAligned = specOk && (!phaseNeedsGate || gateOk)

          expect(result.aligned).toBe(expectedAligned)
        })
      }
    }
  }
})
```

**Step 2: Run the test**

Run: `bun test apps/web/lib/agent/spec/__tests__/spec-forge-invariant.test.ts`
Expected: all combinations PASS.

**Step 3: Run full validation**

Run: `cd "/home/nochaserz/Documents/Coding Projects/panda" && bun run typecheck && bun run lint && bun run format:check && bun test`
Expected: all PASS, zero warnings.

**Step 4: Commit**

```bash
git add apps/web/lib/agent/spec/__tests__/spec-forge-invariant.test.ts
git commit -m "test(spec): add spec/forge invariant matrix test

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 8 — Documentation (minimal)

### Task 9: Update AGENTS.md section on spec/forge integration only if explicitly requested

Do NOT create new Markdown files. If the user asks for docs later, add a short section to `AGENTS.md` under "Working on harness runtime" pointing at `reconcileSpecAndForge`, `acceptance-bridge`, and `resolveRulesForPhase`. Otherwise skip this task.

---

## Out of Scope

- Reworking Forge's own gate machinery (`convex/lib/forge_gatekeeper.ts`) — we only consume it.
- Building a new UI for drift reconciliation — existing `SpecDrawer` surfaces drift already.
- Changing LLM prompt content in `classifier.ts` / `verifier.ts` — only wrapping them with flags + telemetry.
- Converting `ForgeAcceptanceCriterion` to use `AcceptanceCriterion` at the Convex schema layer — schema changes would require a migration; we only bridge at the TypeScript application layer.

## Verification Before Completion

Before considering the plan complete, run:

```bash
cd "/home/nochaserz/Documents/Coding Projects/panda"
bun run typecheck
bun run lint
bun run format:check
bun test
# optional: cd apps/web && bun run test:e2e
```

All must pass with zero warnings. If any fail, fix before marking the plan done.
