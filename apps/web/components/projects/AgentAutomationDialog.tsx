"use client"

import * as React from "react"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { AgentPolicy } from "@/lib/agent/automationPolicy"
import { normalizePrefixList, resolveEffectiveAgentPolicy } from "@/lib/agent/automationPolicy"

function prefixesToText(prefixes: string[] | null | undefined) {
  return normalizePrefixList(prefixes).join("\n")
}

function textToPrefixes(text: string) {
  return normalizePrefixList(text.split("\n"))
}

export function AgentAutomationDialog({
  projectId,
  projectPolicy,
  userDefaults,
}: {
  projectId: Id<"projects">
  projectPolicy: AgentPolicy | null | undefined
  userDefaults: AgentPolicy | null | undefined
}) {
  const updateProject = useMutation(api.projects.update)

  const [open, setOpen] = React.useState(false)
  const [inheritDefaults, setInheritDefaults] = React.useState(!projectPolicy)

  const effective = React.useMemo(
    () => resolveEffectiveAgentPolicy({ projectPolicy, userDefaults }),
    [projectPolicy, userDefaults]
  )

  const [autoApplyFiles, setAutoApplyFiles] = React.useState(effective.autoApplyFiles)
  const [autoRunCommands, setAutoRunCommands] = React.useState(effective.autoRunCommands)
  const [allowedPrefixesText, setAllowedPrefixesText] = React.useState(
    prefixesToText(effective.allowedCommandPrefixes)
  )

  React.useEffect(() => {
    const nextEffective = resolveEffectiveAgentPolicy({ projectPolicy, userDefaults })
    setInheritDefaults(!projectPolicy)
    setAutoApplyFiles(nextEffective.autoApplyFiles)
    setAutoRunCommands(nextEffective.autoRunCommands)
    setAllowedPrefixesText(prefixesToText(nextEffective.allowedCommandPrefixes))
  }, [projectPolicy, userDefaults, open])

  const handleSave = async () => {
    try {
      if (inheritDefaults) {
        await updateProject({ id: projectId, agentPolicy: null } as any)
      } else {
        await updateProject({
          id: projectId,
          agentPolicy: {
            autoApplyFiles,
            autoRunCommands,
            allowedCommandPrefixes: textToPrefixes(allowedPrefixesText),
          },
        } as any)
      }
      toast.success("Automation settings saved")
      setOpen(false)
    } catch (error) {
      toast.error("Failed to save automation settings", {
        description: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 rounded-none font-mono text-xs">
          Automation
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Automation</DialogTitle>
          <DialogDescription>
            Control whether Panda auto-applies file changes and auto-runs allowlisted commands.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="font-mono text-xs">Inherit user defaults</Label>
              <p className="text-xs text-muted-foreground">
                When enabled, this project uses your global automation defaults.
              </p>
            </div>
            <Switch checked={inheritDefaults} onCheckedChange={setInheritDefaults} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="font-mono text-xs">Auto-apply file writes</Label>
              <p className="text-xs text-muted-foreground">
                Applies queued file artifacts automatically.
              </p>
            </div>
            <Switch
              checked={autoApplyFiles}
              onCheckedChange={setAutoApplyFiles}
              disabled={inheritDefaults}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <Label className="font-mono text-xs">Auto-run allowlisted commands</Label>
              <p className="text-xs text-muted-foreground">
                Only runs commands whose prefixes match the allowlist.
              </p>
            </div>
            <Switch
              checked={autoRunCommands}
              onCheckedChange={setAutoRunCommands}
              disabled={inheritDefaults}
            />
          </div>

          <div className="space-y-2">
            <Label className="font-mono text-xs">Allowed command prefixes (one per line)</Label>
            <Textarea
              value={allowedPrefixesText}
              onChange={(e) => setAllowedPrefixesText(e.target.value)}
              placeholder={"bun test\nbunx eslint\nbun run lint"}
              className="min-h-[120px] rounded-none font-mono text-xs"
              disabled={inheritDefaults || !autoRunCommands}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
