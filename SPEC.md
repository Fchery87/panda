# Spec: "Ink & Paper" design system — full UI/UX redesign

## Deliverables

- [ ] New token layer (globals.css + tailwind.config.ts): warm paper canvas, violet-ink primary, lavender accent, teal run signals, 12px radius, violet-tinted shadows, light + dark modes designed
- [ ] `.ink-panel` signature mechanism: local CSS-variable re-theme that turns any agent-execution surface into a dark violet-ink island
- [ ] New type system: Bricolage Grotesque (display) + Schibsted Grotesk (body) + Geist Mono (code only)
- [ ] Restyled shared chrome: Button (pill), PandaLogo, PublicNav, PublicFooter, DashboardHeader, AuthenticatedPageShell
- [ ] Redesigned pages: landing, login, projects home (Codex-style centered layout)
- [ ] Workbench chrome: WorkbenchTopBar becomes an ink panel; shell polish
- [ ] Global removal of hardcoded `rounded-none` overrides so radius is uniform
- [ ] Updated design contract test (`design-system-css.test.ts`) + rewritten `docs/DESIGN.md`
- [ ] Validation gate green: `bun run typecheck && bun run lint && bun test`

## Constraints

- Preserve all component APIs, handlers, aria-labels, and test-asserted behavior (mobile view aria-labels in ProjectWorkspaceLayout, skip link, icon metadata)
- Keep every existing CSS utility class name (`surface-*`, `shadow-sharp-*`, `dock-tab`, `badge-*`, `state-band`, etc.) — restyle values only, so unvisited components inherit the new look
- Honor approved palette memory: warm white canvas + deep violet + lavender; no blue-slate, no beige/orange
- Copy follows sentence case, plain verbs; no uppercase-mono labels in product chrome
- Quality floor: responsive to mobile, visible keyboard focus, reduced motion respected

## Out of scope (log here during the run, do not act on)

- Deep interior workbench panels (editor tabs, timeline internals, chat bubbles) beyond what tokens re-skin automatically
- Admin pages beyond token inheritance
- Icon set replacement (lucide stays)
