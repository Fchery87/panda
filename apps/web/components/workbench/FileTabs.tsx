'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X as IconClose, Bot as IconBot, FileCode as IconFileTs, FileCode as IconFileJs, FileCode as IconFileJson, FileCode as IconFileCss, FileCode as IconFileHtml, FileText as IconFileMarkdown, FileCode as IconFileCode } from 'lucide-react'
import type { WorkspaceOpenTab } from '@/contexts/WorkspaceContext'
import { cn } from '@/lib/utils'

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return <IconFileTs className="h-3.5 w-3.5 text-primary" />
    case 'js':
    case 'jsx':
      return <IconFileJs className="h-3.5 w-3.5 text-primary" />
    case 'json':
      return <IconFileJson className="h-3.5 w-3.5 text-primary/70" />
    case 'css':
    case 'scss':
    case 'sass':
    case 'less':
      return <IconFileCss className="h-3.5 w-3.5 text-primary/70" />
    case 'html':
    case 'htm':
      return <IconFileHtml className="h-3.5 w-3.5 text-primary/70" />
    case 'md':
    case 'txt':
    case 'markdown':
      return <IconFileMarkdown className="h-3.5 w-3.5 text-muted-foreground" />
    default:
      return <IconFileCode className="h-3.5 w-3.5 text-muted-foreground" />
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

interface FileTabsProps {
  tabs: WorkspaceOpenTab[]
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
          'surface-1 flex items-end gap-0 overflow-x-auto border-b border-border',
          'scrollbar-thin scrollbar-h-1',
          className
        )}
      >
        <AnimatePresence initial={false}>
          {tabs.map((tab) => {
            const isActive = tab.path === activePath
            const isPlanTab = tab.kind === 'plan'
            const filename = isPlanTab ? tab.title : tab.path.split('/').pop() || tab.path
            const ariaLabel = isPlanTab ? `Plan tab ${tab.title}` : `File tab ${filename}`

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
                aria-label={ariaLabel}
                className={cn(
                  'group relative flex cursor-pointer items-center gap-2 px-3 py-2',
                  'min-w-0 border-r border-border font-mono text-xs',
                  'transition-colors duration-150',
                  isPlanTab && 'bg-background/95',
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

                {isPlanTab ? (
                  <IconBot className="h-3.5 w-3.5 text-primary" />
                ) : (
                  getFileIcon(filename)
                )}

                <div className="flex min-w-0 flex-col">
                  <span className="max-w-[140px] truncate leading-none">
                    {isPlanTab ? `Plan: ${filename}` : filename}
                  </span>
                  {!isPlanTab && (
                    <span className="max-w-[140px] truncate pt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                      {tab.path.includes('/') ? tab.path.split('/').slice(0, -1).join('/') : 'root'}
                    </span>
                  )}
                </div>

                {!isPlanTab && tab.isDirty && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}

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
                  aria-label={isPlanTab ? `Close plan ${filename}` : `Close ${filename}`}
                >
                  <IconClose className="h-3 w-3" />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {/* Action Strip */}
        {onOpenAgentManager && (
          <div className="surface-0 sticky right-0 flex items-center gap-1 border-l border-border px-2">
            <button
              type="button"
              onClick={onOpenAgentManager}
              className="hover:bg-surface-2 flex h-8 items-center gap-1.5 rounded-none border border-transparent px-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              title="Open Agent Manager"
            >
              <IconBot className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agents</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
