# AGENTS.md - AI Agent Instructions for Panda.ai

> **Version:** 2.0
> **Last Updated:** 2026-04-26
> **Maintainer:** AI Development Team
> **Status:** Active web platform

---

## Quick Start for AI Agents

When working on this codebase, orient before executing:

1. **Assess task scope first** — Is this one file or many? A single bug fix or a
   multi-step feature? Scale your approach using the Execution Model below.

2. **Follow the loop at every scale:**

   ```
   Plan → Execute → Validate → Repair → Document → repeat
   ```

3. **For tasks touching >3 files or >10 steps** — create `SPEC.md`, `PLAN.md`,
   and `STATUS.md` in the repo root before writing any code. See "Execution
   Model" for the format.

4. **Run the validation gate after every milestone, not just at the end:**

   ```bash
   bun run typecheck && bun run lint && bun run format:check && bun test
   ```

5. **Zero tolerance for warnings** — Fix all ESLint/TypeScript issues before
   advancing to the next milestone.

6. **Follow the brutalist design system** — Sharp corners, monospace fonts,
   precise spacing.

7. **Keep the 4-mode workflow canonical** — `ask`, `plan`, `code`, `build`.

8. **Use Convex for persistent data** — Keep client session and shell state in
   Zustand.

9. **Protect Convex bandwidth** — Default to metadata, summaries, pagination,
   and lazy detail loading for realtime queries.

10. **Write tests alongside code** — Add or update tests as part of each
    milestone, not as a final step.

11. **This file is LLM-provider agnostic** — These conventions apply regardless
    of which model is executing. Do not assume model-specific behaviors; follow
    the discipline described here.

---

## Project Philosophy

### Code Quality Standard

The baseline for every task is a fully green verification pass:

- Zero TypeScript errors
- Zero ESLint warnings
- Unit and browser acceptance tests passing
- Build successful
- Formatting consistent

Never commit code that breaks this standard.

### Task Durability

Long tasks fail not because of intelligence but because of lost state, scope
drift, and skipped validation. Task durability is a first-class value here:

- **Scope doesn't change mid-run.** What you agreed to build in `SPEC.md` is
  what you build. New discoveries are logged in `STATUS.md` as future work.
- **Progress is externalized.** Don't carry milestone state only in context.
  Write it to `STATUS.md` so any re-entry point has full ground truth.
- **Validation gates are non-negotiable.** A milestone is not complete until its
  gate passes. Quality is not a final step — it is part of the loop.
- **Repair before advancing.** A failing gate stops forward progress until the
  issue is resolved.

### Brutalist Design System

Our UI follows a strict brutalist aesthetic:

```typescript
const designTokens = {
  borderRadius: 'rounded-none',     // Always sharp
  fontMono: 'font-mono',            // Monospace for UI elements
  spacing: 'space-y-4',             // Precise, uniform (space-y-8 for sections)
  border: 'border-border',          // Thin, sharp
  shadow: 'shadow-sharp-md',        // Sharp, directional
  surface1: 'surface-1',
  surface2: 'surface-2',
}
```

**Key Rules:**

- No rounded corners (`rounded-none`)
- Monospace fonts for buttons, labels, navigation
- Sharp shadows with `shadow-sharp-*`
- Dot grid background on landing page
- Offset decorative elements

---

## Execution Model

This section defines how agents should approach all tasks — not just large ones.
The same loop applies at every scale; only the ceremony around it scales up.

### The Loop

```
Plan → Execute → Validate → Repair → Document → repeat
```

Every iteration of the loop corresponds to one milestone. A milestone is any
discrete, independently verifiable unit of work.

**Plan**: Define what you are about to do and how you will know it is done.  
**Execute**: Write the code or make the change.  
**Validate**: Run the gate. If it fails, do not advance.  
**Repair**: Read the actual error output. Apply the smallest correct fix.
Re-run the gate.  
**Document**: Update `STATUS.md` with what was done, any decisions made, and any
future work discovered. Then begin the next milestone.

### Validation Gate

Run after every milestone:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test
```

For Convex changes, also verify the schema deploys:

```bash
npx convex dev --once
```

### Durable State Files

For any task involving >3 files, >10 steps, or parallel work streams, create
these three files in the repo root before writing any code:

**`SPEC.md`** — Frozen scope. Written once at the start.

```markdown
# Spec: [Task Name]

## Deliverables
- [ ] Concrete outcome 1
- [ ] Concrete outcome 2

## Constraints
- Must not change X
- Must preserve Y behavior

## Out of scope (log here during the run, do not act on)
```

**`PLAN.md`** — Milestone breakdown with gates.

```markdown
# Plan: [Task Name]

## Milestone 1: [Name]
What: ...
Acceptance criteria: ...
Validation: `bun run typecheck && bun test path/to/relevant`
Status: [ ] pending / [x] complete

## Milestone 2: [Name]
...
```

**`STATUS.md`** — Live audit log. Updated after every milestone.

```markdown
# Status: [Task Name]

## Current milestone: [Name]
## Last completed: [Name] — [date]

## Decision log
- [decision] because [reason]

## Known issues
- [issue]

## Future work (out of scope, log here)
- [item]
```

These files are runtime artifacts — created for the task, not committed as
permanent repo files unless the team decides to keep them.

### Context Compaction

The harness auto-compacts context when approaching its threshold
(`compaction.ts`). Before that happens:

- Write the current milestone's status and any pending decisions to `STATUS.md`
- The compacted context will have `STATUS.md` as ground truth for re-entry
- Never rely on in-context memory for decisions that span more than one milestone

If you re-enter a run after compaction, read `STATUS.md` and `PLAN.md` first to
reconstruct your position before taking any action.

### Horizontal Tasks (Multi-Step Sequential)

A horizontal task is a long sequential chain — many milestones, one thread.

1. Write `SPEC.md`, `PLAN.md`, `STATUS.md` before any code.
2. Execute milestones in order. Do not skip ahead.
3. Do not proceed past a failing gate.
4. Update `STATUS.md` after every milestone.
5. When finished, verify all milestones in `PLAN.md` are checked off.

### Vertical Tasks (Parallel Work Streams)

A vertical task splits into independent parallel branches.

1. Define the merge contract in `PLAN.md` before starting — what each branch
   produces and how they combine.
2. Use git worktrees (via `lib/agent/harness/snapshots.ts`) to isolate each
   branch. Each branch gets its own working tree.
3. Each branch runs the full validation gate independently before merging.
4. Merge only after both branches pass.
5. Run the full gate again on the merged result.

### Repair-Forward Protocol

When a validation gate fails:

1. Read the full error output — do not guess.
2. Apply the smallest correct fix that addresses the root cause.
3. Re-run the gate immediately.
4. If three consecutive repair attempts fail:
   - Write the blocker to `STATUS.md` with the full error and what was tried.
   - Surface to the user. Do not continue patching blindly.

---

## Architecture Overview

### Tech Stack

```
Frontend:        Next.js 16 (App Router) + React 19 + TypeScript 5.9
Backend:         Convex (real-time database + HTTP actions)
Authentication:  Convex Auth with Google OAuth
UI Components:   shadcn/ui (30+ components)
Styling:         Tailwind CSS 3.4 + brutalist custom theme
Animations:      Framer Motion
State:           Zustand (client session/shell) + Convex (persistent data)
Browser Runtime: WebContainer API for browser-side project execution
Model Catalog:   models.dev for live provider and model metadata
Testing:         Bun test runner + Playwright (E2E)
Package Mgr:     Bun 1.2.0
Monorepo:        TurboRepo 2.4
```

### Directory Structure

```
panda-ai/
├── apps/
│   └── web/                    # Next.js 16 frontend
│       ├── app/               # App Router
│       │   ├── (dashboard)/   # Projects, settings, and route-scoped layouts
│       │   ├── admin/         # Admin console routes
│       │   ├── api/           # API routes
│       │   ├── education/     # Public product guide
│       │   ├── login/         # Auth entry point
│       │   ├── s/[shareId]/   # Shared chat route
│       │   ├── globals.css    # Global styles + theme
│       │   ├── layout.tsx     # Root layout
│       │   └── page.tsx       # Landing page
│       ├── components/
│       │   ├── ui/           # shadcn/ui components (base)
│       │   ├── chat/          # Chat components
│       │   │   ├── RunProgressPanel.tsx    # Unified run progress
│       │   │   ├── AgentSelector.tsx        # 4-mode selector
│       │   │   ├── MemoryBankEditor.tsx    # Project memory
│       │   │   └── ReasoningPanel.tsx     # Thinking display
│       │   ├── workbench/    # Workbench panels
│       │   ├── editor/       # CodeMirror editor
│       │   ├── artifacts/    # Artifact system
│       │   ├── plan/         # Plan and planning-session surfaces
│       │   └── settings/     # Settings components
│       ├── lib/
│       │   ├── llm/          # LLM provider registry (provider-agnostic)
│       │   ├── webcontainer/ # Browser runtime boot, fs sync, and processes
│       │   ├── agent/        # Agent runtime and delivery logic
│       │   │   ├── harness/   # OpenCode-style agentic harness
│       │   │   │   ├── types.ts          # Core types
│       │   │   │   ├── identifier.ts     # Unique IDs
│       │   │   │   ├── event-bus.ts     # Real-time events
│       │   │   │   ├── permissions.ts   # Permission system
│       │   │   │   ├── agents.ts        # Agent registry
│       │   │   │   ├── plugins.ts      # Plugin system
│       │   │   │   ├── compaction.ts   # Context compaction (90% threshold)
│       │   │   │   ├── runtime.ts      # Execution engine
│       │   │   │   ├── task-tool.ts    # Subagent delegation
│       │   │   │   ├── mcp.ts          # MCP support
│       │   │   │   └── snapshots.ts    # Git worktrees + snapshots
│       │   │   ├── runtime.ts       # Runtime adapter/orchestration
│       │   │   ├── tools.ts         # Tool definitions
│       │   │   └── prompt-library.ts
│       │   └── diff.ts       # Diff computation
│       ├── hooks/            # Custom React hooks
│       ├── stores/           # Zustand stores
│       ├── e2e/             # Playwright E2E tests
│       └── convex/           # Generated types
├── convex/                   # Backend
│   ├── schema.ts            # Database schema (28 tables)
│   ├── *.ts                # Queries, mutations, actions
│   └── _generated/         # Auto-generated
├── docs/
│   └── AGENTIC_HARNESS.md  # Agentic harness docs
└── .github/workflows/      # CI/CD
```

---

## Code Conventions

### File Organization

**Components:**

- Co-locate related files: `Component.tsx`, `Component.test.ts`, `index.ts`
- Use barrel exports via `index.ts`
- One component per file (with rare exceptions)

**Hooks:**

- Prefix with `use`: `useAgent.ts`, `useStreamingChat.ts`
- Co-locate test files: `useAgent.test.ts`

**Convex Functions:**

- Queries: `projects.ts` contains multiple query functions
- Mutations: Same file, prefixed with action intent
- HTTP Actions: `llm.ts`, `http.ts` for streaming

### Naming Conventions

```typescript
// Components: PascalCase
export function Button({ ... }) { }

// Hooks: camelCase with 'use' prefix
export function useAgent(options: UseAgentOptions) { }

// Convex Functions: camelCase, descriptive
export const list = query({...})
export const create = mutation({...})

// Types/Interfaces: PascalCase
interface Project { }
type ChatMode = 'ask' | 'plan' | 'code' | 'build'

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3

// Files: lowercase-with-dashes
// my-component.tsx, use-my-hook.ts
```

### Import Organization

```typescript
// 1. React/Next.js
import { useState, useCallback } from 'react'
import Link from 'next/link'

// 2. Third-party libraries
import { motion } from 'framer-motion'
import { useQuery } from 'convex/react'
import { toast } from 'sonner'

// 3. Internal utilities/types
import { cn } from '@/lib/utils'
import type { Id } from '@convex/_generated/dataModel'

// 4. Components
import { Button } from '@/components/ui/button'
import { ChatContainer } from '@/components/chat/ChatContainer'

// 5. Hooks/stores
import { useArtifactStore } from '@/stores/artifactStore'
```

### Server vs Client Components

**Default to Server Components:**

```typescript
// app/page.tsx - Server Component by default
export default function HomePage() {
  return <div>...</div>
}
```

**Use Client Directive when needed:**

```typescript
// Any component using hooks, event handlers, or browser APIs
'use client'
```

---

## Component Patterns

### Creating a New Component

```typescript
// components/my-feature/MyComponent.tsx
'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface MyComponentProps {
  title: string
  className?: string
  onAction?: () => void
}

export function MyComponent({
  title,
  className,
  onAction
}: MyComponentProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'border border-border surface-1',
        'rounded-none',
        className
      )}
    >
      <h2 className="text-label font-mono">{title}</h2>
      <Button onClick={onAction} className="rounded-none font-mono">
        Action
      </Button>
    </motion.div>
  )
}
```

**Barrel Export:**

```typescript
// components/my-feature/index.ts
export { MyComponent } from './MyComponent'
export type { MyComponentProps } from './MyComponent'
```

### Styling with Tailwind

**Always use the `cn()` utility:**

```typescript
import { cn } from '@/lib/utils'

// ✅ Do this
className={cn(
  'p-4',
  isActive && 'bg-primary',
  !isActive && 'bg-secondary'
)}

// ✅ For complex logic
className={cn(
  'base-classes',
  variant === 'default' && 'variant-default',
  size === 'sm' && 'size-sm',
  className
)}
```

**Use Tailwind's arbitrary values sparingly:**

```typescript
// ✅ Prefer design-scale values
<div className="w-32">
```

### Animation Patterns

**Framer Motion is required for animations:**

```typescript
import { motion, AnimatePresence } from 'framer-motion'

// Fade in
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
>

// Stagger children
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
  }}
>

// Exit animations
<AnimatePresence>
  {isVisible && (
    <motion.div exit={{ opacity: 0, scale: 0.95 }} />
  )}
</AnimatePresence>
```

---

## Convex Patterns

### Database Schema

Convex currently defines 28 tables in `convex/schema.ts`.

Core product tables:

- `users` - User accounts
- `projects` - Code projects
- `files` - Project files
- `fileSnapshots` - Version history
- `chats` - Conversation threads
- `planningSessions` - Structured plan intake, review, and approval state
- `messages` - Chat messages
- `artifacts` - AI-generated changes
- `jobs` - Terminal commands
- `settings` - User preferences

Additional active tables cover runs, checkpoints, sharing, evals, specs,
attachments, admin, provider tokens, and MCP servers.

### Convex Bandwidth Rules

Convex live queries resend result payloads as data changes. Treat payload shape
as part of the product contract.

**Default patterns:**

- Use metadata queries for project file trees. Load file content only when a
  file is opened, saved, downloaded, or needed for runtime execution.
- Use recent or paginated chat lists. Do not subscribe to all chats on project
  boot.
- Use paginated message lists for transcripts. Keep the active workspace to one
  visible persisted transcript subscription.
- Return attachment metadata in message lists. Resolve signed storage URLs only
  when rendering an image preview or when the user opens/downloads a file.
- Use run event summaries for progress UI. Do not return full tool arguments,
  command output, full event content, or full errors to timeline surfaces by
  default.
- Use runtime checkpoint summaries for badges and panels. Load full checkpoint
  payloads only in resume flows.
- Bound usage and analytics queries. Prefer `take(...)`, pagination, or stored
  counters over `.collect()` on tables that grow with user activity.

**Before adding or changing a Convex query, ask:**

- Is this query live in the UI?
- Can the result grow with project size, chat length, attachments, runs, or time?
- Does the caller need full documents, or only summary fields?
- Should this be paginated, capped, or fetched lazily on interaction?

Use `NEXT_PUBLIC_DEBUG_CONVEX_PAYLOADS=1` in development to log byte counts for
hot Convex payloads. Never log raw message text, file content, provider
settings, tokens, or secrets.

### Creating a Query

```typescript
// convex/projects.ts
import { query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', args.userId))
      .order('desc')
      .take(100)
  },
})
```

### Creating a Mutation

```typescript
// convex/projects.ts
import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id('users'),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    return await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: now,
      lastOpenedAt: now,
    })
  },
})
```

### Real-time Subscriptions

```typescript
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

export function ProjectList({ userId }: { userId: Id<'users'> }) {
  const projects = useQuery(api.projects.list, { userId })
  if (projects === undefined) return <Loading />
  return <div>{projects.map(p => <ProjectCard key={p._id} project={p} />)}</div>
}
```

### HTTP Actions for Streaming

```typescript
// convex/llm.ts
import { httpAction } from './_generated/server'

export const streamChat = httpAction(async (ctx, req) => {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode('data: hello\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
})
```

---

## State Management

### Zustand for Client State

Use Zustand for client-side shell state and per-session chat controls that
should not be the product source of truth:

```typescript
// stores/uiStore.ts
import { create } from 'zustand'

interface UIState {
  sidebarOpen: boolean
  activePanel: 'editor' | 'terminal' | 'preview'
  toggleSidebar: () => void
  setActivePanel: (panel: 'editor' | 'terminal' | 'preview') => void
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  activePanel: 'editor',
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActivePanel: (panel) => set({ activePanel: panel }),
}))
```

### Convex for Persistent State

**ALWAYS** use Convex for data that should persist across sessions or devices:

- User settings, projects, files, chat history, artifacts, planning sessions,
  agent runs and run events

**NEVER** use localStorage or Zustand for these.

---

## Testing Guidelines

Tests are not a final step — they are part of each milestone's validation gate.
Write or update tests alongside the code change, then run the gate.

### Unit Tests (Bun)

```typescript
// lib/utils.test.ts
import { expect, test, describe } from 'bun:test'
import { cn } from './utils'

describe('cn', () => {
  test('merges classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  test('handles conditionals', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })
})
```

**Run tests:**

```bash
bun test                    # All tests
bun test path/to/test.ts    # Specific test
bun test --watch            # Watch mode
```

### E2E Tests (Playwright)

```typescript
// e2e/homepage.spec.ts
import { test, expect } from '@playwright/test'

test('landing page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/Panda.ai/)
  await expect(page.getByText('AI Coding Workbench')).toBeVisible()
})
```

**Run E2E tests:**

```bash
cd apps/web
bun run test:e2e
PLAYWRIGHT_REUSE_SERVER=true bunx playwright test e2e/workbench.e2e-spec.ts
bun run test:e2e:ui
bun run test:e2e:debug
```

---

## Common Tasks

Each recipe below includes the loop steps. For tasks that are milestones in a
larger run, update `PLAN.md` (check off the milestone) and `STATUS.md` (log what
was done) after the gate passes.

### Adding a New Page

**Plan**: Identify the route, any data it needs, and its error/loading states.

1. Create the page file:

```typescript
// app/my-page/page.tsx
export default function MyPage() {
  return <div>My Page</div>
}
```

2. Add a loading state:

```typescript
// app/my-page/loading.tsx
export default function Loading() {
  return <LoadingSpinner />
}
```

3. Add error handling:

```typescript
// app/my-page/error.tsx
'use client'
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

**Validate**: `bun run typecheck && bun run lint && bun test`  
**Document**: Update `STATUS.md` if this is part of a larger task.

### Adding a New Convex Function

**Plan**: Know the table, the index needed, and the access pattern before writing.

1. Add to existing file or create new one in `convex/`
2. Define using `query()`, `mutation()`, or `action()`
3. Use proper argument validation with `v.*`
4. Add appropriate indexes in `schema.ts` if querying
5. Use the function in frontend with `useQuery()` or `useMutation()`

**Validate**: `bun run typecheck && npx convex dev --once`  
**Document**: Note any bandwidth implications in `STATUS.md`.

### Adding a New Component

**Plan**: Know which design tokens apply and whether the component needs state.

1. Create file in appropriate directory under `components/`
2. Use TypeScript interfaces for props
3. Apply brutalist design system (sharp corners, monospace fonts)
4. Add `'use client'` if using hooks or browser APIs
5. Export via `index.ts` barrel file
6. Add tests if logic is complex

**Validate**: `bun run typecheck && bun run lint && bun test`

### Adding a New Hook

**Plan**: Know the cleanup requirements before starting.

1. Create file in `hooks/` with `use` prefix
2. Always add `'use client'`
3. Use TypeScript for options and return types
4. Handle cleanup in `useEffect` return
5. Add test file for complex logic

**Validate**: `bun run typecheck && bun test`

---

## Agentic Harness

Panda uses an OpenCode-style agentic harness in `lib/agent/harness/`. The
canonical workflow: direct the agent → review its plan → approve → watch
execution → inspect changes.

The harness is LLM-provider agnostic. `lib/llm/` abstracts the provider layer.
Do not add provider-specific logic to harness code.

### Key Components and Their Long-Horizon Roles

- **Agent Registry** — Built-in agents (`ask`, `plan`, `code`, `build`) + custom
  subagents. Each agent maps to a phase of the execution loop.
- **Permission System** — Pattern-based allow/deny/ask for tools. Reviewed before
  starting any long task.
- **Context Compaction** (`compaction.ts`) — Auto-summarizes at the context
  threshold. Before this triggers, write milestone state to `STATUS.md`.
- **Plugin System** — Lifecycle hooks for extensibility. The spec/plan/status
  tracking pattern can be implemented as plugins.
- **MCP Support** — Connect to external MCP servers.
- **Git Snapshots / Worktrees** (`snapshots.ts`) — Per-step undo + worktree
  isolation for parallel work streams. Use worktrees when running vertical tasks;
  define the merge contract in `PLAN.md` before branching.

### Horizontal vs Vertical Task Flows

**Horizontal** (sequential milestones, one thread):

```
Milestone 1 → [gate] → Milestone 2 → [gate] → Milestone 3 → [gate] → done
```

Each milestone is a unit in `PLAN.md`. Gate must pass before advancing.

**Vertical** (parallel branches):

```
Branch A: M1 → [gate] ─────────────────┐
                                        ├─ merge → [gate] → done
Branch B: M1 → [gate] ─────────────────┘
```

Each branch uses a separate worktree (`snapshots.ts`). Both must pass their
gates before merging. Merge contract defined in `PLAN.md` upfront.

### Chat Panel Components

- **RunProgressPanel** — Unified live/historical run progress
- **AgentSelector** — Dropdown for canonical mode selection
- **MemoryBankEditor** — Project memory management
- **ReasoningPanel** — Model thinking display

### Using the Harness

```typescript
import { Runtime, agents, permissions } from '@/lib/agent/harness'

const agent = agents.get('build')
const decision = permissions.checkPermission(agent.permission, 'write_files', 'src/*')
```

See `docs/AGENTIC_HARNESS.md` for complete documentation.

---

## AI-Specific Guidance

### Working with Streaming

```typescript
const stream = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ message }),
})

const reader = stream.body?.getReader()
while (reader) {
  const { done, value } = await reader.read()
  if (done) break
  // Process chunk
}
```

**Key rules:**

- Always handle stream cleanup (abort controllers)
- Show loading states during streaming
- Handle errors gracefully
- Update UI incrementally with each chunk

### Working with Artifacts

```typescript
const artifact = {
  type: 'file_write',
  payload: { filePath: 'src/utils.ts', content: 'export function helper() {}' },
}
artifactStore.addToQueue(artifact)
await artifactStore.applyArtifact(artifact.id)
```

### Tool Execution

```typescript
const tools = {
  readFile: {
    description: 'Read file contents',
    execute: async ({ path }) => await convex.query(api.files.get, { path }),
  },
  writeFile: {
    description: 'Write file contents',
    execute: async ({ path, content }) =>
      await convex.mutation(api.files.update, { path, content }),
  },
}
```

---

## Constraints & Warnings

### NEVER Do These

❌ **Commit .env files** — These contain secrets  
❌ **Expose Convex admin keys** — Use environment variables  
❌ **Use `any` type** — Always use proper TypeScript types  
❌ **Ignore ESLint warnings** — Fix them all  
❌ **Break the build** — Always verify before committing  
❌ **Skip tests** — All tests must pass  
❌ **Use setState in loops** — Batch updates properly  
❌ **Forget error boundaries** — Wrap risky components  
❌ **Mix sync/async state** — Keep state updates predictable  
❌ **Use innerHTML** — Always React components  
❌ **Proceed past a failing validation gate** — Repair before advancing  
❌ **Scope-creep mid-run** — Discovered improvements go to `STATUS.md` as future
   work, not into the current run  
❌ **Rely on in-context memory across milestones** — Externalize to `STATUS.md`  
❌ **Patch blindly after 3 failed repairs** — Escalate with a full error report  
❌ **Add provider-specific logic to harness code** — The harness is LLM-agnostic  

### ALWAYS Do These

✅ **Run the validation gate after every milestone** — Not just before committing  
✅ **Freeze scope in SPEC.md before multi-file work** — Write it first, start
   coding second  
✅ **Externalize progress to STATUS.md** — Before context compacts, before
   stopping for any reason  
✅ **Use git worktrees for parallel work streams** — Isolation prevents merge
   chaos  
✅ **Read actual error output before repairing** — The error message is the spec  
✅ **Run all quality checks** — `typecheck && lint && format:check && test`  
✅ **Use semantic HTML** — Proper headings, buttons, labels  
✅ **Handle errors** — Try/catch with user feedback  
✅ **Clean up effects** — Return cleanup functions  
✅ **Use loading states** — Never leave users waiting blindly  
✅ **Follow the design system** — Brutalist aesthetic consistently  
✅ **Write tests alongside code** — Per milestone, not at the end  
✅ **Use proper types** — No `any`, explicit return types  

---

## Quality Checklist

### Tier 1 — After Every Milestone

Run these before advancing to the next milestone:

- [ ] TypeScript compiles (`bun run typecheck`)
- [ ] ESLint passes with zero warnings (`bun run lint`)
- [ ] Tests pass for the modified area (`bun test path/to/...`)
- [ ] `STATUS.md` updated with what was done and any decisions made
- [ ] `PLAN.md` milestone checked off (if part of a larger task)

### Tier 2 — Before Committing

Run the full gate before any commit:

- [ ] TypeScript compiles without errors (`bun run typecheck`)
- [ ] ESLint passes with zero warnings (`bun run lint`)
- [ ] Prettier formatting is correct (`bun run format:check`)
- [ ] All tests pass (`bun test`)
- [ ] E2E tests pass (`bun run test:e2e`)
- [ ] Build succeeds (`bun run build`)
- [ ] No secrets in code
- [ ] Design system followed (sharp corners, monospace fonts)
- [ ] Error handling in place
- [ ] Loading states implemented
- [ ] Console is clean (no errors/warnings)
- [ ] All PLAN.md milestones complete (if applicable)

For Convex bandwidth-sensitive changes, also verify:

- [ ] Project boot does not subscribe to full file contents
- [ ] Chat and shared-chat transcripts are paginated or bounded
- [ ] Run progress and checkpoint UI use summaries by default
- [ ] Attachment URLs are resolved lazily and authorized
- [ ] Bandwidth guard tests cover any newly optimized query boundary

---

## Recovery

Recovery is part of the execution model, not an exceptional case. These
protocols apply when a run stalls, a gate fails repeatedly, or a run must be
re-entered after interruption.

### Repair-Forward Protocol

When a validation gate fails:

1. **Read the error output** — do not guess the cause.
2. **Apply the smallest correct fix** that addresses the root cause.
3. **Re-run the gate immediately**.
4. **After 3 consecutive failures**: write the full error and what was tried to
   `STATUS.md`, surface the blocker to the user. Do not keep patching.

Always fix forward. Only revert your own changes when no forward path exists.

### Re-entry Protocol

When resuming an interrupted or compacted run:

1. Read `STATUS.md` to reconstruct ground truth — what was done, where things
   stand, what was decided.
2. Read `PLAN.md` to identify the current milestone and which gates have passed.
3. Run `bun run typecheck && bun run lint && bun test` to assess current state
   before taking any new action.
4. Continue from the last incomplete milestone.

### Scope Drift Recovery

If you notice the run has drifted from `SPEC.md`:

1. Stop immediately.
2. Re-read `SPEC.md`.
3. Log the drift in `STATUS.md`.
4. Reverse any out-of-scope changes.
5. Continue only what was agreed.

### Context Loss Recovery

If context was compacted and the run is mid-task:

1. Read `STATUS.md` and `PLAN.md` first — these are your ground truth.
2. Do not reconstruct from memory or guessing.
3. If the state files are missing or incomplete, surface to the user before
   taking any action.

---

## Appendix: File Templates

### New Component

```typescript
// components/[feature]/ComponentName.tsx
'use client'

import { cn } from '@/lib/utils'

interface ComponentNameProps {
  className?: string
}

export function ComponentName({ className }: ComponentNameProps) {
  return (
    <div className={cn('rounded-none', className)}>
      {/* Component content */}
    </div>
  )
}
```

### New Hook

```typescript
// hooks/useHookName.ts
'use client'

import { useState, useCallback } from 'react'

interface UseHookNameOptions {}
interface UseHookNameReturn {}

export function useHookName(options: UseHookNameOptions): UseHookNameReturn {
  return {}
}
```

### New Convex Query

```typescript
// convex/feature.ts
import { query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {},
  handler: async (ctx, args) => {
    return []
  },
})
```

### New E2E Test

```typescript
// e2e/feature.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Feature', () => {
  test('should work', async ({ page }) => {
    await page.goto('/route')
    await expect(page.getByText('Expected')).toBeVisible()
  })
})
```

### SPEC.md Template

```markdown
# Spec: [Task Name]

## Deliverables
- [ ] ...

## Constraints
- ...

## Out of scope (log here during the run, do not act on)
```

### PLAN.md Template

```markdown
# Plan: [Task Name]

## Milestone 1: [Name]
What: ...
Acceptance criteria: ...
Validation: `bun run typecheck && bun test path/to/...`
Status: [ ] pending

## Milestone 2: [Name]
...
```

### STATUS.md Template

```markdown
# Status: [Task Name]

## Current milestone: [Name]
## Last completed: [Name] — [date]

## Decision log
- [decision] because [reason]

## Known issues
- [issue]

## Future work (out of scope, log here)
- [item]
```

---

**The standard is a fully green pass at every gate. Durability and discipline are
what make long tasks succeed.**

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md`
first** for important guidelines on how to correctly use Convex APIs and
patterns. The file contains rules that override what you may have learned about
Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
