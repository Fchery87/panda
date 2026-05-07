# Spec: Panda Design System Redesign

## Deliverables

- [ ] Replace the existing warm amber visual tokens with the OKLCH Panda design
      system from `docs/DESIGN.md`.
- [ ] Apply the new hard-grid, flat-panel, green-proof visual language to the
      public landing page and primary workbench shell.
- [ ] Preserve the existing session-first workbench behavior, including desktop
      regions and mobile focused views.
- [ ] Add regression coverage for the design-system contract and responsive
      mobile view labels.

## Constraints

- Follow `docs/DESIGN.md` over the older AGENTS brutalist token examples.
- Keep the canonical workflow modes as `ask`, `plan`, `code`, and `build`.
- Do not introduce purple gradients, glass panels, rounded shells, mascot color
  systems, or decorative glow.
- Keep Convex query shapes unchanged.

## Out of scope

- Rebuilding every settings, admin, education, and shared-chat screen in this
  pass.
- Changing product data models, agent runtime behavior, or Convex backend APIs.
