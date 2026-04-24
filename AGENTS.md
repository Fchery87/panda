# AGENTS.md - AI Agent Instructions for Panda.ai

> **Version:** 1.2  
> **Last Updated:** 2026-04-24  
> **Maintainer:** AI Development Team  
> **Status:** Active web platform

---

## Quick Start for AI Agents

When working on this codebase:

1. **Always run quality checks** before finishing any task:

   ```bash
   bun run typecheck && bun run lint && bun run format:check && bun test
   ```

2. **Zero tolerance for warnings** - Fix all ESLint/TypeScript issues

3. **Follow the brutalist design system** - Sharp corners, monospace fonts,
   precise spacing

4. **Keep the 4-mode workflow canonical** - `ask`, `plan`, `code`, `build`

5. **Use Convex for persistent data** - Keep client session and shell state in
   Zustand

6. **Test your changes** - Add/update tests as needed

7. **Protect Convex bandwidth** - Default to metadata, summaries, pagination,
   and lazy detail loading for realtime queries

---

## Project Philosophy

### Quality Standard

The standard for this repo is a fully green web app verification pass. This
means:

- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings
- ✅ Unit and browser acceptance tests passing
- ✅ Build successful
- ✅ Formatting consistent

**Never commit code that breaks this standard.**

### Brutalist Design System

Our UI follows a strict brutalist aesthetic:

```typescript
// Design tokens you MUST use
const designTokens = {
  // Border radius - always sharp
  borderRadius: 'rounded-none',

  // Fonts - monospace for UI elements
  fontMono: 'font-mono',

  // Spacing - precise, uniform
  spacing: 'space-y-4', // or space-y-8 for sections

  // Borders - thin, sharp
  border: 'border-border',

  // Shadows - sharp, directional
  shadow: 'shadow-sharp-md', // or shadow-sharp-lg

  // Colors - use semantic tokens
  surface1: 'surface-1',
  surface2: 'surface-2',
}
```

**Key Rules:**

- No rounded corners (use `rounded-none`)
- Monospace fonts for buttons, labels, navigation
- Sharp shadows with `shadow-sharp-*`
- Dot grid background on landing page
- Offset decorative elements

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
│       │   ├── llm/          # LLM provider registry
│       │   ├── agent/        # Agent runtime and delivery logic
│       │   │   ├── harness/   # OpenCode-style agentic harness
│       │   │   │   ├── types.ts          # Core types
│       │   │   │   ├── identifier.ts     # Unique IDs
│       │   │   │   ├── event-bus.ts     # Real-time events
│       │   │   │   ├── permissions.ts   # Permission system
│       │   │   │   ├── agents.ts        # Agent registry
│       │   │   │   ├── plugins.ts      # Plugin system
│       │   │   │   ├── compaction.ts   # Context compaction
│       │   │   │   ├── runtime.ts      # Execution engine
│       │   │   │   ├── task-tool.ts    # Subagent delegation
│       │   │   │   ├── mcp.ts          # MCP support
│       │   │   │   └── snapshots.ts    # Git snapshots
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
// File: Button.tsx
export function Button({ ... }) { }

// Hooks: camelCase with 'use' prefix
// File: useAgent.ts
export function useAgent(options: UseAgentOptions) { }

// Convex Functions: camelCase, descriptive
// In: projects.ts
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
  // Can fetch data directly
  // Cannot use hooks or browser APIs
  return <div>...</div>
}
```

**Use Client Directive when needed:**

```typescript
// hooks/useAgent.ts
'use client' // Required for hooks

// components/chat/ChatContainer.tsx
'use client' // Required for event handlers, hooks, browser APIs

// Any component using:
// - useState, useEffect, useCallback
// - Event handlers (onClick, onSubmit)
// - Browser APIs (window, document, localStorage)
// - Convex hooks (useQuery, useMutation)
```

---

## Component Patterns

### Creating a New Component

**Template:**

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
        'rounded-none', // Always sharp corners
        className
      )}
    >
      <h2 className="text-label font-mono">{title}</h2>
      <Button
        onClick={onAction}
        className="rounded-none font-mono"
      >
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

// ❌ Don't do this
className={`p-4 ${isActive ? 'bg-primary' : 'bg-secondary'}`}

// ✅ Do this
className={cn(
  'p-4',
  isActive && 'bg-primary',
  !isActive && 'bg-secondary'
)}

// ✅ Or this for complex logic
className={cn(
  'base-classes',
  variant === 'default' && 'variant-default',
  variant === 'destructive' && 'variant-destructive',
  size === 'sm' && 'size-sm',
  size === 'lg' && 'size-lg',
  className // Always allow override
)}
```

**Use Tailwind's arbitrary values sparingly:**

```typescript
// ❌ Avoid
<div className="w-[123px]">

// ✅ Prefer
<div className="w-32"> // or w-32, w-40, etc.
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
  {items.map(item => (
    <motion.div
      key={item.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
      }}
    />
  ))}
</motion.div>

// Exit animations
<AnimatePresence>
  {isVisible && (
    <motion.div
      exit={{ opacity: 0, scale: 0.95 }}
    />
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
- Can the result grow with project size, chat length, attachments, runs, or
  time?
- Does the caller need full documents, or only summary fields?
- Should this be paginated, capped, or fetched lazily on interaction?
- Does a regression guard need to prevent future broad-query use?

Use `NEXT_PUBLIC_DEBUG_CONVEX_PAYLOADS=1` in development to log byte counts for
hot Convex payloads. The logger reports labels and sizes only; never log raw
message text, file content, provider settings, tokens, or secrets.

### Creating a Query

```typescript
// convex/projects.ts
import { query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {
    userId: v.id('users'),
  },
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

    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: args.createdBy,
      createdAt: now,
      lastOpenedAt: now,
    })

    return projectId
  },
})
```

### Real-time Subscriptions

```typescript
// In components
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

export function ProjectList({ userId }: { userId: Id<'users'> }) {
  // Automatically re-renders when data changes
  const projects = useQuery(api.projects.list, { userId })

  if (projects === undefined) {
    return <Loading /> // Loading state
  }

  return (
    <div>
      {projects.map(project => (
        <ProjectCard key={project._id} project={project} />
      ))}
    </div>
  )
}
```

### HTTP Actions for Streaming

```typescript
// convex/llm.ts
import { httpAction } from './_generated/server'

export const streamChat = httpAction(async (ctx, req) => {
  // Handle streaming LLM responses
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Stream chunks...
      controller.enqueue(encoder.encode('data: hello\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
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
  toggleSidebar: () =>
    set((state) => ({
      sidebarOpen: !state.sidebarOpen,
    })),
  setActivePanel: (panel) => set({ activePanel: panel }),
}))
```

### Convex for Persistent State

**ALWAYS** use Convex for data that should persist across sessions or devices:

- User settings
- Projects
- Files
- Chat history
- Artifacts
- Planning sessions
- Agent runs and run events

**NEVER** use localStorage or Zustand for these.

---

## Testing Guidelines

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
bun test                    # Run all tests
bun test path/to/test.ts    # Run specific test
bun test --watch           # Watch mode
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
bun run test:e2e           # Run all E2E tests
PLAYWRIGHT_REUSE_SERVER=true bunx playwright test e2e/workbench.e2e-spec.ts e2e/sharing.e2e-spec.ts
# Use direct Playwright commands for targeted specs when port 3000 is already running.
bun run test:e2e:ui        # Run with UI mode
bun run test:e2e:debug     # Debug mode
```

---

## Common Tasks

### Adding a New Page

1. Create the page file:

```typescript
// app/my-page/page.tsx
export default function MyPage() {
  return <div>My Page</div>
}
```

2. If it needs data, create a loading state:

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

export default function Error({ error, reset }: {
  error: Error
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <button onClick={reset}>Try again</button>
    </div>
  )
}
```

### Adding a New Convex Function

1. Add to existing file or create new one in `convex/`
2. Define using `query()`, `mutation()`, or `action()`
3. Use proper argument validation with `v.*`
4. Add appropriate indexes in `schema.ts` if querying
5. Use the function in frontend with `useQuery()` or `useMutation()`

### Adding a New Component

1. Create file in appropriate directory under `components/`
2. Use TypeScript interfaces for props
3. Apply brutalist design system
4. Add `'use client'` if using hooks/browser APIs
5. Export via `index.ts` barrel file
6. Add tests if logic is complex

### Adding a New Hook

1. Create file in `hooks/` with `use` prefix
2. Always add `'use client'`
3. Use TypeScript for options and return types
4. Handle cleanup in useEffect return
5. Add test file for complex logic

---

## Agentic Harness

Panda uses an OpenCode-style agentic harness located in `lib/agent/harness/`.
The canonical workflow is: direct the AI, review its plan, approve the plan,
watch execution, inspect changes.

### Key Components

- **Agent Registry** - Built-in agents (`ask`, `plan`, `code`, `build`) + custom
  subagents
- **Permission System** - Pattern-based allow/deny/ask for tools
- **Context Compaction** - Auto-summarization at 90% token limit
- **Plugin System** - Lifecycle hooks for extensibility
- **MCP Support** - Connect to external MCP servers
- **Git Snapshots** - Per-step undo capability

### Chat Panel Components

- **RunProgressPanel** - Unified live/historical run progress
- **AgentSelector** - Dropdown for canonical mode selection
- **MemoryBankEditor** - Project memory management
- **ReasoningPanel** - Model thinking display

### Using the Harness

```typescript
import { Runtime, agents, permissions } from '@/lib/agent/harness'

// Get agent config
const agent = agents.get('build')

// Check permission
const decision = permissions.checkPermission(
  agent.permission,
  'write_files',
  'src/*'
)
```

See `docs/AGENTIC_HARNESS.md` for complete documentation.

---

## AI-Specific Guidance

### Working with Streaming

The app uses streaming for AI chat:

```typescript
// Handle streaming chunks
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

Artifacts are AI-generated code changes:

```typescript
// Creating an artifact
const artifact = {
  type: 'file_write',
  payload: {
    filePath: 'src/utils.ts',
    content: 'export function helper() {}',
  },
}

// Queue it
artifactStore.addToQueue(artifact)

// User applies it
await artifactStore.applyArtifact(artifact.id)
```

### Tool Execution

Agent tools execute actions:

```typescript
// Tool definition
const tools = {
  readFile: {
    description: 'Read file contents',
    execute: async ({ path }) => {
      return await convex.query(api.files.get, { path })
    },
  },

  writeFile: {
    description: 'Write file contents',
    execute: async ({ path, content }) => {
      await convex.mutation(api.files.update, { path, content })
    },
  },
}
```

---

## Constraints & Warnings

### NEVER Do These

❌ **Commit .env files** - These contain secrets  
❌ **Expose Convex admin keys** - Use environment variables  
❌ **Use any type** - Always use proper TypeScript types  
❌ **Ignore ESLint warnings** - Fix them all  
❌ **Break the build** - Always verify before committing  
❌ **Skip tests** - All tests must pass  
❌ **Use setState in loops** - Batch updates properly  
❌ **Forget error boundaries** - Wrap risky components  
❌ **Mix sync/async state** - Keep state updates predictable  
❌ **Use innerHTML** - Always React components

### ALWAYS Do These

✅ **Run all checks** - `typecheck && lint && format:check && test`  
✅ **Use semantic HTML** - Proper headings, buttons, labels  
✅ **Handle errors** - Try/catch with user feedback  
✅ **Clean up effects** - Return cleanup functions  
✅ **Use loading states** - Never leave users waiting blindly  
✅ **Test edge cases** - Empty states, errors, loading  
✅ **Follow design system** - Brutalist aesthetic consistently  
✅ **Write tests** - For complex logic and components  
✅ **Document complex code** - Comments for non-obvious logic  
✅ **Use proper types** - No `any`, explicit return types

---

## Quality Checklist

Before finishing ANY task, verify:

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

For Convex bandwidth-sensitive changes, also verify:

- [ ] Project boot does not subscribe to full file contents
- [ ] Chat and shared-chat transcripts are paginated or bounded
- [ ] Run progress and checkpoint UI use summaries by default
- [ ] Attachment URLs are resolved lazily and authorized
- [ ] Bandwidth guard tests cover any newly optimized query boundary

---

## Recovery

If you break something:

1. **Check git status** - See what changed
2. **Run quality checks** - Identify the issue
3. **Fix forward first** - Apply the smallest correct fix and verify it
4. **Only revert your own changes when necessary**
5. **Ask for help** - Document the issue clearly

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

interface UseHookNameOptions {
  // Options
}

interface UseHookNameReturn {
  // Return values
}

export function useHookName(options: UseHookNameOptions): UseHookNameReturn {
  // Implementation
  return {}
}
```

### New Convex Query

```typescript
// convex/feature.ts
import { query } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: {
    // Arguments
  },
  handler: async (ctx, args) => {
    // Implementation
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

---

**Remember:** Perfect health (100/100) is the standard. Never compromise on
quality. 🐼
