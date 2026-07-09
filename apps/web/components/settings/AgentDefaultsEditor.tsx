'use client'

import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  getDefaultPolicyForMode,
  normalizePrefixList,
  type AgentPolicy,
} from '@/lib/agent/automationPolicy'

interface AgentDefaultsEditorProps {
  value: AgentPolicy | null | undefined
  onChange: (value: AgentPolicy) => void
  className?: string
}

function prefixesToText(prefixes: string[] | null | undefined): string {
  return normalizePrefixList(prefixes).join('\n')
}

function textToPrefixes(text: string): string[] {
  return normalizePrefixList(text.split('\n'))
}

export function AgentDefaultsEditor({ value, onChange, className }: AgentDefaultsEditorProps) {
  const effectiveValue = value ?? getDefaultPolicyForMode('code')

  const update = (updates: Partial<AgentPolicy>) => {
    onChange({
      ...effectiveValue,
      ...updates,
    })
  }

  return (
    <div className={cn('space-y-5', className)}>
      <div className="space-y-1">
        <h3 className="font-mono text-sm font-medium">Browser Automation Defaults</h3>
        <p className="text-xs text-muted-foreground">
          Set the default automation policy Panda uses for web workspaces. Projects can inherit or
          override these defaults.
        </p>
      </div>

      <div className="border-destructive/30 bg-destructive/5 flex items-center justify-between gap-4 border p-3">
        <div className="space-y-1">
          <Label className="font-mono text-xs">YOLO command mode</Label>
          <p className="text-xs text-muted-foreground">
            Runs command executions without approval prompts when admin policy and platform safety
            blocks allow them.
          </p>
        </div>
        <Switch
          checked={effectiveValue.yoloCommandMode ?? false}
          onCheckedChange={(checked) => update({ yoloCommandMode: checked })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label className="font-mono text-xs">Auto-apply file writes</Label>
          <p className="text-xs text-muted-foreground">
            Applies queued file artifacts automatically in the web workbench.
          </p>
        </div>
        <Switch
          checked={effectiveValue.autoApplyFiles}
          onCheckedChange={(checked) => update({ autoApplyFiles: checked })}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <Label className="font-mono text-xs">Auto-run allowlisted commands</Label>
          <p className="text-xs text-muted-foreground">
            Only runs browser-approved commands whose prefixes match the allowlist.
          </p>
        </div>
        <Switch
          checked={effectiveValue.autoRunCommands}
          onCheckedChange={(checked) => update({ autoRunCommands: checked })}
        />
      </div>

      <div className="space-y-2">
        <Label className="font-mono text-xs">Allowed command prefixes (one per line)</Label>
        <Textarea
          value={prefixesToText(effectiveValue.allowedCommandPrefixes)}
          onChange={(event) =>
            update({ allowedCommandPrefixes: textToPrefixes(event.target.value) })
          }
          placeholder={'bun test\nbun run lint\nbunx eslint'}
          className="min-h-[120px] font-mono text-xs"
          disabled={!effectiveValue.autoRunCommands || (effectiveValue.yoloCommandMode ?? false)}
        />
        <p className="text-xs text-muted-foreground">
          Prefixes are matched case-insensitively and apply only when YOLO command mode is off.
        </p>
      </div>
    </div>
  )
}
