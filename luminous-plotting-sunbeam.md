# Panda IDE: Enterprise UI/UX Design System Overhaul

## Context

Panda is a browser-based IDE with an intentional **"brutalist-meets-IDE"** design language: zero border-radius, sharp offset shadows, monospace labels, numbered sections, and an amber/gold brand color. The aesthetic is distinctive and appropriate for a developer tool, but it's applied **inconsistently** across the codebase, creating friction, accessibility gaps, and visual dissonance. This plan establishes a scalable, enterprise-grade design system that refines (not replaces) the existing identity.

**Key problems being solved:**
- 43+ hardcoded color values (`zinc-*`, `rose-*`, `emerald-*`) bypassing the token system
- Fragmented typography scale (arbitrary `text-[11px]`, `text-[13px]` brackets)
- Border-radius conflicts (`rounded-2xl` on MessageBubble, `rounded-md`/`rounded-lg` in base components vs `--radius: 0px`)
- Missing accessibility (no tree roles, no aria-live regions, missing skip links on 4/6 layouts)
- CodeMirror `oneDark` theme clashing with warm neutral UI palette
- No semantic status/terminal/diff color tokens

**Design decisions (user-approved):**
- **Chat bubbles:** Sharp blocks (`rounded-none`) to enforce cohesive brutalist identity
- **Execution order:** Foundation-first (fix base primitives before workbench tokenization)

---

## Phase 1: Design Token Foundation
**Risk: Low (additive only) | No visual changes**

### 1.1 Extend CSS Variables in `globals.css`
**File:** `/apps/web/app/globals.css`

Add to both `:root` and `.dark` blocks:

```css
/* Status colors */
--status-success: 142 71% 45%;
--status-error: 0 84% 60%;
--status-warning: 38 92% 50%;
--status-info: 217 91% 60%;
--status-online: 142 71% 45%;

/* Terminal semantic colors */
--terminal-success: 142 71% 65%;     /* light mode: 142 71% 35% */
--terminal-error: 0 76% 72%;         /* light mode: 0 76% 50% */
--terminal-warning: 38 92% 65%;      /* light mode: 38 92% 45% */

/* Diff semantic colors */
--diff-added-bg: 142 71% 45%;
--diff-added-fg: 142 71% 45%;
--diff-removed-bg: 0 84% 60%;
--diff-removed-fg: 0 84% 60%;

/* Interactive states */
--interactive-hover: 38 92% 50%;
--interactive-selected: 38 92% 50%;
```

Add new utility classes in `@layer components`:
```css
.text-terminal-success { color: hsl(var(--terminal-success)); }
.text-terminal-error { color: hsl(var(--terminal-error)); }
.text-terminal-warning { color: hsl(var(--terminal-warning)); }
.bg-terminal-success { background-color: hsl(var(--terminal-success) / 0.05); }
.bg-terminal-error { background-color: hsl(var(--terminal-error) / 0.05); }
.text-diff-added { color: hsl(var(--diff-added-fg)); }
.text-diff-removed { color: hsl(var(--diff-removed-fg)); }
.bg-diff-added { background-color: hsl(var(--diff-added-bg) / 0.1); }
.bg-diff-removed { background-color: hsl(var(--diff-removed-bg) / 0.1); }
.bg-status-online { background-color: hsl(var(--status-online)); }
```

### 1.2 Extend Tailwind Config
**File:** `/apps/web/tailwind.config.ts`

Add to `theme.extend`:
```ts
fontSize: {
  'code-xs': ['11px', { lineHeight: '16px' }],
  'code-sm': ['12px', { lineHeight: '18px' }],
  'code-base': ['13px', { lineHeight: '20px' }],
  'code-lg': ['14px', { lineHeight: '22px' }],
},
colors: {
  // ...existing colors...
  status: {
    success: 'hsl(var(--status-success))',
    error: 'hsl(var(--status-error))',
    warning: 'hsl(var(--status-warning))',
    info: 'hsl(var(--status-info))',
    online: 'hsl(var(--status-online))',
  },
},
```

### 1.3 Create Design Token Reference
**New file:** `/apps/web/lib/design-tokens.ts`

TypeScript constants documenting all tokens for programmatic access.

**Verification:** `bun run build` in `apps/web` succeeds; all pages render identically before/after.

---

## Phase 2: Base UI Primitives (Foundation Fix)
**Risk: Medium (widest blast radius) | Fixes defaults so all downstream work inherits clean values**

### 2.1 Fix Base Component Border Radius Conflict
These components define `rounded-md` / `rounded-lg` which resolves to 0px or negative values with `--radius: 0px`. Make the intent explicit:

**File:** `/apps/web/components/ui/button.tsx` (line 8)
- Replace `rounded-md` -> `rounded-none` in base CVA class
- Remove `rounded-md` from `sm` and `lg` size variants

**File:** `/apps/web/components/ui/card.tsx`
- Replace `rounded-lg` -> `rounded-none` (explicit over implicit)
- Replace `shadow-sm` -> `shadow-sharp-sm`

**File:** `/apps/web/components/ui/tabs.tsx`
- Replace `rounded-lg` (TabsList) -> `rounded-none`
- Replace `rounded-md` (TabsTrigger) -> `rounded-none`

### 2.2 Add Missing Skip Links
**Files to add skip-to-main-content link:**
- `/apps/web/app/page.tsx` (landing)
- `/apps/web/app/admin/layout.tsx`
- `/apps/web/app/login/page.tsx`
- `/apps/web/app/settings/page.tsx`

Pattern (reuse from DashboardLayout):
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4 focus:text-foreground">
  Skip to main content
</a>
```

**Verification:**
- Run `bun run build` to confirm no regressions
- Spot-check all pages for visual consistency after base component changes

---

## Phase 3: IDE Workbench Hardening (Hero Experience)
**Risk: Medium | Highest-traffic area**

### 3.1 Tokenize EditorContainer
**File:** `/apps/web/components/editor/EditorContainer.tsx` (lines 60-62)
- Replace `border-zinc-800` -> `border-border`
- Replace `bg-zinc-900` -> `surface-2`
- Replace `text-zinc-400` -> `text-muted-foreground`

### 3.2 Tokenize Preview Component (28 hardcoded instances)
**File:** `/apps/web/components/workbench/Preview.tsx`
- Replace all `zinc-*` classes with semantic tokens (`border-border`, `text-muted-foreground`, `bg-background`, `surface-1`)
- Replace `bg-green-500` -> `bg-status-online`
- Replace `text-zinc-400 hover:text-zinc-300` -> `text-muted-foreground hover:text-foreground`
- Add `aria-label` to: Refresh, External Link, Fullscreen, device toggle buttons

### 3.3 Tokenize Terminal
**File:** `/apps/web/components/workbench/Terminal.tsx` (lines 107-231)
- Replace `text-rose-300` -> `text-terminal-error`
- Replace `text-emerald-300` -> `text-terminal-success`
- Replace `text-amber-300` -> `text-terminal-warning`
- Replace `text-zinc-300` -> `text-muted-foreground`
- Replace `border-zinc-800` -> `border-border`
- Replace `bg-emerald-500/5` -> `bg-terminal-success`
- Replace `bg-rose-500/5` -> `bg-terminal-error`
- Add `aria-label` to Cancel and Delete icon buttons
- Add `aria-expanded` to JobCard expand/collapse toggle
- Add `aria-live="polite"` to log output ScrollArea

### 3.4 Accessibility: FileTree
**File:** `/apps/web/components/workbench/FileTree.tsx`
- Add `role="tree"` to root container
- Add `role="treeitem"` to each TreeItem
- Add `aria-expanded={isExpanded}` to directory items
- Add `aria-selected={isSelected}` to items
- Replace `text-[13px]` -> `text-code-base`
- Replace `rounded-md` -> `rounded-none`

### 3.5 Accessibility: FileTabs
**File:** `/apps/web/components/workbench/FileTabs.tsx`
- Wrap in `role="tablist"` with `aria-label="Open files"`

### 3.6 Standardize StatusBar Typography
**File:** `/apps/web/components/workbench/StatusBar.tsx`
- Replace `text-[11px]` -> `text-code-xs`
- Add `aria-live="polite"` for connection status

### 3.7 Tokenize DiffViewer
**File:** `/apps/web/components/workbench/DiffViewer.tsx`
- Replace `text-red-500` -> `text-diff-removed`
- Replace `text-emerald-500` -> `text-diff-added`
- Replace `bg-red-500/10` -> `bg-diff-removed`
- Replace `bg-emerald-500/10` -> `bg-diff-added`
- Replace `border-l-red-500` -> `border-l-[hsl(var(--diff-removed-fg))]`
- Replace `border-l-emerald-500` -> `border-l-[hsl(var(--diff-added-fg))]`

### 3.8 Custom CodeMirror Theme
**New file:** `/apps/web/components/editor/panda-theme.ts`

Custom theme using Panda's warm neutral palette:
- Background: `hsl(var(--surface-0))`
- Gutter: `hsl(var(--surface-1))`
- Cursor: `hsl(var(--primary))`
- Selection: `hsl(var(--primary) / 0.2)`
- Line highlight: `hsl(var(--primary) / 0.06)`

**File:** `/apps/web/components/editor/CodeMirrorEditor.tsx` (line 181)
- Replace `import { oneDark }` -> `import { pandaTheme }`

**Verification:**
- Manually verify: keyboard Tab through file tree, editor tabs, terminal
- Compare editor theme colors against surrounding UI for harmony
- Test light and dark modes

---

## Phase 4: Chat System Polish
**Risk: Low-Medium**

### 4.1 Enforce Brutalist Identity on MessageBubble
**File:** `/apps/web/components/chat/MessageBubble.tsx` (line 92)
- Replace `rounded-2xl` -> `rounded-none` (sharp blocks match IDE identity)
- Remove `rounded-tr-sm` / `rounded-tl-sm` concessions
- Replace `text-amber-500/90` (line ~116) -> `text-primary/90`

### 4.2 Chat Accessibility
**File:** `/apps/web/components/chat/ChatInput.tsx`
- Add `aria-label="Send message"` to Send button
- Add `aria-label="Stop generation"` to Stop button

**File:** `/apps/web/components/chat/MessageList.tsx`
- Add `role="log"` and `aria-live="polite"` wrapper

### 4.3 Tokenize ContextWindowIndicator
**File:** `/apps/web/components/chat/ContextWindowIndicator.tsx`
- Replace `bg-amber-500` -> `bg-status-warning`
- Replace `text-amber-500` -> `text-status-warning`

**Verification:** Screen reader test of chat send/receive flow.

---

## Phase 5: Dashboard, Settings, Admin
**Risk: Low**

### 5.1 Tokenize Admin Components
**File:** `/apps/web/components/admin/AuditLog.tsx` + `SystemOverview.tsx`
- Replace `bg-green-500/10` -> `bg-status-success/10`
- Replace `text-green-500` -> `text-status-success`
- Replace `text-amber-500` -> `text-status-warning`

### 5.2 Tokenize GitHub Import Dialog
**File:** `/apps/web/components/github/GitHubImportDialog.tsx` (lines 262-264)
- Replace `border-green-500/50` -> `border-status-success/50`
- Replace `bg-green-500/10` -> `bg-status-success/10`
- Replace `text-green-600` -> `text-status-success`

**Verification:** Visual regression check across admin and settings pages in light + dark mode.

---

## Phase 6: Landing Page + Final Polish
**Risk: Low**

### 6.1 Landing Page
**File:** `/apps/web/app/page.tsx`
- Verify terminal mockup colors use tokenized palette
- Update feature card hover states to use `hover:border-primary` consistently

### 6.2 Shared Chat Viewer
**File:** `/apps/web/app/s/[shareId]/page.tsx`
- Verify token usage

### 6.3 Font Optimization
**File:** `/apps/web/app/layout.tsx`
- Consider subsetting Fira Code to weights 400 + 500 only (saves ~80KB; 600/700 rarely used in UI)

**Verification:**
- Lighthouse audit (performance + accessibility scores)
- Mobile responsive check at 375px, 768px, 1024px, 1440px

---

## Phase 7: Documentation + Governance
**Risk: Low (new files only)**

### 7.1 Design System Reference
**New file:** `/apps/web/DESIGN_SYSTEM.md`
- Document all tokens, typography scale, spacing patterns, component rules
- Include do/don't examples for the brutalist identity

### 7.2 Lint Rule for Token Enforcement
Extend ESLint config with `no-restricted-syntax` patterns to warn on:
- Direct `zinc-*`, `rose-*`, `emerald-*`, `green-*`, `amber-*` usage outside `globals.css`
- `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl` usage (should be `rounded-none`)

---

## Critical Files Summary

| File | Phase | Changes |
|------|-------|---------|
| `apps/web/app/globals.css` | 1 | Add ~30 semantic CSS variables + utility classes |
| `apps/web/tailwind.config.ts` | 1 | Extend fontSize, colors |
| `apps/web/lib/design-tokens.ts` | 1 | **NEW** - Token reference constants |
| `apps/web/components/ui/button.tsx` | 2 | rounded-md -> rounded-none |
| `apps/web/components/ui/card.tsx` | 2 | rounded-lg -> rounded-none + sharp shadow |
| `apps/web/components/ui/tabs.tsx` | 2 | rounded-* -> rounded-none |
| `apps/web/app/page.tsx` | 2 | Add skip link |
| `apps/web/app/admin/layout.tsx` | 2 | Add skip link |
| `apps/web/app/login/page.tsx` | 2 | Add skip link |
| `apps/web/app/settings/page.tsx` | 2 | Add skip link |
| `apps/web/components/editor/panda-theme.ts` | 3 | **NEW** - Custom CodeMirror theme |
| `apps/web/components/editor/CodeMirrorEditor.tsx` | 3 | Swap oneDark for pandaTheme |
| `apps/web/components/editor/EditorContainer.tsx` | 3 | Replace zinc-* with tokens |
| `apps/web/components/workbench/Preview.tsx` | 3 | Replace 28 hardcoded colors + add aria-labels |
| `apps/web/components/workbench/Terminal.tsx` | 3 | Replace terminal colors + add ARIA attrs |
| `apps/web/components/workbench/FileTree.tsx` | 3 | Add tree roles + standardize typography |
| `apps/web/components/workbench/FileTabs.tsx` | 3 | Add tablist role |
| `apps/web/components/workbench/StatusBar.tsx` | 3 | Standardize font size + aria-live |
| `apps/web/components/workbench/DiffViewer.tsx` | 3 | Replace diff colors with tokens |
| `apps/web/components/chat/MessageBubble.tsx` | 4 | rounded-2xl -> rounded-none + tokenize |
| `apps/web/components/chat/ChatInput.tsx` | 4 | Add aria-labels |
| `apps/web/components/chat/MessageList.tsx` | 4 | Add role="log" + aria-live |
| `apps/web/components/chat/ContextWindowIndicator.tsx` | 4 | Tokenize amber-* colors |
| `apps/web/components/admin/AuditLog.tsx` | 5 | Tokenize status colors |
| `apps/web/components/admin/SystemOverview.tsx` | 5 | Tokenize status colors |
| `apps/web/components/github/GitHubImportDialog.tsx` | 5 | Tokenize status colors |

## Existing Utilities to Reuse
- `cn()` from `/apps/web/lib/utils.ts` - class merging
- `.surface-0/1/2` classes - surface elevation (already in globals.css)
- `.shadow-sharp-sm/md/lg` - sharp shadows (already in globals.css)
- `.panel-header` / `.panel-header-numbered` - panel styling (already in globals.css)
- `.text-display` / `.text-label` - typography utilities (already in globals.css)
- `.transition-sharp` - animation timing (already in globals.css)
- `.scrollbar-thin` / `.scrollbar-hide` - scrollbar styling (already in globals.css)

## End-to-End Verification Plan
1. **Build check:** `bun run build` in `apps/web` succeeds
2. **Type check:** `bun run typecheck` passes
3. **Lint check:** `bun run lint` passes
4. **Visual regression:** Screenshot each page in light + dark mode at 1440px and 375px
5. **Accessibility:** Run axe-core on `/`, `/login`, `/projects`, `/projects/[id]`, `/settings`, `/admin`
6. **Keyboard nav:** Tab through entire IDE workbench, verify focus visibility
7. **Screen reader:** Test chat message streaming with VoiceOver/NVDA
8. **Performance:** Lighthouse audit targeting 90+ performance, 90+ accessibility
9. **E2E tests:** `npx playwright test` if existing tests exist
