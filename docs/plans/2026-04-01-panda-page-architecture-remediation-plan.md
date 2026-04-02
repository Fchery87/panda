# Panda Page Architecture Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to
> implement this plan task-by-task.

**Goal:** Bring every routed non-Markdown page in Panda to a production-ready
architectural baseline by fixing cross-page access control, hardening primary
workflows, removing duplicated admin IA, and aligning page content with actual
shipped capabilities.

**Architecture:** This rollout starts with shared infrastructure instead of
page-local patches. First, centralize access-state and app-shell concerns so
public, authenticated, and admin pages all consume the same route-state model.
Then harden the user-facing pages in order of business impact: public
acquisition pages, shared chat, projects index, core workbench, settings, and
finally admin surfaces. The admin area should move from duplicated embedded tabs
toward a single navigation model with dedicated pages as the source of truth.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex, Bun,
ESLint, existing auth proxy + route guards, shadcn/ui, Framer Motion.

---

## Phase 1: Shared Routing, Access, and App-Shell Foundations

### Task 1: Centralize access-state messaging and maintenance reasons

**Files:**

- Create: `apps/web/lib/auth/access-state.ts`
- Modify: `apps/web/proxy.ts`
- Modify: `apps/web/components/auth/ProtectedRoute.tsx`
- Modify: `apps/web/app/login/page.tsx`
- Modify: `apps/web/app/maintenance/page.tsx`
- Test: `apps/web/lib/auth/access-state.test.ts`
- Test: `apps/web/app/proxy.auth.test.ts`

**Step 1: Write the failing tests**

```typescript
// apps/web/lib/auth/access-state.test.ts
import { describe, expect, test } from 'bun:test'
import {
  getAccessState,
  getMaintenanceReasonFromSearchParams,
} from './access-state'

describe('getAccessState', () => {
  test('returns maintenance for authenticated non-admin users during maintenance', () => {
    expect(
      getAccessState({
        authenticated: true,
        isAdmin: false,
        registrationEnabled: true,
        systemMaintenance: true,
      })
    ).toMatchObject({ kind: 'maintenance', reason: 'maintenance' })
  })

  test('returns registration closed for unauthenticated users when sign-in is disabled', () => {
    expect(
      getAccessState({
        authenticated: false,
        isAdmin: false,
        registrationEnabled: false,
        systemMaintenance: false,
      })
    ).toMatchObject({ kind: 'login_disabled', reason: 'registration-closed' })
  })
})

describe('getMaintenanceReasonFromSearchParams', () => {
  test('defaults unknown values to maintenance', () => {
    expect(
      getMaintenanceReasonFromSearchParams(new URLSearchParams('reason=nope'))
    ).toBe('maintenance')
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
`cd apps/web && bun test lib/auth/access-state.test.ts app/proxy.auth.test.ts`

Expected: FAIL because `access-state.ts` does not exist and proxy tests do not
yet assert the new reason plumbing.

**Step 3: Write the minimal implementation**

```typescript
// apps/web/lib/auth/access-state.ts
export type AccessReason = 'maintenance' | 'registration-closed'

export type AccessState =
  | { kind: 'allowed' }
  | { kind: 'maintenance'; reason: AccessReason }
  | { kind: 'login_required' }
  | { kind: 'login_disabled'; reason: AccessReason }

export function getAccessState(input: {
  authenticated: boolean
  isAdmin: boolean
  registrationEnabled: boolean
  systemMaintenance: boolean
}): AccessState {
  if (input.systemMaintenance && input.authenticated && !input.isAdmin) {
    return { kind: 'maintenance', reason: 'maintenance' }
  }

  if (!input.authenticated && !input.registrationEnabled) {
    return { kind: 'login_disabled', reason: 'registration-closed' }
  }

  if (!input.authenticated) {
    return { kind: 'login_required' }
  }

  return { kind: 'allowed' }
}

export function getMaintenanceReasonFromSearchParams(
  searchParams: URLSearchParams
): AccessReason {
  return searchParams.get('reason') === 'registration-closed'
    ? 'registration-closed'
    : 'maintenance'
}
```

Implementation notes:

- Update `proxy.ts` to compute one access state and redirect with explicit
  `?reason=...` when applicable.
- Update `ProtectedRoute.tsx` and `login/page.tsx` to render copy from the
  shared access-state helper instead of open-coded branches.
- Update `maintenance/page.tsx` to accept `searchParams` and render distinct
  messaging for maintenance vs registration closure.

**Step 4: Run tests to verify they pass**

Run:
`cd apps/web && bun test lib/auth/access-state.test.ts app/proxy.auth.test.ts lib/auth/routeGuards.test.ts`

Expected: PASS with coverage for reason-aware redirects and consistent state
mapping.

**Step 5: Commit**

```bash
git add apps/web/lib/auth/access-state.ts apps/web/lib/auth/access-state.test.ts apps/web/proxy.ts apps/web/components/auth/ProtectedRoute.tsx apps/web/app/login/page.tsx apps/web/app/maintenance/page.tsx apps/web/app/proxy.auth.test.ts
git commit -m "refactor: centralize page access state and maintenance reasons"
```

---

### Task 2: Add root app-shell accessibility and metadata primitives

**Files:**

- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/education/page.tsx`
- Modify: `apps/web/app/login/page.tsx`
- Modify: `apps/web/app/maintenance/page.tsx`
- Modify: `apps/web/app/s/[shareId]/page.tsx`
- Modify: `apps/web/app/(dashboard)/projects/page.tsx`
- Modify: `apps/web/app/(dashboard)/settings/page.tsx`
- Modify: `apps/web/app/admin/layout.tsx`
- Test: `apps/web/app/layout.test.tsx`

**Step 1: Write the failing test**

```typescript
// apps/web/app/layout.test.tsx
import { describe, expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import RootLayout from './layout'

describe('RootLayout', () => {
  test('renders a skip link before page content', () => {
    const html = renderToString(
      <RootLayout>
        <div id="main-content">Hello</div>
      </RootLayout>
    )

    expect(html).toContain('href="#main-content"')
    expect(html).toContain('Skip to main content')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test app/layout.test.tsx`

Expected: FAIL because the current layout does not render a skip link.

**Step 3: Write the minimal implementation**

```tsx
// apps/web/app/layout.tsx
<html lang="en" suppressHydrationWarning>
  <body className={`${geistSans.variable} ${firaCode.variable} antialiased`}>
    <a
      href="#main-content"
      className="focus:border-border focus:bg-background sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:border focus:px-3 focus:py-2 focus:font-mono"
    >
      Skip to main content
    </a>
    <ConvexAuthNextjsServerProvider>
      <Providers>{children}</Providers>
    </ConvexAuthNextjsServerProvider>
  </body>
</html>
```

Implementation notes:

- Add page-specific `metadata` exports for public pages and top-level
  admin/projects/settings routes.
- Ensure every primary page has one real `main` region or a stable
  `id="main-content"` target, not just a nested `div`.
- If theme handling supports it, add `color-scheme` metadata and theme-color
  values here rather than per-page duplication.

**Step 4: Run tests to verify it passes**

Run: `cd apps/web && bun test app/layout.test.tsx && bun run typecheck`

Expected: PASS and no new type errors.

**Step 5: Commit**

```bash
git add apps/web/app/layout.tsx apps/web/app/layout.test.tsx apps/web/app/page.tsx apps/web/app/education/page.tsx apps/web/app/login/page.tsx apps/web/app/maintenance/page.tsx apps/web/app/s/[shareId]/page.tsx apps/web/app/(dashboard)/projects/page.tsx apps/web/app/(dashboard)/settings/page.tsx apps/web/app/admin/layout.tsx
git commit -m "feat: add shared app-shell accessibility and metadata primitives"
```

---

## Phase 2: Public Page Alignment and Trust Surfaces

### Task 3: Replace hardcoded public-page drift with a shared capability source

**Files:**

- Create: `apps/web/lib/product/capabilities.ts`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/education/page.tsx`
- Test: `apps/web/lib/product/capabilities.test.ts`

**Step 1: Write the failing test**

```typescript
// apps/web/lib/product/capabilities.test.ts
import { describe, expect, test } from 'bun:test'
import { getWorkbenchCapabilities } from './capabilities'

describe('getWorkbenchCapabilities', () => {
  test('returns capability groups used by both marketing pages', () => {
    const result = getWorkbenchCapabilities()
    expect(result.landingFeatures.length).toBeGreaterThan(0)
    expect(result.educationSections.length).toBeGreaterThan(0)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test lib/product/capabilities.test.ts`

Expected: FAIL because the shared product capability module does not exist.

**Step 3: Write the minimal implementation**

```typescript
// apps/web/lib/product/capabilities.ts
export function getWorkbenchCapabilities() {
  return {
    landingFeatures: [
      { id: 'plan-review', title: 'Plan Review Before Execution' },
      { id: 'artifacts', title: 'Files, Diffs, and Artifacts' },
    ],
    educationSections: [
      { id: 'explorer', title: 'Explorer' },
      { id: 'workspace', title: 'Workspace' },
    ],
  }
}
```

Implementation notes:

- Move the duplicated hardcoded feature/capability arrays out of `page.tsx` and
  `education/page.tsx`.
- Keep copy distinct per page, but derive capability names, ordering, and
  surface IDs from one module.
- Reserve a field for `status: 'shipped' | 'partial'` so education can honestly
  mark incomplete wiring instead of overstating availability.

**Step 4: Run tests to verify it passes**

Run:
`cd apps/web && bun test lib/product/capabilities.test.ts && bun run typecheck`

Expected: PASS with both pages consuming the same source-of-truth structure.

**Step 5: Commit**

```bash
git add apps/web/lib/product/capabilities.ts apps/web/lib/product/capabilities.test.ts apps/web/app/page.tsx apps/web/app/education/page.tsx
git commit -m "refactor: align public pages to shared workbench capabilities"
```

---

### Task 4: Harden the shared chat page into a real review surface

**Files:**

- Create: `apps/web/components/chat/SharedTranscript.tsx`
- Modify: `apps/web/app/s/[shareId]/page.tsx`
- Test: `apps/web/components/chat/SharedTranscript.test.tsx`

**Step 1: Write the failing test**

```tsx
// apps/web/components/chat/SharedTranscript.test.tsx
import { describe, expect, test } from 'bun:test'
import { renderToString } from 'react-dom/server'
import { SharedTranscript } from './SharedTranscript'

describe('SharedTranscript', () => {
  test('renders message roles and preserves multiline content', () => {
    const html = renderToString(
      <SharedTranscript
        messages={[
          { role: 'user', content: 'line 1\nline 2' },
          { role: 'assistant', content: 'done' },
        ]}
      />
    )

    expect(html).toContain('line 1')
    expect(html).toContain('done')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bun test components/chat/SharedTranscript.test.tsx`

Expected: FAIL because the extracted transcript component does not exist.

**Step 3: Write the minimal implementation**

```tsx
// apps/web/components/chat/SharedTranscript.tsx
export function SharedTranscript({
  messages,
}: {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
}) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <article
          key={`${message.role}-${index}`}
          className="border-border border p-4"
        >
          <p className="mb-2 font-mono text-xs tracking-wide uppercase">
            {message.role}
          </p>
          <div className="font-mono text-sm break-words whitespace-pre-wrap">
            {message.content}
          </div>
        </article>
      ))}
    </div>
  )
}
```

Implementation notes:

- Replace the current inline transcript rendering in `/s/[shareId]`.
- Add stable date formatting with `Intl.DateTimeFormat`, not raw
  `toLocaleDateString()`.
- Prepare the component to support future code fences, artifacts, and
  annotations from the main message renderer.

**Step 4: Run tests to verify it passes**

Run:
`cd apps/web && bun test components/chat/SharedTranscript.test.tsx && bun run typecheck`

Expected: PASS with the share page importing the extracted renderer cleanly.

**Step 5: Commit**

```bash
git add apps/web/components/chat/SharedTranscript.tsx apps/web/components/chat/SharedTranscript.test.tsx apps/web/app/s/[shareId]/page.tsx
git commit -m "feat: extract shared transcript renderer for public chat pages"
```

---

## Phase 3: Core User Workflow Hardening

### Task 5: Make the projects index safe, accessible, and deterministic

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/page.tsx`
- Test: `apps/web/e2e/projects-page.spec.ts`

**Step 1: Write the failing E2E test**

```typescript
// apps/web/e2e/projects-page.spec.ts
import { test, expect } from '@playwright/test'

test('project deletion requires explicit confirmation', async ({ page }) => {
  await page.goto('/projects')
  await page
    .getByRole('button', { name: /delete/i })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx playwright test e2e/projects-page.spec.ts`

Expected: FAIL because deletion currently happens directly from the row action.

**Step 3: Write the minimal implementation**

```tsx
// Replace direct delete click with dialog-driven confirmation.
// Add explicit label to the search input.
<Input
  aria-label="Search projects"
  placeholder="Search projects…"
  ...
/>
```

Implementation notes:

- Replace immediate delete with confirmation modal or undo toast.
- Move `lastOpenedAt` updates into a function that is awaited as part of
  navigation/open handling, not a wrapper `div` click.
- Add empty-state guidance for first project creation and no-results search
  states.

**Step 4: Run tests to verify it passes**

Run:
`cd apps/web && bunx playwright test e2e/projects-page.spec.ts && bun run typecheck`

Expected: PASS with accessible search and guarded deletion.

**Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/projects/page.tsx apps/web/e2e/projects-page.spec.ts
git commit -m "fix: harden projects index interactions and deletion flow"
```

---

### Task 6: Finish workbench wiring and protect high-value state

**Files:**

- Modify: `apps/web/app/(dashboard)/projects/[projectId]/page.tsx`
- Modify: `apps/web/components/sidebar/FileTree.tsx`
- Modify: `apps/web/components/workbench/Breadcrumb.tsx`
- Create: `apps/web/hooks/useUnsavedChangesGuard.ts`
- Test: `apps/web/components/workbench/workbench.integration.test.ts`
- Test: `apps/web/e2e/workbench.e2e-spec.ts`

**Step 1: Write the failing tests**

```typescript
// apps/web/components/workbench/workbench.integration.test.ts
import { describe, expect, it, mock } from 'bun:test'

describe('breadcrumb reveal integration', () => {
  it('expands the explorer when reveal in explorer is requested', () => {
    const onReveal = mock()
    onReveal('src/components')
    expect(onReveal).toHaveBeenCalledWith('src/components')
  })
})
```

```typescript
// apps/web/e2e/workbench.e2e-spec.ts
test('warns before navigation when editor state is dirty', async ({ page }) => {
  await page.goto('/projects/test-project')
  // open file, type change, navigate away
  // expect confirmation or blocked navigation state
})
```

**Step 2: Run tests to verify they fail**

Run:
`cd apps/web && bun test components/workbench/workbench.integration.test.ts && bunx playwright test e2e/workbench.e2e-spec.ts`

Expected: FAIL because breadcrumb reveal only logs, and there is no
unsaved-change guard.

**Step 3: Write the minimal implementation**

```typescript
// apps/web/hooks/useUnsavedChangesGuard.ts
import { useEffect } from 'react'

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])
}
```

Implementation notes:

- Replace the breadcrumb `console.log` at `projects/[projectId]/page.tsx` with a
  real explorer expansion contract.
- Remove `console.error` fallback in inline chat and surface a user-facing toast
  plus structured logging.
- Persist more workbench UI state in the URL where it materially improves
  recovery: selected review tab, selected chat, and potentially selected file.

**Step 4: Run tests to verify it passes**

Run:
`cd apps/web && bun test components/workbench/workbench.integration.test.ts && bunx playwright test e2e/workbench.e2e-spec.ts --grep "dirty|reveal" && bun run typecheck`

Expected: PASS with real explorer reveal behavior and dirty-state protection.

**Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/projects/[projectId]/page.tsx apps/web/components/sidebar/FileTree.tsx apps/web/components/workbench/Breadcrumb.tsx apps/web/hooks/useUnsavedChangesGuard.ts apps/web/components/workbench/workbench.integration.test.ts apps/web/e2e/workbench.e2e-spec.ts
git commit -m "feat: finish workbench wiring and guard unsaved state"
```

---

### Task 7: Fix settings navigation, dirty-state handling, and tab deep-linking

**Files:**

- Modify: `apps/web/app/(dashboard)/settings/page.tsx`
- Create: `apps/web/hooks/useSettingsTabQueryState.ts`
- Test: `apps/web/e2e/settings-page.spec.ts`

**Step 1: Write the failing E2E test**

```typescript
// apps/web/e2e/settings-page.spec.ts
import { test, expect } from '@playwright/test'

test('settings page restores the providers tab from the URL', async ({
  page,
}) => {
  await page.goto('/settings?tab=providers')
  await expect(
    page.getByRole('tab', { name: /llm providers/i })
  ).toHaveAttribute('data-state', 'active')
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx playwright test e2e/settings-page.spec.ts`

Expected: FAIL because the tab state is currently local only.

**Step 3: Write the minimal implementation**

```typescript
// apps/web/hooks/useSettingsTabQueryState.ts
export const SETTINGS_TABS = [
  'general',
  'providers',
  'advanced',
  'appearance',
] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]
```

Implementation notes:

- Fix the back button from `/` to `/projects`.
- Introduce URL-backed active tab state.
- Add dirty-state detection so provider/settings edits warn before navigation
  when unsaved.
- While touching the file, remove the local lint warning for the unused `_`
  destructuring around provider removal.

**Step 4: Run tests to verify it passes**

Run:
`cd apps/web && bunx playwright test e2e/settings-page.spec.ts && bun run lint -- --quiet`

Expected: PASS with deep-linkable tabs and no new settings-page lint warnings.

**Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/settings/page.tsx apps/web/hooks/useSettingsTabQueryState.ts apps/web/e2e/settings-page.spec.ts
git commit -m "fix: harden settings navigation and tab state"
```

---

## Phase 4: Admin Information Architecture Consolidation

### Task 8: Convert `/admin` into a true hub and remove duplicated embedded tooling

**Files:**

- Modify: `apps/web/app/admin/page.tsx`
- Modify: `apps/web/app/admin/layout.tsx`
- Test: `apps/web/e2e/admin-navigation.spec.ts`

**Step 1: Write the failing E2E test**

```typescript
// apps/web/e2e/admin-navigation.spec.ts
import { test, expect } from '@playwright/test'

test('admin dashboard links to dedicated management pages instead of rendering duplicate tools', async ({
  page,
}) => {
  await page.goto('/admin')
  await expect(
    page.getByRole('link', { name: /user management/i })
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: /^users$/i })).toHaveCount(0)
})
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && bunx playwright test e2e/admin-navigation.spec.ts`

Expected: FAIL because `/admin` currently renders embedded tabs for users,
analytics, LLM config, and system controls.

**Step 3: Write the minimal implementation**

```tsx
// apps/web/app/admin/page.tsx
// Replace operational tabs with overview cards that link to:
// /admin/users, /admin/analytics, /admin/system, /admin/security
```

Implementation notes:

- Keep `/admin` as overview + recent status only.
- Make `admin/layout.tsx` visually indicate the active section.
- Do not delete the dedicated pages; make them the single place for operational
  tooling.

**Step 4: Run tests to verify it passes**

Run:
`cd apps/web && bunx playwright test e2e/admin-navigation.spec.ts && bun run typecheck`

Expected: PASS with one clear admin navigation model.

**Step 5: Commit**

```bash
git add apps/web/app/admin/page.tsx apps/web/app/admin/layout.tsx apps/web/e2e/admin-navigation.spec.ts
git commit -m "refactor: consolidate admin IA around dedicated routes"
```

---

### Task 9: Harden dedicated admin pages for operational use

**Files:**

- Modify: `apps/web/app/admin/users/page.tsx`
- Modify: `apps/web/app/admin/security/page.tsx`
- Modify: `apps/web/app/admin/system/page.tsx`
- Modify: `apps/web/app/admin/analytics/page.tsx`
- Create: `apps/web/lib/admin/query-state.ts`
- Test: `apps/web/e2e/admin-users.spec.ts`
- Test: `apps/web/e2e/admin-security.spec.ts`
- Test: `apps/web/e2e/admin-analytics.spec.ts`

**Step 1: Write the failing tests**

```typescript
// apps/web/e2e/admin-users.spec.ts
test('admin users page uses a dialog instead of window.confirm for destructive actions', async ({
  page,
}) => {
  await page.goto('/admin/users')
  await page.getByRole('button', { name: /delete user/i }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
})
```

```typescript
// apps/web/e2e/admin-analytics.spec.ts
test('analytics page supports a date range control', async ({ page }) => {
  await page.goto('/admin/analytics')
  await expect(page.getByLabel(/date range/i)).toBeVisible()
})
```

**Step 2: Run tests to verify they fail**

Run:
`cd apps/web && bunx playwright test e2e/admin-users.spec.ts e2e/admin-analytics.spec.ts`

Expected: FAIL because the current pages do not expose dialog-driven destructive
actions or analytics filters.

**Step 3: Write the minimal implementation**

```typescript
// apps/web/lib/admin/query-state.ts
export type AdminUsersQueryState = {
  search?: string
  filter?: 'all' | 'admins' | 'banned' | 'active'
}
```

Implementation notes:

- `/admin/users`: replace `confirm()` with modal, make row selection
  keyboard-accessible, persist `search`, `filter`, and `selectedUserId` in the
  URL.
- `/admin/security`: add actor/resource/action/date filters before considering
  export.
- `/admin/system`: source enhancement-provider options from the same shared
  provider registry as user settings.
- `/admin/analytics`: add date-range inputs and route/query-backed filtering
  before adding exports or drilldowns.

**Step 4: Run tests to verify they pass**

Run:
`cd apps/web && bunx playwright test e2e/admin-users.spec.ts e2e/admin-security.spec.ts e2e/admin-analytics.spec.ts && bun run typecheck`

Expected: PASS with safer admin actions and first-pass query/filter support.

**Step 5: Commit**

```bash
git add apps/web/app/admin/users/page.tsx apps/web/app/admin/security/page.tsx apps/web/app/admin/system/page.tsx apps/web/app/admin/analytics/page.tsx apps/web/lib/admin/query-state.ts apps/web/e2e/admin-users.spec.ts apps/web/e2e/admin-security.spec.ts apps/web/e2e/admin-analytics.spec.ts
git commit -m "feat: harden dedicated admin pages for operational workflows"
```

---

## Phase 5: Quality Bar Closure

### Task 10: Clear lint drift and rerun the full verification bar

**Files:**

- Modify: `apps/web/app/(dashboard)/settings/page.tsx`
- Modify: `apps/web/components/chat/ChatInput.tsx`
- Modify: `apps/web/hooks/useAgent.ts`
- Modify: other files reported by `bun run lint` as needed

**Step 1: Capture the current failing verification surface**

Run: `bun run lint`

Expected: FAIL the repo policy due to warnings, including:

- `apps/web/app/(dashboard)/settings/page.tsx`
- `apps/web/components/chat/ChatInput.tsx`
- `apps/web/hooks/useAgent.ts`

**Step 2: Fix warnings in smallest coherent batches**

Examples:

- remove unused destructured variables
- rename intentionally unused args to `_arg`
- remove stale imports
- fix hook dependency arrays only when behavior remains correct

**Step 3: Re-run lint after each batch**

Run: `bun run lint`

Expected: Warning count trends to zero.

**Step 4: Run the full verification suite**

Run:

```bash
bun run typecheck && bun run lint && bun run format:check && bun test && bun run build
```

Expected: Fully green verification pass with zero TypeScript errors, zero ESLint
warnings, passing tests, and successful production build.

**Step 5: Commit**

```bash
git add apps/web
git commit -m "chore: restore zero-warning verification baseline"
```

---

## Rollout Notes

- Execute Phase 1 before any page-local refactor. It removes duplicated auth and
  messaging branches that would otherwise be reimplemented multiple times.
- Execute Phase 4 before large admin UX polish. Otherwise work will be
  duplicated across both `/admin` and the dedicated admin routes.
- If time is constrained, the highest-value subset is: Task 1, Task 5, Task 6,
  Task 7, Task 8, Task 10.
- Keep the education page honest during rollout. If a workbench feature remains
  partial, mark it as partial rather than describing it as complete.

## Final Verification Gate

Before calling the rollout complete, verify all routed non-Markdown pages still
build and render:

```bash
bun run typecheck
bun run lint
bun run format:check
bun test
bun run build
```

Optional but recommended:

```bash
cd apps/web && bunx playwright test
```
