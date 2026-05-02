# Spec: Custom Skills Phase 1

## Deliverables

- [ ] Add Convex schema support for user-scoped Custom Skills.
- [ ] Add authenticated Custom Skill list/get/create/update/delete functions.
- [ ] Enforce ownership and admin policy for Custom Skill access.
- [ ] Expose admin policy defaults for Custom Skills alongside existing
      settings.
- [ ] Add targeted tests for Custom Skill ownership and admin-policy contracts.

## Constraints

- Custom Skills are workflow documents, not executable plugins.
- Do not implement UI, runtime preflight, prompt composition, or import/export
  in this phase.
- New schema fields added to existing tables must be optional unless data is
  backfilled.
- Preserve existing Custom Subagent behavior.

## Out of scope (log here during the run, do not act on)

- Project-scoped Skills.
- Team registries or marketplaces.
- Executable Skill matchers or tool calls.
- Run/proof Applied Skill rendering.
