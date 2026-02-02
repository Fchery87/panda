# Convex Real-Time Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Add real-time collaboration features including multi-user cursors,
live presence indicators, user avatars, shared cursors, and collaborative
editing using Convex's real-time subscriptions.

**Architecture:**

- Use Convex real-time queries (`useQuery`) for live data synchronization
- Implement presence system using Convex's reactive subscriptions
- Use Yjs for operational transform-based collaborative text editing
- Add cursor tracking via mouse position events broadcast through Convex
- Implement user presence with heartbeat pattern

**Tech Stack:**

- Convex real-time subscriptions
- Yjs (CRDT library for collaborative editing)
- Socket.io or Convex internal channels for cursor sync
- Framer Motion for smooth cursor animations
- Radix UI Avatar components

---

## Prerequisites

Before starting:

- Authentication system must be implemented (users need identities)
- Basic project structure must be stable
- Team understands real-time data flow patterns

---

## Phase 1: Presence System Foundation

### Task 1: Create Presence Schema

**Files:**

- Modify: `convex/schema.ts`

**Step 1: Add presence table to schema**

Modify `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ... existing tables ...

  // 10. Presence table - real-time user presence
  presence: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),
    status: v.union(
      v.literal('online'),
      v.literal('away'),
      v.literal('offline')
    ),
    cursor: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        filePath: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
    selection: v.optional(
      v.object({
        filePath: v.string(),
        startLine: v.number(),
        startColumn: v.number(),
        endLine: v.number(),
        endColumn: v.number(),
      })
    ),
    lastSeenAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_user_project', ['userId', 'projectId'])
    .index('by_last_seen', ['lastSeenAt']),

  // 11. Activity table - recent user actions
  activity: defineTable({
    userId: v.id('users'),
    projectId: v.id('projects'),
    type: v.union(
      v.literal('file_edit'),
      v.literal('file_create'),
      v.literal('file_delete'),
      v.literal('chat_message'),
      v.literal('command_run'),
      v.literal('cursor_move')
    ),
    data: v.optional(v.record(v.string(), v.any())),
    createdAt: v.number(),
  })
    .index('by_project', ['projectId'])
    .index('by_project_time', ['projectId', 'createdAt']),
})
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(realtime): add presence and activity tables to schema"
```

---

### Task 2: Create Presence Convex Functions

**Files:**

- Create: `convex/presence.ts`

**Step 1: Implement presence queries and mutations**

Create `convex/presence.ts`:

```typescript
import { query, mutation, internalMutation } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'
import { requireAuth, getCurrentUserId } from './lib/auth'

// Get all active users in a project
export const list = query({
  args: { projectId: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000

    return await ctx.db
      .query('presence')
      .withIndex('by_project', (q) => q.eq('projectId', args.projectId))
      .filter((q) => q.gte('lastSeenAt', fiveMinutesAgo))
      .collect()
  },
})

// Update user presence
export const update = mutation({
  args: {
    projectId: v.id('projects'),
    status: v.union(
      v.literal('online'),
      v.literal('away'),
      v.literal('offline')
    ),
    cursor: v.optional(
      v.object({
        x: v.number(),
        y: v.number(),
        filePath: v.optional(v.string()),
        timestamp: v.number(),
      })
    ),
    selection: v.optional(
      v.object({
        filePath: v.string(),
        startLine: v.number(),
        startColumn: v.number(),
        endLine: v.number(),
        endColumn: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    // Check if presence record exists
    const existing = await ctx.db
      .query('presence')
      .withIndex('by_user_project', (q) =>
        q.eq('userId', userId).eq('projectId', args.projectId)
      )
      .first()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        cursor: args.cursor,
        selection: args.selection,
        lastSeenAt: now,
      })
      return existing._id
    } else {
      return await ctx.db.insert('presence', {
        userId,
        projectId: args.projectId,
        status: args.status,
        cursor: args.cursor,
        selection: args.selection,
        lastSeenAt: now,
      })
    }
  },
})

// Update cursor position only (lightweight)
export const updateCursor = mutation({
  args: {
    projectId: v.id('projects'),
    cursor: v.object({
      x: v.number(),
      y: v.number(),
      filePath: v.optional(v.string()),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const existing = await ctx.db
      .query('presence')
      .withIndex('by_user_project', (q) =>
        q.eq('userId', userId).eq('projectId', args.projectId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        cursor: args.cursor,
        lastSeenAt: Date.now(),
      })
    }
  },
})

// Heartbeat to keep presence alive
export const heartbeat = mutation({
  args: {
    projectId: v.id('projects'),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const existing = await ctx.db
      .query('presence')
      .withIndex('by_user_project', (q) =>
        q.eq('userId', userId).eq('projectId', args.projectId)
      )
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenAt: Date.now(),
      })
    }
  },
})

// Cleanup old presence records (scheduled)
export const cleanup = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000

    const oldRecords = await ctx.db
      .query('presence')
      .withIndex('by_last_seen', (q) => q.lt('lastSeenAt', tenMinutesAgo))
      .collect()

    for (const record of oldRecords) {
      await ctx.db.delete(record._id)
    }

    return oldRecords.length
  },
})
```

**Step 2: Commit**

```bash
git add convex/presence.ts
git commit -m "feat(realtime): implement presence convex functions"
```

---

### Task 3: Create Activity Tracking Functions

**Files:**

- Create: `convex/activity.ts`

**Step 1: Implement activity tracking**

Create `convex/activity.ts`:

```typescript
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getCurrentUserId } from './lib/auth'

// Get recent activity in a project
export const list = query({
  args: {
    projectId: v.id('projects'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return []

    const limit = args.limit ?? 50

    return await ctx.db
      .query('activity')
      .withIndex('by_project_time', (q) => q.eq('projectId', args.projectId))
      .order('desc')
      .take(limit)
  },
})

// Record an activity
export const record = mutation({
  args: {
    projectId: v.id('projects'),
    type: v.union(
      v.literal('file_edit'),
      v.literal('file_create'),
      v.literal('file_delete'),
      v.literal('chat_message'),
      v.literal('command_run'),
      v.literal('cursor_move')
    ),
    data: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    return await ctx.db.insert('activity', {
      userId,
      projectId: args.projectId,
      type: args.type,
      data: args.data,
      createdAt: Date.now(),
    })
  },
})
```

**Step 2: Commit**

```bash
git add convex/activity.ts
git commit -m "feat(realtime): add activity tracking functions"
```

---

## Phase 2: Real-Time UI Components

### Task 4: Create Presence Hook

**Files:**

- Create: `apps/web/hooks/usePresence.ts`

**Step 1: Implement presence hook**

Create `apps/web/hooks/usePresence.ts`:

```typescript
'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

interface CursorPosition {
  x: number
  y: number
  filePath?: string
}

interface PresenceUser {
  userId: Id<'users'>
  status: 'online' | 'away' | 'offline'
  cursor?: CursorPosition
  lastSeenAt: number
}

export function usePresence(projectId: Id<'projects'>) {
  // Subscribe to other users' presence
  const otherUsers = useQuery(api.presence.list, { projectId }) as
    | PresenceUser[]
    | undefined

  // Mutations
  const updatePresence = useMutation(api.presence.update)
  const updateCursor = useMutation(api.presence.updateCursor)
  const heartbeat = useMutation(api.presence.heartbeat)

  // Heartbeat interval
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Send heartbeat every 30 seconds
    heartbeatInterval.current = setInterval(() => {
      heartbeat({ projectId })
    }, 30000)

    return () => {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current)
      }
    }
  }, [projectId, heartbeat])

  // Set user as online when entering project
  useEffect(() => {
    updatePresence({
      projectId,
      status: 'online',
    })

    // Set offline when leaving
    return () => {
      updatePresence({
        projectId,
        status: 'offline',
      })
    }
  }, [projectId, updatePresence])

  // Broadcast cursor position
  const broadcastCursor = useCallback(
    (cursor: CursorPosition) => {
      updateCursor({
        projectId,
        cursor: {
          ...cursor,
          timestamp: Date.now(),
        },
      })
    },
    [projectId, updateCursor]
  )

  // Set away status
  const setAway = useCallback(() => {
    updatePresence({
      projectId,
      status: 'away',
    })
  }, [projectId, updatePresence])

  // Set online status
  const setOnline = useCallback(() => {
    updatePresence({
      projectId,
      status: 'online',
    })
  }, [projectId, updatePresence])

  return {
    otherUsers: otherUsers || [],
    broadcastCursor,
    setAway,
    setOnline,
  }
}

export default usePresence
```

**Step 2: Commit**

```bash
git add apps/web/hooks/usePresence.ts
git commit -m "feat(realtime): create presence hook"
```

---

### Task 5: Create Activity Feed Hook

**Files:**

- Create: `apps/web/hooks/useActivity.ts`

**Step 1: Implement activity hook**

Create `apps/web/hooks/useActivity.ts`:

```typescript
'use client'

import { useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'

type ActivityType =
  | 'file_edit'
  | 'file_create'
  | 'file_delete'
  | 'chat_message'
  | 'command_run'
  | 'cursor_move'

interface Activity {
  userId: Id<'users'>
  type: ActivityType
  data?: Record<string, any>
  createdAt: number
}

export function useActivity(projectId: Id<'projects'>, limit?: number) {
  // Subscribe to activity feed
  const activities = useQuery(api.activity.list, { projectId, limit }) as
    | Activity[]
    | undefined

  // Record activity
  const recordActivity = useMutation(api.activity.record)

  const record = useCallback(
    async (type: ActivityType, data?: Record<string, any>) => {
      await recordActivity({
        projectId,
        type,
        data,
      })
    },
    [projectId, recordActivity]
  )

  return {
    activities: activities || [],
    record,
  }
}

export default useActivity
```

**Step 2: Commit**

```bash
git add apps/web/hooks/useActivity.ts
git commit -m "feat(realtime): create activity feed hook"
```

---

### Task 6: Create User Avatars Component

**Files:**

- Create: `apps/web/components/presence/UserAvatars.tsx`

**Step 1: Create user avatars component**

Create `apps/web/components/presence/UserAvatars.tsx`:

```typescript
'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface UserAvatarsProps {
  projectId: Id<'projects'>
  maxAvatars?: number
  className?: string
}

interface PresenceUser {
  userId: Id<'users'>
  status: 'online' | 'away' | 'offline'
  lastSeenAt: number
}

export function UserAvatars({
  projectId,
  maxAvatars = 5,
  className,
}: UserAvatarsProps) {
  const users = useQuery(
    api.presence.list,
    { projectId }
  ) as PresenceUser[] | undefined

  const userDetails = useQuery(
    api.users.listByIds,
    {
      userIds: users?.map(u => u.userId) || []
    }
  ) as Array<{
    _id: Id<'users'>
    name?: string
    email: string
    avatarUrl?: string
  }> | undefined

  if (!users || users.length === 0) {
    return null
  }

  const visibleUsers = users.slice(0, maxAvatars)
  const remainingCount = users.length - maxAvatars

  return (
    <TooltipProvider>
      <div className={cn('flex -space-x-2', className)}>
        {visibleUsers.map((user) => {
          const details = userDetails?.find(d => d._id === user.userId)
          const initials = details?.name
            ? details.name.split(' ').map(n => n[0]).join('').toUpperCase()
            : details?.email[0].toUpperCase() || 'U'

          return (
            <Tooltip key={user.userId}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar
                    className={cn(
                      'h-8 w-8 rounded-none border-2 border-background',
                      user.status === 'online' && 'ring-2 ring-green-500',
                      user.status === 'away' && 'ring-2 ring-yellow-500',
                      user.status === 'offline' && 'opacity-50'
                    )}
                  >
                    <AvatarImage
                      src={details?.avatarUrl}
                      alt={details?.name || details?.email}
                    />
                    <AvatarFallback className="rounded-none text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent className="rounded-none">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {details?.name || details?.email}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">
                    {user.status}
                  </span>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}

        {remainingCount > 0 && (
          <div className="flex h-8 w-8 items-center justify-center rounded-none border-2 border-background bg-muted text-xs font-medium">
            +{remainingCount}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
```

**Step 2: Create users list query**

Add to `convex/users.ts`:

```typescript
export const listByIds = query({
  args: {
    userIds: v.array(v.id('users')),
  },
  handler: async (ctx, args) => {
    const users = []
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId)
      if (user) {
        users.push(user)
      }
    }
    return users
  },
})
```

**Step 3: Commit**

```bash
git add apps/web/components/presence/UserAvatars.tsx
git add convex/users.ts
git commit -m "feat(realtime): create user avatars component"
```

---

### Task 7: Create Cursor Overlay Component

**Files:**

- Create: `apps/web/components/presence/CursorOverlay.tsx`

**Step 1: Create cursor overlay component**

Create `apps/web/components/presence/CursorOverlay.tsx`:

```typescript
'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import type { Id } from '@convex/_generated/dataModel'
import { usePresence } from '@/hooks/usePresence'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

interface Cursor {
  userId: Id<'users'>
  x: number
  y: number
  color: string
  name: string
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B739', '#52C4B0',
]

interface CursorOverlayProps {
  projectId: Id<'projects'>
  containerRef: React.RefObject<HTMLElement>
}

export function CursorOverlay({ projectId, containerRef }: CursorOverlayProps) {
  const { otherUsers, broadcastCursor } = usePresence(projectId)
  const [cursors, setCursors] = useState<Cursor[]>([])

  // Get user details for cursors
  const userDetails = useQuery(
    api.users.listByIds,
    {
      userIds: otherUsers
        .filter(u => u.cursor)
        .map(u => u.userId),
    }
  )

  // Update cursor positions
  useEffect(() => {
    const newCursors = otherUsers
      .filter(user => user.cursor)
      .map((user, index) => {
        const details = userDetails?.find(d => d._id === user.userId)
        return {
          userId: user.userId,
          x: user.cursor!.x,
          y: user.cursor!.y,
          color: CURSOR_COLORS[index % CURSOR_COLORS.length],
          name: details?.name || details?.email || 'Unknown',
        }
      })

    setCursors(newCursors)
  }, [otherUsers, userDetails])

  // Track mouse movement
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      broadcastCursor({ x, y })
    },
    [broadcastCursor, containerRef]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('mousemove', handleMouseMove)
    return () => container.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove, containerRef])

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      {cursors.map((cursor) => (
        <motion.div
          key={cursor.userId}
          className="absolute"
          initial={{ x: cursor.x, y: cursor.y }}
          animate={{ x: cursor.x, y: cursor.y }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            style={{ color: cursor.color }}
          >
            <path
              d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87c.44 0 .66-.53.35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
              fill="currentColor"
              stroke="white"
              strokeWidth="1"
            />
          </svg>
          <div
            className="absolute left-4 top-4 rounded-none px-2 py-1 text-xs font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.name}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/presence/CursorOverlay.tsx
git commit -m "feat(realtime): create cursor overlay component"
```

---

## Phase 3: Collaborative Editing

### Task 8: Setup Yjs Integration

**Files:**

- Install: yjs, y-websocket, @yjs/react
- Create: `apps/web/lib/collaboration/yjs-provider.ts`
- Create: `apps/web/components/editor/CollaborativeEditor.tsx`

**Step 1: Install Yjs dependencies**

```bash
cd /home/nochaserz/Documents/Coding Projects/panda/apps/web
bun add yjs y-websocket @yjs/react y-codemirror.next
```

**Step 2: Create Yjs provider**

Create `apps/web/lib/collaboration/yjs-provider.ts`:

```typescript
import * as Y from 'yjs'
import { ConvexProvider } from './convex-yjs-provider'
import type { Id } from '@convex/_generated/dataModel'

interface YjsProviderOptions {
  projectId: Id<'projects'>
  fileId: string
  userId: string
  userName: string
}

export class CollaborationProvider {
  private doc: Y.Doc
  private provider: ConvexProvider
  private text: Y.Text

  constructor(options: YjsProviderOptions) {
    this.doc = new Y.Doc()
    this.text = this.doc.getText('content')

    // Initialize Convex Yjs provider
    this.provider = new ConvexProvider(
      `project-${options.projectId}-file-${options.fileId}`,
      this.doc,
      {
        userId: options.userId,
        userName: options.userName,
      }
    )
  }

  getText(): Y.Text {
    return this.text
  }

  getContent(): string {
    return this.text.toString()
  }

  setContent(content: string): void {
    this.doc.transact(() => {
      this.text.delete(0, this.text.length)
      this.text.insert(0, content)
    })
  }

  onChange(callback: (content: string) => void): () => void {
    const observer = () => {
      callback(this.text.toString())
    }
    this.text.observe(observer)
    return () => this.text.unobserve(observer)
  }

  destroy(): void {
    this.provider.destroy()
    this.doc.destroy()
  }
}
```

**Step 3: Create Convex Yjs provider**

Create `apps/web/lib/collaboration/convex-yjs-provider.ts`:

```typescript
import * as Y from 'yjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

interface ConvexProviderOptions {
  userId: string
  userName: string
}

export class ConvexProvider {
  private doc: Y.Doc
  private roomId: string
  private options: ConvexProviderOptions
  private awareness: Map<string, any>

  constructor(roomId: string, doc: Y.Doc, options: ConvexProviderOptions) {
    this.roomId = roomId
    this.doc = doc
    this.options = options
    this.awareness = new Map()

    this.setupSync()
  }

  private setupSync(): void {
    // Subscribe to document updates from other users
    // This is a simplified version - real implementation would use
    // Convex real-time subscriptions for Yjs updates

    // For now, we'll use periodic sync
    setInterval(() => {
      this.syncDocument()
    }, 1000)
  }

  private async syncDocument(): Promise<void> {
    // Get current state vector
    const stateVector = Y.encodeStateAsUpdate(this.doc)

    // Send to server (would be a Convex mutation)
    // await convex.mutation(api.collaboration.syncDocument, {
    //   roomId: this.roomId,
    //   update: Array.from(stateVector),
    // })
  }

  setAwarenessField(field: string, value: any): void {
    this.awareness.set(field, value)
    this.broadcastAwareness()
  }

  private broadcastAwareness(): void {
    // Broadcast awareness data to other users
  }

  destroy(): void {
    // Cleanup
  }
}
```

**Step 4: Commit**

```bash
git add apps/web/lib/collaboration/
git commit -m "feat(realtime): setup Yjs for collaborative editing"
```

---

### Task 9: Create Collaborative Editor

**Files:**

- Create: `apps/web/components/editor/CollaborativeEditor.tsx`

**Step 1: Create collaborative editor component**

Create `apps/web/components/editor/CollaborativeEditor.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import type { Id } from '@convex/_generated/dataModel'
import { CollaborationProvider } from '@/lib/collaboration/yjs-provider'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

interface CollaborativeEditorProps {
  projectId: Id<'projects'>
  fileId: string
  filePath: string
  initialContent: string
  onSave: (content: string) => void
}

export function CollaborativeEditor({
  projectId,
  fileId,
  filePath,
  initialContent,
  onSave,
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent)
  const collaborationRef = useRef<CollaborationProvider | null>(null)
  const user = useQuery(api.users.getCurrent)

  // Initialize collaboration
  useEffect(() => {
    if (!user) return

    collaborationRef.current = new CollaborationProvider({
      projectId,
      fileId,
      userId: user._id,
      userName: user.name || user.email,
    })

    // Set initial content
    collaborationRef.current.setContent(initialContent)

    // Listen for changes
    const unsubscribe = collaborationRef.current.onChange((newContent) => {
      setContent(newContent)
    })

    return () => {
      unsubscribe()
      collaborationRef.current?.destroy()
    }
  }, [projectId, fileId, initialContent, user])

  const handleChange = (value: string) => {
    setContent(value)
    // Update collaboration doc
    collaborationRef.current?.setContent(value)
  }

  const handleSave = () => {
    onSave(content)
  }

  return (
    <div className="relative h-full w-full">
      <CodeMirror
        value={content}
        height="100%"
        theme={oneDark}
        extensions={[javascript()]}
        onChange={handleChange}
        onBlur={handleSave}
        className="h-full"
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/components/editor/CollaborativeEditor.tsx
git commit -m "feat(realtime): create collaborative editor component"
```

---

## Phase 4: Integration

### Task 10: Update Workbench with Real-Time Features

**Files:**

- Modify: `apps/web/components/workbench/Workbench.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Integrate presence into workbench**

Modify `apps/web/components/workbench/Workbench.tsx`:

```typescript
import { useRef } from 'react'
import { UserAvatars } from '@/components/presence/UserAvatars'
import { CursorOverlay } from '@/components/presence/CursorOverlay'

export function Workbench({
  projectId,
  files,
  selectedFilePath,
  // ... other props
}: WorkbenchProps) {
  const workbenchRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={workbenchRef} className="surface-0 h-full w-full relative">
      <CursorOverlay
        projectId={projectId}
        containerRef={workbenchRef}
      />

      {/* Existing workbench content */}
      <PanelGroup direction="horizontal" className="h-full">
        {/* ... */}
      </PanelGroup>
    </div>
  )
}
```

**Step 2: Add user avatars to project header**

Modify `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`:

```typescript
import { UserAvatars } from '@/components/presence/UserAvatars'

// In the top bar:
<div className="flex items-center gap-4">
  {/* ... existing items ... */}
  <UserAvatars projectId={projectId} maxAvatars={5} />
</div>
```

**Step 3: Commit**

```bash
git add apps/web/components/workbench/Workbench.tsx
git add apps/web/app/(dashboard)/projects/[projectId]/page.tsx
git commit -m "feat(realtime): integrate presence features into workbench"
```

---

### Task 11: Create Activity Feed Panel

**Files:**

- Create: `apps/web/components/presence/ActivityFeed.tsx`

**Step 1: Create activity feed component**

Create `apps/web/components/presence/ActivityFeed.tsx`:

```typescript
'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { motion, AnimatePresence } from 'framer-motion'
import { FileEdit, MessageSquare, Terminal, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ActivityFeedProps {
  projectId: Id<'projects'>
  className?: string
}

type ActivityType =
  | 'file_edit'
  | 'file_create'
  | 'file_delete'
  | 'chat_message'
  | 'command_run'
  | 'cursor_move'

interface Activity {
  userId: Id<'users'>
  type: ActivityType
  data?: Record<string, any>
  createdAt: number
}

const ACTIVITY_ICONS = {
  file_edit: FileEdit,
  file_create: FileEdit,
  file_delete: FileEdit,
  chat_message: MessageSquare,
  command_run: Terminal,
  cursor_move: User,
}

const ACTIVITY_LABELS = {
  file_edit: 'edited',
  file_create: 'created',
  file_delete: 'deleted',
  chat_message: 'messaged',
  command_run: 'ran command',
  cursor_move: 'is viewing',
}

export function ActivityFeed({ projectId, className }: ActivityFeedProps) {
  const activities = useQuery(
    api.activity.list,
    { projectId, limit: 20 }
  ) as Activity[] | undefined

  const userDetails = useQuery(
    api.users.listByIds,
    {
      userIds: activities?.map(a => a.userId) || [],
    }
  )

  if (!activities || activities.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        No recent activity
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <AnimatePresence initial={false}>
        {activities.map((activity, index) => {
          const user = userDetails?.find(u => u._id === activity.userId)
          const Icon = ACTIVITY_ICONS[activity.type]
          const label = ACTIVITY_LABELS[activity.type]
          const timeAgo = formatDistanceToNow(activity.createdAt, {
            addSuffix: true,
          })

          return (
            <motion.div
              key={`${activity.userId}-${activity.createdAt}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 text-sm"
            >
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-medium">
                {user?.name || user?.email || 'Unknown'}
              </span>
              <span className="text-muted-foreground">{label}</span>
              {activity.data?.filePath && (
                <span className="font-mono text-xs text-primary">
                  {activity.data.filePath}
                </span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {timeAgo}
              </span>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Add activity feed to sidebar**

Modify `apps/web/components/workbench/Workbench.tsx`:

```typescript
import { ActivityFeed } from '@/components/presence/ActivityFeed'

// In the Explorer panel or add a new panel:
<div className="panel-header" data-number="04">
  <span>Activity</span>
</div>
<div className="flex-1 overflow-auto p-2">
  <ActivityFeed projectId={projectId} />
</div>
```

**Step 3: Commit**

```bash
git add apps/web/components/presence/ActivityFeed.tsx
git add apps/web/components/workbench/Workbench.tsx
git commit -m "feat(realtime): add activity feed panel"
```

---

## Phase 5: Testing & Optimization

### Task 12: Test Real-Time Features

**Files:**

- Create: `apps/web/hooks/usePresence.test.ts`
- Create: `apps/web/components/presence/UserAvatars.test.tsx`
- Create: `convex/presence.test.ts`

**Step 1: Test presence hook**

Create `apps/web/hooks/usePresence.test.ts`:

```typescript
import { describe, test, expect, mock, beforeEach } from 'bun:test'
import { renderHook, act } from '@testing-library/react'
import { usePresence } from './usePresence'

describe('usePresence', () => {
  beforeEach(() => {
    // Reset mocks
  })

  test('returns other users list', () => {
    const { result } = renderHook(() => usePresence('projects-1' as any))

    expect(result.current.otherUsers).toBeDefined()
    expect(Array.isArray(result.current.otherUsers)).toBe(true)
  })

  test('provides broadcastCursor function', () => {
    const { result } = renderHook(() => usePresence('projects-1' as any))

    expect(typeof result.current.broadcastCursor).toBe('function')
  })

  test('provides setAway function', () => {
    const { result } = renderHook(() => usePresence('projects-1' as any))

    expect(typeof result.current.setAway).toBe('function')
  })
})
```

**Step 2: Test presence Convex functions**

Create `convex/presence.test.ts`:

```typescript
import { describe, test, expect, beforeEach } from 'bun:test'
import { list, update, updateCursor, heartbeat } from './presence'
import { createMockQueryCtx, createMockMutationCtx } from './lib/test-helpers'

describe('presence queries', () => {
  let ctx: ReturnType<typeof createMockQueryCtx>
  let projectId: string
  let userId: string

  beforeEach(async () => {
    ctx = createMockQueryCtx()
    userId = 'users-1'
    projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      createdBy: userId,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    })
  })

  describe('list', () => {
    test('returns active users in project', async () => {
      // Create presence records
      await ctx.db.insert('presence', {
        userId,
        projectId,
        status: 'online',
        lastSeenAt: Date.now(),
      })

      const result = await list(ctx, { projectId })
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('online')
    })

    test('filters out stale presence records', async () => {
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000

      await ctx.db.insert('presence', {
        userId,
        projectId,
        status: 'online',
        lastSeenAt: tenMinutesAgo,
      })

      const result = await list(ctx, { projectId })
      expect(result).toHaveLength(0)
    })
  })
})

describe('presence mutations', () => {
  let ctx: ReturnType<typeof createMockMutationCtx>
  let projectId: string
  let userId: string

  beforeEach(async () => {
    ctx = createMockMutationCtx()
    userId = 'users-1'
    projectId = await ctx.db.insert('projects', {
      name: 'Test Project',
      createdBy: userId,
      createdAt: Date.now(),
      lastOpenedAt: Date.now(),
    })
  })

  describe('update', () => {
    test('creates new presence record', async () => {
      const result = await update(ctx, {
        projectId,
        status: 'online',
      })

      expect(result).toBeDefined()
      const presence = await ctx.db.get('presence', result)
      expect(presence.status).toBe('online')
    })

    test('updates existing presence record', async () => {
      const existingId = await ctx.db.insert('presence', {
        userId,
        projectId,
        status: 'away',
        lastSeenAt: Date.now(),
      })

      await update(ctx, {
        projectId,
        status: 'online',
      })

      const presence = await ctx.db.get('presence', existingId)
      expect(presence.status).toBe('online')
    })
  })

  describe('updateCursor', () => {
    test('updates cursor position', async () => {
      await ctx.db.insert('presence', {
        userId,
        projectId,
        status: 'online',
        lastSeenAt: Date.now(),
      })

      await updateCursor(ctx, {
        projectId,
        cursor: {
          x: 100,
          y: 200,
          timestamp: Date.now(),
        },
      })

      const presence = await ctx.db
        .query('presence')
        .filter((q) => q.eq('userId', userId))
        .first()

      expect(presence?.cursor?.x).toBe(100)
      expect(presence?.cursor?.y).toBe(200)
    })
  })
})
```

**Step 3: Commit**

```bash
git add apps/web/hooks/usePresence.test.ts
git add apps/web/components/presence/UserAvatars.test.tsx
git add convex/presence.test.ts
git commit -m "test(realtime): add tests for real-time features"
```

---

### Task 13: Optimize Performance

**Files:**

- Modify: `apps/web/hooks/usePresence.ts`
- Modify: `convex/presence.ts`

**Step 1: Optimize cursor update frequency**

Modify `apps/web/hooks/usePresence.ts`:

```typescript
import { useCallback, useRef } from 'react'
import { throttle } from 'lodash-es'

export function usePresence(projectId: Id<'projects'>) {
  // ... existing code ...

  // Throttle cursor updates to 30fps max
  const throttledBroadcastCursor = useCallback(
    throttle((cursor: CursorPosition) => {
      broadcastCursor(cursor)
    }, 33), // ~30fps
    [broadcastCursor]
  )

  return {
    otherUsers,
    broadcastCursor: throttledBroadcastCursor,
    // ...
  }
}
```

**Step 2: Add cursor update rate limiting on server**

Modify `convex/presence.ts`:

```typescript
export const updateCursor = mutation({
  args: {
    projectId: v.id('projects'),
    cursor: v.object({
      x: v.number(),
      y: v.number(),
      filePath: v.optional(v.string()),
      timestamp: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const existing = await ctx.db
      .query('presence')
      .withIndex('by_user_project', (q) =>
        q.eq('userId', userId).eq('projectId', args.projectId)
      )
      .first()

    if (!existing) return

    // Rate limit: only update if last update was >50ms ago
    const now = Date.now()
    if (existing.lastSeenAt && now - existing.lastSeenAt < 50) {
      return
    }

    await ctx.db.patch(existing._id, {
      cursor: args.cursor,
      lastSeenAt: now,
    })
  },
})
```

**Step 3: Commit**

```bash
bun add lodash-es
bun add -d @types/lodash-es
```

```bash
git add apps/web/hooks/usePresence.ts
git add convex/presence.ts
git commit -m "perf(realtime): optimize cursor update frequency"
```

---

## Summary

This implementation plan provides:

1. **Presence System**: Real-time user tracking with cursors, status, and
   activity
2. **User Avatars**: Visual indicator of active users with status
3. **Cursor Tracking**: Live cursor positions of other users
4. **Activity Feed**: Real-time stream of user actions
5. **Collaborative Editing**: Yjs-based operational transform editing
6. **Performance Optimizations**: Throttled updates, rate limiting

**Expected Timeline:** 1-2 weeks

**Key Deliverables:**

- Users see who else is online
- Live cursor positions displayed
- Activity feed shows recent actions
- Collaborative editing (if implemented)
- Optimized performance

---

## Post-Implementation Checklist

- [ ] Presence updates work in real-time
- [ ] Cursor tracking is smooth (30fps)
- [ ] User avatars display correctly
- [ ] Activity feed updates live
- [ ] Collaborative editing works (if implemented)
- [ ] Performance is optimized (no lag)
- [ ] Tests pass
- [ ] Documentation updated

---

## Usage Example

```typescript
// In a component:
import { usePresence } from '@/hooks/usePresence'
import { UserAvatars } from '@/components/presence/UserAvatars'
import { CursorOverlay } from '@/components/presence/CursorOverlay'

function ProjectPage({ projectId }) {
  const { otherUsers, broadcastCursor } = usePresence(projectId)

  return (
    <div>
      <UserAvatars projectId={projectId} />
      <CursorOverlay projectId={projectId} containerRef={containerRef} />
      {/* ... rest of component */}
    </div>
  )
}
```
