# Panda.ai Implementation Plan - Updated

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Build Panda.ai, a browser-based AI coding workbench with streaming
chat agent (discuss/build modes), code editor, file tree, diff view, terminal,
and preview in a Next.js + Convex stack.

**Architecture:** Monorepo with `apps/web` (Next.js frontend), `convex/`
(backend/storage). Agent runtime and LLM providers live in `apps/web/lib/` for
simplicity. Convex handles all persistence (projects, files, chats, messages,
jobs, artifacts) with HTTP actions for streaming. Uses Vercel AI SDK for
streaming utilities.

**Tech Stack:** Next.js 16+ (App Router, TypeScript, Tailwind/shadcn-ui), Convex
(backend/database with HTTP actions), CodeMirror 6 (dynamic import, SSR-safe),
Vercel AI SDK (streaming utilities), bun (package manager), shadcn/ui + Framer
Motion (UI with resizable panels)

---

## Phase 1: Scaffolding & Architecture

### Task 1.1: Create Monorepo Structure

**Files:**

- Create: `package.json` (root workspace config)
- Create: `tsconfig.json` (root)
- Create: `turbo.json`
- Create: `.gitignore`

**Step 1: Initialize root package.json**

```json
{
  "name": "panda-ai",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

**Step 3: Create root .gitignore**

```
# Dependencies
node_modules/
*.lock

# Build outputs
.next/
dist/
build/

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Convex
.convex/

# Bun
bun.lockb
```

**Step 4: Initialize repository**

```bash
cd /home/nochaserz/Documents/Coding\ Projects/panda
git init
git add .
git commit -m "chore: initialize monorepo structure with bun"
```

---

### Task 1.2: Setup Next.js App with Vercel AI SDK

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`

**Step 1: Create apps/web/package.json**

```json
{
  "name": "@panda-ai/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "convex": "^1.19.0",
    "ai": "^4.1.0",
    "@ai-sdk/openai": "^1.1.0",
    "@ai-sdk/react": "^1.1.0",
    "@uiw/react-codemirror": "^4.23.0",
    "@codemirror/lang-javascript": "^6.2.2",
    "@codemirror/lang-typescript": "^6.2.0",
    "@codemirror/theme-one-dark": "^6.1.2",
    "@codemirror/view": "^6.36.0",
    "@codemirror/state": "^6.5.0",
    "@codemirror/commands": "^6.7.0",
    "framer-motion": "^12.0.0",
    "react-resizable-panels": "^2.1.0",
    "lucide-react": "^0.474.0",
    "zustand": "^5.0.3",
    "@radix-ui/react-slot": "^1.1.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.0",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0"
  }
}
```

**Step 2: Install shadcn/ui**

```bash
cd apps/web
bunx shadcn@latest init --yes --template next --base-color neutral
```

**Step 3: Install all required shadcn components**

```bash
bunx shadcn@latest add button card dialog dropdown-menu tabs tooltip sonner input textarea scroll-area separator badge avatar resizable skeleton toggle-group context-menu
```

**Step 4: Install Framer Motion and resizable panels**

```bash
bun add framer-motion react-resizable-panels
```

**Step 5: Commit**

```bash
cd ../..
git add apps/web/
git commit -m "feat: setup Next.js 16 with shadcn/ui, Framer Motion, Vercel AI SDK, resizable panels"
```

---

### Task 1.3: Initialize Convex Backend with HTTP Actions

**Files:**

- Create: `convex/schema.ts`
- Modify: `package.json` (root scripts)

**Step 1: Setup Convex**

```bash
bun add -d convex@^1.19.0
bunx convex dev --init
```

**Step 2: Verify bun + Convex compatibility**

```bash
# Test that convex CLI works with bun
bunx convex dev --help
# Should show help without errors
```

If errors occur, use:

```bash
npm install -g convex
convex dev
```

**Step 3: Update root package.json scripts**

```json
{
  "scripts": {
    "dev": "concurrently \"bunx convex dev\" \"turbo run dev\"",
    "convex:dev": "bunx convex dev",
    "convex:deploy": "bunx convex deploy"
  }
}
```

**Step 4: Commit**

```bash
git add convex/ package.json
git commit -m "feat: initialize Convex backend with HTTP actions support"
```

---

## Phase 2: Data Model in Convex

### Task 2.1: Define Convex Schema

**Files:**

- Create: `convex/schema.ts`

**Step 1: Write the Convex schema**

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_email', ['email']),

  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    lastOpenedAt: v.number(),
    repoUrl: v.optional(v.string()),
  })
    .index('by_createdBy', ['createdBy'])
    .index('by_lastOpenedAt', ['lastOpenedAt']),

  files: defineTable({
    projectId: v.id('projects'),
    path: v.string(),
    content: v.string(),
    isBinary: v.boolean(),
    updatedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_path', ['projectId', 'path']),

  fileSnapshots: defineTable({
    fileId: v.id('files'),
    snapshotNumber: v.number(),
    content: v.string(),
    createdAt: v.number(),
  })
    .index('by_fileId', ['fileId'])
    .index('by_fileId_snapshotNumber', ['fileId', 'snapshotNumber']),

  chats: defineTable({
    projectId: v.id('projects'),
    title: v.string(),
    mode: v.union(v.literal('discuss'), v.literal('build')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_updatedAt', ['projectId', 'updatedAt']),

  messages: defineTable({
    chatId: v.id('chats'),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system')
    ),
    content: v.string(),
    annotations: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index('by_chatId', ['chatId'])
    .index('by_chatId_createdAt', ['chatId', 'createdAt']),

  artifacts: defineTable({
    chatId: v.id('chats'),
    messageId: v.id('messages'),
    actions: v.any(),
    status: v.union(
      v.literal('pending'),
      v.literal('complete'),
      v.literal('failed')
    ),
    createdAt: v.number(),
  })
    .index('by_chatId', ['chatId'])
    .index('by_messageId', ['messageId']),

  settings: defineTable({
    userId: v.string(),
    providerConfigs: v.any(),
    theme: v.union(v.literal('light'), v.literal('dark'), v.literal('system')),
    language: v.string(),
    defaultProvider: v.optional(v.string()),
    defaultModel: v.optional(v.string()),
    updatedAt: v.number(),
  }).index('by_userId', ['userId']),

  jobs: defineTable({
    projectId: v.id('projects'),
    type: v.union(v.literal('command'), v.literal('deploy')),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('complete'),
      v.literal('failed')
    ),
    command: v.optional(v.string()),
    logs: v.optional(v.string()),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  })
    .index('by_projectId', ['projectId'])
    .index('by_projectId_status', ['projectId', 'status']),
})
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: define Convex schema with artifacts and jobs"
```

---

### Task 2.2: Create CRUD Operations with Real-time Subscriptions

**Files:**

- Create: `convex/projects.ts`
- Create: `convex/files.ts`
- Create: `convex/chats.ts`
- Create: `convex/messages.ts`
- Create: `convex/settings.ts`
- Create: `convex/jobs.ts`
- Create: `convex/artifacts.ts`

**Step 1: Implement queries and mutations for all tables**

Use `useQuery()` from `convex/react` for automatic real-time subscriptions:

```typescript
// Example: convex/files.ts
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, { projectId }) => {
    return await ctx.db
      .query('files')
      .withIndex('by_projectId', (q) => q.eq('projectId', projectId))
      .collect()
  },
})

// In component:
// const files = useQuery(api.files.list, { projectId })
// Automatically re-renders when files change!
```

**Step 2: Commit**

```bash
git add convex/
git commit -m "feat: add Convex CRUD with real-time subscriptions"
```

---

## Phase 3: Workbench UI with Resizable Panels

### Task 3.1: Create File Tree Component with Animations

**Files:**

- Create: `apps/web/components/workbench/FileTree.tsx`

**Step 1: Implement file tree with Framer Motion animations**

Build a tree view with smooth expand/collapse animations.

**Step 2: Commit**

```bash
git add apps/web/components/workbench/FileTree.tsx
git commit -m "feat: add FileTree with animations"
```

---

### Task 3.2: Create CodeMirror Editor (SSR-Safe)

**Files:**

- Create: `apps/web/components/workbench/CodeMirrorEditor.tsx`
- Create: `apps/web/components/editor/EditorContainer.tsx`

**Step 1: Create EditorContainer with dynamic import**

```typescript
// apps/web/components/editor/EditorContainer.tsx
'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const CodeMirrorEditor = dynamic(
  () => import('./CodeMirrorEditor'),
  { ssr: false }
)

interface EditorContainerProps {
  filePath: string
  content: string
  onSave: (content: string) => void
}

export function EditorContainer(props: EditorContainerProps) {
  return (
    <Suspense fallback={<Skeleton className="h-full w-full" />}>
      <CodeMirrorEditor {...props} />
    </Suspense>
  )
}
```

**Step 2: Create CodeMirrorEditor component**

```typescript
// apps/web/components/editor/CodeMirrorEditor.tsx
'use client'

import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'

interface CodeMirrorEditorProps {
  filePath: string
  content: string
  onSave: (content: string) => void
}

export default function CodeMirrorEditor({ filePath, content, onSave }: CodeMirrorEditorProps) {
  return (
    <CodeMirror
      value={content}
      height="100%"
      theme={oneDark}
      extensions={[javascript({ typescript: true })]}
      onChange={onSave}
    />
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/components/editor/
git commit -m "feat: add SSR-safe CodeMirror editor"
```

---

### Task 3.3: Create Resizable Workbench Layout

**Files:**

- Create: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Create Workbench with resizable panels**

```typescript
// apps/web/components/workbench/Workbench.tsx
'use client'

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { motion } from 'framer-motion'
import { FileTree } from './FileTree'
import { EditorContainer } from '../editor/EditorContainer'
import { Terminal } from './Terminal'
import { Preview } from './Preview'

export function Workbench({ projectId }: { projectId: string }) {
  return (
    <PanelGroup direction="horizontal" className="h-full">
      {/* File Tree */}
      <Panel defaultSize={20} minSize={15} maxSize={30}>
        <motion.div
          className="h-full border-r"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <FileTree projectId={projectId} />
        </motion.div>
      </Panel>

      <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

      {/* Editor + Bottom Panel */}
      <Panel defaultSize={50}>
        <PanelGroup direction="vertical">
          <Panel defaultSize={70}>
            <EditorContainer />
          </Panel>

          <PanelResizeHandle className="h-1 bg-border hover:bg-primary transition-colors" />

          <Panel defaultSize={30} minSize={20}>
            <Terminal projectId={projectId} />
          </Panel>
        </PanelGroup>
      </Panel>

      <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors" />

      {/* Preview */}
      <Panel defaultSize={30} minSize={20}>
        <Preview />
      </Panel>
    </PanelGroup>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/workbench/Workbench.tsx
git commit -m "feat: add resizable workbench layout"
```

---

### Task 3.4: Create Diff Viewer Component

**Files:**

- Create: `apps/web/components/workbench/DiffViewer.tsx`
- Create: `apps/web/lib/diff.ts`

**Step 1: Create diff utility**

```typescript
// apps/web/lib/diff.ts
export function computeDiff(
  oldContent: string,
  newContent: string
): DiffLine[] {
  // Simple line-by-line diff
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const result: DiffLine[] = []

  // Implementation here

  return result
}
```

**Step 2: Create DiffViewer component**

```typescript
// apps/web/components/workbench/DiffViewer.tsx
'use client'

import { motion } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DiffViewerProps {
  oldContent: string
  newContent: string
  oldLabel?: string
  newLabel?: string
}

export function DiffViewer({
  oldContent,
  newContent,
  oldLabel,
  newLabel,
}: DiffViewerProps) {
  // Implementation with syntax highlighting
}
```

**Step 3: Commit**

```bash
git add apps/web/components/workbench/DiffViewer.tsx apps/web/lib/diff.ts
git commit -m "feat: add diff viewer component"
```

---

## Phase 4: Chat UI with Vercel AI SDK

### Task 4.1: Create Chat Components with shadcn

**Files:**

- Create: `apps/web/components/chat/ChatContainer.tsx`
- Create: `apps/web/components/chat/MessageList.tsx`
- Create: `apps/web/components/chat/MessageBubble.tsx`
- Create: `apps/web/components/chat/ChatInput.tsx`

**Step 1: Build chat UI with shadcn Card, Avatar, Badge, and Framer Motion**

Use shadcn components for consistent design:

- Card for message containers
- Avatar for user/bot icons
- Badge for model info
- Skeleton for loading states
- Toggle Group for mode switch

**Step 2: Commit**

```bash
git add apps/web/components/chat/
git commit -m "feat: add chat UI with shadcn components"
```

---

### Task 4.2: Implement Streaming with Vercel AI SDK + Convex HTTP Actions

**Files:**

- Create: `apps/web/lib/llm/` (moved from packages/llm)
- Create: `apps/web/lib/agent/` (moved from packages/agent)
- Create: `convex/llm.ts` (HTTP action for streaming)
- Create: `apps/web/hooks/useStreamingChat.ts`

**Step 1: Move LLM and agent code to apps/web/lib/**

```
apps/web/lib/
├── llm/
│   ├── types.ts
│   ├── base-provider.ts
│   ├── providers/
│   │   └── openai-compatible.ts
│   └── registry.ts
├── agent/
│   ├── prompt-library.ts
│   ├── tools.ts
│   └── runtime.ts
└── mcp/
    └── (placeholder for future)
```

**Step 2: Create Convex HTTP action for streaming**

```typescript
// convex/llm.ts
import { httpAction } from './_generated/server'
import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'

export const streamChat = httpAction(async (ctx, request) => {
  const { messages, mode } = await request.json()

  const result = streamText({
    model: openai('gpt-4o-mini'),
    messages,
    system:
      mode === 'build'
        ? 'You are a coding assistant...'
        : 'You are a planning assistant...',
  })

  return result.toDataStreamResponse()
})
```

**Step 3: Create useStreamingChat hook with Vercel AI SDK**

```typescript
// apps/web/hooks/useStreamingChat.ts
'use client'

import { useChat } from '@ai-sdk/react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function useStreamingChat({
  chatId,
  projectId,
}: {
  chatId: string
  projectId: string
}) {
  const messages = useQuery(api.messages.list, { chatId })
  const addMessage = useMutation(api.messages.add)

  const {
    messages: streamMessages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: '/api/chat',
    body: { chatId, projectId },
    onFinish: async (message) => {
      // Persist to Convex
      await addMessage({
        chatId,
        role: 'assistant',
        content: message.content,
      })
    },
  })

  return { messages, input, handleInputChange, handleSubmit, isLoading }
}
```

**Step 4: Commit**

```bash
git add apps/web/lib/llm/ apps/web/lib/agent/ convex/llm.ts apps/web/hooks/useStreamingChat.ts
git commit -m "feat: add streaming chat with Vercel AI SDK and Convex HTTP actions"
```

---

## Phase 5: Agent Runtime with Artifact Queue

### Task 5.1: Create Artifact Transaction System

**Files:**

- Create: `apps/web/stores/artifactStore.ts`
- Create: `apps/web/components/artifacts/ArtifactPanel.tsx`

**Step 1: Create Zustand store for artifact queue**

```typescript
// apps/web/stores/artifactStore.ts
import { create } from 'zustand'

interface Artifact {
  id: string
  type: 'file_write' | 'command_run'
  payload: any
  status: 'pending' | 'applied' | 'rejected'
}

interface ArtifactStore {
  queue: Artifact[]
  addToQueue: (artifact: Artifact) => void
  applyArtifact: (id: string) => void
  rejectArtifact: (id: string) => void
  clearQueue: () => void
}

export const useArtifactStore = create<ArtifactStore>((set) => ({
  queue: [],
  addToQueue: (artifact) =>
    set((state) => ({
      queue: [...state.queue, artifact],
    })),
  applyArtifact: (id) =>
    set((state) => ({
      queue: state.queue.map((a) =>
        a.id === id ? { ...a, status: 'applied' } : a
      ),
    })),
  rejectArtifact: (id) =>
    set((state) => ({
      queue: state.queue.map((a) =>
        a.id === id ? { ...a, status: 'rejected' } : a
      ),
    })),
  clearQueue: () => set({ queue: [] }),
}))
```

**Step 2: Create ArtifactPanel for apply/reject UI**

```typescript
// apps/web/components/artifacts/ArtifactPanel.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useArtifactStore } from '@/stores/artifactStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'

export function ArtifactPanel() {
  const { queue, applyArtifact, rejectArtifact } = useArtifactStore()

  return (
    <AnimatePresence>
      {queue.map((artifact) => (
        <motion.div
          key={artifact.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 100 }}
        >
          <Card className="p-4 mb-2">
            <div className="flex justify-between items-center">
              <span>{artifact.type}: {artifact.payload.path}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => rejectArtifact(artifact.id)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyArtifact(artifact.id)}
                >
                  Apply
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </AnimatePresence>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/stores/ apps/web/components/artifacts/
git commit -m "feat: add artifact transaction system with apply/reject"
```

---

### Task 5.2: Implement Agent Tools

**Files:**

- Create: `apps/web/lib/agent/tools.ts`
- Create: `apps/web/lib/agent/runtime.ts`

**Step 1: Define tools (read_files, write_files, run_command)**

```typescript
// apps/web/lib/agent/tools.ts
export const tools = [
  {
    name: 'read_files',
    description: 'Read file contents',
    parameters: {
      type: 'object',
      properties: {
        paths: { type: 'array', items: { type: 'string' } },
      },
      required: ['paths'],
    },
  },
  {
    name: 'write_files',
    description: 'Write or modify files',
    parameters: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              path: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['path', 'content'],
          },
        },
      },
      required: ['changes'],
    },
  },
  {
    name: 'run_command',
    description: 'Run a shell command',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string' },
      },
      required: ['command'],
    },
  },
]
```

**Step 2: Commit**

```bash
git add apps/web/lib/agent/tools.ts apps/web/lib/agent/runtime.ts
git commit -m "feat: add agent tools and runtime"
```

---

## Phase 6: Terminal Integration

### Task 6.1: Implement Terminal with Job Streaming

**Files:**

- Create: `apps/web/components/workbench/Terminal.tsx`
- Create: `convex/jobs.ts`

**Step 1: Create Terminal component with real-time job logs**

```typescript
// apps/web/components/workbench/Terminal.tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { ScrollArea } from '@/components/ui/scroll-area'

export function Terminal({ projectId }: { projectId: string }) {
  const jobs = useQuery(api.jobs.list, { projectId })

  // Auto-subscribes to real-time updates!

  return (
    <ScrollArea className="h-full">
      {jobs?.map((job) => (
        <div key={job._id}>
          <span className="text-muted-foreground">{job.command}</span>
          <pre className="text-sm">{job.logs}</pre>
        </div>
      ))}
    </ScrollArea>
  )
}
```

**Step 2: Create Convex jobs with streaming**

```typescript
// convex/jobs.ts
import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    projectId: v.id('projects'),
    command: v.string(),
  },
  handler: async (ctx, { projectId, command }) => {
    const jobId = await ctx.db.insert('jobs', {
      projectId,
      type: 'command',
      status: 'pending',
      command,
      createdAt: Date.now(),
    })
    return jobId
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('jobs'),
    status: v.union(
      v.literal('pending'),
      v.literal('running'),
      v.literal('complete'),
      v.literal('failed')
    ),
    logs: v.optional(v.string()),
    output: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      ...args,
      ...(args.status === 'running' ? { startedAt: Date.now() } : {}),
      ...(args.status === 'complete' || args.status === 'failed'
        ? { completedAt: Date.now() }
        : {}),
    })
  },
})
```

**Step 3: Commit**

```bash
git add apps/web/components/workbench/Terminal.tsx convex/jobs.ts
git commit -m "feat: add terminal with real-time job streaming"
```

---

## Phase 7: Settings & GitHub Import

### Task 7.1: Create Settings Page

**Files:**

- Create: `apps/web/app/settings/page.tsx`

**Step 1: Build settings UI with shadcn**

- LLM provider configuration
- Theme toggle
- API key management
- Model selection

**Step 2: Commit**

```bash
git add apps/web/app/settings/page.tsx
git commit -m "feat: add settings page"
```

---

### Task 7.2: Implement GitHub Import

**Files:**

- Create: `convex/github.ts`

**Step 1: Add GitHub repo cloning**

```typescript
// convex/github.ts
import { action } from './_generated/server'
import { v } from 'convex/values'

export const importRepo = action({
  args: { repoUrl: v.string(), projectId: v.id('projects') },
  handler: async (ctx, { repoUrl, projectId }) => {
    // Clone repo and import files
    // Use simple-git or GitHub API
  },
})
```

**Step 2: Commit**

```bash
git add convex/github.ts
git commit -m "feat: add GitHub repo import"
```

---

## Phase 8: Final Integration & Polish

### Task 8.1: Connect All Components

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Integrate all components**

- Workbench with resizable panels
- Chat with streaming
- Artifact panel
- Terminal
- Real-time subscriptions

**Step 2: Test complete flow**

- Create project
- Add/edit files
- Start chat in discuss mode
- Switch to build mode
- Watch agent generate artifacts
- Apply/reject artifacts
- Run commands in terminal
- View real-time updates

**Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/projects/\[projectId\]/page.tsx
git commit -m "feat: integrate all workbench components"
```

---

### Task 8.2: Add Toast Notifications

**Files:**

- Modify: `apps/web/app/layout.tsx`

**Step 1: Add Sonner toast provider**

```typescript
// Add to layout.tsx
import { Toaster } from '@/components/ui/sonner'

// In body:
<Toaster />
```

**Step 2: Use toasts for user feedback**

- File saved
- Artifact applied/rejected
- Command completed
- Errors

**Step 3: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "feat: add toast notifications with sonner"
```

---

## Final Tech Stack Summary

- **Package Manager:** bun with workspaces
- **Framework:** Next.js 16+ with App Router
- **Database:** Convex with real-time subscriptions
- **Streaming:** Vercel AI SDK + Convex HTTP actions
- **UI:** shadcn/ui (button, card, dialog, tabs, tooltip, sonner, resizable,
  skeleton, toggle-group, context-menu)
- **Animations:** Framer Motion
- **Layout:** react-resizable-panels
- **Editor:** CodeMirror 6 (dynamic import, SSR-safe)
- **State:** Zustand (artifact queue)
- **Real-time:** Convex useQuery hooks
- **LLM:** OpenRouter, Together.ai via AI SDK

**Removed:**

- MCP Exa/Context7 integration (not needed)
- Project templates (not needed for small team)

**Added:**

- SSR-safe CodeMirror with dynamic imports
- Resizable panels
- Artifact apply/reject transaction system
- Real-time Convex subscriptions
- Vercel AI SDK for streaming
- bun + Convex verification step

---

**Execution Options:**

1. **Subagent-Driven (this session)** - Dispatch fresh subagent per task
2. **Parallel Session (separate)** - Open new session with executing-plans skill

Which approach would you prefer?
