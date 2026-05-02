# AGENTIC_HARNESS.md - Panda Agentic Harness

> **Version:** 1.4  
> **Last Updated:** 2026-05-02  
> **Status:** Implemented

---

## Overview

Panda.ai implements an OpenCode-inspired agentic harness that provides a
provider-agnostic execution system for Panda's browser-first workbench with
server-backed fallback. The harness is adapted to Panda's current browser
product, Convex-backed persistence model, and plan-review/build workflow rather
than trying to mirror another interface surface one-to-one.

The harness executes work through provider-agnostic agents while Convex owns
truth for delivery lifecycle, task tracking, review gates, QA evidence, ship
readiness, browser session metadata, and durable runtime checkpoints.

The current workspace presents this runtime through a chat-first session
timeline. Chat owns intent and the narrative record; the proof surface owns run
detail, changes, context, and preview. This keeps the harness provider-agnostic
while making execution inspectable from one coherent workspace flow.

## Architecture

The agentic harness is located in `lib/agent/harness/` and consists of:

```
lib/agent/harness/
├── types.ts          # Core type definitions (Message, Part, Agent, etc.)
├── identifier.ts    # Unique, sortable identifiers
├── event-bus.ts    # Real-time event publishing/subscribing
├── permissions.ts  # Allow/deny/ask permission system
├── agents.ts       # Agent registry with YAML/Markdown support
├── plugins.ts      # Plugin/hook system for extensibility
├── compaction.ts   # Context auto-summarization
├── runtime.ts      # Main execution engine
├── task-tool.ts   # Subagent delegation
├── mcp.ts         # MCP (Model Context Protocol) support
├── snapshots.ts   # Git snapshots for undo
└── index.ts       # Barrel exports
```

## Core Concepts

### Message/Part System

The harness uses a hierarchical message structure:

- **Message** - Can be `UserMessage` or `AssistantMessage`
- **Part** - Components within messages (12 types):
  - `text` - Plain text content
  - `reasoning` - Model's thinking process
  - `file` - File attachments
  - `tool` - Tool invocation and lifecycle
  - `subtask` - Deferred task for subagent
  - `agent` - Agent reference
  - `step_start` / `step_finish` - Step markers
  - `snapshot` / `patch` - Git references
  - `retry` - API retry attempt
  - `compaction` - Context compaction marker
  - `permission` - Permission request

### Agent System

Agents are configured with:

```typescript
interface AgentConfig {
  name: string // Agent identifier
  description?: string // Human-readable description
  model?: string // Model ID to use
  variant?: string // Model variant
  temperature?: number // Sampling temperature
  topP?: number // Nucleus sampling
  prompt?: string // System prompt
  permission: Permission // Tool permissions
  mode: AgentMode // 'primary' | 'subagent' | 'all'
  hidden?: boolean // Hide from subagent list
  color?: string // UI color
  steps?: number // Max steps
  defaultSkillIds?: string[] // Custom Skills attached by default
  skillAutoMatchingEnabled?: boolean // Allow delegated task Skill matching
}
```

**Built-in Agents:**

- `builder` - Task-scoped implementation role for structured execution work
- `manager` - Default orchestration role for delivery coordination and state
  progression
- `executive` - Review and gatekeeping role for architecture, QA, and ship
  readiness
- `build` - Full-access for active development
- `code` - Direct implementation mode without subagent delegation
- `plan` - Read-only analysis and planning
- `ask` - Quick Q&A

The canonical user-facing modes are `ask`, `plan`, `code`, and `build`. Other
names in this section are internal agent or delivery-role names, not separate
product modes.

### Custom Skills And Subagents

Panda treats Skills and Subagents as separate concepts:

- **Skills** are reusable workflow guidance. They can be built-in or
  user-created Custom Skills. They do not execute code and are not plugins.
- **Subagents** are delegated workers invoked through the task tool. They own a
  bounded execution lane and produce delegated results.

The harness supports Custom Skill composition in both primary Runs and delegated
Subagent tasks:

- Primary prompt composition resolves built-in Skills and user-scoped Custom
  Skills against the current mode, user message, custom instructions, and admin
  policy.
- Delegated Subagent prompts inherit parent constraints, include Subagent
  default attached Skills, then run task-specific Skill matching against the
  delegated prompt.
- Strict user-created Custom Skills emit a `strict_skill_preflight` runtime
  event before execution steps. Soft guidance Skills emit only Applied Skill
  metadata.
- Applied Skill summaries are persisted on run events. These summaries include
  name, source, profile, reason, and whether strict preflight was required. They
  intentionally exclude full Skill instructions.

### Agent Role Mapping

Chat modes route to appropriate agents:

- `plan` → planning, architecture review, and spec creation
- `code` → direct implementation with tool calls
- `build` → full-access structured execution
- `ask` → quick Q&A, no tool calls

## Delivery Control Plane

The harness can integrate with a delivery state machine managed in Convex. The
key principle is that the harness can execute work, but Convex owns truth for
persisted lifecycle and gating.

Current schema coverage is narrower than the original delivery-control proposal.
`agentRuns`, `agentRunEvents`, `planningSessions`, `specifications`,
`permissionAuditLog`, and `harnessRuntimeCheckpoints` are active persisted
surfaces. Delivery tables listed below are target concepts unless the schema
adds them later.

### Delivery Entity Status

| Concept                                       | Current status | Notes                                                                    |
| --------------------------------------------- | -------------- | ------------------------------------------------------------------------ |
| `agentRuns`                                   | Implemented    | Canonical run lifecycle and receipt persistence.                         |
| `agentRunEvents`                              | Implemented    | Persisted run progress and event summaries.                              |
| `customSkills`                                | Implemented    | User-scoped workflow guidance documents.                                 |
| `planningSessions`                            | Implemented    | Canonical planning intake, approval, and execution state.                |
| `specifications`                              | Implemented    | Formal specs and spec history.                                           |
| `permissionAuditLog`                          | Implemented    | Permission decision audit history.                                       |
| `harnessRuntimeCheckpoints`                   | Implemented    | Durable runtime resume snapshots.                                        |
| `deliveryStates` / `deliveryTasks`            | Target concept | Do not document as current schema until implemented.                     |
| `reviewReports` / `qaReports` / `shipReports` | Target concept | Use current run/receipt/eval surfaces unless dedicated tables are added. |
| `deliveryVerifications` / `browserSessions`   | Target concept | Future governance extension, not current table coverage.                 |

### Control-Plane Rules

- Ship readiness is recorded only from actual QA outcomes, not precomputed
  optimistic assumptions.
- Review, QA, and ship transitions create persistent verification records.
- Browser QA session reuse is persisted in Convex, not only in process memory.
- Intake and task creation are idempotent by delivery state and task key.
- Next.js API routes that operate on delivery resources must authenticate the
  user and validate ownership through Convex before acting.

## Plan-Mode Productization

Panda now treats planning as a first-class workflow layered on top of the
harness instead of only as a chat prompt style.

### Spec vs Plan vs Build

- **Spec** - Formal requirements, constraints, and acceptance criteria
- **Plan** - Editable implementation strategy with relevant files, ordered
  steps, validation, and open questions
- **Build** - Execution mode that can consume an approved plan as the active
  implementation contract

### Plan Workflow

Structured planning now has a dedicated planning-session layer in Convex in
instead of legacy chat-level compatibility fields.

The planning session state machine is:

- `intake`
- `generating`
- `ready_for_review`
- `accepted`
- `executing`
- `completed`
- `failed`
- `stale`

The active chat no longer mirrors plan draft, approval, or execution state. Plan
review and build transitions read from `planningSessions` and the generated plan
artifact.

### Plan Mode Contract

For explicit planning requests, `plan` mode now produces a plan artifact with
these sections:

- `Goal`
- `Clarifications`
- `Relevant Files`
- `Implementation Plan`
- `Risks`
- `Validation`
- `Open Questions`

This artifact is the canonical plan surface used by the UI. The previous
assistant-message extraction path remains only as a compatibility fallback.

### Guided Intake

Planning intake now starts in the right-side review surface rather than as an
unstructured chat turn.

- The user gets one question at a time
- Suggested answers are shown as numbered options
- Freeform fallback remains available when the question allows it
- After the final answer, Panda generates the plan artifact and promotes it into
  the main workspace

This keeps intake lightweight while making the resulting plan a first-class
workspace document instead of transient popup state.

### Workspace Plan Artifact Tabs

Generated plans are now rendered as virtual workspace tabs, not file tabs.

- Plan tabs use a synthetic workspace path of `plan:<sessionId>`
- They live beside file tabs in the existing workbench tab strip
- The selected plan tab renders a dedicated plan artifact view instead of the
  file editor
- When the active planning session produces a new generated plan revision, Panda
  updates the existing tab in place rather than duplicating it

### Build From Plan

When the user approves a plan and triggers **Build from Plan**:

- the chat is switched to build mode
- the accepted planning session is marked `accepted`, then `executing`
- the new run id is linked back through planning-session execution state and
  mirrored into the chat compatibility fields
- the build prompt receives an explicit execution contract that treats the
  accepted generated plan artifact as primary context instead of relying on
  conversation memory

Normal build messages do not automatically inherit the plan forever. Approved
plan injection only happens for explicit build-from-plan runs or while the chat
is still tied to an active approved-plan execution.

### Planning Diagnostics

In development, Panda exposes a compact planning debug card in the run progress
surface when an active planning session exists. It shows:

- active planning session id
- answered questions vs total questions
- current unanswered question
- last answer source (`suggestion` or `freeform`)
- generated plan tab id and artifact status
- whether the workspace plan tab is open
- whether the accepted plan is currently executing

### Planning Context Grounding

`plan` mode now receives a targeted planning context bundle in addition to the
general repo overview. This bundle prioritizes:

- routes and app entry points
- schema and API boundary files
- adjacent tests
- likely affected UI/component files

The goal is to increase concrete file references in the generated plan instead
of returning only generic architecture prose.

### Run Progress Mapping

Run progress now carries plan-step metadata. Execution events can include:

- current plan step index
- current plan step title
- total plan steps
- completed plan step indexes

`RunProgressPanel` uses that metadata to show plan progress during execution and
falls back to heuristic matching only when explicit metadata is unavailable.

**Subagent Templates:**

- `explore` - Codebase exploration
- `security-auditor` - Security review
- `performance-analyzer` - Performance analysis
- `test-generator` - Test generation
- `code-reviewer` - Code quality review

### Permission System

Uses pattern-based permissions with three decisions:

- `allow` - Always permit
- `deny` - Always deny
- `ask` - Prompt user for decision

Patterns support glob matching:

- `read_files` - All read operations
- `write_files:src/*` - Write to src directory
- `run_command:npm*` - npm commands only

### Context Compaction

Automatically summarizes conversation when approaching token limits:

- Triggers at 90% of context limit
- Preserves recent messages
- Prunes large tool outputs
- Creates summary with `CompactionPart`

### Plugin System

Plugins extend the harness with hooks:

```typescript
interface Plugin {
  name: string
  version?: string
  hooks: Partial<Record<HookType, HookHandler>>
  tools?: ToolDefinition[]
  agents?: AgentConfig[]
}
```

**Hook Types:**

- `session.start` / `session.end`
- `step.start` / `step.end`
- `tool.execute.before` / `tool.execute.after`
- `llm.request` / `llm.response`
- `compaction.before` / `compaction.after`
- `permission.ask` / `permission.decision`

### MCP Support

Connects to external MCP (Model Context Protocol) servers for additional tools:

```typescript
interface MCPServerConfig {
  id: string
  name: string
  command?: string[] // For stdio transport
  url?: string // For SSE transport
  env?: Record<string, string>
}
```

### Git Snapshots

Per-step snapshots using git write-tree for safe rollback:

- Track: Save working state before each step
- Restore: Revert to previous snapshot
- Diff: Compare snapshots

## Runtime Execution

The `Runtime` class orchestrates execution:

```typescript
const runtime = new Runtime(provider, toolExecutors, config)

for await (const event of runtime.run(sessionID, userMessage)) {
  // Handle: status, text, reasoning, tool_call, tool_result,
  //         step_start, step_finish, compaction, error, complete
}
```

**Key Features:**

- Streaming with `AsyncGenerator`
- Multi-step reasoning loop
- Tool deduplication
- Loop detection
- Forced text-only mode on max steps

## Integration with UI

### Chat Timeline And Proof Surfaces

The UI derives chat timeline rows from a bounded run timeline view model. The
visible stages are intent, routing, planning, execution, validation, receipt,
and next action. Low-level run events remain inspectable, but they are not the
default transcript experience.

The right-side proof surface is consolidated into four views:

- `Run` - live/historical progress, validation evidence, recovery state,
  approvals, and receipt summaries.
- `Changes` - artifacts, diffs, generated files, and review actions.
- `Context` - plan context, memory, specifications, context audit, and relevant
  decisions.
- `Preview` - browser/runtime preview and runtime availability.

The session rail uses bounded run and chat summaries to show quiet state markers
for active, blocked, review-ready, running, and completed work. It must not
subscribe to raw logs, full event arguments, full checkpoint payloads, or full
file contents.

Mobile preserves the same contract through `Work`, `Chat`, `Proof`, and
`Preview` destinations, with chat as the default primary panel.

### AgentSelector

Dropdown for agent selection:

- Primary chat modes: Plan, Build, and Code
- Subagents: Listed with @mention hints
- Uses harness agent registry

## Database Schema

Important persistence surfaces used by the harness and delivery control plane:

| Table                       | Purpose                               |
| --------------------------- | ------------------------------------- |
| `agentRuns`                 | Canonical run lifecycle per chat turn |
| `agentRunEvents`            | Persisted run timeline and progress   |
| `harnessRuntimeCheckpoints` | Durable runtime resume state          |

Delivery-specific tables such as `deliveryStates`, `deliveryTasks`,
`reviewReports`, `qaReports`, `shipReports`, `deliveryVerifications`, and
`browserSessions` are target concepts, not current schema entries.

## Usage Example

```typescript
import {
  Runtime,
  agents,
  permissions,
  createToolContext,
} from '@/lib/agent/harness'

// Create runtime with provider and tools
const runtime = new Runtime(llmProvider, toolExecutors, {
  maxSteps: 50,
  contextCompactionThreshold: 0.9,
})

// Run agent
for await (const event of runtime.run(sessionID, userMessage)) {
  switch (event.type) {
    case 'text':
      // Stream text to UI
      break
    case 'tool_call':
      // Show tool being executed
      break
    case 'tool_result':
      // Display result
      break
    case 'complete':
      // Final response
      break
  }
}
```

## Differences from OpenCode

| Feature | Panda           | OpenCode   |
| ------- | --------------- | ---------- |
| Backend | Convex          | Hono (Bun) |
| UI      | Next.js + React | Go TUI     |
| Storage | Convex tables   | File-based |
| Auth    | Convex Auth     | Custom     |

## See Also

- [AGENTS.md](../AGENTS.md) - AI agent instructions for this codebase
- [README.md](../README.md) - Project overview
- [docs/ARCHITECTURE_CONTRACT.md](./ARCHITECTURE_CONTRACT.md) - canonical
  vocabulary and source-of-truth map
- [docs/SECURITY_TRUST_BOUNDARIES.md](./SECURITY_TRUST_BOUNDARIES.md) - trust
  boundaries and redaction policy
- [docs/CONVEX_BACKEND_GOVERNANCE.md](./CONVEX_BACKEND_GOVERNANCE.md) - Convex
  data governance rules
