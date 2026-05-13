# Panda vs Thanos Agentic Harness Review

> Date: 2026-05-12  
> Scope: Panda's agentic harness compared with
> `https://github.com/Fchery87/Thanos` at HEAD
> `a586a97d4b70537d60a354801a05f0e4868b9376`.  
> Mode: report-only review. No Panda harness implementation changes were made.

## Executive Summary

Panda and Thanos are solving adjacent but different problems.

- **Panda is a product runtime.** Its harness is embedded in a browser-first,
  Convex-backed coding workbench. It has richer runtime orchestration, provider
  compatibility enforcement, model grammar sanitization, checkpoint/resume,
  custom Skill composition, planning-session integration, run projections, and
  persistent product state. This matches Panda's architecture contract:
  canonical modes, Convex source-of-truth, Execution Session / Run / Receipt
  separation, and share-safe projections.
- **Thanos is a compact Pi extension.** Its harness is smaller, easier to audit,
  and stronger in a few operational control-plane areas: capability-first
  permission vocabulary, explicit command-family policy, visible policy denials,
  JSONL audit logging, headless-safe defaults, and subprocess-isolated subagents
  with local transcript metadata.
- **The best Panda adoption path is selective.** Panda should not converge
  toward Thanos wholesale. It should adopt Thanos's clearer policy/audit
  semantics and subagent bounding ideas while preserving Panda's product
  architecture, Convex persistence, canonical modes, Skills/Subagents split,
  model grammar hardening, and browser-first/server-fallback runtime.

Highest-value Panda backlog from Thanos:

1. Add a first-class, user/admin-visible **harness policy layer** with rule ids,
   denial reasons, headless/default behavior, and command-family matching.
2. Persist bounded **permission/audit records** for tool decisions, especially
   command decisions, using hashed or summarized targets where raw payloads are
   risky.
3. Strengthen command governance from syntactic risk analysis to
   **command-family policy** (`network`, `package-manager`, `remote-exec`,
   `destructive`, etc.).
4. Add lightweight **subagent execution metadata**: status, duration, effective
   capability ceiling, summary, and parsed result metadata.
5. Keep Panda's richer SpecNative system, but borrow Thanos's simple
   evidence-type framing for user-facing proof explanations.

## Review Inputs

### Panda authority and implementation

- Canonical modes and source-of-truth rules: `docs/ARCHITECTURE_CONTRACT.md`.
- Harness docs: `docs/AGENTIC_HARNESS.md`.
- Domain glossary: `CONTEXT.md`.
- Security/trust policy: `docs/SECURITY_TRUST_BOUNDARIES.md`.
- Core runtime: `apps/web/lib/agent/harness/runtime.ts`.
- Mode/permission policy: `apps/web/lib/agent/permission/mode-rulesets.ts`,
  `apps/web/lib/agent/harness/permission/evaluate.ts`,
  `apps/web/lib/agent/harness/permissions.ts`.
- Agents/subagents: `apps/web/lib/agent/harness/agents.ts`,
  `apps/web/lib/agent/harness/task-tool.ts`.
- Specs: `apps/web/lib/agent/spec/*`.
- MCP/plugins/checkpoints/projections: `apps/web/lib/agent/harness/mcp.ts`,
  `apps/web/lib/agent/harness/plugins.ts`,
  `apps/web/lib/agent/harness/convex-checkpoint-store.ts`,
  `apps/web/lib/agent/run-projection.ts`.

### Thanos implementation

- Product README: `/tmp/thanos-review/README.md`.
- Pi extension entrypoint: `/tmp/thanos-review/src/index.ts`.
- Permissions/policy/audit: `/tmp/thanos-review/src/permissions/*`,
  `/tmp/thanos-review/src/policy/*`,
  `/tmp/thanos-review/src/hooks/before-tool.ts`,
  `/tmp/thanos-review/src/audit/*`.
- Specs: `/tmp/thanos-review/src/spec/*`.
- Subagents: `/tmp/thanos-review/src/agents/*`,
  `/tmp/thanos-review/agents/*.md`.
- MCP: `/tmp/thanos-review/src/mcp/*`.

## Panda Contract Constraints That Shape The Comparison

These constraints are not optional if the goal is to improve Panda rather than
replace it.

| Constraint                                                              | Evidence                                                                        | Review implication                                                                                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Canonical user-facing modes are exactly `ask`, `plan`, `code`, `build`. | `docs/ARCHITECTURE_CONTRACT.md`; `docs/AGENTIC_HARNESS.md:101`                  | Thanos's `explore`, `reviewer`, and `designer` should map to Subagents or Skills, not new top-level Panda modes.         |
| Skills and Subagents are separate concepts.                             | `docs/AGENTIC_HARNESS.md:105-128`; `CONTEXT.md` glossary                        | Thanos agent markdown files are closer to Panda Subagent templates or workflow Skills depending on whether they execute. |
| Planning sessions and specs are sensitive execution inputs.             | `docs/SECURITY_TRUST_BOUNDARIES.md:28`; `docs/AGENTIC_HARNESS.md:191-206`       | Thanos's file-local spec lifecycle cannot replace Panda's Convex-backed planning/spec state.                             |
| MCP servers are high-risk user-controlled configuration.                | `docs/SECURITY_TRUST_BOUNDARIES.md:33`, `docs/SECURITY_TRUST_BOUNDARIES.md:109` | Thanos's MCP config layering is useful, but Panda must enforce owner/admin policy and redaction.                         |
| Runtime actions require project ownership plus permission policy.       | `docs/SECURITY_TRUST_BOUNDARIES.md:37`                                          | Thanos's local permission layer should become a Panda policy input, not the sole authorization mechanism.                |
| Runtime telemetry should store bounded summaries by default.            | `docs/SECURITY_TRUST_BOUNDARIES.md:119`                                         | Thanos's hashed command audit target is directly relevant to Panda's storage policy.                                     |

## Concept Map: Panda ↔ Thanos

| Concept                   | Panda                                                                                                                                                     | Thanos                                                                                                           | Assessment                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| User-facing modes         | `ask`, `plan`, `code`, `build`; documented as canonical.                                                                                                  | Session/subagent modes: `explore`, `plan`, `build`, `reviewer`, `designer`; selected via `/modes`.               | Preserve Panda modes. Map Thanos `explore/reviewer/designer` to Subagents or Skills.             |
| Runtime loop              | Provider-agnostic async generator with steps, compaction, tool execution, subagents, checkpoints, spec verification.                                      | Pi extension hooks around existing Pi runtime; no independent runtime loop.                                      | Panda is much deeper and product-integrated.                                                     |
| Permission vocabulary     | Mix of legacy tool-pattern permissions and newer capability rules (`read`, `search`, `edit`, `exec`, `plan_exit`, `memory`, `mcp`).                       | Compact capabilities: `read`, `edit`, `exec`, `task`; every tool call gates through risk + policy + permissions. | Panda should unify around its newer capability layer and add Thanos-style policy ids/reasons.    |
| Policy file/admin policy  | Panda has mode rules and security docs; admin policy exists in product domains, but no obvious local `harness.policy.json` equivalent in harness runtime. | `harness.policy.json`, presets, command-family rules, visible denials, headless defaults.                        | Thanos's most portable advantage. Adapt to Convex/admin policy rather than local-only file.      |
| Specs                     | Rich SpecNative types: EARS criteria, constraints, validation, provenance, LLM/heuristic classification, persistence helpers.                             | Simple ambient/explicit spec; criteria require evidence types (`diff`, `test`, `command`, `manual`).             | Panda should keep its richer system; borrow Thanos's simple evidence explanation model.          |
| Subagents                 | In-process/runtime delegation via `task`, concurrent subtasks, permission intersection, depth cap.                                                        | Subprocess Pi subagents, narrowed policy file, timeout, max-turn instruction, transcript metadata.               | Panda has better product integration; Thanos has cleaner process isolation and bounded metadata. |
| MCP                       | Browser-aware manager with in-memory/remote transports and optional stdio bridge.                                                                         | Pi extension MCP manager with global/user/project config, stdio and HTTP/SSE clients, dynamic tool registration. | Thanos has better config layering; Panda has better browser/server separation.                   |
| Audit/proof               | Convex `agentRuns`, `agentRunEvents`, receipts, projections, checkpoints.                                                                                 | Local JSONL `.harness/audit.jsonl` plus `.harness/subagents` metadata.                                           | Panda should not use local JSONL as source of truth, but should adopt the bounded audit shape.   |
| Model/tool grammar safety | Preflight, model capability manifest, grammar registry, stream sanitizer.                                                                                 | Not visible in Thanos.                                                                                           | Panda is stronger. Do not regress.                                                               |
| Tests                     | 29 harness/spec test files and many runtime tests.                                                                                                        | 30 test files, smaller behavioral surface.                                                                       | Both have test coverage; Panda tests cover more runtime edge cases.                              |

## Standalone Assessment Of Thanos

### What Thanos does well

#### 1. It has a clean two-stage permission story

Thanos describes its permission model as risk classification followed by rule
evaluation. The README frames this as a primary feature: capability-based
permission gate, ambient spec lifecycle, and specialist subagent delegation
(`/tmp/thanos-review/README.md:5-7`). It then documents risk classification
(`/tmp/thanos-review/README.md:74`) and rule evaluation
(`/tmp/thanos-review/README.md:88`).

The implementation is compact:

- Tool names map to capabilities in `makeBeforeToolHandler`
  (`/tmp/thanos-review/src/hooks/before-tool.ts:17-25`).
- Every tool call gets a risk tier and capability
  (`/tmp/thanos-review/src/hooks/before-tool.ts:46-49`).
- Low-risk reads are allowed after policy checks
  (`/tmp/thanos-review/src/hooks/before-tool.ts:82-86`).
- High/critical tools prompt or block in headless mode
  (`/tmp/thanos-review/src/hooks/before-tool.ts:115-131`).
- Default capabilities are readable in one place
  (`/tmp/thanos-review/src/permissions/manager.ts:6-12`).

This is a strong operator mental model: users can reason about capabilities,
risk, policy, and session approvals without understanding the full runtime.

#### 2. Policy denials are visible and safe

Thanos's policy layer returns safe denial messages instead of protected content.
Policy evaluation performs last-match-wins over capability, pattern, and command
family (`/tmp/thanos-review/src/policy/evaluator.ts:13-34`). The denial
formatter includes rule id, reason, and matched pattern
(`/tmp/thanos-review/src/policy/denial.ts:1-7`).

That is better than a generic `Permission denied` because it is debuggable
without leaking the blocked target contents.

#### 3. Command-family classification is simple but useful

Thanos classifies shell commands into `package-manager`, `network`, `git`,
`destructive`, `remote-exec`, and `unknown`
(`/tmp/thanos-review/src/commands/classifier.ts:1-27`). The policy evaluator can
then match `commandFamily` for `exec` decisions
(`/tmp/thanos-review/src/policy/evaluator.ts:19-25`).

This is not a complete shell security model, but it is a useful governance
layer. It lets a team ask for network commands while allowing safe reads, or
deny remote execution in CI.

#### 4. Audit records avoid raw command storage

Thanos hashes raw commands for audit targets: `commandAuditTarget` records
`family:executable:sha256(command)`
(`/tmp/thanos-review/src/audit/target.ts:4-13`). Audit events include timestamp,
agent type, tool, capability, decision, optional rule id, and safe target
representation (`/tmp/thanos-review/src/audit/types.ts:3-17`). The logger
appends JSONL records (`/tmp/thanos-review/src/audit/logger.ts:5-10`).

This aligns strongly with Panda's runtime telemetry policy to avoid raw command
output, raw tool arguments, tokens, and signed URLs by default.

#### 5. Subagents are concretely bounded

Thanos runs subagents as isolated Pi subprocesses
(`/tmp/thanos-review/src/agents/task-tool.ts:105-205`). It writes a narrowed
policy file into a temporary directory before launching
(`/tmp/thanos-review/src/agents/task-tool.ts:115-119`), sets `HARNESS_SUBAGENT`
to make most children leaf agents
(`/tmp/thanos-review/src/agents/task-tool.ts:89-103`), applies optional timeout
(`/tmp/thanos-review/src/agents/task-tool.ts:144-149`), and writes metadata
under `.harness/subagents`
(`/tmp/thanos-review/src/agents/task-tool.ts:189-198`).

Policy narrowing is explicit: explore/plan deny edit, exec, and task; reviewer
denies edit/exec but may spawn explore; build/designer deny further delegation
(`/tmp/thanos-review/src/agents/policy.ts:13-42`).

### Thanos risks and limitations

#### 1. Spec verification is too coarse for product-grade claims

Thanos verifies a criterion by checking whether each required evidence type
exists and passed (`/tmp/thanos-review/src/spec/verifier.ts:10-16`). This is
intentionally lightweight, but it can pass a criterion because _some_ test
passed, not because the right behavior was verified.

The generator also infers criteria from broad keyword patterns
(`/tmp/thanos-review/src/spec/generator.ts:12-57`) and allowed capabilities from
keywords (`/tmp/thanos-review/src/spec/generator.ts:41-54`). This is acceptable
for a local extension but weaker than Panda's formal spec/provenance model.

#### 2. Shell classification is shallow

`classifyCommand` looks only at the leading executable
(`/tmp/thanos-review/src/commands/classifier.ts:14-27`). It does not parse
compound commands, nested shells, quoted command strings, shell functions,
environment assignment prefixes, or exfiltration hidden inside package scripts.
It is a governance hint, not a security boundary.

#### 3. Audit target presentation has a minor mismatch

Audit events allow target kinds `literal`, `pattern`, `hash`, or `command`
(`/tmp/thanos-review/src/audit/types.ts:11-16`). Command targets use kind
`command` and put family/executable/hash into `value`
(`/tmp/thanos-review/src/audit/target.ts:4-13`). This is fine, but the separate
`hash` kind appears unused in the observed code. A future cleanup could either
use `hash` for raw command hashes or remove it.

#### 4. Subprocess isolation is useful but expensive to productize

The subprocess model is clean for a local Pi extension, but it is not directly
portable to Panda's browser-first runtime. Panda cannot assume a local Pi
binary, local filesystem, or local `.harness` directory in the browser
workbench. The idea to borrow is not the subprocess itself; it is the bounded
child policy, timeout, status, and transcript metadata.

#### 5. MCP config loading silently ignores invalid JSON

`readMcpFile` returns `{}` for absent or unparseable files
(`/tmp/thanos-review/src/mcp/config.ts:36-49`). That keeps startup robust but
can hide misconfiguration. Panda should prefer explicit owner-visible
configuration errors for project/user MCP because MCP servers are high-risk
configuration.

## Panda Harness Assessment

### What Panda already does better

#### 1. Runtime orchestration is substantially more complete

Panda's `Runtime` owns a full provider-agnostic execution loop. It requires an
explicit checkpoint store in the constructor
(`apps/web/lib/agent/harness/runtime.ts:345-377`), runs an async generator for
session events (`apps/web/lib/agent/harness/runtime.ts:388-421`), and executes a
step loop with compaction, tool execution, checkpoints, completion, and spec
verification (`apps/web/lib/agent/harness/runtime.ts:612-857`).

Key runtime capabilities not visible in Thanos:

- Checkpoint/resume is mandatory at runtime construction
  (`apps/web/lib/agent/harness/runtime.ts:364-377`) and saved on steps,
  completion, and errors (`apps/web/lib/agent/harness/runtime.ts:711-808`,
  `apps/web/lib/agent/harness/runtime.ts:2690-2706`).
- Build/code modes guard against repeated narration without tool calls
  (`apps/web/lib/agent/harness/runtime.ts:762-785`).
- Compaction is integrated into the loop and can hard-stop after repeated
  failure (`apps/web/lib/agent/harness/runtime.ts:717-742`).
- Spec verification can block completion
  (`apps/web/lib/agent/harness/runtime.ts:808-836`).

#### 2. Panda has model/tool grammar hardening

Panda sanitizes streamed text for leaked tool-call grammars. It finds declared
grammars from model capability data, extracts tool calls when appropriate, and
hard-stops on undeclared or suspicious grammar leaks
(`apps/web/lib/agent/harness/runtime.ts:1072-1106`;
`apps/web/lib/agent/harness/stream-sanitizer.ts:16`).

Thanos does not appear to have an equivalent model compatibility/grammar layer.
Panda should keep this as a differentiator.

#### 3. Panda has richer tool scheduling and loop protection

Panda separates read-only parallelizable tools from sequential tools
(`apps/web/lib/agent/harness/tool-scheduling.ts:23-34`), supports deduplication
and max tool calls per step
(`apps/web/lib/agent/harness/tool-scheduling.ts:34-79`), and applies a loop
guard before executing repeated tool calls
(`apps/web/lib/agent/harness/runtime.ts:1181-1204`).

Thanos delegates core execution to Pi hooks and does not own a comparable
multi-step scheduling layer.

#### 4. Panda has a stronger formal spec model

Panda's SpecNative types include lifecycle status, EARS-style acceptance
criteria, typed constraints, execution plan, validation conditions, invariants,
provenance, and verification results
(`apps/web/lib/agent/spec/types.ts:12-156`). The spec engine supports
classification, generation, validation, refinement, and verification
(`apps/web/lib/agent/spec/engine.ts:71-183`). The verifier produces criterion
results, constraint results, summaries, recommendations, and status
(`apps/web/lib/agent/spec/verifier.ts:87-128`).

This is stronger than Thanos's evidence-type checklist and aligns with Panda's
planning/session product model.

#### 5. Panda aligns with Convex-backed product state

Panda has explicit run orchestration that creates a message, attachments, run
record, begins the run, and appends a `run_started` event
(`apps/web/lib/agent/run-orchestration.ts:64-125`). Checkpoints persist through
Convex with scope validation
(`apps/web/lib/agent/harness/convex-checkpoint-store.ts:55-84`). Run projections
are surface-specific and redact/limit details for chat and public shares
(`apps/web/lib/agent/run-projection.ts:190-204`).

This matches Panda's architecture and security contracts. Thanos's local JSONL
and `.harness/subagents` records are useful local artifacts but not suitable as
Panda source-of-truth.

#### 6. Panda supports Skills as first-class workflow guidance

Panda resolves applied Skills per run and emits `applied_skills` plus
`strict_skill_preflight` events before execution
(`apps/web/lib/agent/harness/runtime.ts:627-652`). The docs explicitly
distinguish Skills from Subagents and avoid copying full Skill instructions into
persisted summaries (`docs/AGENTIC_HARNESS.md:105-128`).

Thanos has agent prompts but does not expose a comparable Skill/Subagent
distinction.

### Panda gaps highlighted by Thanos

#### 1. Panda's permission model is split across two systems

Panda has a legacy tool-pattern permission system
(`apps/web/lib/agent/harness/permissions.ts:41-72`, defaults at
`apps/web/lib/agent/harness/permissions.ts:120-153`) and a newer capability-rule
system (`apps/web/lib/agent/harness/permission/types.ts:1-31`, evaluator at
`apps/web/lib/agent/harness/permission/evaluate.ts:10-38`). Mode rules use the
newer capability vocabulary
(`apps/web/lib/agent/permission/mode-rulesets.ts:9-60`).

The split makes it harder to reason about final authority. Thanos is clearer:
every tool maps to one capability, policy evaluates first, then permission
prompt/headless handling runs.

**Recommendation:** converge Panda internals toward the capability-rule
evaluator as the canonical runtime policy engine, with compatibility adapters
for legacy `read_files` / `write_files` tool names.

#### 2. Panda lacks Thanos-style policy ids and visible denial reasons in the harness layer

Panda permission requests can include command analysis metadata and reasons
(`apps/web/lib/agent/harness/runtime.ts:1450-1498`), but the observed runtime
path does not expose a durable policy rule id equivalent to Thanos's
`formatPolicyDenial` output and `ruleId` audit field
(`/tmp/thanos-review/src/policy/denial.ts:1-7`,
`/tmp/thanos-review/src/audit/types.ts:3-17`).

**Recommendation:** add a Panda `HarnessPolicyRule` concept with id, source,
reason, capability, pattern, optional command family, and decision. Persist
bounded decision events in Convex.

#### 3. Command governance is less policy-shaped

Panda analyzes command syntax for pipelines, chains, and redirection
(`apps/web/lib/agent/command-analysis.ts:43-83`), and runtime surfaces approval
reasons for `run_command` (`apps/web/lib/agent/harness/runtime.ts:1466-1480`).
Thanos adds a different axis: command family (`network`, `package-manager`,
`remote-exec`, `destructive`) that teams can govern directly
(`/tmp/thanos-review/src/commands/classifier.ts:1-27`,
`/tmp/thanos-review/src/policy/evaluator.ts:19-25`).

**Recommendation:** keep Panda's syntactic command analysis and add
command-family classification. They answer different questions.

#### 4. Subagent metadata can be more inspectable

Panda emits subagent start/complete events and supports concurrent processing
(`apps/web/lib/agent/harness/runtime.ts:1817-1905`). It intersects parent and
child permissions (`apps/web/lib/agent/harness/task-tool.ts:151-154`) and
enforces depth caps in runtime
(`apps/web/lib/agent/harness/runtime.ts:1400-1414`).

Thanos additionally writes a compact metadata record with agent type, status,
timestamps, summary, and parsed result metadata
(`/tmp/thanos-review/src/agents/task-tool.ts:189-198`;
`/tmp/thanos-review/src/agents/transcripts.ts:11-26`).

**Recommendation:** add an owner-only bounded `subagentSummary` run event or
receipt section with: agent, status, duration, effective capability
preset/ceiling, delegated prompt summary, output summary, files touched, tests
run, and risks. Do not store raw subagent stdout by default.

#### 5. MCP configuration needs clearer product-level layering

Panda's MCP manager supports browser-compatible transports and optional
server-side stdio bridge (`apps/web/lib/agent/harness/mcp.ts:271-347`). Thanos
has explicit global/user/project config paths and merged source attribution
(`/tmp/thanos-review/src/mcp/config.ts:23-78`).

**Recommendation:** adopt the idea of source attribution (`admin`, `user`,
`project` later) and status surfaces, but not local path semantics. Panda should
load MCP config from Convex/user/admin settings and preserve owner/admin policy
enforcement.

## Subsystem-by-Subsystem Comparison

### Runtime Loop

| Dimension           | Panda                                                                                                                                                    | Thanos                                                                   | Winner |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------ |
| Owns execution loop | Yes: `Runtime.run` and `runLoop` (`apps/web/lib/agent/harness/runtime.ts:388-857`).                                                                      | No: hooks around Pi runtime (`/tmp/thanos-review/src/index.ts:501-580`). | Panda  |
| Streaming events    | Rich runtime events (`status`, `text`, `reasoning`, `tool_call`, `spec_verification`, etc.) (`apps/web/lib/agent/harness/runtime.ts:203-220`).           | Pi extension notifications and tool hooks.                               | Panda  |
| Checkpoint/resume   | Required store + Convex implementation (`apps/web/lib/agent/harness/runtime.ts:364-377`; `apps/web/lib/agent/harness/convex-checkpoint-store.ts:55-84`). | No equivalent durable runtime checkpoint observed.                       | Panda  |
| Simplicity          | Complex.                                                                                                                                                 | Compact and easy to audit.                                               | Thanos |

### Permissions And Policy

| Dimension          | Panda                                                                                | Thanos                                                                                     | Winner            |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | ----------------- |
| Capability clarity | Present but split between legacy and newer systems.                                  | Very clear capability vocabulary and hook gate.                                            | Thanos            |
| Mode policy        | Strong canonical mode rules (`apps/web/lib/agent/permission/mode-rulesets.ts:9-60`). | Subagent mode defaults, not product modes.                                                 | Panda             |
| Policy ids/reasons | Partial; not clearly first-class in runtime.                                         | First-class rule ids/reasons and visible denials.                                          | Thanos            |
| Command governance | Syntactic risk analysis.                                                             | Command-family governance.                                                                 | Tie; combine both |
| Headless behavior  | Runtime/product dependent.                                                           | Explicit default deny in headless (`/tmp/thanos-review/src/hooks/before-tool.ts:115-121`). | Thanos            |

### Specs And Plans

| Dimension                 | Panda                                                     | Thanos                                                  | Winner                      |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------- | --------------------------- |
| Spec richness             | Formal lifecycle, constraints, provenance, EARS criteria. | Simple generated spec with evidence requirements.       | Panda                       |
| User-facing proof clarity | Rich but complex.                                         | Very clear `diff/test/command/manual` evidence framing. | Thanos for clarity          |
| Persistence               | Convex persistence helpers and planning integration.      | In-memory per session.                                  | Panda                       |
| Approval lifecycle        | Integrated runtime events and planning sessions.          | `--spec` approval before first non-low-risk tool.       | Depends; Panda product wins |

### Subagents

| Dimension           | Panda                                                             | Thanos                                  | Winner                         |
| ------------------- | ----------------------------------------------------------------- | --------------------------------------- | ------------------------------ |
| Product integration | Run events, Skills, permission intersection, concurrent subtasks. | Local subprocesses and metadata.        | Panda                          |
| Isolation           | In-process runtime child session.                                 | Separate Pi subprocess.                 | Thanos for local CLI isolation |
| Bounded metadata    | Partial event metadata.                                           | Explicit `.harness/subagents` metadata. | Thanos                         |
| Browser fit         | Stronger.                                                         | Poor direct fit.                        | Panda                          |

### MCP

| Dimension               | Panda                                                              | Thanos                                                                   | Winner                                                 |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------ |
| Browser fit             | Remote/in-memory transports and stdio bridge requirement.          | Local stdio/HTTP clients.                                                | Panda                                                  |
| Config layering         | Not as explicit in observed harness file.                          | Global/user/project merge with source attribution.                       | Thanos                                                 |
| Protocol implementation | Panda remote client uses proxy-shaped endpoints; stdio via bridge. | Direct JSON-RPC initialize/tools/list/tools/call for stdio and HTTP/SSE. | Thanos for local protocol depth; Panda for product fit |

### Audit, Proof, And Sharing

| Dimension              | Panda                                                                           | Thanos                          | Winner |
| ---------------------- | ------------------------------------------------------------------------------- | ------------------------------- | ------ |
| Product proof          | Convex runs, events, receipts, projections.                                     | Local JSONL audit and metadata. | Panda  |
| Safe command audit     | Not as explicit in observed harness audit path.                                 | Hashes commands.                | Thanos |
| Public share redaction | Dedicated projection contract (`apps/web/lib/agent/run-projection.ts:190-204`). | Not applicable.                 | Panda  |

## Recommended Panda Adoption Backlog

### P0 — Clarify and unify harness policy authority

**Goal:** Make Panda's runtime permission decision explainable as: mode rule +
spec rule + admin/user/project policy + session approval.

Recommended tasks:

1. Define `HarnessPolicyRule` with:
   - `id`
   - `source`: `mode | spec | admin | user | project | session`
   - `capability`
   - `pattern?`
   - `commandFamily?`
   - `decision`
   - `reason`
2. Route runtime decisions through
   `apps/web/lib/agent/harness/permission/evaluate.ts` as the canonical
   evaluator.
3. Keep legacy `Permission` maps only as compatibility inputs.
4. Ensure denial events include safe `ruleId`, `source`, and `reason`.

Evidence base:

- Panda split systems: `apps/web/lib/agent/harness/permissions.ts:41-72`,
  `apps/web/lib/agent/harness/permission/evaluate.ts:10-38`.
- Thanos compact policy gate:
  `/tmp/thanos-review/src/hooks/before-tool.ts:35-139`.

### P0 — Add command-family policy alongside syntactic command analysis

**Goal:** Preserve Panda's pipeline/chain/redirection analysis while adding
team-governable command families.

Recommended families:

- `package-manager`
- `network`
- `git`
- `destructive`
- `remote-exec`
- `filesystem-write`
- `unknown`

Evidence base:

- Panda syntax risk: `apps/web/lib/agent/command-analysis.ts:43-83`.
- Thanos family classifier:
  `/tmp/thanos-review/src/commands/classifier.ts:1-27`.

### P0 — Persist bounded permission/audit decision records

**Goal:** Give owners/admins debuggable proof of why a tool was allowed, denied,
or prompted without storing secrets.

Shape:

```ts
interface HarnessAuditDecision {
  runId: Id<'agentRuns'>
  sessionId: string
  agentId: string
  subagentChain?: string[]
  toolName: string
  capability: string
  decision: 'allow' | 'ask' | 'deny'
  ruleId?: string
  ruleSource?: string
  reason?: string
  target: {
    kind: 'literal' | 'pattern' | 'command_hash' | 'summary'
    value: string
  }
  commandFamily?: string
  createdAt: number
}
```

Evidence base:

- Panda security telemetry policy: `docs/SECURITY_TRUST_BOUNDARIES.md:119`.
- Thanos command hash target: `/tmp/thanos-review/src/audit/target.ts:4-13`.
- Thanos audit event shape: `/tmp/thanos-review/src/audit/types.ts:3-17`.

### P1 — Add subagent summary events/receipt fields

**Goal:** Make delegated work inspectable without leaking raw stdout or prompts.

Include:

- subagent name/type
- status
- duration
- effective capability ceiling or preset
- delegated-task summary
- result summary
- parsed files touched/tests/risks if provided
- parent/child chain

Evidence base:

- Panda concurrent subagent events:
  `apps/web/lib/agent/harness/runtime.ts:1817-1905`.
- Thanos transcript metadata:
  `/tmp/thanos-review/src/agents/transcripts.ts:11-26`.

### P1 — Add MCP source attribution and configuration diagnostics

**Goal:** Show where each MCP server came from and why it is available/blocked.

Panda adaptation:

- `admin` source: globally managed/allowed MCP config.
- `user` source: owner-scoped personal MCP config.
- `project` source: future team/project policy, not local `.pi/mcp.json` by
  default.
- Store statuses as bounded summaries; never expose secrets or headers.

Evidence base:

- Thanos config layering: `/tmp/thanos-review/src/mcp/config.ts:23-78`.
- Panda MCP security policy: `docs/SECURITY_TRUST_BOUNDARIES.md:109`.
- Panda MCP browser-aware transport:
  `apps/web/lib/agent/harness/mcp.ts:271-347`.

### P1 — Make spec verification proof easier to explain

**Goal:** Keep Panda's rich SpecNative verifier but present proof using a small
evidence vocabulary for users.

Possible user-facing evidence categories:

- `diff`
- `test`
- `command`
- `runtime-preview`
- `manual-review`
- `receipt`

Evidence base:

- Panda verifier: `apps/web/lib/agent/spec/verifier.ts:87-128`.
- Thanos evidence types: `/tmp/thanos-review/src/spec/evidence.ts:1-10`.

### P2 — Add explicit headless/noninteractive policy semantics

**Goal:** Define what happens when a tool would ask but no UI/approval channel
exists.

Panda should distinguish:

- browser interactive session
- server fallback with owner watching
- background/resume/headless run
- public/shared replay

Evidence base:

- Thanos blocks confirmation-required actions without UI
  (`/tmp/thanos-review/src/hooks/before-tool.ts:115-121`).

## Do Not Adopt From Thanos

1. **Do not add Thanos's modes as Panda top-level modes.** `explore`,
   `reviewer`, and `designer` are useful, but Panda's canonical modes are fixed.
   Use Subagents or Skills.
2. **Do not replace Convex with local JSONL/files.** Thanos's
   `.harness/audit.jsonl` and `.harness/subagents` are good shapes, not Panda
   storage targets.
3. **Do not weaken Panda's SpecNative model to keyword/evidence-only
   verification.** Borrow evidence vocabulary, not the whole verifier.
4. **Do not bypass Panda's browser-first constraints with local Pi subprocess
   assumptions.** Panda can use server fallback, but browser runtime remains
   first-class.
5. **Do not remove grammar sanitizer/preflight/model capability checks.** Thanos
   does not appear to address this class of risk; Panda is ahead here.
6. **Do not expose raw command strings, stdout, MCP headers, signed URLs, or
   reasoning in audit/proof by default.** Thanos's command hashing is the safer
   direction.

## Resolved Follow-Up Implementation Decisions

The review originally left these as open questions. The accepted implementation
recommendations are now:

1. **Harness policy ships as admin ceiling first, user preferences second, and
   project policy later.** Admin policy is the maximum allowed capability set.
   User policy may make behavior stricter inside that ceiling. Project policy is
   deferred until Panda has explicit team/project governance semantics.
2. **Command-family policy lives in Convex admin settings first.** Runtime
   receives a resolved policy snapshot and is not the source of truth. User
   preferences may later add stricter command-family behavior under the admin
   ceiling.
3. **`permissionAuditLog` is the canonical audit store; `agentRunEvents` gets
   bounded proof summaries.** Audit queries need security-oriented filtering and
   retention separate from timeline display, while run events remain the proof
   projection surface.
4. **Subagent summaries are persisted in both run events and receipts.** Run
   events power live/historical Proof UI. Receipts carry the final durable
   rollup of delegated work. Raw subagent prompt/output remains owner-only,
   bounded, lazy, or omitted by default.
5. **Project-scoped MCP is deferred.** Ship admin-scoped MCP policy and
   user-scoped MCP configuration first. Project MCP may start as
   recommendations, but active inherited project MCP requires team/project
   governance.
6. **Use `Unattended Execution`, not `headless`, as the product term.** A Run is
   unattended when Panda has no active owner approval channel for permission
   prompts. Server fallback is a runtime location, not the same thing as
   unattended execution.

## Bottom Line

Thanos is not a better Panda harness. It is a smaller, cleaner local extension
with several excellent governance ideas. Panda should selectively adopt Thanos's
policy clarity, command-family controls, safe audit shape, headless semantics,
and bounded subagent metadata. Panda should preserve its own stronger runtime
loop, Convex persistence, browser-first execution model, canonical chat modes,
planning/session architecture, Skills/Subagents distinction, and model grammar
hardening.
