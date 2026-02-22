# AGENTIC_HARNESS.md - OpenCode-Style Agentic Harness

> **Version:** 1.0  
> **Last Updated:** 2026-02-21  
> **Status:** Implemented

---

## Overview

Panda.ai implements an OpenCode-style agentic harness that provides a
provider-agnostic agent execution system. It was designed to mirror the
architecture of OpenCode while integrating with Panda's existing Convex-based
backend.

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

- `build` - Full-access for active development
- `plan` - Read-only analysis and planning
- `ask` - Quick Q&A

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

### AgentSelector

Dropdown for agent selection:

- Primary agents: build, plan, ask (with keyboard shortcuts 1-4)
- Subagents: Listed with @mention hints
- Uses harness agent registry

## Database Schema

New tables for agentic harness:

| Table                | Purpose                  |
| -------------------- | ------------------------ |
| `agentSessions`      | Session state management |
| `messageParts`       | Structured message parts |
| `permissionRequests` | Pending permissions      |
| `gitSnapshots`       | Git snapshot storage     |

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
