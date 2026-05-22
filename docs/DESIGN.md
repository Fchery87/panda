# Panda Design System

> **Last updated: 2026-05-20** — "Neutral Precision" refresh aligned with
> Cursor 2.0 / Antigravity 2.0 / 2026 IDE standards. Source of truth is
> `apps/web/app/globals.css`.

## Reader And Action

This document is for a product designer, design agent, or frontend engineer
creating new Panda screens. After reading it, they should be able to produce a
consistent Panda interface without re-reading the original product brief or
copying a previous mockup.

## Design Thesis

Panda is a premium operational workbench for AI-assisted code work. It should
feel calm, exact, recoverable, and technically serious. The interface is not a
chatbot, not a project dashboard, and not an IDE clone. It is a session-first
command surface where context, chat direction, plan review, execution proof,
changed work, and recovery stay visible in one browser workspace.

The visual direction is **neutral precision**: clean chromatic-neutral surfaces
(not warm cream, not cold blue-gray), subtle elevation hierarchy, restrained
orange accent reserved for active states and proof markers, and a professional
clarity that prioritizes usability over decoration.

## Core Principles

1. Keep the work in one place: every screen should clarify the relationship
   between context, current objective, agent direction, proof, changed work, and
   next action.
2. Make trust visible: mode, model, runtime, permission boundary, share
   boundary, and recovery state must be surfaced near the actions they affect.
3. Prefer bounded transparency: show useful summaries by default and reveal
   sensitive or verbose detail only behind explicit inspection surfaces.
4. Use density as a feature: Panda is for technically fluent users, so panels
   can carry real information, but every panel needs a clear job.
5. Treat approval as product architecture: plan review and risky actions are not
   modal afterthoughts; they are first-class states.
6. Avoid spectacle: motion, color, and elevation must clarify state changes
   rather than decorate the surface.
7. Both themes are designed, not auto-inverted: light and dark modes each have
   hand-tuned tokens. Never hardcode a color that only works in one mode.

## Visual Tokens

Use OKLCH tokens as the source of truth. All tokens live in
`apps/web/app/globals.css`.

### Light Mode

```css
:root {
  /* Core palette — clean neutral with faint cool undertone */
  --background: 99.07% 0.003 270;      /* Off-white canvas */
  --foreground: 14.5% 0.005 270;       /* Near-black text */

  /* Surfaces — barely-there elevation */
  --card: 97.5% 0.003 270;             /* Cards, panels */
  --surface-0: 99.07% 0.003 270;       /* Canvas */
  --surface-1: 97.5% 0.003 270;        /* Panels */
  --surface-2: 95.5% 0.004 270;        /* Hover, flyout */
  --surface-3: 93.5% 0.005 270;        /* Popovers, overlays */

  /* Brand accent — orange, used sparingly */
  --primary: 63.5% 0.17 40;            /* Active state, primary CTA */
  --primary-foreground: 99.07% 0.003 270;

  /* Structural */
  --muted: 95.5% 0.004 270;            /* Quiet backgrounds */
  --muted-foreground: 50% 0.008 270;   /* Secondary text */
  --border: 91.5% 0.004 270;           /* Subtle dividers */
  --accent: 93.5% 0.005 270;           /* Hover tint */

  /* Sidebar — slightly recessed */
  --sidebar-background: 96.5% 0.003 270;

  --radius: 6px;
}
```

### Dark Mode

```css
.dark {
  /* Core palette — deep charcoal with dimension */
  --background: 13% 0.005 270;         /* Canvas */
  --foreground: 93% 0.004 270;         /* Text */

  /* Surfaces — progressive lift */
  --card: 16.5% 0.005 270;
  --surface-0: 13% 0.005 270;
  --surface-1: 16.5% 0.005 270;
  --surface-2: 18% 0.005 270;
  --surface-3: 22% 0.006 270;

  /* Brand accent — brighter for same perceived vibrancy */
  --primary: 72% 0.165 55;
  --primary-foreground: 13% 0.005 270;

  /* Structural */
  --muted: 18% 0.005 270;
  --muted-foreground: 60% 0.01 270;
  --border: 24% 0.006 270;
  --accent: 22% 0.006 270;

  /* Sidebar — slightly darker than canvas */
  --sidebar-background: 11% 0.005 270;

  --radius: 6px;
}
```

### Token Roles

`--background` (surface-0) is the app canvas. Clean, neutral, and open. It may
carry a dot-grid treatment on public pages.

`--surface-1` (card) is the default panel, card, and editor background. One step
up from canvas — barely visible elevation.

`--surface-2` is for hover states and active flyout backgrounds.

`--surface-3` is for popovers and overlays — the most lifted surface.

`--foreground` is primary text and the strongest structural color. Use it for
high-priority labels and important content.

`--muted-foreground` is metadata, secondary labels, inactive tabs, helper copy,
and low-priority text.

`--border` is the default internal divider. Use it for file rows, tab
separators, card borders, and inspector sections. Subtle but visible.

`--primary` is Panda's orange accent. Use it ONLY for:
- Selected/active navigation items
- Primary action buttons
- Live runtime state indicators
- Proof markers and progress
- Focus ring outlines

Do not use it as general decoration, background fills, or decorative borders.

`--sidebar-background` is the sidebar rail background. It is recessed (slightly
lighter than canvas in light mode, slightly darker in dark mode) to create
natural visual hierarchy without inverting the color scheme.

## Color Behavior

The system is chromatic-neutral by default. Accent should appear in at most two
major roles per screen: active navigation and one proof/status family. If a
screen already uses accent for active rail selection, use subtle opacity tints
for chips rather than new accent blocks.

### Status Colors

Status colors are refined — clear but not garish. They signal without shouting.

| Status    | Light Mode             | Dark Mode              | Use                         |
| --------- | ---------------------- | ---------------------- | --------------------------- |
| Success   | `55% 0.12 155`         | `62% 0.14 155`         | Completed, online, healthy  |
| Error     | `52% 0.16 25`          | `58% 0.18 25`          | Failed, destructive         |
| Warning   | `68% 0.13 75`          | `72% 0.14 75`          | Review required, blocked    |
| Info      | `58% 0.1 230`          | `64% 0.11 230`         | Waiting, neutral status     |

### Diff Colors

Diff colors use semantic tints with proper opacity layers for background
highlighting.

| Role          | Use                                    |
| ------------- | -------------------------------------- |
| `--diff-added-fg`    | Added line text                        |
| `--diff-added-bg`    | Added line background                  |
| `--diff-removed-fg`  | Removed line text                      |
| `--diff-removed-bg`  | Removed line background                |

### Terminal Colors

Terminal uses muted, readable versions of the status palette. Not full
saturation — designed for scanning logs at speed.

### Forbidden Colors

Do not introduce:
- Cool gray canvases (blue-gray `#f0f4f8` style)
- Blue or cyan brand accents
- Purple AI gradients
- Rainbow model badges
- Glass panels or blur effects
- Cute mascot colors
- Decorative glow systems
- Hardcoded oklch/hex values that bypass the token system

## Typography

Panda uses one sans family for display and body because utility is the design
posture. The difference comes from weight, size, spacing, and monospace
metadata.

```css
--font-sans: Inter, system-ui, sans-serif;
--font-mono: Geist Mono, SF Mono, Consolas, monospace;
```

Display headings are compact, confident, and tightly tracked. Use them for
objective statements, plan artifact titles, and major public/product-tour
claims.

Body text is concise and operational. Avoid soft onboarding prose. A paragraph
should explain state, consequence, or next action.

Monospace is used for code, file paths, labels, badges, command output, file
metadata, mode names, runtime states, model names, counters, and audit/proof
rows. Do NOT use monospace for non-code UI text like section headings, button
labels, or descriptions.

Recommended scale:

| Role            |            Size |  Weight | Notes                                  |
| --------------- | --------------: | ------: | -------------------------------------- |
| Hero/objective  | 56-76px desktop | 740-780 | Tight tracking, one idea only          |
| Artifact title  |         32-42px | 720-760 | Used for plan and proof surfaces       |
| Section heading |         18-26px | 680-720 | Short nouns, not marketing lines       |
| Body            |         13-16px | 400-500 | Dense but readable                     |
| Metadata        |         10-12px | 500-700 | Monospace, for data and file paths     |
| Terminal/proof  |            12px | 400-600 | Monospace, tabular numerics            |

## Spatial System

Use a hard grid. No soft cards, no pill-shaped shells, no floating dashboard
islands.

Primary spacing values:

| Token       | Value | Use                              |
| ----------- | ----: | -------------------------------- |
| `--space-1` |   4px | Tight text gaps, icon-label gaps |
| `--space-2` |   8px | Chips, compact row groups        |
| `--space-3` |  12px | Row padding, inspector bodies    |
| `--space-4` |  16px | Panel bodies, compact cards      |
| `--space-5` |  22px | Shell padding, screen padding    |
| `--space-6` |  24px | Hero/objective card padding      |

Borders are 1px. Use `--border` for all dividers. Avoid using `--foreground` as
a border color except for the outermost app shell frame on public marketing
pages.

Border radius is `6px` (`--radius`). Use `rounded-md` for interactive elements,
`rounded-sm` for small chips and badges. Avoid `rounded-none` on interactive
controls — it creates unnecessarily harsh edges.

Public marketing surfaces may use sharp directional shadows, such as
`shadow-sharp-sm` through `shadow-sharp-lg`. Product workbench surfaces should
stay mostly flat except for one flagship objective or hero card.

## Backgrounds And Texture

Public landing and education surfaces use a restrained dot-grid pattern:

```css
.dot-grid {
  background:
    radial-gradient(
      circle at 16px 16px,
      oklch(var(--foreground) / 0.06) 0.7px,
      transparent 0.8px
    ),
    oklch(var(--background));
  background-size: 24px 24px, auto;
}
```

Inside the workbench canvas, the background is flat with no texture. Panels use
surface elevation to create visual hierarchy, not patterns.

## Surface Elevation

The elevation system creates depth without shadows:

| Level  | Light                      | Dark                       | Use                          |
| ------ | -------------------------- | -------------------------- | ---------------------------- |
| 0      | `99.07% 0.003 270` (canvas) | `13% 0.005 270` (canvas)   | App background               |
| 1      | `97.5% 0.003 270`          | `16.5% 0.005 270`          | Cards, panels, editors       |
| 2      | `95.5% 0.004 270`          | `18% 0.005 270`            | Hover states, flyouts        |
| 3      | `93.5% 0.005 270`          | `22% 0.006 270`            | Popovers, overlays           |

Each level is a barely perceptible step. The hierarchy works because of
consistent layering, not dramatic contrast.

## App Shell

The desktop workbench shell is the canonical Panda surface.

Required regions:

1. **Top bar**: project identity, selected mode, search/command entry, model,
   runtime, share state, and global actions.
2. **Left rail** (`SidebarRail`): icon-only navigation using `sidebar-*` tokens.
   Icons: Home, Projects (Folder), Sessions (History), Project Files (FolderTree),
   Agent Runs (Bot), Find Context (Search), Source Review (GitBranch), Settings.
3. **Left flyout** (`SidebarFlyout`): expandable section detail — file tree,
   search results, agent runs, git status, or session history. Uses `bg-card`
   and slides to 240px width.
4. **Center canvas** (`Workbench`): session home, file editor, plan artifact,
   diff review, or preview. Uses `bg-card` as background.
5. **Right panel** (`RightPanel`): chat by default, with Proof, Changes, and
   Context available as inspector tabs. Uses `bg-background` for header and
   `bg-card` for content.
6. **Bottom dock** (`BottomDock`): terminal and agent events with collapsed and
   expanded states. Uses token-based `bg-surface-1` (works in both themes).
7. **Status bar** (`StatusBar`): selected file, cursor/path, connection,
   streaming, spec, and runtime state. Uses `surface-1` background.

Do not squeeze all regions onto small screens. Mobile should switch between
Session, Chat, Proof, and Preview as focused views.

### Sidebar Rail Rules

- Background uses `--sidebar-background` (recessed, not inverted).
- Icons use `--sidebar-foreground` with opacity modifiers.
- Active items use `--sidebar-primary` at 10% opacity for background.
- Hover uses `--sidebar-accent` background.
- Session signal dots use status colors, not custom hues.

### Bottom Dock Rules

- Always uses token-based colors (`bg-surface-1`, `text-foreground`,
  `text-muted-foreground`). Never hardcode oklch values.
- Works identically in light and dark modes.
- Tab bar uses the `TabBar` component with `dock-tab` styling.

## Screen Coverage

Apply this system across these Panda surfaces:

1. **Public**: landing, education, login, maintenance, not-found, error, and
   shared chat. Uses dot-grid background, `border-border` for structural lines.
2. **Authenticated hub**: projects list, empty projects, new project dialog,
   delete confirmation, and settings entry points. Uses `bg-background` canvas.
3. **Workbench**: idle home, file editor, chat active, no provider, plan review,
   build executing, permission request, diff review, recoverable checkpoint, and
   runtime fallback. Uses sidebar + workbench + right panel layout.
4. **Settings**: general, LLM providers, automation, advanced permissions,
   unsaved changes, and provider testing.
5. **Admin**: dashboard, users, analytics, system controls, security audit,
   access denied, and maintenance-sensitive confirmations.
6. **Mobile**: Work, Chat, Proof, and Changes as focused views rather than a
   compressed desktop shell. Panda does not depend on a live-preview destination.

The visual language stays consistent across all surfaces. Density changes by
context: public pages are more typographic, workbench pages are dense and
operational, settings and admin pages are precise configuration surfaces.

## Layout Recipes

### Command Center

Use this for idle/home workbench states. The center canvas should have one large
objective card, a clear next action, and three operational signal cards: mode,
runtime, and proof. The side stack should summarize session timeline and next
move. This screen orients the user before work begins.

### Plan Review

Use this when a plan is generated or awaiting owner approval. The plan artifact
is the hero. Acceptance checks should be visible as rows with step numbers and
status chips. Approval, edit, risk, permission, and share boundaries belong in a
right-side approval rail. The shell should clearly indicate that execution has
not begun.

### Build Proof

Use this when Build mode is executing or has produced changed work. The center
canvas should privilege diff review and bounded proof. The right inspector
should show live run events, receipt state, checkpoint state, and stop/retry
actions. Terminal output remains visible but should not dominate the screen.

### Settings

Settings should be a configuration surface, not onboarding. Use left navigation
on desktop, horizontal tabs on mobile, dense provider cards, explicit
dirty/saved states, and restrained destructive confirmations.

### Public And Shared Views

Public landing and education pages can be more graphic, but they must still feel
operational. Use large type, dot grid, terminal-style product frames, and
directional shadows. Shared chat pages must be calm artifact views with no
owner-only controls.

### Admin

Admin screens should look related but more austere. Prioritize auditability:
filters, log rows, role labels, action badges, and confirmation states. Do not
reuse playful empty states or marketing hero language.

## Component Families

### Brand Mark

The mark is a square black tile with a monospace `P` and a small accent tab
offset to the top-right. It should feel like a terminal cursor, checkpoint tag,
or workbench stamp rather than a mascot.

### Status Chips (Badges)

Chips are small, rectangular, monospace labels. Use them for mode, runtime,
model, share, approval, run, artifact, and checkpoint state. They are not
decorative tags.

Two sizes: `badge-sm` (9px text, compact) and `badge-md` (10px text, with icon).

Status variants use data attributes:
- `data-status="running"` — accent tint
- `data-status="waiting"` — info tint
- `data-status="review"` — warning tint
- `data-status="failed"` — destructive tint
- `data-status="complete"` — success tint
- `data-status="draft"` — muted/neutral

### Rails And Tabs

Rails are compact and use `sidebar-*` tokens. Active rail items use a 10%
primary tint background. Tabs are rectangular, text-first, and use `dock-tab`
styling with an active underline indicator. Active tabs show a 2px primary
bottom inset shadow.

### Panels

Panels are flat rectangles with `border-border` dividers. Panel headers use
`panel-header` class: compact, `text-xs`, `text-muted-foreground`. Panel bodies
should use real rows and state summaries, not blank cards.

### Tab Bar

The `TabBar` component is the shared tab strip for dock tabs, center tabs, and
right panel tabs. Uses `surface-1` background with `border-border` bottom edge.
Active tab gets `dock-tab[data-active='true']` styling with inset shadow.

### Objective Cards

Use one objective card on workbench home or public hero surfaces. It can have a
directional shadow (`shadow-sharp-sm` through `shadow-sharp-lg`) in a restrained
tint. Do not repeat this elevation treatment across every card.

### Plan Artifacts

Plan artifacts should look like contracts. Include a title, status, short
rationale, numbered steps, acceptance checks, risk notes, and owner actions.
Make the current permission boundary obvious.

### Run Proof

Run proof should show step progress, receipt summary, checkpoint state, changed
files, and stop/retry/inspect actions. Raw logs, raw tool arguments, and private
file content belong behind explicit inspection, never in public projection.

### Diff Review

Diffs use monospace rows with line numbers. Additions and removals get subtle
semantic tints via `--diff-added-*` and `--diff-removed-*` tokens. Keep the
surrounding shell neutral so the changed work is the highest-information area.

### Terminal And Agent Events

The terminal is a dark surface (token-based via `surface-1` in dark mode), and
grounded at the bottom dock. Agent events sit beside or below it. Keep event
copy terse: event name, status, and short summary.

## Interaction And Motion

Motion is functional only.

Use motion for:

1. Revealing or collapsing inspectors, terminal, and permission panels.
2. Streaming assistant text or run-event updates.
3. Switching between Session, Plan, Diff, Proof, and Preview states.
4. Showing progress for runtime boot, tests, file writes, and checkpoint save.

Avoid decorative parallax, bouncing mascots, gradient animation, and theatrical
AI thinking effects. Duration should be fast: 120-180ms for panel changes, up to
240ms for larger state transitions.

## Copy Voice

Panda copy is operational and plain. It should tell users what state they are
in, what is safe, what is blocked, and what action is next.

Use:

1. `Review required`
2. `Build from approved plan`
3. `Checkpoint saved before file write`
4. `Server fallback available`
5. `Public share excludes private files`

Avoid:

1. `Unleash your creativity`
2. `AI magic at work`
3. `Supercharge everything`
4. `10x productivity`
5. Cute empty-state jokes

When a value is unknown, show a short honest stub such as `not configured`,
`waiting`, `private`, `unsupported`, or `no writes yet`. Do not invent usage
metrics or fake command results.

## Trust And Privacy Rules

Never expose these in public or shared views:

1. Provider tokens or API keys.
2. Raw command output.
3. Raw tool arguments.
4. Private file contents.
5. Checkpoint payloads.
6. Raw receipts or run event internals.
7. Signed attachment URLs.
8. Private project memory.
9. Admin-only data.

Owner workspaces may inspect sensitive detail, but the user must choose an
explicit panel or details action. Admin surfaces must emphasize audit logs,
actor, action, resource, time, and confirmation.

## Responsive Behavior

Desktop is the primary surface. Keep the full operational shell visible above
1100px.

Below desktop width, collapse in this order:

1. Hide the right inspector behind a bottom or side tab.
2. Hide the left flyout behind the rail.
3. Collapse terminal and agent events into a single Proof panel.
4. Switch the workbench to focused mobile tabs: Session, Chat, Proof, Preview.

Do not compress the desktop workbench into four unreadable columns on mobile.
Each mobile view should have one main job.

## Accessibility

Maintain clear focus states on rail items, tabs, buttons, and composer controls.
Keep hit targets at least 44px on touch surfaces. Status must not rely on color
alone; every state needs visible text. Terminal and diff regions should preserve
readable contrast. Avoid tiny labels below 10px.

## Anti-Patterns

Do not use:

1. Hardcoded oklch or hex color values — always use CSS variable tokens.
2. Rounded glass cards or blur effects.
3. Purple or blue AI gradients.
4. Cute panda mascot illustrations.
5. Emoji feature icons.
6. Dashboard KPI cards that make the product feel bureaucratic.
7. Soft shadows on every panel.
8. Marketing claims without evidence.
9. Hidden mode or model state.
10. Public shared views that resemble editable owner workspaces.
11. Dense panes without a named next action.
12. Inverted color schemes for the sidebar (use `sidebar-*` tokens instead).
13. `rounded-none` on interactive controls — use `rounded-md` minimum.

## Acceptance Checklist

Before shipping a Panda screen, check:

1. The active mode is visible near the user action that depends on it.
2. Runtime state is visible and distinguishes browser runtime from server
   fallback.
3. Plan, approval, execution, changed work, and recovery states have distinct
   treatments.
4. The accent is restrained and tied to active/proof state.
5. At least one clear next action is visible.
6. Sensitive detail is hidden behind explicit inspection unless the screen is
   owner-only and the user has chosen to inspect it.
7. The screen uses clean grid, consistent `6px` radius, `border-border` for
   dividers, and monospace for code/data.
8. Copy is specific to Panda's workflow and avoids generic AI-product language.
9. Mobile or narrow layouts reduce scope instead of squeezing the desktop shell.
10. Public/share/admin surfaces respect their trust boundary.
11. All colors use token-based CSS variables — no hardcoded oklch or hex values.
12. Both light and dark modes render correctly — no dark-only or light-only
    styling.
