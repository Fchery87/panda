# Panda Design System

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

The visual direction is **warm editorial utility with brutalist precision**:
tinted cream surfaces, dark navy product chrome, sharp grid divisions, monospace
operational labels, dense but legible panels, and a restrained orange accent
reserved for primary action, active state, and proof.

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

## Visual Tokens

Use OKLCH tokens as the source of truth.

```css
:root {
  --bg: oklch(98.18% 0.0054 95.1);
  --surface: oklch(93.57% 0.0161 82.79);
  --fg: oklch(19.08% 0.002 106.59);
  --muted: oklch(52.42% 0.0096 91.56);
  --border: oklch(90.72% 0.0122 67.67);
  --accent: oklch(55.53% 0.1455 49);

  --font-display:
    -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui,
    sans-serif;
  --font-body:
    -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui,
    sans-serif;
  --font-mono:
    'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace;
}
```

### Token Roles

`--bg` is the tinted cream app background and large workspace field. It may
carry a dot-grid or fine grid treatment.

`--surface` is the warm cream panel, editor, card, and control background. Keep
it clean and flat.

`--fg` is the strongest structural color. Use it for outer shell borders, rail
backgrounds, primary text, and high-risk division lines.

`--muted` is metadata, secondary labels, inactive tabs, helper copy, and
low-priority transcript text.

`--border` is the default internal divider. Use it for file rows, tab
separators, card borders, and inspector sections.

`--accent` is Panda's orange active state and proof color. Use it for selected
rail items, live runtime state, progress, selected screen state, focused mode,
primary actions, and a small number of status chips. Do not use it as general
decoration.

## Color Behavior

The system is mostly neutral. Accent should appear in at most two major roles
per screen: active navigation and one proof/status family. If a screen already
uses accent for active rail selection, use subtle `color-mix()` tints for chips
rather than new accent blocks.

Use these semantic extensions when needed:

```css
--terminal-bg: oklch(20.5% 0.0042 84.59);
--terminal-fg: oklch(85.84% 0.0192 75.3);
--success-bg: oklch(95% 0.035 149.41);
--success-fg: oklch(42% 0.11 149.41);
--danger-bg: oklch(96% 0.035 23.96);
--danger-fg: oklch(42% 0.09 23.96);
--warn-bg: oklch(96% 0.035 67.39);
--warn-border: oklch(77.16% 0.1212 67.39);
```

Dark mode uses a brighter orange companion, `oklch(71.02% 0.1464 62.29)`, so
accent text and focus states remain legible on dark navy product surfaces.

Do not introduce cool gray canvases, blue/cyan brand accents, purple AI
gradients, rainbow model badges, glass panels, cute mascot colors, or decorative
glow systems.

## Typography

Panda uses one sans family for display and body because utility is the design
posture. The difference comes from weight, size, spacing, and monospace
metadata.

Display headings are compact, confident, and tightly tracked. Use them for
objective statements, plan artifact titles, and major public/product-tour
claims.

Body text is concise and operational. Avoid soft onboarding prose. A paragraph
should explain state, consequence, or next action.

Monospace is mandatory for labels, badges, rail markers, command output, file
metadata, mode names, runtime states, model names, counters, and audit/proof
rows.

Recommended scale:

| Role            |            Size |  Weight | Notes                                  |
| --------------- | --------------: | ------: | -------------------------------------- |
| Hero/objective  | 56-76px desktop | 740-780 | Tight tracking, one idea only          |
| Artifact title  |         32-42px | 720-760 | Used for plan and proof surfaces       |
| Section heading |         18-26px | 680-720 | Short nouns, not marketing lines       |
| Body            |         13-16px | 400-500 | Dense but readable                     |
| Metadata        |         10-12px | 500-700 | Monospace, uppercase when navigational |
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

Borders are usually 1px. Use `--fg` for external frame lines and critical
divisions. Use `--border` for internal row separators. Avoid rounded corners;
default radius is 0. If a browser-native control forces a radius, keep it below
2px.

Public marketing surfaces may use sharp directional shadows, such as
`10px 10px 0 color-mix(in oklch, var(--fg) 12%, transparent)`. Product workbench
surfaces should stay mostly flat except for one flagship objective or hero card.

## Backgrounds And Texture

Workspace and public home surfaces should use restrained technical texture:

```css
background:
  linear-gradient(
    90deg,
    color-mix(in oklch, var(--border) 60%, transparent) 1px,
    transparent 1px
  ),
  linear-gradient(
    color-mix(in oklch, var(--border) 60%, transparent) 1px,
    transparent 1px
  ),
  radial-gradient(
    circle at 16px 16px,
    color-mix(in oklch, var(--accent) 28%, transparent) 1.3px,
    transparent 1.4px
  ),
  var(--bg);
background-size:
  48px 48px,
  48px 48px,
  16px 16px,
  auto;
```

Inside the workbench canvas, reduce the grid to fine panel texture and remove
the dot layer. The grid should help orientation, not compete with code, chat, or
proof.

## App Shell

The desktop workbench shell is the canonical Panda surface.

Required regions:

1. Top bar: project identity, selected mode, search/command entry, model,
   runtime, share state, and global actions.
2. Left rail: files, search, git, agents, history/tasks, deploy. Markers should
   be short monospace codes or purpose-built icons.
3. Left flyout: active navigation detail such as file tree, search results,
   changed work, agents, or history.
4. Center canvas: session home, file editor, plan artifact, diff review, or
   preview.
5. Right inspector: chat by default, with Run, Changes, Context, and Preview
   available as inspector tabs.
6. Bottom dock: terminal and agent events with collapsed and expanded states.
7. Status bar: selected file, cursor/path, connection, streaming, spec, and
   runtime state.

Do not squeeze all regions onto small screens. Mobile should switch between
Session, Chat, Proof, and Preview as focused views.

## Screen Coverage

Apply this system across these Panda surfaces:

1. Public: landing, education, login, maintenance, not-found, error, and shared
   chat.
2. Authenticated hub: projects list, empty projects, new project dialog, delete
   confirmation, and settings entry points.
3. Workbench: idle home, file editor, chat active, no provider, plan review,
   build executing, permission request, diff review, recoverable checkpoint, and
   runtime fallback.
4. Settings: general, LLM providers, automation, advanced permissions, unsaved
   changes, and provider testing.
5. Admin: dashboard, users, analytics, system controls, security audit, access
   denied, and maintenance-sensitive confirmations.
6. Mobile: Session, Chat, Proof, and Preview as focused views rather than a
   compressed desktop shell.

The visual language should stay consistent across all surfaces, but density
changes by context. Public pages are more typographic and graphic. Workbench
pages are dense and operational. Settings and admin pages are precise
configuration surfaces.

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
operational. Use large type, dot grid, terminal-style product frames, and hard
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

### Status Chips

Chips are small, rectangular, monospace labels. Use them for mode, runtime,
model, share, approval, run, artifact, and checkpoint state. They are not
decorative tags.

Default chip: border `--border`, surface background, foreground text.

Accent chip: accent border or 8-12% accent tint for active/proof states.

Warning chip: use the warning semantic extension for review-required or stop
states.

### Rails And Tabs

Rails are high-contrast and compact. Active rail items may use accent fill. Tabs
are rectangular, bordered, and text-first. Active tabs use a surface/background
tint rather than a large color block unless the state is high trust or live
proof.

### Panels

Panels are flat rectangles with hard internal dividers. Panel headers are
42-48px tall, monospace, uppercase, and quiet. Panel bodies should use real rows
and state summaries, not blank cards.

### Objective Cards

Use one objective card on workbench home or public hero surfaces. It can have a
hard directional shadow in a restrained accent tint. Do not repeat this
elevation treatment across every card.

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
semantic tints. Keep the surrounding shell neutral so the changed work is the
highest-information area.

### Terminal And Agent Events

The terminal is dark, rectangular, and grounded at the bottom. Agent events sit
beside or below it. Keep event copy terse: event name, status, and short
summary.

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

1. Rounded glass cards.
2. Purple or blue AI gradients.
3. Cute panda mascot illustrations.
4. Emoji feature icons.
5. Dashboard KPI cards that make the product feel bureaucratic.
6. Soft shadows on every panel.
7. Marketing claims without evidence.
8. Hidden mode or model state.
9. Public shared views that resemble editable owner workspaces.
10. Dense panes without a named next action.

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
7. The screen uses hard grid, sharp corners, thin borders, and monospace
   metadata.
8. Copy is specific to Panda's workflow and avoids generic AI-product language.
9. Mobile or narrow layouts reduce scope instead of squeezing the desktop shell.
10. Public/share/admin surfaces respect their trust boundary.
