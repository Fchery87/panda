# Panda SpecNative Implementation Plan

> **Version:** 1.0  
> **Date:** February 28, 2026  
> **Author:** Specification Engineering Team  
> **Status:** Draft — Pending Review

---

## 1. Strategic Context

Panda.ai currently operates as a **reactive agentic IDE**: user message → LLM
reasoning → tool calls → streamed response. This plan transforms Panda into a
**specification-native** system where formal specifications become first-class
cognitive primitives — generated, validated, executed against, and refined
automatically.

### Competitive Positioning

| IDE                  | Paradigm                                    | Spec Lifecycle            | Spec-Code Sync            |
| -------------------- | ------------------------------------------- | ------------------------- | ------------------------- |
| **Cursor**           | Prompt → Code (autocomplete-first)          | None                      | N/A                       |
| **Claude Code**      | Prompt → Plan → Execute                     | Implicit in planning      | None                      |
| **Kiro**             | Requirements → Design → Tasks → Code        | Explicit but waterfall    | Manual (known pain point) |
| **Panda SpecNative** | **Intent → Living Spec → Execute → Verify** | Continuous, bidirectional | **Automatic**             |

### Why This Wins

Kiro's spec-driven workflow is a proven concept but has a **critical flaw**:
specifications don't auto-update when code changes through prompting. Users
report spec-code drift and workflow rigidity as primary pain points. Panda's
spec system must be:

1. **Living** — Specs evolve bidirectionally with code changes
2. **Ambient** — Specs generate silently; surface only when useful
3. **Progressive** — Simple tasks skip formality; complex tasks get full spec
   rigor

---

## 2. UX Design: Seamless Specification Flow

> [!IMPORTANT] This section is the core UX recommendation — how the spec system
> _feels_ to the user. The guiding principle is **"invisible rigor"**: maximum
> structural benefit with minimal workflow friction.

### 2.1 The Three Interaction Tiers

Not every interaction needs a formal specification. The system should
auto-calibrate based on intent complexity:

```
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: INSTANT (No Spec)                                  │
│  "What does this function do?" / "Fix this typo"            │
│  → Direct LLM response, zero overhead                       │
│  → Modes: ask, discuss                                      │
├─────────────────────────────────────────────────────────────┤
│  TIER 2: AMBIENT (Silent Spec)                              │
│  "Refactor this component" / "Add error handling"           │
│  → Spec generated behind the scenes, stored but not shown   │
│  → Appears in Spec History panel after completion            │
│  → Modes: code, debug                                       │
├─────────────────────────────────────────────────────────────┤
│  TIER 3: EXPLICIT (Full Spec)                               │
│  "Build a payment system" / "Redesign the auth flow"        │
│  → Spec surfaces in SpecPanel before execution              │
│  → User reviews/edits spec, then approves execution         │
│  → Modes: build, architect                                  │
└─────────────────────────────────────────────────────────────┘
```

**Tier detection is automatic** via an LLM-based intent classifier that
evaluates:

- Scope (single file vs. multi-file vs. system-wide)
- Risk (read-only vs. write vs. destructive)
- Complexity (simple edit vs. multi-step workflow)

Users can **override** tier at any time via a toggle in the ChatInput bar.

### 2.2 Userflow: Tier 2 (Ambient Spec)

This is the **default experience** for most coding interactions:

```
User types: "Add input validation to the signup form"
                    │
                    ▼
┌──────────────────────────────────────────┐
│  ChatInput → Intent classifier → TIER 2  │
│  (multi-file write, medium complexity)   │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│  Runtime generates spec silently:         │
│  ┌──────────────────────────────────┐    │
│  │ constraints: [                    │    │
│  │   { type: 'behavioral',          │    │
│  │     rule: 'email must be valid',  │    │
│  │     assertion: 'regex match' },   │    │
│  │   { type: 'structural',          │    │
│  │     rule: 'no new dependencies',  │    │
│  │     target: 'package.json' }      │    │
│  │ ]                                 │    │
│  └──────────────────────────────────┘    │
│  Spec stored in DB, not shown to user    │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│  Agent executes normally                  │
│  RunProgressPanel shows tool calls        │
│  ✓ Spec badge shows in status bar:        │
│    "⚡ Spec-verified • 3 constraints met" │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│  Post-execution verification:             │
│  Spec engine checks outputs match spec    │
│  If pass: green checkmark in status bar   │
│  If fail: amber warning + suggestion      │
└──────────────────────────────────────────┘
```

**Key UX elements for Tier 2:**

- A subtle **spec badge** in the `StatusBar` component (non-intrusive)
- Clicking the badge opens a **SpecDrawer** showing the generated spec
- Completed specs appear in the **Timeline** component as spec checkpoints

### 2.3 Userflow: Tier 3 (Explicit Spec)

For high-complexity tasks, the spec surfaces as a dedicated panel:

```
User types: "Build a real-time notification system with WebSocket support"
                    │
                    ▼
┌──────────────────────────────────────────┐
│  ChatInput → Intent classifier → TIER 3  │
│  (system-wide, high complexity)          │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────────────────────┐
│  SpecPanel opens in Workbench (replaces PlanPanel position)   │
│  ┌───────────────────────────────────────────────────────┐   │
│  │  SPEC: Real-time Notification System                   │   │
│  │                                                        │   │
│  │  ┌─ Requirements ──────────────────────────────────┐  │   │
│  │  │ ▸ WHEN a user receives a notification            │  │   │
│  │  │   THE SYSTEM SHALL display it within 500ms       │  │   │
│  │  │ ▸ WHEN WebSocket disconnects                     │  │   │
│  │  │   THE SYSTEM SHALL reconnect with exponential    │  │   │
│  │  │   backoff up to 30 seconds                       │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌─ Constraints ───────────────────────────────────┐  │   │
│  │  │ ◆ structural: no new runtime dependencies        │  │   │
│  │  │ ◆ behavioral: supports 1000 concurrent conns     │  │   │
│  │  │ ◆ compatibility: existing auth system unchanged  │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  ┌─ Execution Plan ────────────────────────────────┐  │   │
│  │  │ 1. Create WebSocket server handler               │  │   │
│  │  │ 2. Add notification store (Convex table)         │  │   │
│  │  │ 3. Build client-side hook                        │  │   │
│  │  │ 4. Wire to existing UI notification slot         │  │   │
│  │  └─────────────────────────────────────────────────┘  │   │
│  │                                                        │   │
│  │  [ ✎ Edit ]  [ ▶ Execute ]  [ ✕ Cancel ]              │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

**Key UX elements for Tier 3:**

- SpecPanel uses the **same position** as PlanPanel in the Workbench
- Requirements use **EARS syntax** (Easy Approach to Requirements Syntax —
  industry standard)
- Constraints are **editable** — users can add/remove/modify before execution
- **Execute button** triggers the agent with the spec as binding context
- During execution, each spec step highlights in sync with `RunProgressPanel`
- Post-execution, `SpecPanel` shows verification results inline

### 2.4 Spec History & Traceability

Every spec (ambient or explicit) is stored and browseable:

```
┌──────────────────────────────────────────────────────────┐
│  Workbench Sidebar → "Specs" tab (new, next to Files)     │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ▾ Today                                           │  │
│  │    ✓ Add input validation — spec #14 (ambient)     │  │
│  │    ✓ Refactor auth hook — spec #13 (ambient)       │  │
│  │    ⚡ Build notification system — spec #12 (explicit)│  │
│  │  ▾ Yesterday                                       │  │
│  │    ✓ Fix payment edge cases — spec #11 (ambient)   │  │
│  │    ✕ Redesign settings page — spec #10 (failed)    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                           │
│  Clicking any spec opens the SpecPanel in read-only mode  │
│  showing: intent, constraints, plan, and verification     │
│  results — the complete "why" behind every change.        │
└──────────────────────────────────────────────────────────┘
```

### 2.5 Spec-Code Bidirectional Sync (Solving Kiro's Fatal Flaw)

This is Panda's key differentiator. When a user makes changes via chat that
affect a spec'd area:

1. **Drift Detection**: Plugin hook `tool.execute.after` checks if modified
   files are covered by an active spec
2. **Spec Update Prompt**: A non-blocking toast notification: _"This change
   affects spec #12. Update spec? [Yes] [Ignore]"_
3. **Auto-Reconciliation**: If accepted, the spec engine re-evaluates
   constraints against the new code state
4. **Spec Versioning**: Every reconciliation creates a new spec version (v1 →
   v2), preserving the full evolution chain

**The critical insight**: Kiro treats specs as a _gating mechanism_ (waterfall).
Panda treats specs as a _living document_ that evolves alongside the code. The
spec is never stale because the system reconciles automatically.

### 2.6 UI Component Integration Map

| New Component                 | Base Component               | Location                             | Purpose                              |
| ----------------------------- | ---------------------------- | ------------------------------------ | ------------------------------------ |
| `SpecPanel.tsx`               | Evolves from `PlanPanel.tsx` | `components/plan/`                   | Full spec view (edit/preview/verify) |
| `SpecBadge.tsx`               | New                          | `components/workbench/StatusBar.tsx` | Ambient spec status indicator        |
| `SpecDrawer.tsx`              | New (uses Sheet from `ui/`)  | `components/chat/`                   | Quick spec view from badge click     |
| `SpecHistory.tsx`             | New (sidebar tab)            | `components/workbench/`              | Browseable spec log                  |
| `SpecVerificationResults.tsx` | Inspired by `EvalPanel.tsx`  | `components/plan/`                   | Post-execution verification display  |
| `IntentClassifier`            | New (runtime-level)          | `lib/agent/spec/`                    | Automatic tier detection             |
| `SpecSyncToast.tsx`           | Uses existing toast system   | `components/ui/`                     | Drift detection notification         |

---

## 3. Technical Architecture

### 3.1 Directory Structure

```
lib/agent/spec/
├── types.ts              # FormalSpecification, Constraint, AcceptanceCriterion
├── engine.ts             # Core spec generation, validation, refinement
├── classifier.ts         # Intent complexity classifier (tier detection)
├── validator.ts          # Multi-layer validation pipeline
├── verifier.ts           # Post-execution verification against spec
├── reconciler.ts         # Bidirectional spec-code sync
├── templates/            # Mode-specific spec templates
│   ├── build.ts          # Full implementation spec template
│   ├── code.ts           # Change-scoped spec template
│   ├── architect.ts      # Design spec template
│   ├── debug.ts          # Diagnostic spec template
│   └── review.ts         # Quality spec template
└── __tests__/
    ├── engine.test.ts
    ├── classifier.test.ts
    ├── validator.test.ts
    ├── verifier.test.ts
    └── reconciler.test.ts
```

### 3.2 Type System

```typescript
// lib/agent/spec/types.ts

/** Complexity tier for automatic spec behavior */
export type SpecTier = 'instant' | 'ambient' | 'explicit'

/** Lifecycle states of a specification */
export type SpecStatus =
  | 'draft' // Generated, awaiting validation
  | 'validated' // Passed structural + semantic checks
  | 'approved' // User approved (Tier 3 only)
  | 'executing' // Agent executing against spec
  | 'verified' // Post-execution verification passed
  | 'drifted' // Code changed, spec needs reconciliation
  | 'failed' // Verification failed
  | 'archived' // Superseded by newer version

/** Core specification structure */
export interface FormalSpecification {
  id: string
  version: number
  tier: SpecTier
  status: SpecStatus

  /** What the user wants */
  intent: {
    goal: string
    rawMessage: string
    constraints: Constraint[]
    acceptanceCriteria: AcceptanceCriterion[]
  }

  /** How to achieve it */
  plan: {
    steps: SpecStep[]
    dependencies: FileDependency[]
    risks: Risk[]
    estimatedTools: string[]
  }

  /** How to verify it */
  validation: {
    preConditions: Condition[]
    postConditions: Condition[]
    invariants: Invariant[]
  }

  /** Traceability metadata */
  provenance: {
    model: string
    promptHash: string
    timestamp: number
    parentSpecId?: string
    chatId: string
    runId?: string
  }
}

/** EARS-style requirement syntax */
export interface AcceptanceCriterion {
  id: string
  /** WHEN <trigger> THE SYSTEM SHALL <behavior> */
  trigger: string
  behavior: string
  verificationMethod: 'automated' | 'llm-judge' | 'manual'
  status: 'pending' | 'passed' | 'failed' | 'skipped'
}

/** Typed constraint system */
export type Constraint =
  | { type: 'structural'; rule: string; target: string }
  | { type: 'behavioral'; rule: string; assertion: string }
  | { type: 'performance'; metric: string; threshold: number; unit: string }
  | { type: 'compatibility'; requirement: string; scope: string }
  | { type: 'security'; requirement: string; standard?: string }

export interface SpecStep {
  id: string
  description: string
  tools: string[]
  targetFiles: string[]
  status: 'pending' | 'active' | 'completed' | 'failed'
  result?: string
}

export interface FileDependency {
  path: string
  access: 'read' | 'write' | 'create' | 'delete'
  reason: string
}

export interface Risk {
  description: string
  severity: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface Condition {
  description: string
  check: string // Machine-evaluable expression or LLM prompt
  type: 'file-exists' | 'file-contains' | 'command-passes' | 'llm-assert'
}

export interface Invariant {
  description: string
  scope: string // File path or pattern
  rule: string // What must remain true
}
```

### 3.3 Convex Schema Extension

```typescript
// Addition to convex/schema.ts

specifications: defineTable({
  projectId: v.id('projects'),
  chatId: v.id('chats'),
  runId: v.optional(v.id('agentRuns')),
  version: v.number(),
  tier: v.union(v.literal('instant'), v.literal('ambient'), v.literal('explicit')),
  status: v.union(
    v.literal('draft'),
    v.literal('validated'),
    v.literal('approved'),
    v.literal('executing'),
    v.literal('verified'),
    v.literal('drifted'),
    v.literal('failed'),
    v.literal('archived')
  ),
  intent: v.object({
    goal: v.string(),
    rawMessage: v.string(),
    constraints: v.array(v.any()),
    acceptanceCriteria: v.array(v.any()),
  }),
  plan: v.object({
    steps: v.array(v.any()),
    dependencies: v.array(v.any()),
    risks: v.array(v.any()),
    estimatedTools: v.array(v.string()),
  }),
  validation: v.object({
    preConditions: v.array(v.any()),
    postConditions: v.array(v.any()),
    invariants: v.array(v.any()),
  }),
  provenance: v.object({
    model: v.string(),
    promptHash: v.string(),
    timestamp: v.number(),
    parentSpecId: v.optional(v.string()),
  }),
  verificationResults: v.optional(v.array(v.any())),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_project', ['projectId'])
  .index('by_chat', ['chatId'])
  .index('by_run', ['runId'])
  .index('by_status', ['projectId', 'status'])
  .index('by_tier', ['projectId', 'tier']),
```

### 3.4 Runtime Integration

The spec engine integrates at **three points** in the existing runtime:

#### Point 1: Pre-execution (in `Runtime.runLoop`)

```typescript
// lib/agent/harness/runtime.ts — inside runLoop, before step execution

if (this.config.specEngine?.enabled) {
  // Classify intent complexity
  const tier = await this.specEngine.classify(userMessage, context)

  if (tier !== 'instant') {
    // Generate spec
    const spec = await this.specEngine.generate(userMessage, context, tier)

    // Validate spec
    const validation = await this.specEngine.validate(spec)
    if (!validation.isValid) {
      spec = await this.specEngine.refine(spec, validation.errors)
    }

    if (tier === 'explicit') {
      // Yield spec for UI approval before proceeding
      yield { type: 'spec_pending_approval', spec }
      // Wait for user approval or edits...
    }

    // Inject spec as execution context
    this.activeSpec = spec
    yield { type: 'spec_generated', spec, tier }
  }
}
```

#### Point 2: During execution (tool hooks)

```typescript
// Spec-aware plugin that tracks execution against spec steps

const specTrackingPlugin: Plugin = {
  name: 'spec-tracking',
  hooks: {
    'tool.execute.after': async (data) => {
      if (this.activeSpec) {
        // Mark completed spec steps
        // Check for drift
        // Track constraint satisfaction
      }
      return data
    },
  },
}
```

#### Point 3: Post-execution (verification)

```typescript
// After the run loop completes

if (this.activeSpec) {
  const verification = await this.specEngine.verify(
    this.activeSpec,
    executionResults
  )
  yield { type: 'spec_verification', verification }

  // Update spec status in DB
  await this.updateSpecStatus(
    this.activeSpec.id,
    verification.passed ? 'verified' : 'failed',
    verification.results
  )
}
```

### 3.5 Plugin Hook Extensions

```typescript
// New hook types added to HookType union in harness/types.ts

| 'spec.classify'           // After intent classification
| 'spec.generate.before'    // Before spec generation
| 'spec.generate.after'     // After spec generation
| 'spec.validate'           // During spec validation
| 'spec.refine'             // During spec refinement
| 'spec.approve'            // When user approves explicit spec
| 'spec.execute.before'     // Before executing against spec
| 'spec.execute.after'      // After execution completes
| 'spec.verify'             // During post-execution verification
| 'spec.drift.detected'     // When code changes affect a spec
| 'spec.reconcile'          // During bidirectional sync
```

---

## 4. Phased Implementation Schedule

### Phase 0: Foundation (Weeks 1–2) — Zero Breaking Changes

| Task                                     | Files                                   | Effort  | Risk               |
| ---------------------------------------- | --------------------------------------- | ------- | ------------------ |
| Define spec type system                  | `lib/agent/spec/types.ts` [NEW]         | 1 day   | 🟢 None            |
| Add `specifications` table to schema     | `convex/schema.ts` [MODIFY]             | 0.5 day | 🟢 Additive        |
| Create CRUD mutations for specs          | `convex/specifications.ts` [NEW]        | 1 day   | 🟢 None            |
| Extend `HookType` with spec hooks        | `lib/agent/harness/types.ts` [MODIFY]   | 0.5 day | 🟢 Additive        |
| Add `specEngine` config to Runtime       | `lib/agent/harness/runtime.ts` [MODIFY] | 0.5 day | 🟢 Optional field  |
| Add `spec_*` event types to RuntimeEvent | `lib/agent/harness/types.ts` [MODIFY]   | 0.5 day | 🟢 Union extension |
| Write unit tests for types/schema        | `lib/agent/spec/__tests__/` [NEW]       | 1 day   | 🟢 None            |

**Acceptance Criteria**: All existing tests pass. New spec types importable.
Schema deploys without migration issues.

---

### Phase 1: Spec Engine Core (Weeks 3–5)

| Task                               | Files                                   | Effort | Risk                  |
| ---------------------------------- | --------------------------------------- | ------ | --------------------- |
| Build intent classifier            | `lib/agent/spec/classifier.ts` [NEW]    | 2 days | 🟡 LLM accuracy       |
| Build spec generator               | `lib/agent/spec/engine.ts` [NEW]        | 3 days | 🟡 Prompt quality     |
| Build spec validator               | `lib/agent/spec/validator.ts` [NEW]     | 2 days | 🟢 Deterministic      |
| Build spec verifier                | `lib/agent/spec/verifier.ts` [NEW]      | 2 days | 🟡 Post-exec matching |
| Create mode-specific templates     | `lib/agent/spec/templates/*.ts` [NEW]   | 2 days | 🟢 Configuration      |
| Wire engine into `Runtime.runLoop` | `lib/agent/harness/runtime.ts` [MODIFY] | 2 days | 🟡 Critical path      |
| Wire spec tracking plugin          | `lib/agent/harness/plugins.ts` [MODIFY] | 1 day  | 🟢 Additive           |
| Integration tests                  | `lib/agent/spec/__tests__/` [NEW]       | 2 days | 🟢 None               |

**Acceptance Criteria**: Spec engine generates valid specs for sample prompts
across all 5 templates. Runtime produces `spec_generated` and
`spec_verification` events when enabled. Feature flag `specEngine.enabled`
defaults to `false`.

---

### Phase 2: UI — Ambient Surface (Weeks 6–7)

| Task                                  | Files                                           | Effort   | Risk              |
| ------------------------------------- | ----------------------------------------------- | -------- | ----------------- |
| Build `SpecBadge` component           | `components/workbench/SpecBadge.tsx` [NEW]      | 1 day    | 🟢 UI only        |
| Integrate badge into `StatusBar`      | `components/workbench/StatusBar.tsx` [MODIFY]   | 0.5 day  | 🟢 Additive       |
| Build `SpecDrawer` component          | `components/chat/SpecDrawer.tsx` [NEW]          | 1.5 days | 🟢 UI only        |
| Add spec events to `RunProgressPanel` | `components/chat/RunProgressPanel.tsx` [MODIFY] | 1 day    | 🟢 Event handling |
| Build `SpecHistory` sidebar tab       | `components/workbench/SpecHistory.tsx` [NEW]    | 2 days   | 🟡 New section    |
| Add Specs tab to `Workbench` sidebar  | `components/workbench/Workbench.tsx` [MODIFY]   | 1 day    | 🟢 Tab addition   |
| Wire Convex queries for spec data     | `hooks/useSpecifications.ts` [NEW]              | 1 day    | 🟢 Data plumbing  |

**Acceptance Criteria**: Ambient specs show a non-intrusive badge in the status
bar during/after agent runs. Clicking badge opens the spec drawer. Spec history
is browseable in the workbench sidebar.

---

### Phase 3: UI — Explicit Spec (Weeks 8–9)

| Task                                | Files                                               | Effort   | Risk              |
| ----------------------------------- | --------------------------------------------------- | -------- | ----------------- |
| Evolve `PlanPanel` into `SpecPanel` | `components/plan/SpecPanel.tsx` [NEW]               | 3 days   | 🟡 Core UX        |
| Build EARS requirement editor       | `components/plan/RequirementEditor.tsx` [NEW]       | 2 days   | 🟡 Interactive    |
| Build constraint editor             | `components/plan/ConstraintEditor.tsx` [NEW]        | 1.5 days | 🟢 Form-based     |
| Build verification results view     | `components/plan/SpecVerificationResults.tsx` [NEW] | 1.5 days | 🟢 Display        |
| Add spec approval flow to ChatInput | `components/chat/ChatInput.tsx` [MODIFY]            | 1 day    | 🟡 UX critical    |
| Wire spec events to SpecPanel       | `components/plan/SpecPanel.tsx` [MODIFY]            | 1 day    | 🟢 Event handling |
| Add spec tier override toggle       | `components/chat/ChatInput.tsx` [MODIFY]            | 0.5 day  | 🟢 UI control     |

**Acceptance Criteria**: Tier 3 prompts trigger SpecPanel in the workbench.
Users can edit requirements and constraints. Execute button triggers the agent
with spec binding. Verification results display inline after completion.

---

### Phase 4: Spec-Code Sync & Refinement (Weeks 10–12)

| Task                            | Files                                   | Effort   | Risk         |
| ------------------------------- | --------------------------------------- | -------- | ------------ |
| Build spec reconciler           | `lib/agent/spec/reconciler.ts` [NEW]    | 3 days   | 🟠 Complex   |
| Build drift detection plugin    | Plugin using `tool.execute.after` hook  | 2 days   | 🟡 Heuristic |
| Build `SpecSyncToast` component | `components/ui/SpecSyncToast.tsx` [NEW] | 1 day    | 🟢 UI only   |
| Build spec refinement loop      | `lib/agent/spec/engine.ts` [MODIFY]     | 2 days   | 🟡 LLM loop  |
| Add spec version chaining       | `convex/specifications.ts` [MODIFY]     | 1 day    | 🟢 DB logic  |
| Add spec comparison view        | `components/plan/SpecDiff.tsx` [NEW]    | 1.5 days | 🟢 Visual    |
| End-to-end integration tests    | Across all modules                      | 2 days   | 🟢 None      |

**Acceptance Criteria**: Code changes to spec-covered files trigger drift
detection. Reconciliation produces a new spec version. Full spec evolution chain
is browseable.

---

## 5. Verification Plan

### 5.1 Automated Tests

All tests use the existing Bun test runner.

```bash
# Phase 0: Type system and schema validation
bun test lib/agent/spec/__tests__/types.test.ts

# Phase 1: Engine, classifier, validator, verifier
bun test lib/agent/spec/__tests__/

# Phase 1: Runtime integration (spec events emitted correctly)
bun test lib/agent/harness/runtime.test.ts

# Full harness regression (must still pass)
bun test lib/agent/harness/

# Full agent regression
bun test lib/agent/
```

### 5.2 Manual Verification

| Phase | Test                       | Steps                                                                           |
| ----- | -------------------------- | ------------------------------------------------------------------------------- |
| 0     | Schema deploys             | Run `npx convex dev` → confirm `specifications` table created                   |
| 1     | Tier 2 generates spec      | Enable `specEngine.enabled`, send a code-mode prompt → check DB for spec record |
| 1     | Tier 3 pauses for approval | Send a build-mode complex prompt → confirm `spec_pending_approval` event        |
| 2     | Badge appears              | Run a code-mode task with spec enabled → confirm badge in StatusBar             |
| 2     | Drawer opens               | Click SpecBadge → confirm SpecDrawer shows spec details                         |
| 3     | SpecPanel renders          | Send a Tier 3 prompt → confirm SpecPanel opens in workbench                     |
| 3     | Edit + Execute flow        | Modify a constraint in SpecPanel → click Execute → confirm agent respects edit  |
| 4     | Drift detection            | After a spec'd task, make a manual chat edit → confirm toast notification       |

### 5.3 Evaluation Benchmark

Use Panda's existing `evalSuites` system to create a **SpecNative Eval Suite**:

- **20 scenarios**: 7 Tier 1 (should NOT generate specs), 8 Tier 2 (should
  generate ambient), 5 Tier 3 (should generate explicit)
- **Metrics**: Classification accuracy ≥ 85%, Spec validity rate ≥ 70%,
  Post-execution verification pass rate ≥ 90%
- **Latency budget**: Spec generation adds ≤ 2 seconds to response time

---

## 6. Risk Mitigation

| Risk                                   | Probability | Impact | Mitigation                                                    |
| -------------------------------------- | ----------- | ------ | ------------------------------------------------------------- |
| Spec generation latency degrades UX    | Medium      | High   | Spec generation is async/streamed; Tier 2 is non-blocking     |
| Intent classifier miscategorizes tier  | Medium      | Medium | User override toggle; refinement from usage data              |
| Over-constrained specs block execution | Medium      | Medium | Constraint relaxation algorithm in refinement loop            |
| Spec-code reconciler creates noise     | Low         | Medium | Non-blocking toasts with "Ignore" option; frequency throttle  |
| Existing tests break                   | Low         | High   | All changes behind `specEngine.enabled` flag (default: false) |
| UI cognitive overload                  | Low         | High   | Progressive disclosure — badge → drawer → panel               |

---

## 7. Success Metrics

| Metric                           | Baseline (Current) | Phase 2 Target        | Phase 4 Target       |
| -------------------------------- | ------------------ | --------------------- | -------------------- |
| Intent-to-execution traceability | 0% (no specs)      | 60% (ambient specs)   | 90%+                 |
| Post-execution verification      | None               | Automated for Tier 2+ | Automated + ML judge |
| Spec-code sync latency           | N/A                | ≤ 5 seconds           | ≤ 2 seconds          |
| User spec approval rate (Tier 3) | N/A                | ≥ 70% first attempt   | ≥ 85%                |
| Regression from spec system      | 0 failures         | 0 failures            | 0 failures           |

---

## 8. Future Extensions (Post-Phase 4)

- **Specification Interchange Format (SIF)**: Machine-readable export for
  cross-tool portability
- **Spec-from-PR**: Generate specs retroactively from git diffs for existing
  codebases
- **Team Spec Templates**: Shared constraint libraries per organization
- **Formal Verification Integration**: SMT solver hook for mathematical
  invariant checking
- **Agent-to-Agent Spec Exchange**: A2A protocol compatibility for multi-agent
  spec delegation
