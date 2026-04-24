'use client'

import React, { useEffect, useRef } from 'react'
import { Blocks } from 'lucide-react'
import { ChatInput } from './ChatInput'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ComposerOverlayProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string, contextFiles?: string[]) => void
  isStreaming: boolean
}

export function ComposerOverlay({ isOpen, onClose, onSubmit, isStreaming }: ComposerOverlayProps) {
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      lastFocusedElementRef.current = document.activeElement as HTMLElement | null
    }
  }, [isOpen, onClose])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      window.setTimeout(() => {
        lastFocusedElementRef.current?.focus()
      }, 0)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="top-[26%] max-w-3xl translate-y-0 rounded-none border-border p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-muted/30 px-4 py-3">
          <DialogTitle className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
            <Blocks className="h-4 w-4 text-primary" aria-hidden="true" />
            Multi-File Composer
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            Draft a build-mode prompt with attached context without leaving the current workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-background p-4">
          <ChatInput
            onSendMessage={(msg, mode, ctx) => {
              onSubmit(msg, ctx)
              onClose()
            }}
            isStreaming={isStreaming}
            mode="build"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
