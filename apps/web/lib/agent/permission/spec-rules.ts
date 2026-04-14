import type { FormalSpecification } from '@/lib/agent/spec/types'
import type { PermissionRule } from '@/lib/agent/harness/permission/types'

/**
 * Build permission rules derived from an active FormalSpecification.
 *
 * When a spec is active, writes to files outside the spec's declared scope
 * require explicit approval (decision: 'ask'). Files within scope are allowed.
 *
 * Rule order matters (last-rule-wins):
 * 1. Broad out-of-scope rule: edit → ask
 * 2. Per-file allow rules for each in-scope file: edit + pattern → allow
 *
 * Result: only in-scope files get 'allow'; everything else falls through to 'ask'.
 *
 * Scope is derived from two sources on SpecPlan:
 * - `plan.steps[].targetFiles` — explicit file targets declared per step
 * - `plan.dependencies[]` — FileDependency entries with write/create/delete access
 *   (read-only dependencies are excluded; they don't require scope protection)
 */
export function rulesForSpec(spec: FormalSpecification | null | undefined): PermissionRule[] {
  if (!spec) return []

  const scope = new Set<string>()

  // Source 1: targetFiles declared on each plan step
  for (const step of spec.plan?.steps ?? []) {
    for (const file of step.targetFiles ?? []) {
      if (file) scope.add(file)
    }
  }

  // Source 2: file dependencies with mutating access
  for (const dep of spec.plan?.dependencies ?? []) {
    if (dep.path && dep.access !== 'read') {
      scope.add(dep.path)
    }
  }

  if (scope.size === 0) return []

  return [
    // Broad rule: out-of-scope edits require approval
    {
      capability: 'edit' as const,
      decision: 'ask' as const,
      source: 'spec' as const,
      reason: 'edit outside spec scope requires approval',
    },
    // Per-file allow rules — last-rule-wins lets these override the broad 'ask' above
    ...Array.from(scope).map<PermissionRule>((pattern) => ({
      capability: 'edit' as const,
      pattern,
      decision: 'allow' as const,
      source: 'spec' as const,
      reason: `in spec scope: ${pattern}`,
    })),
  ]
}
