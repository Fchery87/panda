# SPEC: Panda.ai Design Redesign

## Direction

**Precision & Clarity** — Refined Swiss/editorial aesthetic. Crisp typography,
generous whitespace, evolved amber accent. Think Linear meets Bloomberg for a
developer workbench.

## Deliverables

- [ ] Update core design tokens (globals.css) — refined amber palette, editorial
      typography scale
- [ ] Update tailwind.config.ts with new typography, colors, spacing
- [ ] Refine panda-logo SVG and palette
- [ ] Redesign PublicNav — cleaner, more refined header
- [ ] Redesign PublicFooter — editorial footer with better hierarchy
- [ ] Redesign Landing Page (page.tsx) — hero, features, workflow, CTA
- [ ] Redesign Dashboard Layout — cleaner container, refined header
- [ ] Redesign Projects Page — refined project list, new dialog styling
- [ ] Redesign Login Page — elevated auth entry
- [ ] Redesign Education/Guide Page — refined interface guide layout
- [ ] Redesign Admin Page — refined dashboard hub
- [ ] Validation gate:
      `bun run typecheck && bun run lint && bun run format:check && bun test`

## Design Tokens

### Colors

- Base: Warm off-white (#F7F5F0) → evolved from #F2F0E6
- Ink: Near-black (#1A1A18)
- Primary: Refined amber (#E8951A) → deeper, more sophisticated than #F9A825
- Muted / secondary: Subtle warm grays
- Borders: Sharp, thin (#E5E0D5)

### Typography

- Headings: Plus Jakarta Sans (imported via next/font)
- Body: Inter (imported via next/font)
- Mono/Code: JetBrains Mono
- Size scale: More refined, generous leading

### Iconography

- Replace generic lucide-react icons with custom minimal SVG icons
- Clean, thin, consistent stroke weights
- Custom mode icons (ask, plan, code, build)

## Constraints

- Preserve all existing functionality (Convex queries, auth, routing)
- Must pass TypeScript, lint, and build gates
- Maintain dark mode support
- Keep the brutalist sharp-corners DNA but elevate execution
