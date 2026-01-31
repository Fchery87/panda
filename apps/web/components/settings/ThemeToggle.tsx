"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  value: "light" | "dark" | "system"
  onChange: (value: "light" | "dark" | "system") => void
  className?: string
}

export function ThemeToggle({ value, onChange, className }: ThemeToggleProps) {
  const themes = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "System", icon: Monitor },
  ] as const

  return (
    <div className={cn("flex gap-2", className)}>
      {themes.map((theme) => {
        const Icon = theme.icon
        const isActive = value === theme.id
        
        return (
          <button
            key={theme.id}
            onClick={() => onChange(theme.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-sm font-medium">{theme.label}</span>
          </button>
        )
      })}
    </div>
  )
}
