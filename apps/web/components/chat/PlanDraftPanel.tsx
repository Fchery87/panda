"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, Save } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export function PlanDraftPanel({
  value,
  onChange,
  onSaveNow,
  isSaving,
  updatedAt,
  className,
}: {
  value: string
  onChange: (next: string) => void
  onSaveNow?: () => void
  isSaving?: boolean
  updatedAt?: number | null
  className?: string
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn("border-b border-border surface-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Plan Draft
        </span>
        <span className="ml-auto flex items-center gap-2">
          {updatedAt ? (
            <span className="text-[10px] text-muted-foreground/70 font-mono">
              {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground/70 font-mono">not saved</span>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="h-7 rounded-none font-mono text-xs"
            onClick={onSaveNow}
            disabled={!onSaveNow || isSaving}
          >
            <Save className={cn("h-3.5 w-3.5", isSaving && "animate-pulse")} />
            <span className="ml-2">{isSaving ? "Saving" : "Saved"}</span>
          </Button>
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Discuss mode will auto-update this plan draft. You can edit it anytime."
            className={cn(
              "min-h-[140px] rounded-none font-mono text-xs leading-relaxed",
              "bg-background border border-border"
            )}
          />
        </div>
      )}
    </div>
  )
}
