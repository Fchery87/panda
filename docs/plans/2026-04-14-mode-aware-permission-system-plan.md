# Architectural Implementation Plan: Mode-Aware Permission System for Panda

**Date:** 2026-04-14
**Status:** Proposed
**Scope:** `apps/web/lib/agent/**`, `convex/specifications.ts`, runtime wiring
**Synthesis sources:** Panda current state, Claude Code (leaked source), OpenCode (`anomalyco/opencode`)

---

## Context

Panda's `architect` (plan) mode currently leaks write capabilities: the LLM can emit `write_files` / `run_command` / `apply_patch` tool calls and those calls flow through the harness runtime. A helper named `getAllowedToolsForMode()` exists in `apps/web/lib/agent/tools.ts` and correctly restricts the toolset per mode, but it is **never called** by the execution path. The harness's `getToolsForAgent()` (`apps/web/lib/agent/harness/runtime.ts:2285`) only filters by `agent.permission`, so `chatMode` never reaches the filter. The system prompt tells plan mode to be read-only, but there is no structural enforcement — a behavioral guardrail only.

Research into Claude Code and OpenCode confirmed the same class of bug is common (Claude Code has had open issues for 5+ months about plan mode running edits), and OpenCode's agent-as-permission-container pattern is the most robust solution observed. This plan fuses the best of all three systems into a structural, spec-native permission model tailored to Panda's harness.

---

## Strong Additional Recommendations (Pre-Plan)

Before the phased plan, five cross-cutting recommendations that should be adopted as design constraints:

1. **Spec-as-Permission-Scope** — Make the active `FormalSpecification.plan.steps[].dependencies` part of the permission evaluation input. When a spec is active, writes outside its declared file scope require explicit approval. Panda is uniquely positioned for this; neither Claude Code nor OpenCode has it.
2. **Capability-Based Permissions** — Group tools by capability (`edit`, `exec`, `read`, `search`, `plan_exit`) rather than name-based lists. New tools inherit policy automatically.
3. **Plan Artifact as Credential** — `ExitPlanMode` is not just a UI transition; it produces a signed plan artifact that the code/build mode references. Writes in code mode that fall outside the artifact's file scope require approval. Removes "silent drift" between planning and execution.
4. **Permission Denials as Tool Results** — When a tool is blocked, return a structured `tool_result` with `is_error: true` (OpenCode's `DeniedError` pattern) rather than throwing. The LLM can see the denial, reason about it, and course-correct instead of terminating the run.
5. **Subagent Permission Narrowing** — Subagents (explore, search, plan-exit) inherit a **subset** of the parent's rules, never a superset. A parent in plan mode cannot spawn a child with `edit: allow`.

---

## Design Principles

1. **Structural over behavioral** — permissions enforced by filtered tool-lists and runtime guards, not prompts.
2. **Two-phase enforcement** — (a) tool-list filtering before every LLM step, (b) tool-body guard immediately before execution. Defense-in-depth.
3. **Capability-based** — rules target capabilities; tools declare capability at registration.
4. **Last-rule-wins with wildcards** — OpenCode-style ruleset evaluation; rules match on both action name and (optional) file pattern.
5. **Spec-native** — the active spec's file scope contributes rules.
6. **Asymmetric mode transitions** — plan → code requires a formal gate (plan-exit). code → plan is free.

---

## Phase 0 — Foundation: Permission Module

**New files:**
- `apps/web/lib/agent/harness/permission/types.ts`
- `apps/web/lib/agent/harness/permission/evaluate.ts`
- `apps/web/lib/agent/harness/permission/wildcard.ts`

### Types

```ts
// types.ts
export type Decision = 'allow' | 'ask' | 'deny'
export type Capability = 'read' | 'search' | 'edit' | 'exec' | 'plan_exit' | 'memory' | 'mcp'

export interface PermissionRule {
  capability: Capability | '*'
  pattern?: string          // file glob for edit, command prefix for exec
  decision: Decision
  reason?: string           // surfaced in denials & approvals
  source: 'mode' | 'spec' | 'user' | 'project' | 'session'
}

export interface PermissionContext {
  capability: Capability
  target?: string           // path for edit, command for exec
  mode: ChatMode
  specId?: string           // active spec if any
  agentId: string           // subagent scoping
}

export interface PermissionDecision {
  decision: Decision
  rule: PermissionRule | null
  reason: string
}
```

### Evaluate (last-rule-wins)

```ts
// evaluate.ts
export function evaluate(rules: PermissionRule[], ctx: PermissionContext): PermissionDecision {
  let match: PermissionRule | null = null
  for (const rule of rules) {
    if (rule.capability !== '*' && rule.capability !== ctx.capability) continue
    if (rule.pattern && ctx.target && !wildcardMatch(rule.pattern, ctx.target)) continue
    match = rule // keep going — last match wins
  }
  if (!match) return { decision: 'ask', rule: null, reason: 'no matching rule' }
  return { decision: match.decision, rule: match, reason: match.reason ?? 'rule match' }
}
```

**Wildcard matcher** — port OpenCode's minimal `Wildcard.match` (supports `*`, `**`, literal).

---

## Phase 1 — Tool Capability Metadata

**File:** `apps/web/lib/agent/tools.ts` (modify existing tool descriptor).

Add two fields to each tool's descriptor:

```ts
interface ToolDescriptor {
  // …existing…
  capability: Capability
  readOnly: boolean   // redundant but useful for quick checks
}
```

Assignments:
- `read_files`, `list_directory` → `read`
- `search_codebase`, `search_code`, `search_code_ast` → `search`
- `write_files`, `apply_patch` → `edit`
- `run_command` → `exec`
- `update_memory_bank` → `memory`
- `plan_exit` (new, Phase 6) → `plan_exit`

Delete `getAllowedToolsForMode()` once replaced by the rule-driven filter in Phase 4. Keep it until then for a clean diff.

---

## Phase 2 — Mode Rulesets

**New file:** `apps/web/lib/agent/permission/mode-rulesets.ts`

```ts
const DEFAULT_RULES: Record<ChatMode, PermissionRule[]> = {
  ask: [
    { capability: '*',        decision: 'deny',  source: 'mode' },
    { capability: 'read',     decision: 'allow', source: 'mode' },
    { capability: 'search',   decision: 'allow', source: 'mode' },
  ],
  architect: [
    { capability: '*',          decision: 'deny',  source: 'mode' },
    { capability: 'read',       decision: 'allow', source: 'mode' },
    { capability: 'search',     decision: 'allow', source: 'mode' },
    { capability: 'memory',     decision: 'allow', source: 'mode' },
    { capability: 'plan_exit',  decision: 'ask',   source: 'mode' },
  ],
  code: [
    { capability: 'read',    decision: 'allow', source: 'mode' },
    { capability: 'search',  decision: 'allow', source: 'mode' },
    { capability: 'edit',    decision: 'ask',   source: 'mode' },
    { capability: 'exec',    decision: 'ask',   source: 'mode' },
    { capability: 'memory',  decision: 'allow', source: 'mode' },
  ],
  build: [
    { capability: '*',       decision: 'allow', source: 'mode' },
    { capability: 'exec',    decision: 'ask',   source: 'mode', pattern: 'rm *' },
    { capability: 'exec',    decision: 'ask',   source: 'mode', pattern: 'git push*' },
  ],
}

export function rulesForMode(mode: ChatMode): PermissionRule[] {
  return DEFAULT_RULES[mode]
}
```

---

## Phase 3 — Spec-Aware Rules

**New file:** `apps/web/lib/agent/permission/spec-rules.ts`

```ts
export function rulesForSpec(spec: FormalSpecification | null): PermissionRule[] {
  if (!spec) return []
  const scope = new Set<string>()
  for (const step of spec.plan?.steps ?? []) {
    for (const dep of step.dependencies ?? []) scope.add(dep)
  }
  if (scope.size === 0) return []
  return [
    { capability: 'edit', decision: 'ask', source: 'spec', reason: 'outside spec scope' },
    ...Array.from(scope).map<PermissionRule>(pattern => ({
      capability: 'edit',
      pattern,
      decision: 'allow',
      source: 'spec',
      reason: `in spec scope: ${pattern}`,
    })),
  ]
}
```

Order matters: the broad deny goes first, specific allows come after, and `evaluate()`'s last-rule-wins lets scoped paths through.

---

## Phase 4 — Core Fix: Wire Mode Into Runtime

**Files modified:**
- `apps/web/lib/agent/harness/runtime.ts`
- `apps/web/hooks/useAgent.ts`
- `apps/web/lib/agent/runtime.ts` (outer `HarnessAgentRuntimeAdapter`)

### 4a. Runtime config surface

Add `chatMode` + `activeSpec` to the harness session config:

```ts
// harness/runtime.ts — RuntimeConfig
export interface RuntimeConfig {
  // …existing…
  chatMode?: ChatMode
  activeSpec?: FormalSpecification | null
  userRules?: PermissionRule[]      // from settings
  projectRules?: PermissionRule[]   // from project config
}
```

### 4b. Build ruleset once per session

```ts
function buildRuleset(cfg: RuntimeConfig): PermissionRule[] {
  return [
    ...rulesForMode(cfg.chatMode ?? 'code'),
    ...rulesForSpec(cfg.activeSpec ?? null),
    ...(cfg.projectRules ?? []),
    ...(cfg.userRules ?? []),
  ]
}
```

### 4c. Filter tool-list per step

In `getToolsForAgent()` (`runtime.ts:2285`), add a second filter pass that calls `evaluate()` with capability-only context (no target). Drop any tool whose capability evaluates to `deny`.

```ts
private getToolsForAgent(agent: AgentDef): Tool[] {
  const base = this.tools.filter(t => this.agentCanUse(t, agent))
  const rules = this.ruleset
  return base.filter(t => {
    const decision = evaluate(rules, {
      capability: t.capability, mode: this.cfg.chatMode ?? 'code', agentId: agent.id,
    })
    return decision.decision !== 'deny'
  })
}
```

### 4d. Outer adapter plumbing

`HarnessAgentRuntimeAdapter` currently assembles `RuntimeConfig` from `useAgent`. Pipe `chatMode`, `activeSpec`, and merged user/project rules through. `useAgent` already knows the chat mode (it drives prompt selection) — pass it along instead of letting it die at the prompt layer.

---

## Phase 5 — Execution-Time Guard (Phase Two of Defense)

Inside the harness tool dispatcher (just before invoking the tool implementation), re-evaluate with target info:

```ts
const decision = evaluate(rules, {
  capability: tool.capability,
  target: extractTarget(tool, args),   // filePath or command
  mode: cfg.chatMode,
  agentId: agent.id,
  specId: cfg.activeSpec?.id,
})
if (decision.decision === 'deny') {
  return toolResult({ is_error: true, content: `blocked by ${decision.rule?.source}: ${decision.reason}` })
}
if (decision.decision === 'ask') {
  const approved = await permissionManager.request({ tool: tool.name, target, decision })
  if (!approved) return toolResult({ is_error: true, content: 'user declined' })
}
```

Denials return as tool results — the LLM sees the blockage, not a thrown exception.

---

## Phase 6 — Plan-Exit Transition Gate

**New file:** `apps/web/lib/agent/harness/tools/plan-exit.ts`
**Modified:** `convex/specifications.ts`

### Tool

A `plan_exit` tool that only exists in the architect ruleset. Its body:
1. Validates the plan artifact (files, steps, rationale).
2. Writes a signed `FormalSpecification` via Convex `api.specifications.create` with status `approved`.
3. Emits a `spec_generated` harness event.
4. Returns `{ plan_id, files, status: 'approved' }`.

The chat mode does **not** change automatically — the user (or an agent in build mode) then invokes code mode with the `plan_id`. This keeps mode transitions explicit and auditable.

### Convex schema touch

Add `approvedAt`, `approvedBy`, `signature` to the `specifications` table so downstream modes can verify authenticity.

### Code mode consumption

When `chatMode === 'code'` and `activeSpec` is provided, Phase 3's `rulesForSpec()` automatically scopes writes to the approved files.

---

## Phase 7 — Subagent Permission Narrowing

When the runtime spawns a subagent (explore, search, build sub-task), intersect the parent ruleset with the subagent's declared max-capabilities. Never expand.

```ts
function narrowForSubagent(parentRules: PermissionRule[], subagent: SubagentDef): PermissionRule[] {
  const allowedCaps = new Set(subagent.capabilities)
  return parentRules.filter(r => r.capability === '*' || allowedCaps.has(r.capability as Capability))
         .concat(subagent.extraDenies ?? [])
}
```

Explore/search subagents declare `capabilities: ['read', 'search']` → the parent's `edit` rules vanish for them.

---

## Phase 8 — Observability

Emit a `permission_decision` harness event for every evaluation at tool dispatch:

```ts
bus.emit('permission_decision', {
  tool, capability, target, decision: decision.decision,
  source: decision.rule?.source, reason: decision.reason,
  mode: cfg.chatMode, specId: cfg.activeSpec?.id, agentId,
})
```

Surface in the existing activity log UI. This gives a diagnostic trail — essential when "why didn't my edit apply?" becomes a user question.

---

## Phase 9 — Migration & Cleanup

1. Delete `getAllowedToolsForMode()` (orphaned).
2. Move `automationPolicy.ts`'s command-prefix logic into a project-level rule generator:
   `allowedCommandPrefixes: ['bun test']` → `[{ capability: 'exec', pattern: 'bun test*', decision: 'allow', source: 'project' }]`.
3. Remove the ad-hoc `harnessEnableRiskInterrupts` flag — replaced by rule evaluation at the dispatcher.
4. Update `DEFAULT_PERMISSIONS` in `plugins.ts` to be seed rules (not overrides), or deprecate in favor of the ruleset.

---

## Testing Strategy

| Layer | Test | Tool |
|---|---|---|
| Unit | `evaluate()` precedence, wildcard matcher, `rulesForMode`, `rulesForSpec` | `bun test apps/web/lib/agent/permission/` |
| Unit | `plan_exit` tool → writes signed spec | `bun test apps/web/lib/agent/harness/tools/` |
| Integration | Mode filtering removes `write_files` from architect toolset | harness integration suite |
| Integration | Denial returns `is_error: true` tool_result (not exception) | harness integration suite |
| Integration | Spec-scoped edit outside scope → `ask`; inside scope → `allow` | harness integration suite |
| E2E | Plan mode run cannot produce file artifacts | playwright / existing E2E |
| E2E | Plan → code transition requires approved spec | playwright |

---

## Risk Register

| Risk | Mitigation |
|---|---|
| Existing sessions break when config adds `chatMode` | Default to `code` when absent; feature-flag behind `NEXT_PUBLIC_PANDA_PERMISSION_V2` for rollout. |
| Rule explosion / hard to debug | `permission_decision` event + UI trace (Phase 8). |
| Spec scope too tight, blocks legitimate edits | Default `rulesForSpec` to `ask` (not `deny`) for out-of-scope — user can approve. |
| Plan-exit tool abused to auto-promote | Require user confirmation via `permissionManager.request()` regardless of policy; plan_exit is always `ask`. |
| Subagent narrowing breaks existing explore flows | Explore already uses only `read`/`search` — narrowing is a no-op; confirm in integration test. |

---

## Sequencing Note

Phases 0–4 are the **critical path** — they fix the reported bug and close the structural gap. Phases 5–9 are force-multipliers that make the system production-grade (spec-native, observable, subagent-safe).

**MVP cut (~1 week):** Phases 0, 1, 2, 4. This fixes plan mode today.
**Full rollout (~3 weeks):** All nine phases.

---

## Appendix — Three-Way Feature Matrix

| Feature | Panda (today) | Claude Code | OpenCode | Panda (proposed) |
|---|---|---|---|---|
| Mode-filtered tool list | ❌ (orphaned helper) | ⚠️ (buggy) | ✅ (agent container) | ✅ |
| Capability-based rules | ❌ | ❌ | ⚠️ partial | ✅ |
| Last-rule-wins evaluation | ❌ | ❌ | ✅ | ✅ |
| Denial as tool_result | ❌ (throws) | ❌ | ✅ | ✅ |
| Plan-exit formal gate | ❌ | ⚠️ UI only | ✅ (PlanExitTool) | ✅ (signed spec) |
| Spec-as-permission-scope | ❌ | ❌ | ❌ | ✅ **(unique)** |
| Subagent narrowing | ❌ | ⚠️ | ✅ | ✅ |
| Permission decision events | ❌ | ❌ | ⚠️ | ✅ |

Panda's proposed system is a strict superset of both reference implementations, with spec-native scoping as a distinguishing capability.
