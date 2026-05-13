# Layered Harness Policy Implementation Plan

> Status: Completed implementation plan  
> Date: 2026-05-12  
> Last verified: 2026-05-12  
> Reader: Panda engineers and future agents implementing harness policy, command
> governance, permission audit records, subagent summaries, unattended
> execution, and MCP governance.  
> Post-read action: implement the milestones in order, validating each milestone
> before moving to the next.

## Purpose

Panda's agentic harness already has mode rules, permission prompts, Convex run
events, receipts, runtime checkpoints, and admin settings. The Panda/Thanos
harness review and ADR 0003 define the next governance layer: a resolved Harness
Policy that explains and enforces tool, command, MCP, Subagent, and unattended
execution decisions.

This plan turns those accepted decisions into implementation slices.

## Implementation Status

Milestones 1-8 have been implemented and verified in the working tree. The final
slice added admin/user settings for command-family policy, surfaced effective
policy summaries, constrained user MCP transport selection by admin ceiling, and
updated active documentation for Harness Policy and Unattended Execution.

## Accepted Decisions This Plan Implements

- Admin policy is the authoritative ceiling for Harness Policy.
- User preferences may only make behavior stricter inside the admin ceiling.
- Project-scoped Harness Policy is deferred until team/project governance
  exists.
- Command-Family Policy is owned by Convex admin settings first.
- Runtime receives a resolved policy snapshot and is not the source of truth.
- `permissionAuditLog` is the canonical audit store for permission decisions.
- `agentRunEvents` mirrors bounded proof summaries for timeline and Proof UI.
- Subagent summaries are persisted in both run events and receipts.
- Project-scoped MCP is deferred; admin-scoped policy and user-scoped MCP config
  ship first.
- `Unattended Execution` is the product term for a Run with no active owner
  approval channel.

## Non-Goals

- Do not add Thanos modes as top-level Panda modes.
- Do not replace Convex persistence with local JSONL files.
- Do not weaken Panda's SpecNative model.
- Do not make project-scoped MCP active before project/team governance exists.
- Do not store raw command strings, command output, signed URLs, tokens, full
  MCP headers, raw reasoning, or full tool arguments by default.
- Do not treat server fallback as automatically unattended.

## Target Architecture

### Policy Layers

Harness Policy should resolve in this order:

1. **Mode rules** — base capability posture from `ask`, `plan`, `code`, or
   `build`.
2. **Admin ceiling** — maximum allowed capability set and command-family/MCP
   policy.
3. **User preferences** — stricter personal defaults inside the admin ceiling.
4. **Execution contract** — approved Plan, active Spec, and runtime context
   restrictions.
5. **Session approvals** — temporary user decisions for the current Run/session.

The resolver should produce one immutable `ResolvedHarnessPolicy` snapshot for a
Run. Runtime should evaluate against that snapshot and emit audit decisions from
it.

### Decision Flow

For every governed tool/runtime action:

1. Map the tool to a capability.
2. Derive a safe target summary.
3. For commands, classify both syntax risk and command family.
4. Evaluate the resolved policy.
5. If the result is `ask`, check whether the Run has an active owner approval
   channel.
6. If interactive, request approval and record the answer.
7. If unattended, deny unless an exact operation was explicitly pre-approved by
   policy or execution contract.
8. Persist a canonical `permissionAuditLog` entry.
9. Emit a bounded `agentRunEvents` proof summary if the decision is user-visible
   or proof-relevant.

### Storage Ownership

| Data                          | Owner                      | Hot/cold shape                                                    |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------- |
| Admin harness policy defaults | Admin settings             | Cold/admin detail, resolved into runtime snapshot                 |
| User harness preferences      | Current user settings      | Cold/user detail, resolved into runtime snapshot                  |
| Resolved policy snapshot      | Run-scoped runtime context | Small summary on run/receipt; full detail owner-only if persisted |
| Permission audit decisions    | `permissionAuditLog`       | Admin/security query, bounded and redacted                        |
| Proof summaries               | `agentRunEvents`           | Hot bounded timeline/proof projection                             |
| Subagent final rollup         | Run receipt                | Bounded final proof summary                                       |

## Proposed Types

### Core policy types

```ts
type HarnessPolicySource =
  | 'mode'
  | 'admin'
  | 'user'
  | 'execution_contract'
  | 'session'

type HarnessCapability =
  | 'read'
  | 'search'
  | 'edit'
  | 'exec'
  | 'plan_exit'
  | 'memory'
  | 'mcp'
  | 'task'

type HarnessPolicyDecision = 'allow' | 'ask' | 'deny'

type CommandFamily =
  | 'package-manager'
  | 'network'
  | 'git'
  | 'destructive'
  | 'remote-exec'
  | 'filesystem-write'
  | 'unknown'

interface HarnessPolicyRule {
  id: string
  source: HarnessPolicySource
  capability: HarnessCapability | '*'
  decision: HarnessPolicyDecision
  pattern?: string
  commandFamily?: CommandFamily
  reason: string
}

interface ResolvedHarnessPolicy {
  version: 1
  mode: 'ask' | 'plan' | 'code' | 'build'
  runId?: string
  rules: HarnessPolicyRule[]
  unattendedDefaultDecision: Extract<HarnessPolicyDecision, 'allow' | 'deny'>
  createdAt: number
}
```

### Decision/audit types

```ts
type PermissionAuditTargetKind =
  | 'literal'
  | 'pattern'
  | 'command_hash'
  | 'summary'

interface PermissionAuditTarget {
  kind: PermissionAuditTargetKind
  value: string
}

interface HarnessPermissionDecisionRecord {
  version: 1
  sessionID: string
  runId?: string
  chatId?: string
  projectId?: string
  userId?: string
  agentId: string
  subagentChain?: string[]
  toolName: string
  capability: HarnessCapability
  commandFamily?: CommandFamily
  decision: HarnessPolicyDecision
  ruleId?: string
  ruleSource?: HarnessPolicySource
  reason?: string
  target: PermissionAuditTarget
  unattended: boolean
  createdAt: number
}
```

### Subagent summary types

```ts
interface HarnessSubagentSummary {
  version: 1
  subagentId: string
  parentRunId: string
  parentSubagentId?: string
  name: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  startedAt: number
  completedAt?: number
  durationMs?: number
  capabilityPreset?: 'research' | 'assistant' | 'builder' | 'restricted'
  effectiveCapabilities: HarnessCapability[]
  delegatedTaskSummary: string
  outputSummary?: string
  filesTouched?: string[]
  testsRun?: string[]
  risks?: string[]
}
```

## Affected Areas

### Frontend/runtime modules

- Harness permission rule types and evaluator.
- Mode rule resolution.
- Command analysis module.
- Runtime tool execution path.
- Runtime event mapping and projection.
- Subagent task tool and subagent event handling.
- Receipt generation and receipt projection.
- MCP runtime registration/execution path.
- Settings/admin UI for policy controls in later milestones.

### Convex backend modules

- Schema entries for admin settings and permission audit log.
- Permission audit logging mutation/query functions.
- Agent run event validators and append mutation.
- Agent run receipt validator.
- Settings/admin functions for resolved policy inputs.
- MCP server functions for admin ceiling and user-scoped config.

### Tests

- Permission evaluator and resolver unit tests.
- Command-family classifier tests.
- Runtime permission decision tests.
- Convex schema/validator tests.
- Permission audit persistence tests.
- Run event proof summary tests.
- Receipt subagent rollup tests.
- Unattended execution tests.
- MCP policy enforcement tests.

## Milestones

### Milestone 1 — Policy type system and resolver

**Goal:** Create the canonical in-code representation of Harness Policy without
changing runtime behavior yet.

**Work:**

- Add typed policy model for rules, sources, capabilities, command families,
  audit targets, and resolved snapshots.
- Add a resolver that composes mode rules, admin ceiling, user preferences,
  execution contract, and session approvals.
- Add an adapter from current mode rules and legacy tool-pattern permissions
  into the new policy model.
- Keep existing behavior as the compatibility baseline.

**Acceptance criteria:**

- Policy resolution is deterministic and order-dependent.
- Admin ceiling cannot be weakened by user preferences or session approvals.
- Existing mode rules can be represented as policy rules.
- Legacy permission maps can still be evaluated through compatibility adapters.

**Tests:**

- Admin deny beats user allow.
- User ask can make admin allow stricter.
- Session allow cannot override admin deny.
- Mode rules resolve for `ask`, `plan`, `code`, and `build`.
- Legacy permissions round-trip through the adapter.

**Validation:**

```bash
bun test apps/web/lib/agent/harness/permission apps/web/lib/agent/permission
bun run typecheck
```

### Milestone 2 — Command-family classifier

**Goal:** Add command-family governance beside existing command syntax analysis.

**Work:**

- Add `classifyCommandFamily(command)`.
- Preserve existing `analyzeCommand(command)` for syntax risk: redirects,
  chains, and pipelines.
- Ensure target creation can hash command strings for audit while still exposing
  family and executable.
- Treat command-family classification as governance metadata, not a complete
  shell parser or security sandbox.

**Acceptance criteria:**

- Package managers, network tools, git, destructive tools, remote execution,
  filesystem-write tools, and unknown commands classify predictably.
- Command hashing avoids raw command storage in audit records.
- Existing command-analysis tests still pass.

**Tests:**

- `bun install`, `npm test`, `pnpm add` → `package-manager`.
- `curl`, `wget` → `network`.
- `git push`, `git status` → `git` with policy able to distinguish by pattern if
  needed.
- `rm`, `chmod`, `chown` → `destructive`.
- `ssh`, `scp`, `rsync` → `remote-exec`.
- unknown executable → `unknown`.
- command hash does not equal raw command.

**Validation:**

```bash
bun test apps/web/lib/agent/command-analysis.test.ts
bun test apps/web/lib/agent/harness/permission
bun run typecheck
```

### Milestone 3 — Convex schema and audit persistence

**Goal:** Make `permissionAuditLog` the canonical store for harness permission
decisions.

**Work:**

- Extend `permissionAuditLog` schema to include versioned harness decision
  fields.
- Add indexes for run, chat/project, user/time, and created time as needed.
- Keep compatibility with existing entries while new code writes versioned
  records.
- Update `permissionAuditLog.ts` validators and queries.
- Ensure queries are bounded, owner/admin authorized, and do not expose raw
  sensitive targets.

**Recommended schema direction:**

- Add optional fields rather than breaking existing rows immediately.
- Add `version`, `runId`, `chatId`, `userId`, `agentId`, `subagentChain`,
  `capability`, `commandFamily`, `ruleId`, `ruleSource`, `target`, `unattended`,
  and `createdAt`.
- Keep existing `timestamp` temporarily as compatibility data or alias it to
  `createdAt` in query responses.

**Acceptance criteria:**

- New audit records can be written with all harness decision fields.
- Existing audit records remain readable.
- Project audit queries are bounded.
- Admin/security queries can filter by user/project/run/time.
- No raw command strings or raw tool args are required for audit records.

**Tests:**

- Schema source test for new fields and indexes.
- Mutation validator test or source-level persistence test.
- Query limit clamping test.
- Authorization test for project/user/admin access where current testing pattern
  supports it.

**Validation:**

```bash
bun test convex/permissionAuditLog.test.ts
bun run typecheck
npx convex dev --once
```

### Milestone 4 — Runtime permission decision integration

**Goal:** Route governed runtime actions through resolved Harness Policy and
persist decisions.

**Work:**

- Build a run-scoped `ResolvedHarnessPolicy` before execution starts.
- Evaluate `read`, `search`, `edit`, `exec`, `memory`, `mcp`, `task`, and
  `plan_exit` capabilities through the policy engine.
- Emit canonical audit decisions for allow, ask, deny, timeout, and
  unattended-deny cases.
- Mirror bounded proof summaries to `agentRunEvents` for user-visible decisions.
- Preserve existing permission-request UI behavior where interactive approval is
  available.

**Acceptance criteria:**

- Runtime can explain every governed decision with rule id/source/reason when a
  rule matched.
- `ask` decisions still prompt in interactive runs.
- Denials are visible and safe.
- Audit persistence failure does not silently grant a denied action.
- Audit persistence failure should not crash a safe read-only run unless the
  action itself depended on policy state.

**Tests:**

- Allow/deny/ask runtime paths.
- Command-family deny path.
- Command-family ask path.
- Permission decision run event shape.
- Audit target redaction/hash behavior.
- Backward compatibility for existing automation policy behavior.

**Validation:**

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts
bun test apps/web/lib/agent/permission
bun test convex/permissionAuditLog.test.ts
bun run typecheck
```

### Milestone 5 — Unattended Execution semantics

**Goal:** Define and enforce behavior when no active owner approval channel
exists.

**Work:**

- Add runtime context field for approval-channel availability.
- Use `Unattended Execution` in UI/proof copy and docs; reserve `headless` for
  internal compatibility.
- Implement policy rule: `ask + unattended = deny` unless the exact operation
  was pre-approved by policy or execution contract.
- Add typed termination/denial reason for unattended permission denial.

**Acceptance criteria:**

- Server fallback can be interactive when an owner approval channel exists.
- Browser execution can become unattended if the owner approval channel
  disappears.
- Unattended command/write/MCP actions that require `ask` are denied safely.
- Read/search actions allowed by policy can continue unattended.

**Tests:**

- Interactive server fallback can prompt.
- Unattended server execution denies ask-required command.
- Unattended browser execution denies ask-required write after approval channel
  loss.
- Allowed read/search continues unattended.
- Denial emits audit record and proof summary.

**Validation:**

```bash
bun test apps/web/lib/agent/harness/runtime.test.ts
bun test apps/web/lib/agent/runtime.harness-adapter.test.ts
bun run typecheck
```

### Milestone 6 — Subagent summary events and receipt rollup

**Goal:** Make delegated work inspectable without storing raw subagent output by
default.

**Work:**

- Add `subagent_summary` event shape for `agentRunEvents`.
- Add subagent rollup section to execution receipts.
- Capture subagent status, duration, capability preset/ceiling, delegated task
  summary, output summary, files touched, tests run, and risks.
- Preserve delegation chain for nested delegation.
- Keep raw prompt/output owner-only, bounded, lazy-loaded, or omitted.

**Acceptance criteria:**

- Proof UI can show subagent lanes/chain summaries from bounded events.
- Receipt can summarize delegated work after completion/failure/stop.
- Public share projections do not expose raw subagent detail.
- Subagent summary persistence does not require storing full stdout.

**Tests:**

- Subagent start/complete summary event shape.
- Receipt rollup includes completed and failed subagents.
- Public projection excludes owner-only subagent detail.
- Nested delegation preserves chain and depth cap.

**Validation:**

```bash
bun test apps/web/lib/agent/harness/task-tool.test.ts
bun test apps/web/lib/agent/run-projection.test.ts
bun test apps/web/lib/agent/receipt.test.ts
bun run typecheck
```

### Milestone 7 — MCP policy alignment

**Goal:** Apply the resolved Harness Policy to MCP configuration and MCP tool
execution.

**Work:**

- Add admin policy fields for MCP transport allowances and user MCP enablement.
- Keep active MCP configuration user-scoped.
- Treat project MCP as recommendations only unless team/project governance
  exists.
- Apply `mcp` capability decisions to MCP tool calls.
- Include MCP server source attribution in owner-only settings/proof surfaces.

**Acceptance criteria:**

- Admin can disable user MCP.
- Admin can deny stdio MCP while allowing remote/user-safe MCP, or vice versa if
  policy allows.
- User MCP config remains owner-scoped.
- Project MCP recommendations do not activate tools automatically.
- MCP tool calls produce permission audit decisions.

**Tests:**

- MCP disabled by admin blocks user configuration and runtime tool calls.
- User-scoped MCP remains owner-only.
- Project recommendation cannot auto-enable an MCP server.
- MCP tool call audit is bounded and redacted.

**Validation:**

```bash
bun test apps/web/lib/agent/harness/mcp.test.ts
bun test convex/mcpServers.ts convex/customSkills.auth.test.ts
bun run typecheck
npx convex dev --once
```

### Milestone 8 — Admin/user settings UI and docs

**Goal:** Expose policy configuration safely after the backend and runtime paths
are stable.

**Work:**

- Add admin settings controls for command-family defaults and MCP transport
  policy.
- Add user preference controls only for stricter behavior inside admin ceiling.
- Show effective policy summaries in settings.
- Update docs after implementation is verified.

**Acceptance criteria:**

- Admin settings writes audit entries.
- Users can see when admin policy prevents overrides.
- UI never exposes secrets, raw command strings, or raw tool arguments.
- Docs explain policy layers and Unattended Execution behavior.

**Tests:**

- Admin settings mutation writes audit log.
- Effective settings merge respects admin ceiling.
- User cannot loosen admin policy.
- Settings UI copy distinguishes admin ceiling from user preference.

**Validation:**

```bash
bun test convex/admin.audit-log.test.ts convex/settings.public-admin-defaults.test.ts
bun test apps/web/lib/agent/permission
bun run typecheck
bun run lint
```

## Convex Migration Strategy

Use widen-migrate-narrow if any schema change would otherwise break existing
rows.

Recommended approach:

1. **Widen:** add optional fields to `permissionAuditLog`, `adminSettings`,
   `agentRunEvents`, and receipt validators.
2. **Dual read:** query functions normalize old and new records into one
   response shape.
3. **Dual write if needed:** runtime writes new fields while old callers can
   continue writing legacy fields.
4. **Backfill only if required:** most audit history can remain legacy-shaped;
   backfill is optional unless UI requires uniform fields.
5. **Narrow later:** only make fields required after all writers have migrated
   and retention/backfill is complete.

## Security And Redaction Rules

- Store command audit target as family, executable, and hash; do not store raw
  command by default.
- Store tool args only as bounded summaries unless the field is owner-only, lazy
  detail, and explicitly needed.
- Never write provider tokens, auth headers, signed URLs, raw reasoning, full
  file contents, or MCP secret env values to audit/proof summaries.
- Public share projections must not include permission audit detail, raw
  subagent output, raw tool args, MCP configuration, or policy state.
- Admin audit entries should identify changed policy keys without storing secret
  values.

## Rollout Strategy

1. Gate the new resolver behind a runtime feature flag while compatibility
   adapters are verified.
2. Write audit records in shadow mode for one milestone if practical.
3. Compare old permission decisions and new policy decisions in tests before
   enabling enforcement.
4. Enable command-family ask/deny rules for the riskiest families first:
   `remote-exec`, `destructive`, and `network`.
5. Add user-visible controls only after the runtime and Convex persistence paths
   are stable.

## Regression Risks

| Risk                                                | Mitigation                                                    |
| --------------------------------------------------- | ------------------------------------------------------------- |
| Accidentally loosening build-mode permissions       | Admin ceiling tests and mode-rule invariant tests             |
| Breaking existing permission prompts                | Compatibility adapter tests and runtime harness-adapter tests |
| Storing sensitive command/tool data                 | audit target hashing tests and projection redaction tests     |
| Unattended execution blocking safe background reads | Separate allow/read tests from ask/write/exec tests           |
| Convex hot query payload growth                     | bounded summaries, indexes, and lazy detail queries           |
| Project MCP ambiguity                               | keep project MCP as recommendations only                      |

## Definition Of Done

This program is complete when:

- Runtime decisions use a resolved Harness Policy snapshot.
- Command-family policy is enforced and audited.
- `permissionAuditLog` is the canonical store for permission decisions.
- `agentRunEvents` contains bounded proof summaries for permission decisions and
  Subagents.
- Receipts include bounded subagent rollups.
- Unattended Execution behavior is enforced and documented.
- MCP policy respects admin ceilings and user ownership.
- Full validation passes:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
npx convex dev --once
```
