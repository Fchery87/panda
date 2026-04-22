# AGENTIC_HARNESS.md - Panda Agentic Harness

> **Version:** 1.2  
> **Last Updated:** 2026-04-07  
> **Status:** Implemented

---

## Overview

Panda.ai implements an OpenCode-inspired agentic harness that provides a
provider-agnostic execution system for Panda’s web-only workbench. The harness
is adapted to Panda’s current browser product, Convex-backed persistence model,
and plan-review/build workflow rather than trying to mirror another interface
surface one-to-one.

The harness executes work through provider-agnostic agents while Convex owns
truth for delivery lifecycle, task tracking, review gates, QA evidence, ship
readiness, browser session metadata, and durable runtime checkpoints.

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

### Agent Role Mapping

Chat modes route to appropriate agents:

- `architect` → planning, architecture review, and spec creation
- `code` → direct implementation with tool calls
- `build` → full-access structured execution
- `ask` → quick Q&A, no tool calls

## Delivery Control Plane

The harness integrates with a delivery state machine managed in Convex. The key
principle is that the harness can execute work, but Convex owns truth for
delivery lifecycle and gating.

### Canonical Entities

- `deliveryStates` - initiative-level source of truth for phase, status, gates,
  summary, and active role
- `deliveryTasks` - tracked execution units with evidence, requirements, and
  latest run/review/QA links
- `reviewReports` - executive review findings and decisions
- `qaReports` - browser QA evidence, assertions, and defects
- `shipReports` - final readiness decisions
- `deliveryVerifications` - normalized verification log across review, QA, and
  ship
- `browserSessions` - persistent browser-session metadata for QA reuse
- `harnessRuntimeCheckpoints` - durable runtime resume snapshots tied to chat
  and run identity

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

### Architect Mode Contract

For explicit planning requests, Architect Mode now produces a plan artifact with
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

Architect mode now receives a targeted planning context bundle in addition to
the general repo overview. This bundle prioritizes:

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

### RunProgressPanel

Unified component combining live + historical progress:

- Shows live progress during streaming
- Displays historical events after completion
- Groups by category (analysis, rewrite, tool, complete)
- Clickable file paths and artifact links
- Shows plan approval/execution state
- Shows plan step progress when executing an approved plan

### AgentSelector

Dropdown for agent selection:

- Primary chat modes: Plan, Build, and Code
- Subagents: Listed with @mention hints
- Uses harness agent registry

## Database Schema

Important persistence surfaces used by the harness and delivery control plane:

| Table                       | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `agentRuns`                 | Canonical run lifecycle per chat turn     |
| `agentRunEvents`            | Persisted run timeline and progress       |
| `harnessRuntimeCheckpoints` | Durable runtime resume state              |
| `deliveryStates`            | Initiative-level delivery source of truth |
| `deliveryTasks`             | Canonical tracked tasks                   |
| `reviewReports`             | Implementation and architecture reviews   |
| `qaReports`                 | Route-aware QA evidence                   |
| `shipReports`               | Final readiness decisions                 |
| `deliveryVerifications`     | Normalized verification records           |
| `browserSessions`           | Persistent browser QA session metadata    |

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
