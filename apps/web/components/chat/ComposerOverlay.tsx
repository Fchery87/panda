'use client'

import React, { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Blocks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatInput } from './ChatInput'

interface ComposerOverlayProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (prompt: string, contextFiles?: string[]) => void
  isStreaming: boolean
}

export function ComposerOverlay({ isOpen, onClose, onSubmit, isStreaming }: ComposerOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <React.Fragment>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Composer floating window */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-1/4 z-50 w-full max-w-3xl -translate-x-1/2 rounded-none border border-border bg-background shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Blocks className="h-4 w-4 text-primary" />
                <span className="font-mono text-xs uppercase tracking-wider">Multi-File Composer</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-none text-muted-foreground hover:bg-muted"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 bg-background">
              <ChatInput
                onSendMessage={(msg, mode, ctx) => {
                  onSubmit(msg, ctx)
                  onClose()
                }}
                isStreaming={isStreaming}
                mode="build"
              />
            </div>
          </motion.div>
        </React.Fragment>
      )}
    </AnimatePresence>
  )
}
