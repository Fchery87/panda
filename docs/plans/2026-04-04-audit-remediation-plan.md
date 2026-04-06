# Frontend Audit Remediation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Fix all P0 and P1 findings from the Panda frontend audit, plus
high-value P2 fixes that are small effort.

**Architecture:** Add Next.js error/not-found/loading boundary files at key
route segments, fix broken state wiring in workbench, add confirmation dialogs
for dangerous admin actions, add page-level SEO metadata, and fix the shared
chat component architecture.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, Convex, Framer
Motion, Lucide icons.

**Source audit:**
`.gemini/antigravity/brain/56419bab-1b5a-4539-960d-860e6879a33e/panda_codebase_audit.md.resolved`

---

## Batch 1: P0 — Error Boundaries & Not-Found Pages

### Task 1: Global `error.tsx` (root fallback)

**Files:**

- Create: `apps/web/app/error.tsx`

**Step 1: Create the global error boundary**

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <PandaLogo size="lg" />
      <div className="space-y-2">
        <h1 className="font-mono text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-none font-mono">
          Try Again
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => (window.location.href = '/')}
        >
          Go Home
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Verify it renders**

Run: `cd apps/web && npx next build 2>&1 | head -20` Expected: No build errors
related to error.tsx

**Step 3: Commit**

```bash
git add apps/web/app/error.tsx
git commit -m "feat: add global error.tsx boundary"
```

---

### Task 2: Global `not-found.tsx`

**Files:**

- Create: `apps/web/app/not-found.tsx`

**Step 1: Create the global not-found page**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <PandaLogo size="lg" />
      <div className="space-y-2">
        <h1 className="font-mono text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link href="/">
        <Button className="rounded-none font-mono">Go Home</Button>
      </Link>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/app/not-found.tsx
git commit -m "feat: add global not-found.tsx page"
```

---

### Task 3: Dashboard `error.tsx` and `not-found.tsx`

**Files:**

- Create: `apps/web/app/(dashboard)/error.tsx`
- Create: `apps/web/app/(dashboard)/not-found.tsx`

**Step 1: Create dashboard error boundary**

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="space-y-2">
        <h2 className="font-mono text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          An error occurred while loading this page.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-none font-mono">
          Try Again
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => (window.location.href = '/projects')}
        >
          Back to Projects
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Create dashboard not-found**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="space-y-2">
        <h2 className="font-mono text-xl font-bold">Not found</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          This page doesn't exist or you don't have access.
        </p>
      </div>
      <Link href="/projects">
        <Button className="rounded-none font-mono">Back to Projects</Button>
      </Link>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add apps/web/app/\(dashboard\)/error.tsx apps/web/app/\(dashboard\)/not-found.tsx
git commit -m "feat: add dashboard error and not-found boundaries"
```

---

### Task 4: Workbench `error.tsx`

**Files:**

- Create: `apps/web/app/(dashboard)/projects/[projectId]/error.tsx`

**Step 1: Create workbench error boundary**

This is the most complex page — most likely to error. Needs its own boundary so
a crash doesn't take out the whole dashboard layout.

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function WorkbenchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Workbench error:', error)
  }, [error])

  return (
    <div className="bg-background flex h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="space-y-2">
        <h2 className="font-mono text-xl font-bold">Workbench error</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Something went wrong in the workspace. Your project data is safe.
        </p>
        {error.digest && (
          <p className="text-muted-foreground font-mono text-xs">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-none font-mono">
          Reload Workbench
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => (window.location.href = '/projects')}
        >
          Back to Projects
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add "apps/web/app/(dashboard)/projects/[projectId]/error.tsx"
git commit -m "feat: add workbench error boundary"
```

---

### Task 5: Admin `error.tsx`

**Files:**

- Create: `apps/web/app/admin/error.tsx`

**Step 1: Create admin error boundary**

```tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-4 text-center">
      <div className="space-y-2">
        <h2 className="font-mono text-xl font-bold">Admin panel error</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          An error occurred in the admin console.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} className="rounded-none font-mono">
          Try Again
        </Button>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => (window.location.href = '/admin')}
        >
          Admin Dashboard
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add apps/web/app/admin/error.tsx
git commit -m "feat: add admin error boundary"
```

---

### Task 6: Shared chat `not-found.tsx`

**Files:**

- Create: `apps/web/app/s/[shareId]/not-found.tsx`

**Why:** `notFound()` is called at `s/[shareId]/page.tsx:29` but no
`not-found.tsx` catches it.

**Step 1: Create shared chat not-found page**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function SharedChatNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <PandaLogo size="lg" />
      <div className="space-y-2">
        <h1 className="font-mono text-2xl font-bold">Chat not found</h1>
        <p className="text-muted-foreground max-w-md text-sm">
          This shared chat doesn't exist or has been removed.
        </p>
      </div>
      <Link href="/">
        <Button className="rounded-none font-mono">Go to Panda.ai</Button>
      </Link>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add "apps/web/app/s/[shareId]/not-found.tsx"
git commit -m "feat: add shared chat not-found page"
```

---

### Task 7: Global `loading.tsx` files

**Files:**

- Create: `apps/web/app/(dashboard)/loading.tsx`
- Create: `apps/web/app/admin/loading.tsx`

**Step 1: Create dashboard loading**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48 rounded-none" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-32 rounded-none" />
        <Skeleton className="h-32 rounded-none" />
        <Skeleton className="h-32 rounded-none" />
      </div>
    </div>
  )
}
```

**Step 2: Create admin loading**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminLoading() {
  return (
    <div className="space-y-6 p-8">
      <Skeleton className="h-8 w-64 rounded-none" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 rounded-none" />
        <Skeleton className="h-40 rounded-none" />
      </div>
      <Skeleton className="h-64 rounded-none" />
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add "apps/web/app/(dashboard)/loading.tsx" apps/web/app/admin/loading.tsx
git commit -m "feat: add loading.tsx suspense boundaries for dashboard and admin"
```

---

## Batch 2: P1 — High-Priority Fixes

### Task 8: Fix invalid `projectId` infinite loading

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:945-958`

**Why:** When `projectId` is invalid, `useQuery` returns `null` (not
`undefined`). Currently the loading guard is `if (!project || !files)` which
treats both `null` (not found) and `undefined` (loading) the same — showing a
spinner forever.

**Step 1: Fix the loading guard to distinguish null from undefined**

In `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`, find:

```tsx
// Loading state
if (!project || !files) {
  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 text-center"
      >
        <div className="border-primary/30 border-t-primary mx-auto h-12 w-12 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground font-mono text-sm">
          Loading project...
        </p>
      </motion.div>
    </div>
  )
}
```

Replace with:

```tsx
// Project not found (null means query resolved but no result)
if (project === null) {
  return (
    <div className="bg-background flex h-screen w-full flex-col items-center justify-center gap-4">
      <h2 className="font-mono text-xl font-bold">Project not found</h2>
      <p className="text-muted-foreground text-sm">
        This project doesn't exist or you don't have access.
      </p>
      <Button
        variant="outline"
        className="rounded-none font-mono"
        onClick={() => (window.location.href = '/projects')}
      >
        Back to Projects
      </Button>
    </div>
  )
}

// Loading state (undefined means query still loading)
if (project === undefined || !files) {
  return (
    <div className="bg-background flex h-screen w-full items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-4 text-center"
      >
        <div className="border-primary/30 border-t-primary mx-auto h-12 w-12 animate-spin rounded-full border-2" />
        <p className="text-muted-foreground font-mono text-sm">
          Loading project...
        </p>
      </motion.div>
    </div>
  )
}
```

**Note:** Ensure `Button` is already imported (it should be — verify at top of
file).

**Step 2: Commit**

```bash
git add "apps/web/app/(dashboard)/projects/[projectId]/page.tsx"
git commit -m "fix: show 404 for invalid projectId instead of infinite loading"
```

---

### Task 9: Wire up `contextualPrompt` to chat panel

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`

**Why:** `contextualPrompt` is set at L190 and passed at L875 but never consumed
by the chat input to pre-fill a message. Find where `ProjectChatPanel` receives
`contextualPrompt` and verify the prop is actually used inside. If
`ProjectChatPanel` doesn't use it, this is a deeper integration task.

**Step 1: Investigate `ProjectChatPanel` for `contextualPrompt` prop handling**

Search `ProjectChatPanel` component for how it handles the `contextualPrompt`
prop. If it accepts but ignores it, wire it to the chat input's value. If it
doesn't accept the prop at all, the `contextualPrompt={contextualPrompt}` JSX is
a no-op.

Run: `grep -n "contextualPrompt" apps/web/components/chat/ProjectChatPanel.tsx`
(or wherever the component lives)

**Step 2: If the prop is accepted but unused, wire it to pre-fill the chat
input**

The typical pattern: when `contextualPrompt` changes from null to a string, set
the chat input's value and focus it, then clear contextualPrompt.

**Step 3: Commit**

```bash
git add <modified files>
git commit -m "fix: wire contextualPrompt to pre-fill chat input"
```

---

### Task 10: Add confirmation dialogs for admin/ban toggle

**Files:**

- Modify: `apps/web/app/admin/users/page.tsx:139-170`

**Why:** Grant admin and ban user execute immediately on click with no
confirmation. These are high-impact, hard-to-notice mistakes.

**Step 1: Add confirmation state**

At the top of the component (near `deleteDialogOpen` state), add:

```tsx
const [confirmAction, setConfirmAction] = React.useState<{
  type: 'admin' | 'ban'
  userId: AdminUserId
  newValue: boolean
  label: string
} | null>(null)
```

**Step 2: Replace direct handlers with confirmation triggers**

Replace `handleToggleAdmin` to set confirmation state instead of executing
directly:

```tsx
const requestToggleAdmin = (userId: AdminUserId, isAdmin: boolean) => {
  setConfirmAction({
    type: 'admin',
    userId,
    newValue: isAdmin,
    label: isAdmin
      ? 'Grant admin privileges to this user?'
      : 'Revoke admin privileges from this user?',
  })
}

const requestToggleBan = (userId: AdminUserId, isBanned: boolean) => {
  setConfirmAction({
    type: 'ban',
    userId,
    newValue: isBanned,
    label: isBanned ? 'Ban this user from the platform?' : 'Unban this user?',
  })
}

const executeConfirmedAction = async () => {
  if (!confirmAction) return
  setIsLoading(true)
  try {
    if (confirmAction.type === 'admin') {
      await updateUserAdmin({
        userId: confirmAction.userId,
        isAdmin: confirmAction.newValue,
        adminRole: confirmAction.newValue ? 'admin' : undefined,
      })
      toast.success(
        confirmAction.newValue
          ? 'Admin privileges granted'
          : 'Admin privileges revoked'
      )
    } else {
      await updateUserBan({
        userId: confirmAction.userId,
        isBanned: confirmAction.newValue,
        reason: confirmAction.newValue ? 'Administrative action' : undefined,
      })
      toast.success(confirmAction.newValue ? 'User banned' : 'User unbanned')
    }
  } catch (error) {
    void error
    toast.error('Failed to update user')
  } finally {
    setIsLoading(false)
    setConfirmAction(null)
  }
}
```

**Step 3: Add confirmation dialog**

Add near the existing delete confirmation dialog:

```tsx
<Dialog
  open={!!confirmAction}
  onOpenChange={(open) => !open && setConfirmAction(null)}
>
  <DialogContent className="rounded-none font-mono">
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>{confirmAction?.label}</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        className="rounded-none"
        onClick={() => setConfirmAction(null)}
      >
        Cancel
      </Button>
      <Button
        className="rounded-none"
        onClick={executeConfirmedAction}
        disabled={isLoading}
      >
        Confirm
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Step 4: Update call sites** — replace `handleToggleAdmin` with
`requestToggleAdmin` and `handleToggleBan` with `requestToggleBan` wherever
they're called in the JSX.

**Step 5: Commit**

```bash
git add apps/web/app/admin/users/page.tsx
git commit -m "fix: add confirmation dialogs for admin grant/revoke and ban/unban"
```

---

### Task 11: Add SEO metadata for shared chat page

**Files:**

- Modify: `apps/web/app/s/[shareId]/page.tsx`

**Why:** Shared chats are a growth channel. Without `generateMetadata()`, link
previews in Slack/Discord/Twitter show generic "Panda.ai" with no context.

**Step 1: Fix the server/client component split**

The current file mixes `async function` with `'use client'` + `useQuery`.
Restructure:

- Remove `'use client'` from top of file (the outer `SharedChatPage` should be a
  Server Component for metadata)
- Keep `SharedChatContent` as a separate `'use client'` inner component
- Move `SharedChatContent` to a separate file or wrap it with `'use client'`
  directive

Create `apps/web/app/s/[shareId]/SharedChatContent.tsx`:

```tsx
'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { notFound } from 'next/navigation'
import { SharedTranscript } from '@/components/chat/SharedTranscript'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function SharedChatContent({ shareId }: { shareId: string }) {
  const sharedChat = useQuery(api.sharing.getSharedChat, { shareId })

  if (sharedChat === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground font-mono">Loading...</div>
      </div>
    )
  }

  if (!sharedChat) {
    notFound()
  }

  return (
    <main id="main-content" className="bg-background min-h-screen">
      <div className="mx-auto max-w-4xl p-4">
        <header className="border-border mb-6 border-b pb-4">
          <h1 className="font-mono text-xl font-medium">
            {sharedChat.chat.title || 'Shared Chat'}
          </h1>
          <div className="text-muted-foreground mt-2 flex items-center gap-4 font-mono text-sm">
            <span>Mode: {sharedChat.chat.mode}</span>
            <span>
              Shared:{' '}
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(sharedChat.sharedAt))}
            </span>
          </div>
        </header>

        <SharedTranscript messages={sharedChat.messages} />

        <footer className="border-border mt-8 border-t pt-4 text-center">
          <p className="text-muted-foreground mb-3 font-mono text-xs">
            Shared via Panda.ai
          </p>
          <Link href="/">
            <Button
              variant="outline"
              className="rounded-none font-mono text-xs"
            >
              Try Panda.ai
            </Button>
          </Link>
        </footer>
      </div>
    </main>
  )
}
```

**Step 2: Rewrite the page.tsx as a Server Component with metadata**

Replace `apps/web/app/s/[shareId]/page.tsx` entirely:

```tsx
import type { Metadata } from 'next'
import { SharedChatContent } from './SharedChatContent'

interface SharedChatPageProps {
  params: Promise<{ shareId: string }>
}

export async function generateMetadata({
  params,
}: SharedChatPageProps): Promise<Metadata> {
  const { shareId } = await params
  return {
    title: 'Shared Chat',
    description: `View a shared AI coding conversation on Panda.ai`,
    openGraph: {
      title: 'Shared Chat — Panda.ai',
      description: 'An AI-assisted coding conversation shared from Panda.ai',
      type: 'article',
    },
  }
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  const { shareId } = await params
  return <SharedChatContent shareId={shareId} />
}
```

**Note:** We can't fetch the actual chat title server-side without a Convex
server client. The static metadata is good enough for now. If Convex HTTP
actions are available, the metadata description could include the chat title.

**Step 3: Commit**

```bash
git add "apps/web/app/s/[shareId]/page.tsx" "apps/web/app/s/[shareId]/SharedChatContent.tsx"
git commit -m "feat: add SEO metadata for shared chat and fix server/client split"
```

---

### Task 12: Add OAuth error handling on login page

**Files:**

- Modify: `apps/web/app/login/page.tsx`

**Why:** If Google sign-in fails, there's no UI feedback — the page stays on the
sign-in screen silently.

**Step 1: Check if URL has an error query param**

Convex Auth (and most OAuth flows) redirect back with `?error=...` on failure.
Add error detection:

After the existing state hooks, add:

```tsx
import { useSearchParams } from 'next/navigation'

// Inside LoginPage component:
const searchParams = useSearchParams()
const authError = searchParams.get('error')
```

**Step 2: Render the error below the sign-in button**

After `<SignInButton disabled={accessState.signInDisabled} />`, add:

```tsx
{
  authError && (
    <div className="border-destructive/50 bg-destructive/10 max-w-sm border p-3 text-center">
      <p className="text-destructive font-mono text-sm">
        Sign-in failed. Please try again.
      </p>
    </div>
  )
}
```

**Step 3: Add "Back to Home" link**

After the error display (still inside the `<main>` in the `Unauthenticated`
block):

```tsx
<a
  href="/"
  className="text-muted-foreground hover:text-foreground font-mono text-sm underline"
>
  Back to Home
</a>
```

**Step 4: Commit**

```bash
git add apps/web/app/login/page.tsx
git commit -m "fix: show OAuth error state and add back-to-home link on login page"
```

---

## Batch 3: P2 — Medium Priority (Small Effort)

### Task 13: Add page-level SEO metadata

**Files:**

- Modify: `apps/web/app/login/page.tsx` (already `'use client'` — needs
  different approach)
- Create: `apps/web/app/login/layout.tsx` (server component wrapper for
  metadata)
- Modify: `apps/web/app/education/page.tsx` (add metadata export)
- Create: `apps/web/app/(dashboard)/projects/layout.tsx` (if it doesn't exist)
- Modify: `apps/web/app/admin/page.tsx`
- Modify: `apps/web/app/admin/users/page.tsx`
- Modify: `apps/web/app/admin/analytics/page.tsx`
- Modify: `apps/web/app/admin/system/page.tsx`
- Modify: `apps/web/app/admin/security/page.tsx`

**Step 1: Add login page metadata via layout**

Since `login/page.tsx` is `'use client'`, add metadata in a layout:

Create `apps/web/app/login/layout.tsx`:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Panda.ai to start building with AI assistance.',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

**Step 2: Add education page metadata**

At the top of `apps/web/app/education/page.tsx` (if it's a Server Component, add
directly; if `'use client'`, use same layout pattern):

```tsx
export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Learn how Panda.ai workbench helps you build software with AI — explore the interface, workflow, and features.',
}
```

**Step 3: Add admin page metadata via layout pattern**

For each admin page that's a client component, add the metadata export. If the
page has `'use client'`, create a thin layout.tsx in that directory or add
metadata to the admin layout.

For the admin layout at `apps/web/app/admin/layout.tsx`, it's `'use client'` so
create `apps/web/app/admin/metadata.ts` — actually Next.js doesn't support that.
Instead, since admin layout is client-side, we need to add individual
`layout.tsx` wrappers for each admin sub-route, OR we can add a `template.tsx`
with metadata at the admin level.

Simpler: add a `<title>` via `useEffect` + `document.title` in each admin page,
or accept the root layout title for admin pages (they're not public-facing, SEO
doesn't matter for authenticated admin pages).

**Decision:** Skip admin page metadata — admin pages are behind auth and not
indexed. Focus metadata on public pages only (login, education, shared chat —
already done in Task 11).

**Step 4: Commit**

```bash
git add apps/web/app/login/layout.tsx apps/web/app/education/page.tsx
git commit -m "feat: add SEO metadata for login and education pages"
```

---

### Task 14: Fix `FALLBACK_PROVIDER` unsafe cast

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx:150`

**Step 1: Replace the unsafe cast with a typed fallback**

Find:

```tsx
const FALLBACK_PROVIDER = {} as LLMProvider
```

Replace with a safe default that won't crash if properties are accessed:

```tsx
const FALLBACK_PROVIDER: LLMProvider = {
  id: '',
  name: 'No Provider',
  baseUrl: '',
  apiKey: '',
  models: [],
  isDefault: false,
  capabilities: { chat: false, code: false, reasoning: false },
}
```

**Note:** Verify the exact shape of `LLMProvider` by checking its type
definition. Adjust fields to match. The key requirement is that no property
access on this object throws.

**Step 2: Commit**

```bash
git add "apps/web/app/(dashboard)/projects/[projectId]/page.tsx"
git commit -m "fix: replace unsafe FALLBACK_PROVIDER cast with typed default"
```

---

### Task 15: Add dirty state tracking to Admin System page

**Files:**

- Modify: `apps/web/app/admin/system/page.tsx`

**Why:** Unlike the Settings page which warns on navigation with unsaved
changes, the System Controls page has no `isDirty` tracking.

**Step 1: Add dirty state comparison**

Find where `controls` state is initialized from the Convex query. Add a ref to
track the original server state:

```tsx
const serverControlsRef = useRef(controls)

// Update ref when server data changes (not from local edits)
useEffect(() => {
  if (adminSettings) {
    serverControlsRef.current = {
      /* same shape as initial controls from adminSettings */
    }
  }
}, [adminSettings])

const isDirty =
  JSON.stringify(controls) !== JSON.stringify(serverControlsRef.current)
```

**Step 2: Add beforeunload guard**

```tsx
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault()
    }
  }
  window.addEventListener('beforeunload', handler)
  return () => window.removeEventListener('beforeunload', handler)
}, [isDirty])
```

**Step 3: Add visual indicator on Save button**

Update the Save button to show dirty state:

```tsx
<Button disabled={!isDirty || isSaving} ...>
  {isDirty ? 'Save Changes' : 'Saved'}
</Button>
```

**Step 4: Commit**

```bash
git add apps/web/app/admin/system/page.tsx
git commit -m "feat: add dirty state tracking and unsaved changes warning to admin system page"
```

---

### Task 16: Add maintenance mode confirmation

**Files:**

- Modify: `apps/web/app/admin/system/page.tsx:275-280`

**Why:** One accidental toggle of maintenance mode locks out all non-admin
users.

**Step 1: Add confirmation state**

```tsx
const [pendingMaintenance, setPendingMaintenance] = useState<boolean | null>(
  null
)
```

**Step 2: Replace direct toggle with confirmation trigger**

Replace the Switch `onCheckedChange`:

```tsx
<Switch
  checked={controls.systemMaintenance}
  onCheckedChange={(checked) => {
    if (checked) {
      setPendingMaintenance(true)
    } else {
      setControls((prev) => ({ ...prev, systemMaintenance: false }))
    }
  }}
/>
```

**Step 3: Add confirmation dialog**

```tsx
<Dialog
  open={pendingMaintenance !== null}
  onOpenChange={(open) => !open && setPendingMaintenance(null)}
>
  <DialogContent className="rounded-none font-mono">
    <DialogHeader>
      <DialogTitle>Enable Maintenance Mode?</DialogTitle>
      <DialogDescription>
        All non-admin users will be immediately locked out of the platform. This
        takes effect when you save changes.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        className="rounded-none"
        onClick={() => setPendingMaintenance(null)}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        className="rounded-none"
        onClick={() => {
          setControls((prev) => ({ ...prev, systemMaintenance: true }))
          setPendingMaintenance(null)
        }}
      >
        Enable Maintenance Mode
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Step 4: Commit**

```bash
git add apps/web/app/admin/system/page.tsx
git commit -m "fix: add confirmation dialog for enabling maintenance mode"
```

---

### Task 17: Add sticky save bar to Settings page

**Files:**

- Modify: `apps/web/app/(dashboard)/settings/page.tsx`

**Why:** On the Providers tab with 9+ cards expanded, the Save button is at the
very bottom of a long scroll. A sticky save bar that appears when `isDirty`
dramatically improves UX.

**Step 1: Find the existing save button section**

Look for the save button at the bottom (~L1094-1114). Replace the fixed-position
save section with a sticky bar:

```tsx
{
  isDirty && (
    <div className="border-border bg-background/95 sticky bottom-0 z-10 border-t px-6 py-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground font-mono text-sm">
          You have unsaved changes
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-none font-mono"
            onClick={handleRevert}
          >
            Discard
          </Button>
          <Button
            className="rounded-none font-mono"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

**Note:** Verify `isDirty`, `handleSave`, `handleRevert`, and `isSaving`
variable names match the existing code. The existing save button section should
be replaced with this sticky bar — don't duplicate.

**Step 2: Commit**

```bash
git add "apps/web/app/(dashboard)/settings/page.tsx"
git commit -m "feat: add sticky save bar to settings page"
```

---

### Task 18: Add login redirect query param support

**Files:**

- Modify: `apps/web/app/login/page.tsx`
- Modify: `apps/web/components/auth/ProtectedRoute.tsx` (or wherever the auth
  redirect happens)

**Why:** When an unauthenticated user hits `/projects/abc123`, they're
redirected to `/login` but after sign-in they always go to `/projects` instead
of back to the original URL.

**Step 1: Update `AuthenticatedRedirect` to read `redirect` param**

```tsx
function AuthenticatedRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const redirect = searchParams.get('redirect') || '/projects'
    router.replace(redirect)
  }, [router, searchParams])

  return null
}
```

**Step 2: Update `ProtectedRoute` to pass redirect param**

Find where `ProtectedRoute` redirects to `/login` and append
`?redirect=${encodeURIComponent(currentPath)}`.

**Step 3: Commit**

```bash
git add apps/web/app/login/page.tsx apps/web/components/auth/ProtectedRoute.tsx
git commit -m "feat: preserve redirect URL through login flow"
```

---

## Summary

| Batch | Tasks       | Findings Addressed                                                                              | Priority          |
| ----- | ----------- | ----------------------------------------------------------------------------------------------- | ----------------- |
| 1     | Tasks 1-7   | Error boundaries, not-found pages, loading states                                               | P0                |
| 2     | Tasks 8-12  | Invalid projectId, contextualPrompt, admin confirmations, shared chat SEO, OAuth error          | P1                |
| 3     | Tasks 13-18 | Page metadata, FALLBACK_PROVIDER, dirty state, maintenance confirm, sticky save, login redirect | P2 (small effort) |

**Total: 18 tasks across 3 batches.**

Remaining P2 items deferred to future work:

- Admin layout responsive sidebar (Large effort)
- Projects list pagination (Medium effort)
- Edit Project capability (Medium effort)
- Analytics data visualization (Large effort)
- Audit log pagination (Medium effort)
- Workbench "More" dropdown actions (Medium effort)
- Project settings panel (Medium effort)
