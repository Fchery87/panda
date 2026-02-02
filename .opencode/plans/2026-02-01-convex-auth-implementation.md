# Convex Authentication with Google OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Replace the mock `mock-user-id` authentication system with real Convex
Auth using Google OAuth, enabling secure user authentication, session
management, and proper access control.

**Architecture:**

- Use `@convex-dev/auth` library for Convex-native authentication
- Implement Google OAuth provider for seamless sign-in
- Update all Convex functions to use real user context from `ctx.auth`
- Add protected routes and authentication middleware in Next.js
- Ensure backward compatibility during migration

**Tech Stack:**

- @convex-dev/auth (Convex authentication library)
- Google OAuth 2.0
- Next.js 16 middleware
- Convex server-side authentication context

---

## Prerequisites

Before starting, ensure you have:

- Google Cloud Console project with OAuth 2.0 credentials
- `CONVEX_SITE_URL` and `CONVEX_DEPLOYMENT_URL` environment variables set
- Admin access to Convex dashboard

---

## Phase 1: Setup & Configuration

### Task 1: Install Convex Auth Dependencies

**Files:**

- Modify: `package.json` (both root and apps/web)
- Create: `.env.local` (if not exists)

**Step 1: Install dependencies**

Run:

```bash
cd /home/nochaserz/Documents/Coding Projects/panda
bun add @convex-dev/auth
bun add -d @types/node
```

Expected: Packages installed successfully

**Step 2: Add environment variables**

Create or modify `apps/web/.env.local`:

```env
# Convex Auth Configuration
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site

# Google OAuth (from Google Cloud Console)
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret

# Convex Auth Secret (generate with: openssl rand -base64 32)
CONVEX_AUTH_SECRET=your-generated-secret-key
```

**Step 3: Commit**

```bash
git add package.json apps/web/.env.local
git commit -m "chore: install convex auth dependencies and configure env"
```

---

### Task 2: Initialize Convex Auth

**Files:**

- Create: `convex/auth.ts`
- Create: `convex/http.ts` (or modify existing)

**Step 1: Create auth configuration file**

Create `convex/auth.ts`:

```typescript
import { convexAuth } from '@convex-dev/auth/server'
import Google from '@convex-dev/auth/providers/Google'

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
})
```

**Step 2: Update HTTP router to include auth routes**

Modify `convex/http.ts` (or create if not exists):

```typescript
import { httpRouter } from 'convex/server'
import { auth } from './auth'

const http = httpRouter()

// Add authentication routes
auth.addHttpRoutes(http)

// ... existing routes ...

export default http
```

**Step 3: Commit**

```bash
git add convex/auth.ts convex/http.ts
git commit -m "feat(auth): initialize convex auth with google oauth"
```

---

### Task 3: Update Schema for Auth

**Files:**

- Modify: `convex/schema.ts`

**Step 1: Add auth tables to schema**

Modify `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

export default defineSchema({
  // Auth tables (users, sessions, etc.)
  ...authTables,

  // 1. Users table - extends auth user with app-specific data
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_tokenIdentifier', ['tokenIdentifier']), // Add this for auth lookup

  // ... rest of existing tables remain the same ...
})
```

**Step 2: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(auth): add auth tables to schema"
```

---

## Phase 2: Update Convex Functions

### Task 4: Create User Management Helpers

**Files:**

- Create: `convex/lib/auth.ts`
- Delete: `getCurrentUserId()` from all files (we'll replace with proper auth)

**Step 1: Create auth helper utilities**

Create `convex/lib/auth.ts`:

```typescript
import { query, mutation } from '../_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'

/**
 * Get the current authenticated user's ID
 * Returns null if not authenticated
 */
export async function getCurrentUserId(ctx: any): Promise<string | null> {
  return await getAuthUserId(ctx)
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(ctx: any): Promise<string> {
  const userId = await getAuthUserId(ctx)
  if (!userId) {
    throw new Error('Unauthorized: Authentication required')
  }
  return userId
}

/**
 * Get or create user profile
 */
export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', args.email))
      .first()

    if (existing) {
      return existing._id
    }

    // Create new user
    return await ctx.db.insert('users', {
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    })
  },
})
```

**Step 2: Commit**

```bash
git add convex/lib/auth.ts
git commit -m "feat(auth): create auth helper utilities"
```

---

### Task 5: Update Projects Convex Functions

**Files:**

- Modify: `convex/projects.ts`

**Step 1: Update imports and replace mock auth**

Modify `convex/projects.ts`:

```typescript
import { query, mutation } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'
import { requireAuth, getCurrentUserId } from './lib/auth'

// REMOVED: export function getCurrentUserId(): string { return 'mock-user-id' }

// list (query) - list all projects for current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)

    if (!userId) {
      return [] // Return empty if not authenticated
    }

    return await ctx.db
      .query('projects')
      .withIndex('by_creator', (q) => q.eq('createdBy', userId))
      .collect()
  },
})

// get (query) - get single project by id
export const get = query({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await getCurrentUserId(ctx)

    if (!userId) {
      return null
    }

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      return null
    }

    return project
  },
})

// create (mutation) - create new project
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx) // Will throw if not authenticated

    const now = Date.now()

    const projectId = await ctx.db.insert('projects', {
      name: args.name,
      description: args.description,
      createdBy: userId, // Now uses real user ID
      createdAt: now,
      lastOpenedAt: now,
      repoUrl: args.repoUrl,
      agentPolicy: null,
    })

    return projectId
  },
})

// update (mutation) - update project name/description
export const update = mutation({
  args: {
    id: v.id('projects'),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    repoUrl: v.optional(v.string()),
    lastOpenedAt: v.optional(v.number()),
    agentPolicy: v.optional(
      v.union(
        v.null(),
        v.object({
          autoApplyFiles: v.boolean(),
          autoRunCommands: v.boolean(),
          allowedCommandPrefixes: v.array(v.string()),
        })
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      throw new Error('Project not found or access denied')
    }

    const updates: Partial<typeof project> = {}

    if (args.name !== undefined) updates.name = args.name
    if (args.description !== undefined) updates.description = args.description
    if (args.repoUrl !== undefined) updates.repoUrl = args.repoUrl
    if (args.lastOpenedAt !== undefined)
      updates.lastOpenedAt = args.lastOpenedAt
    if (args.agentPolicy !== undefined) updates.agentPolicy = args.agentPolicy

    await ctx.db.patch(args.id, updates)

    return args.id
  },
})

// remove (mutation) - delete project and cascade delete related files/chats
export const remove = mutation({
  args: { id: v.id('projects') },
  handler: async (ctx, args) => {
    const userId = await requireAuth(ctx)

    const project = await ctx.db.get(args.id)

    if (!project || project.createdBy !== userId) {
      throw new Error('Project not found or access denied')
    }

    // ... rest of deletion logic remains the same ...

    await ctx.db.delete(args.id)
    return args.id
  },
})
```

**Step 2: Commit**

```bash
git add convex/projects.ts
git commit -m "feat(auth): update projects functions with real authentication"
```

---

### Task 6: Update Remaining Convex Functions

**Files:**

- Modify: `convex/files.ts`
- Modify: `convex/settings.ts`
- Modify: `convex/chats.ts`
- Modify: `convex/messages.ts`
- Modify: `convex/artifacts.ts`
- Modify: `convex/jobs.ts`

**Step 1: Update files.ts**

Replace mock auth with real auth:

```typescript
import { query, mutation, action } from './_generated/server'
import { api } from './_generated/api'
import { v } from 'convex/values'
import JSZip from 'jszip'
import { requireAuth, getCurrentUserId } from './lib/auth'

// Update all functions to use getCurrentUserId(ctx) and requireAuth(ctx)
// Pattern: Replace getCurrentUserId() calls with await getCurrentUserId(ctx)
```

**Step 2: Update settings.ts**

```typescript
import { query, mutation } from './_generated/server'
import { v } from 'convex/values'
import { requireAuth, getCurrentUserId } from './lib/auth'

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    // ... rest of implementation
  },
})

// ... update all other functions similarly
```

**Step 3: Repeat for remaining files**

Apply the same pattern to:

- `convex/chats.ts`
- `convex/messages.ts`
- `convex/artifacts.ts`
- `convex/jobs.ts`

**Step 4: Commit**

```bash
git add convex/files.ts convex/settings.ts convex/chats.ts convex/messages.ts convex/artifacts.ts convex/jobs.ts
git commit -m "feat(auth): update all convex functions with real authentication"
```

---

## Phase 3: Frontend Authentication

### Task 7: Create Authentication Provider

**Files:**

- Create: `apps/web/components/auth/ConvexAuthProvider.tsx`
- Create: `apps/web/components/auth/SignInButton.tsx`
- Create: `apps/web/components/auth/UserMenu.tsx`

**Step 1: Create Convex Auth Provider**

Create `apps/web/components/auth/ConvexAuthProvider.tsx`:

```typescript
'use client'

import { ConvexProviderWithAuth } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import { ReactNode } from 'react'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function ConvexAuthProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} storageKey="panda-auth">
      {children}
    </ConvexProviderWithAuth>
  )
}
```

**Step 2: Create Sign In Button**

Create `apps/web/components/auth/SignInButton.tsx`:

```typescript
'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui/button'
import { Chrome } from 'lucide-react'

export function SignInButton() {
  const { signIn } = useAuthActions()

  return (
    <Button
      onClick={() => signIn('google')}
      className="gap-2 rounded-none font-mono"
      variant="outline"
    >
      <Chrome className="h-4 w-4" />
      Sign in with Google
    </Button>
  )
}
```

**Step 3: Create User Menu**

Create `apps/web/components/auth/UserMenu.tsx`:

```typescript
'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'

export function UserMenu() {
  const { signOut } = useAuthActions()
  const user = useQuery(api.users.getCurrent)

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-none p-0">
          <Avatar className="h-8 w-8 rounded-none">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || user.email} />
            <AvatarFallback className="rounded-none">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none">
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name || 'User'}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <DropdownMenuItem
          onClick={() => signOut()}
          className="rounded-none cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**Step 4: Commit**

```bash
git add apps/web/components/auth/
git commit -m "feat(auth): create authentication components"
```

---

### Task 8: Create Users Query

**Files:**

- Create: `convex/users.ts`

**Step 1: Create user queries**

Create `convex/users.ts`:

```typescript
import { query } from './_generated/server'
import { getCurrentUserId } from './lib/auth'

export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getCurrentUserId(ctx)
    if (!userId) return null

    return await ctx.db.get(userId)
  },
})
```

**Step 2: Commit**

```bash
git add convex/users.ts
git commit -m "feat(auth): add user queries"
```

---

### Task 9: Update Root Layout

**Files:**

- Modify: `apps/web/app/layout.tsx`

**Step 1: Wrap app with auth provider**

Modify `apps/web/app/layout.tsx`:

```typescript
import { ConvexAuthProvider } from '@/components/auth/ConvexAuthProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen font-sans antialiased', fontSans.variable)}>
        <ConvexAuthProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </ConvexAuthProvider>
      </body>
    </html>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/app/layout.tsx
git commit -m "feat(auth): integrate auth provider into root layout"
```

---

### Task 10: Create Protected Route Middleware

**Files:**

- Create: `apps/web/middleware.ts`
- Create: `apps/web/components/auth/ProtectedRoute.tsx`

**Step 1: Create Next.js middleware**

Create `apps/web/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Protect dashboard routes
  if (
    request.nextUrl.pathname.startsWith('/projects') ||
    request.nextUrl.pathname.startsWith('/settings')
  ) {
    // Check for auth cookie/token
    const token = request.cookies.get(' ConvexAuthToken ')?.value

    if (!token) {
      // Redirect to login page
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/projects/:path*', '/settings/:path*'],
}
```

**Step 2: Create ProtectedRoute component**

Create `apps/web/components/auth/ProtectedRoute.tsx`:

```typescript
'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LoadingSpinner } from '@/components/ui/loading'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthActions()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
```

**Step 3: Commit**

```bash
git add apps/web/middleware.ts apps/web/components/auth/ProtectedRoute.tsx
git commit -m "feat(auth): add protected route middleware and component"
```

---

### Task 11: Create Login Page

**Files:**

- Create: `apps/web/app/login/page.tsx`

**Step 1: Create login page**

Create `apps/web/app/login/page.tsx`:

```typescript
'use client'

import { SignInButton } from '@/components/auth/SignInButton'
import { PandaLogo } from '@/components/ui/panda-logo'
import { useAuthActions } from '@convex-dev/auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function LoginPage() {
  const { isAuthenticated } = useAuthActions()
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/projects')
    }
  }, [isAuthenticated, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-4">
      <div className="flex flex-col items-center gap-4">
        <PandaLogo size="lg" />
        <h1 className="text-display text-2xl">Welcome to Panda.ai</h1>
        <p className="text-muted-foreground">
          Sign in to start coding with AI
        </p>
      </div>

      <SignInButton />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "feat(auth): create login page"
```

---

### Task 12: Update Navigation UI

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/page.tsx`
- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Step 1: Add UserMenu to projects page header**

Modify `apps/web/app/(dashboard)/projects/page.tsx`:

```typescript
import { UserMenu } from '@/components/auth/UserMenu'

// In the header section, add:
<div className="flex items-center justify-between">
  <h1 className="text-display text-4xl">Your Work</h1>
  <div className="flex items-center gap-4">
    <UserMenu />
    <CreateProjectDialog onCreate={handleCreateProject} />
  </div>
</div>
```

**Step 2: Wrap dashboard routes with ProtectedRoute**

Modify `apps/web/app/(dashboard)/layout.tsx`:

```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
```

**Step 3: Commit**

```bash
git add apps/web/app/(dashboard)/
git commit -m "feat(auth): protect dashboard routes and add user menu"
```

---

## Phase 4: Testing & Validation

### Task 13: Add Authentication Tests

**Files:**

- Create: `apps/web/components/auth/auth.test.tsx`
- Create: `convex/lib/auth.test.ts`

**Step 1: Test auth helpers**

Create `convex/lib/auth.test.ts`:

```typescript
import { describe, test, expect } from 'bun:test'
import { requireAuth, getCurrentUserId } from './auth'

describe('auth helpers', () => {
  test('requireAuth throws when not authenticated', async () => {
    const mockCtx = { auth: { getUserId: async () => null } }
    await expect(requireAuth(mockCtx)).rejects.toThrow('Unauthorized')
  })

  test('getCurrentUserId returns null when not authenticated', async () => {
    const mockCtx = { auth: { getUserId: async () => null } }
    const result = await getCurrentUserId(mockCtx)
    expect(result).toBeNull()
  })
})
```

**Step 2: Test auth components**

Create `apps/web/components/auth/auth.test.tsx`:

```typescript
import { describe, test, expect } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { SignInButton } from './SignInButton'

describe('SignInButton', () => {
  test('renders Google sign in button', () => {
    render(<SignInButton />)
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument()
  })
})
```

**Step 3: Commit**

```bash
git add convex/lib/auth.test.ts apps/web/components/auth/auth.test.tsx
git commit -m "test(auth): add authentication tests"
```

---

### Task 14: Run Full Validation

**Step 1: Run typecheck**

```bash
cd /home/nochaserz/Documents/Coding Projects/panda/apps/web
bun run typecheck
```

Expected: No TypeScript errors

**Step 2: Run linter**

```bash
bun run lint
```

Expected: No ESLint errors

**Step 3: Run tests**

```bash
bun test
```

Expected: All tests pass

**Step 4: Deploy Convex changes**

```bash
cd /home/nochaserz/Documents/Coding Projects/panda
bunx convex deploy
```

Expected: Deployment successful

---

## Phase 5: Documentation

### Task 15: Update Documentation

**Files:**

- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Add authentication section to README**

Add to `README.md`:

````markdown
## Authentication

Panda.ai uses Convex Auth with Google OAuth for authentication.

### Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Configure OAuth 2.0 credentials
3. Add authorized redirect URI:
   `https://your-deployment.convex.site/api/auth/callback/google`
4. Copy client ID and secret to `.env.local`

### Environment Variables

```env
AUTH_GOOGLE_ID=your-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-client-secret
CONVEX_AUTH_SECRET=your-random-secret
```
````

````

**Step 2: Update AGENTS.md auth section**

Modify `AGENTS.md` to remove references to `mock-user-id` and document the new auth system.

**Step 3: Commit**

```bash
git add README.md AGENTS.md
git commit -m "docs(auth): update documentation for new authentication system"
````

---

## Summary

This implementation plan provides:

1. **Complete authentication system** using Convex Auth with Google OAuth
2. **Secure user management** with real user IDs instead of mock data
3. **Protected routes** with middleware and components
4. **User profile management** with avatar and name support
5. **Full test coverage** for authentication logic
6. **Documentation updates** for developers

**Expected Timeline:** 3-4 days (8-12 hours)

**Key Deliverables:**

- Users can sign in with Google
- All data is properly user-scoped
- Routes are protected from unauthenticated access
- Mock auth code is completely removed
- All tests updated and passing

---

## Post-Implementation Checklist

- [ ] Google OAuth configured in Google Cloud Console
- [ ] Environment variables set in production
- [ ] Convex deployed with new schema
- [ ] All `mock-user-id` references removed
- [ ] TypeScript compilation passes
- [ ] All tests passing
- [ ] Manual testing completed (sign in, sign out, access control)
- [ ] Documentation updated
- [ ] Team members can authenticate successfully
