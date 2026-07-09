'use client'

import * as React from 'react'

import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  COMMAND_FAMILIES,
  COMMAND_FAMILY_DESCRIPTIONS,
  COMMAND_FAMILY_LABELS,
  getAllowedUserCommandFamilyDecisions,
  mergeCommandFamilyPolicy,
  normalizeCommandFamilyPolicy,
  type CommandFamilyDecision,
  type CommandFamilyPolicyEntry,
} from '@/lib/agent/command-family-policy'
import { cn } from '@/lib/utils'

interface CommandFamilyPolicyEditorProps {
  adminPolicy: CommandFamilyPolicyEntry[] | null | undefined
  userPreferences: CommandFamilyPolicyEntry[] | null | undefined
  onChange: (preferences: CommandFamilyPolicyEntry[]) => void
  className?: string
}

function decisionLabel(decision: CommandFamilyDecision): string {
  if (decision === 'allow') return 'Allow'
  if (decision === 'ask') return 'Ask'
  return 'Deny'
}

export function CommandFamilyPolicyEditor({
  adminPolicy,
  userPreferences,
  onChange,
  className,
}: CommandFamilyPolicyEditorProps) {
  const normalizedAdminPolicy = React.useMemo(
    () => normalizeCommandFamilyPolicy(adminPolicy),
    [adminPolicy]
  )
  const effectivePolicy = React.useMemo(
    () => mergeCommandFamilyPolicy({ adminPolicy, userPreferences }),
    [adminPolicy, userPreferences]
  )

  const adminByFamily = React.useMemo(
    () => new Map(normalizedAdminPolicy.map((entry) => [entry.family, entry.decision] as const)),
    [normalizedAdminPolicy]
  )
  const effectiveByFamily = React.useMemo(
    () => new Map(effectivePolicy.map((entry) => [entry.family, entry.decision] as const)),
    [effectivePolicy]
  )

  const updatePreference = (
    family: CommandFamilyPolicyEntry['family'],
    decision: CommandFamilyDecision
  ) => {
    const next = new Map(
      (userPreferences ?? []).map((entry) => [entry.family, entry.decision] as const)
    )
    next.set(family, decision)
    onChange(
      COMMAND_FAMILIES.filter((item) => next.has(item)).map((item) => ({
        family: item,
        decision: next.get(item)!,
      }))
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className="space-y-1">
        <h3 className="font-mono text-sm font-medium">Command-Family Policy</h3>
        <p className="text-xs text-muted-foreground">
          Admin policy is the ceiling. Your preference can keep that decision or make it stricter;
          it cannot loosen an admin ask or deny.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="border border-border bg-surface-2 p-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
            Admin ceiling
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            These defaults come from system policy and apply before user preferences.
          </p>
        </div>
        <div className="border border-border bg-surface-2 p-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-foreground">
            Effective policy
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Panda stores only command-family decisions here, never raw command strings or tool
            arguments.
          </p>
        </div>
      </div>

      <div className="divide-y divide-border border border-border">
        {COMMAND_FAMILIES.map((family) => {
          const adminDecision = adminByFamily.get(family) ?? 'ask'
          const effectiveDecision = effectiveByFamily.get(family) ?? adminDecision
          const allowedDecisions = getAllowedUserCommandFamilyDecisions(adminDecision)

          return (
            <div key={family} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_180px]">
              <div className="min-w-0 space-y-1">
                <Label className="font-mono text-xs">{COMMAND_FAMILY_LABELS[family]}</Label>
                <p className="text-xs text-muted-foreground">
                  {COMMAND_FAMILY_DESCRIPTIONS[family]}
                </p>
                <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Admin ceiling: {adminDecision}</span>
                  <span>Effective: {effectiveDecision}</span>
                </div>
              </div>

              <Select
                value={effectiveDecision}
                onValueChange={(value) => updatePreference(family, value as CommandFamilyDecision)}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Choose behavior" />
                </SelectTrigger>
                <SelectContent>
                  {allowedDecisions.map((decision) => (
                    <SelectItem key={decision} value={decision}>
                      {decisionLabel(decision)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
