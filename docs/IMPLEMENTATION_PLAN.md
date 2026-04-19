# Implementation Plan: Harness, Spec & Delivery Integration Hardening

> **Status:** Implemented and Verified **Created:** 2026-04-16 **Scope:**
> Agentic harness modularity, spec integration, permission unification

---

## Guiding Principles

1. **Capability-based permissions are canonical.** Legacy glob-pattern
   permissions will be deprecated.
2. **Incremental rollout with feature flags.** Every change is toggleable
   per-session.
3. **Each phase ships independently.** No phase depends on a later phase to be
   correct.
4. **Test coverage is non-negotiable.** Every change has a test before it lands.

---

## Phase 0: Foundation (No behavioral changes — types, interfaces, feature flags)

**Goal:** Lay the groundwork for all subsequent phases without changing runtime
behavior.

### 0.1 Add `PANDA_UNIFIED_PERMISSIONS` feature flag

**Files:**

- `apps/web/lib/agent/harness/feature-flags.ts` (new)

**What:** Create a single feature-flag module that all phases reference. Flags
are read from `process.env` (server) or session config (client).

```typescript
export const flags = {
  get unifiedPermissions(): boolean {
    return process.env.PANDA_UNIFIED_PERMISSIONS !== '0'
  },
  get phasePermissions(): boolean {
    return process.env.PANDA_PHASE_PERMISSIONS !== '0'
  },
  get specEnforcement(): boolean {
    return process.env.PANDA_SPEC_ENFORCEMENT === '1'
  },
  get checkpointFullState(): boolean {
    return process.env.PANDA_CHECKPOINT_FULL_STATE !== '0'
  },
  get specLifecycleManager(): boolean {
    return process.env.PANDA_SPEC_LIFECYCLE_MANAGER === '1'
  },
}
```

**Verify:** `bun test` passes. No runtime behavior changes.

---

### 0.2 Fix `PermissionRule.source` type

**Files:**

- `apps/web/lib/agent/harness/permission/types.ts`

**What:** Add `'delivery-phase'` to the `source` union. Remove the
`as PermissionRule['source']` type assertion in `mode-rulesets.ts:99,106,113`.

```diff
- source: 'mode' | 'spec' | 'user' | 'project' | 'session'
+ source: 'mode' | 'spec' | 'user' | 'project' | 'session' | 'delivery-phase'
```

**Verify:** `bun run typecheck` passes. `mode-rulesets.ts` no longer uses `as`
cast.

---

### 0.3 Fix `Capability` hardcoding — derive from type

**Files:**

- `apps/web/lib/agent/harness/permission/types.ts`
- `apps/web/lib/agent/harness/permission/evaluate.ts`

**What:** Add a `const ALL_CAPABILITIES` array in `types.ts` that is the single
source of truth. Import it in `evaluate.ts` instead of the local hardcoded
array.

```typescript
// types.ts
export const ALL_CAPABILITIES: readonly Capability[] = [
  'read',
  'search',
  'edit',
  'exec',
  'plan_exit',
  'memory',
  'mcp',
] as const
```

```diff
// evaluate.ts
- const allCapabilities: Capability[] = ['read', 'search', 'edit', 'exec', 'plan_exit', 'memory', 'mcp']
+ import { ALL_CAPABILITIES } from './types'
+ const allCapabilities = ALL_CAPABILITIES
```

**Verify:** `bun test` passes (no behavioral change). Compile-time: adding a new
capability to the union without adding to `ALL_CAPABILITIES` is a visible
discrepancy for code review.

---

### 0.4 Unify `Decision` and `PermissionDecision` type aliases

**Files:**

- `apps/web/lib/agent/harness/types.ts`
- `apps/web/lib/agent/harness/permission/types.ts`

**What:** Define `Decision` in `permission/types.ts` as canonical. Re-export as
`PermissionDecision` from `harness/types.ts` for backward compat.

```diff
// harness/types.ts
- export type PermissionDecision = 'allow' | 'deny' | 'ask'
+ export type PermissionDecision = Decision
+ // Re-export for convenience
+ export type { Decision } from './permission/types'
```

**Verify:** `bun run typecheck` passes. All existing usages compile unchanged.

---

### 0.5 Remove dead code

**Files:**

- `apps/web/lib/agent/runtime.ts`

**What:** Remove `resolveLegacyHarnessAgentName()` (exported but never called
within the file).

**Verify:** `bun run typecheck && bun run lint && bun test` all pass.

### Phase 0 execution order

Implement Phase 0 in this order:

1. Create `apps/web/lib/agent/harness/feature-flags.ts`
2. Update `apps/web/lib/agent/harness/permission/types.ts` for `delivery-phase`
   and `ALL_CAPABILITIES`
3. Update `apps/web/lib/agent/harness/permission/evaluate.ts` to import
   `ALL_CAPABILITIES`
4. Update `apps/web/lib/agent/harness/types.ts` to unify `Decision` /
   `PermissionDecision`
5. Remove `resolveLegacyHarnessAgentName()` from `apps/web/lib/agent/runtime.ts`
6. Run the full verification gate before starting Phase 1

**Phase 0 exit criteria:** all type-only changes compile cleanly, no runtime
behavior has changed, and the feature-flag module is available for later phases.

---

## Phase 1: Permission System Unification

**Goal:** Make capability-based `PermissionRule[]` + `evaluate()` the single
permission path. Deprecate legacy `Permission` maps.

**Note:** This is the first behavioral change in the rollout, so it should be
the first phase reviewed carefully before any spec enforcement changes land.

**Feature flag:** `PANDA_UNIFIED_PERMISSIONS` (default ON)

### 1.1 Create legacy-to-capability adapter

**Files:**

- `apps/web/lib/agent/harness/permission/legacy-adapter.ts` (new)

**What:** A function that converts legacy `Permission` (glob map) into
`PermissionRule[]` so the capability evaluator can process them. This bridges
the gap during migration.

```typescript
export function legacyPermissionsToRules(
  legacy: Permission,
  source: PermissionRule['source'] = 'session'
): PermissionRule[]
```

Mapping:

- Key `toolName` → `capability: resolveCapability(toolName)`,
  `decision: legacy[key]`
- Key `toolName:pathPattern` → additionally set `pattern: pathPattern`

**Verify:** Unit tests: given a legacy Permission map, produces correct
PermissionRule array with proper capability mapping and pattern extraction.

---

### 1.2 Gate the legacy check behind the feature flag

**Files:**

- `apps/web/lib/agent/harness/runtime.ts`

**What:** In `executeToolCall()` (~line 1356-1525), wrap the legacy
`checkPermission()` call in a feature-flag check:

```typescript
if (flags.unifiedPermissions) {
  // Only capability-based evaluation (already done above at ~1356-1396)
  // Skip legacy checkPermission entirely
} else {
  // Existing dual-check behavior (backward compat)
}
```

**Verify:** Test with flag ON: only capability evaluation runs. Test with flag
OFF: both systems run (current behavior).

---

### 1.3 Eliminate shared `permissions` singleton for multi-runtime safety

**Files:**

- `apps/web/lib/agent/harness/permissions.ts`
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/lib/agent/runtime.ts`

**What:** Convert `PermissionManager` from a module singleton to a per-runtime
instance. Create it in `createRuntime()`, pass it through `RuntimeConfig`. The
adapter `runtime.ts` creates its own instance per `AgentRuntime`.

Key change: `permissions` global → `this.permissions` instance field on
`Runtime`.

**Verify:** Test that two concurrent runtime instances don't pollute each
other's permission state.

---

### 1.4 Remove duplicate wildcard matcher

**Files:**

- `apps/web/lib/agent/harness/permissions.ts`

**What:** Replace the inline `matchPattern()` with `wildcardMatch()` from
`permission/wildcard.ts`. Update tests to reflect the semantic change (`*` no
longer matches `/`).

**Verify:** All permission tests pass. Document the semantic change in a
comment.

---

## Phase 2: Delivery Phase Wiring

**Goal:** Make delivery phase-aware permission overrides actually activate in
production.

**Feature flag:** `PANDA_PHASE_PERMISSIONS` (default ON)

### 2.1 Wire delivery context into `resolveRulesForPhase`

**Files:**

- `apps/web/lib/agent/runtime.ts` (~line 569)

**What:** Replace the empty `{}` with the actual delivery phase threaded from
delivery state into runtime config:

```diff
- permissionRules: resolveRulesForPhase(promptContext.chatMode, {}),
+ permissionRules: resolveRulesForPhase(promptContext.chatMode, {
+   deliveryPhase: config?.deliveryPhase,
+ }),
```

**Verify:** Test that during `review`/`qa`/`ship` phases, edit and destructive
exec are denied. Test that during `execute` phase, normal build-mode rules
apply.

---

### 2.2 Add integration test for delivery phase permissions

**Files:**

- `apps/web/lib/agent/permission/mode-rulesets.test.ts` (extend existing)

**What:** Add tests that cover each delivery phase override:

- `review` phase: edit denied, read allowed, exec denied for `rm`
- `qa` phase: edit denied, read allowed
- `ship` phase: edit denied, read allowed
- `execute` phase: build mode rules apply normally

**Verify:** `bun test` passes with new tests.

---

## Phase 3: Spec Enforcement

**Goal:** The spec verification result actually blocks completion when
requirements are not met.

**Feature flag:** `PANDA_SPEC_ENFORCEMENT` (default OFF, opt-in)

### 3.1 Add enforcement gate in harness runtime completion

**Files:**

- `apps/web/lib/agent/harness/runtime.ts` (in the completion flow)

**What:** After spec verification and before emitting the `complete` event, run
spec reconciliation. If misaligned:

- Treat the check as an enforcement gate, not a logging-only signal
- Emit a structured conflict with the exact mismatch reasons

- Log a structured warning with spec status, delivery phase, gate status
- Emit a `spec_misalignment` runtime event
- If enforcement flag is ON: block completion, return
  `FinishReason.spec_misalignment`
- If enforcement flag is OFF: log + emit event, proceed with completion

**Verify:** Test with enforcement ON: completion blocked when spec is verified
but delivery gate is not passed. Test with enforcement OFF: event emitted but
run completes.

---

### 3.2 Add `spec_misalignment` event type and finish reason

**Files:**

- `apps/web/lib/agent/harness/types.ts`

**What:** Add `'spec_misalignment'` to `FinishReason` type. Add corresponding
`RuntimeEvent` variant.

**Verify:** `bun run typecheck` passes.

---

### 3.3 Map `spec_misalignment` event through adapter

**Files:**

- `apps/web/lib/agent/runtime.ts` (event mapping)

**What:** Add mapping for `spec_misalignment` → `AgentEvent` with
`event_type: 'spec_misalignment'` so the UI can display the misalignment.

**Verify:** Adapter event mapping test.

---

## Phase 4: Checkpoint Fidelity

**Goal:** Resumed sessions retain spec and delivery context.

**Feature flag:** `PANDA_CHECKPOINT_FULL_STATE` (default ON)

### 4.1 Extend `RuntimeCheckpoint` with spec and delivery state

**Files:**

- `apps/web/lib/agent/harness/checkpoint-store.ts`

**What:** Add optional fields to `RuntimeCheckpointState`:

```typescript
deliveryContextPack?: WorkerContextPack
activeSpec?: FormalSpecification
```

**Verify:** Type-check passes. Existing checkpoints (without these fields)
deserialize correctly (fields are optional).

---

### 4.2 Save and restore spec + delivery context in checkpoint

**Files:**

- `apps/web/lib/agent/harness/runtime.ts`

**What:**

- In checkpoint save: include `state.deliveryContextPack` and `state.activeSpec`
- In `restoreStateFromCheckpoint()`: restore both fields

**Verify:** Test: create a runtime with spec + delivery context → checkpoint →
create new runtime from checkpoint → verify spec and delivery context are
restored.

---

### 4.3 Handle Convex checkpoint store migration

**Files:**

- `apps/web/lib/agent/harness/convex-checkpoint-store.ts`

**What:** Add version field to stored checkpoints. On load, if version is
missing (old format), treat as valid but without spec/delivery fields.

**Verify:** Test loading an old-format checkpoint succeeds with undefined
spec/delivery fields.

---

## Phase 5: Spec Bridge Protocol

**Goal:** Bidirectional sync with a clear authority model.

### 5.1 Define `SpecDeliveryBridge` interface

**Files:**

- `apps/web/lib/agent/spec/bridge.ts` (new)

**What:** Interface that replaces the ad-hoc reconciler/bridge/persistence
pattern:

```typescript
export interface SpecDeliveryBridge {
  // Read current alignment
  getAlignment(): Promise<SpecDeliveryAlignment>

  // Propose a state change — returns accepted or rejected
  proposeSpecTransition(
    status: SpecStatus
  ): Promise<{ accepted: boolean; reason?: string }>
  proposeDeliveryPhaseTransition(
    phase: DeliveryPhase
  ): Promise<{ accepted: boolean; reason?: string }>

  // Sync acceptance criteria bidirectionally
  syncAcceptanceCriteria(
    source: 'spec' | 'delivery',
    criteria: AcceptanceCriterion[]
  ): Promise<{ synced: boolean; conflicts: string[] }>
}
```

**Authority model:** Spec is the source of truth for requirements. Delivery
state is the source of truth for execution progress. Neither overrides the other
— both must agree before advancing.

**Verify:** Interface compiles. No behavioral change yet. Add a unit test that
proves the bridge returns explicit accept/reject results with conflict reasons
for mismatched states.

---

### 5.2 Fix acceptance bridge lossy mapping

**Files:**

- `apps/web/lib/agent/spec/acceptance-bridge.ts`

**What:** Replace the single `automated`↔`unit` mapping with a discriminated
approach:

```typescript
// Spec side: add a verification method field
export interface BridgedAcceptance {
  spec: AcceptanceCriterion
  delivery: DeliveryAcceptanceCriterion
  /** Preserves the specific verification method for roundtripping */
  verificationMethodHint?: 'unit' | 'integration' | 'e2e'
}

// toDeliveryAcceptance: if spec method is 'automated', default to 'unit' but preserve hint
// toSpecAcceptance: if delivery method is 'unit'|'integration'|'e2e', set spec method to 'automated' and preserve hint
```

**Verify:** Test roundtrip: spec `automated` → delivery `integration` → spec
`automated` with `verificationMethodHint: 'integration'`.

---

### 5.3 Wire bridge into persistence

**Files:**

- `apps/web/lib/agent/spec/persistence.ts`

**What:** Add optional `deliveryPhase` and `deliveryGateStatus` fields to
`CreateSpecInput`/`UpdateSpecInput`. When writing spec to Convex, include the
delivery context for traceability.

**Note:** This should make the persistence layer aware of delivery state without
making delivery the owner of spec status; spec remains authoritative for
requirements, delivery state remains authoritative for execution gates.

**Verify:** Spec creates/updates include delivery context when available.

---

### 5.4 Fix snapshot spec query truncation

**Files:**

- `convex/delivery.ts` (~line 733)

**What:** Remove the truncation risk from the spec query so the active
non-archived spec is selected correctly even when more than 10 specs exist:

```diff
- .take(10)
+ .collect()
```

**Verify:** Test that a project with 15+ archived specs still returns the active
spec in the snapshot.

---

## Phase 6: Spec Lifecycle Decoupling

**Goal:** Spec system is injected, not hardcoded into the harness runtime.

**Feature flag:** `PANDA_SPEC_LIFECYCLE_MANAGER` (default OFF, opt-in)

### 6.1 Extract `SpecLifecycleManager` interface

**Files:**

- `apps/web/lib/agent/spec/lifecycle-manager.ts` (new)

**What:** Interface that the harness runtime calls instead of directly calling
`SpecEngine`:

```typescript
export interface SpecLifecycleManager {
  classify(message: string): Promise<ClassificationResult>
  generate(context: SpecGenerationContext): Promise<SpecGenerationResult>
  validate(spec: FormalSpecification): ValidationResult
  refine(spec: FormalSpecification): Promise<FormalSpecification>
  verify(
    spec: FormalSpecification,
    results: ExecutionResults
  ): Promise<SpecVerificationReport>
  getStatus(specId: string): SpecStatus | undefined
  getActiveSpec(): FormalSpecification | undefined
}

export class DefaultSpecLifecycleManager implements SpecLifecycleManager {
  // Wraps existing SpecEngine + reconciler + drift detection
}
```

**Verify:** Interface compiles. `DefaultSpecLifecycleManager` passes all
existing spec tests.

---

### 6.2 Inject `SpecLifecycleManager` into `RuntimeConfig`

**Files:**

- `apps/web/lib/agent/harness/types.ts`
- `apps/web/lib/agent/harness/runtime.ts`

**What:** Add optional `specLifecycleManager?: SpecLifecycleManager` to
`RuntimeConfig`. When present, use it instead of creating `SpecEngine` inline.
When absent, create `DefaultSpecLifecycleManager` as default.

**Verify:** Runtime works with both injected and default managers.

---

### 6.3 Convert drift-detection module-level Maps to per-session state

**Files:**

- `apps/web/lib/agent/spec/drift-detection.ts`

**What:** Replace module-level plugin notification/tracking state with a
per-plugin-instance drift state factory, while preserving the existing exported
helpers used by current integrations and tests.

```typescript
export function createDriftDetectionState(): DriftDetectionState

export function createDriftDetectionPlugin(
  config?: DriftDetectionConfig
): Plugin {
  const pluginState = createDriftDetectionState()
  // ... plugin hooks use pluginState instead of shared plugin globals
}
```

**Verify:** Two concurrent sessions don't share drift state.

---

## Phase 7: Runtime Decomposition (Code Quality)

**Goal:** Break `harness/runtime.ts` (3098 lines) into focused modules.

### 7.1 Extract `runtime-tools.ts`

**What:** Move `executeToolCall()`, `resolveToolList()`, tool deduplication
logic, and risk policy resolution into a dedicated module.

**Note:** Phase 7 should be split into smaller PRs if necessary; extracting tool
execution first is safer than attempting a full runtime split in one change.

### 7.2 Extract `runtime-spec.ts`

**What:** Move spec lifecycle management (classify, generate, validate, approve,
verify) behind the `SpecLifecycleManager` from Phase 6.

**Implemented outcome:** The lifecycle orchestration is now decoupled via
`lifecycle-manager.ts`. A dedicated `runtime-spec.ts` file was not necessary for
this iteration.

### 7.3 Extract `runtime-checkpoint.ts`

**What:** Move checkpoint save/restore logic into a dedicated module.

### 7.4 Extract `runtime-events.ts`

**What:** Move event emission helpers, state change events, into a dedicated
module.

### 7.5 Deduplicate event-mapping and progress mapping in adapter

**Files:**

- `apps/web/lib/agent/runtime.ts`

**What:** Deduplicate shared adapter progress mapping so the main runtime path
and rewrite path reuse the same tool progress helpers.

**Implemented outcome:** Tool progress mapping was extracted into
`runtime-progress.ts` and reused in both places. `mapHarnessEventToAgentEvent()`
remains in `runtime.ts`.

**Verify for each subtask:** `bun run typecheck && bun run lint && bun test`
pass. No behavioral change.

---

## Dependency Graph

```
Phase 0 (Foundation)
  │
  ├── Phase 1 (Permission Unification)
  │     │
  │     └── Phase 2 (Delivery Phase Wiring) ─── depends on Phase 1.1 (adapter)
  │
  ├── Phase 3 (Spec Enforcement) ─── independent of 1, 2
  │
  ├── Phase 4 (Checkpoint Fidelity) ─── independent
  │
  └── Phase 5 (Bridge Protocol) ─── builds on Phase 3
        │
        └── Phase 6 (Spec Decoupling) ─── builds on Phase 5
              │
              └── Phase 7 (Runtime Decomposition) ─── builds on Phase 6
```

**Parallelizable:** Phases 1, 3, 4 can start simultaneously after Phase 0.
**Sequential:** Phase 2 needs Phase 1. Phase 5 needs Phase 3. Phases 6→7 are
sequential.

---

## Risk Assessment

| Phase | Risk                                       | Mitigation                                                               |
| ----- | ------------------------------------------ | ------------------------------------------------------------------------ |
| 0     | Low — types only                           | Compile-time verification                                                |
| 1     | Medium — touches every tool call           | Feature flag allows instant rollback. `legacy-adapter.ts` bridges gap.   |
| 2     | Low — wiring change                        | Feature flag defaults ON. Tests cover each phase.                        |
| 3     | Medium — changes completion flow           | Feature flag defaults OFF. Advisory-only mode first, enforcement opt-in. |
| 4     | Low — additive fields                      | Optional fields, backward-compatible deserialization.                    |
| 5     | High — new interface + persistence changes | Interface first, implementation second. Feature flag guards.             |
| 6     | Medium — architectural refactor            | Feature flag. `DefaultSpecLifecycleManager` wraps existing code.         |
| 7     | Medium — large file reorganization         | One extraction at a time. Each subtask is independently testable.        |

---

## Verification Checklist (Per Phase)

Every phase must pass before the next begins:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

Additionally:

- **Phase 0-2:** No behavioral change when flags are at default values
- **Phase 3:** Run spec enforcement tests with enforcement ON
- **Phase 4:** Checkpoint roundtrip test with spec + delivery state
- **Phase 5:** Acceptance criteria roundtrip test (no data loss)
- **Phase 6:** All existing spec integration tests pass through
  `DefaultSpecLifecycleManager`
- **Phase 7:** `grep` confirms no duplicate code between extracted modules

---

## Execution Checklist

Use this checklist to implement the plan in order. Do not start a later phase
until the current phase is verified.

### Phase 0 — Foundation

- [x] Add feature-flag module
- [x] Add `delivery-phase` to `PermissionRule.source`
- [x] Add `ALL_CAPABILITIES` and wire it into permission evaluation
- [x] Unify `Decision` / `PermissionDecision` aliases
- [x] Remove `resolveLegacyHarnessAgentName()`
- [x] Run `bun run typecheck && bun run lint && bun test`

### Phase 1 — Permission Unification

- [x] Add `legacy-adapter.ts`
- [x] Gate legacy permission checks behind `PANDA_UNIFIED_PERMISSIONS`
- [x] Convert permission manager from singleton to per-runtime instance
- [ ] Replace inline wildcard matcher with shared matcher
- [ ] Add concurrency test for isolated permission state
- [x] Verify no permission regressions with full test suite

### Phase 2 — Delivery Phase Wiring

- [x] Pass real delivery phase into `resolveRulesForPhase`
- [x] Extend permission tests for `review`, `qa`, `ship`, and `execute`
- [x] Confirm delivery phase denies activate in runtime
- [x] Verify build-mode behavior remains unchanged outside delivery phases

### Phase 3 — Spec Enforcement

- [x] Add `spec_misalignment` runtime event and finish reason
- [x] Insert reconciliation gate before runtime completion
- [x] Make enforcement opt-in via feature flag
- [x] Add explicit misalignment tests for verified-spec / failed-gate cases
- [x] Confirm advisory mode still logs without blocking

### Phase 4 — Checkpoint Fidelity

- [x] Extend checkpoint types for spec + delivery state
- [x] Save and restore `activeSpec` and `deliveryContextPack`
- [x] Add checkpoint version handling in Convex store
- [x] Verify old checkpoints still load safely
- [x] Verify resumed sessions retain spec and delivery context

### Phase 5 — Spec Bridge Protocol

- [x] Add `SpecDeliveryBridge` interface
- [x] Encode explicit accept/reject + conflict reasons in bridge code
- [x] Fix acceptance bridge roundtripping for verification methods
- [x] Add delivery context fields to spec persistence inputs
- [x] Fix snapshot spec query truncation
- [x] Add bridge roundtrip and conflict tests

### Phase 6 — Spec Lifecycle Decoupling

- [x] Introduce `SpecLifecycleManager`
- [x] Add `specLifecycleManager` to runtime config
- [x] Wrap existing `SpecEngine` in default manager
- [x] Convert drift detection to per-session state
- [x] Verify all existing spec integration tests still pass

### Phase 7 — Runtime Decomposition

- [x] Extract `runtime-tools.ts`
- [ ] Extract `runtime-spec.ts`
- [x] Extract `runtime-checkpoint.ts`
- [x] Extract `runtime-events.ts`
- [x] Deduplicate adapter event mapping
- [x] Split into smaller PRs if the extraction becomes too large
- [x] Run full verification suite after each extraction

Completed additional slices:

- [x] Extract `runtime-loop-guard.ts`
- [x] Extract `runtime-summary.ts`
- [x] Extract `runtime-progress.ts`
