'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IconClose,
  IconFileTs,
  IconFileJs,
  IconFileJson,
  IconFileCss,
  IconFileHtml,
  IconFileMarkdown,
  IconFileCode,
  IconBot,
} from '@/components/ui/icons'
import { cn } from '@/lib/utils'

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <IconFileTs className="h-3.5 w-3.5 text-primary" weight="duotone" />
    case 'js':
    case 'jsx':
      return <IconFileJs className="h-3.5 w-3.5 text-primary" weight="duotone" />
    case 'json':
      return <IconFileJson className="h-3.5 w-3.5 text-primary/70" weight="duotone" />
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <IconFileCss className="h-3.5 w-3.5 text-primary/70" weight="duotone" />
    case 'html':
    case 'htm':
      return <IconFileHtml className="h-3.5 w-3.5 text-primary/70" weight="duotone" />
    case 'md':
    case 'txt':
    case 'markdown':
      return <IconFileMarkdown className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
    default:
      return <IconFileCode className="h-3.5 w-3.5 text-muted-foreground" weight="duotone" />
  }
}

// Language colors for active tab underlines
const LANGUAGE_COLORS: Record<string, string> = {
  ts: '#3178c6',
  tsx: '#3178c6',
  js: '#f7df1e',
  jsx: '#f7df1e',
  json: '#a8a800',
  css: '#663399',
  scss: '#cf649a',
  sass: '#cf649a',
  less: '#1d365d',
  html: '#e34c26',
  htm: '#e34c26',
  py: '#3776ab',
  md: '#888888',
  markdown: '#888888',
}

function getLanguageColor(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext) return null
  return LANGUAGE_COLORS[ext] || null
}

interface FileTab {
  path: string
  isDirty?: boolean
}

interface FileTabsProps {
  tabs: FileTab[]
  activePath: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  className?: string
  /** Callback to open Agent Manager drawer */
  onOpenAgentManager?: () => void
}

export function FileTabs({
  tabs,
  activePath,
  onSelect,
  onClose,
  className,
  onOpenAgentManager,
}: FileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)
  const [showLeftFade, setShowLeftFade] = useState(false)
  const [showRightFade, setShowRightFade] = useState(false)

  const checkOverflow = () => {
    if (!scrollRef.current) return
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
    setShowLeftFade(scrollLeft > 0)
    setShowRightFade(scrollLeft < scrollWidth - clientWidth - 1)
  }

  useEffect(() => {
    checkOverflow()
    const scrollEl = scrollRef.current
    if (scrollEl) {
      scrollEl.addEventListener('scroll', checkOverflow)
      window.addEventListener('resize', checkOverflow)
      return () => {
        scrollEl.removeEventListener('scroll', checkOverflow)
        window.removeEventListener('resize', checkOverflow)
      }
    }
  }, [tabs.length])

  useEffect(() => {
    if (activeTabRef.current && scrollRef.current) {
      const container = scrollRef.current
      const tab = activeTabRef.current
      const containerRect = container.getBoundingClientRect()
      const tabRect = tab.getBoundingClientRect()

      if (tabRect.left < containerRect.left) {
        container.scrollLeft -= containerRect.left - tabRect.left - 20
      } else if (tabRect.right > containerRect.right) {
        container.scrollLeft += tabRect.right - containerRect.right + 20
      }
    }
  }, [activePath])

  if (tabs.length === 0) return null

  return (
    <div className="relative">
      {showLeftFade && (
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-8 bg-gradient-to-r from-background to-transparent" />
      )}
      {showRightFade && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent" />
      )}
      <div
        ref={scrollRef}
        role="tablist"
        aria-label="Open files"
        className={cn(
          'bg-surface-1 flex items-end gap-0 overflow-x-auto border-b border-border',
          'scrollbar-thin scrollbar-h-1',
          className
        )}
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = tab.path === activePath
            const filename = tab.path.split('/').pop() || tab.path

            return (
              <motion.div
                key={tab.path}
                ref={isActive ? activeTabRef : undefined}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                role="tab"
                aria-selected={isActive}
                tabIndex={0}
                onClick={() => onSelect(tab.path)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(tab.path)
                  }
                }}
                className={cn(
                  'group relative flex cursor-pointer items-center gap-1.5 px-3 py-1.5',
                  'border-r border-border font-mono text-xs',
                  'transition-colors duration-150',
                  isActive
                    ? 'bg-background text-foreground'
                    : 'bg-surface-2 hover:bg-surface-1 text-muted-foreground hover:text-foreground'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{
                      backgroundColor: getLanguageColor(filename) || 'hsl(var(--primary))',
                    }}
                    transition={{ duration: 0.15 }}
                  />
                )}

                {getFileIcon(filename)}

                <span className="max-w-[120px] truncate">{filename}</span>

                {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}

                <button
                  type="button"
                  className={cn(
                    'ml-0.5 flex h-6 w-6 items-center justify-center rounded-none',
                    'opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100',
                    isActive && 'opacity-60'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(tab.path)
                  }}
                  aria-label={`Close ${filename}`}
                >
                  <IconClose className="h-3 w-3" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Action Strip */}
        {onOpenAgentManager && (
          <div className="flex items-center gap-1 border-l border-border px-2">
            <button
              type="button"
              onClick={onOpenAgentManager}
              className="hover:bg-surface-2 flex h-7 items-center gap-1.5 rounded-none px-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
              title="Open Agent Manager"
            >
              <IconBot className="h-3.5 w-3.5" weight="duotone" />
              <span className="hidden sm:inline">Agents</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
