'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileCode, FileJson, FileText, File as FileIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

function getFileIcon(filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
      return <FileCode className="h-3.5 w-3.5 text-primary" />
    case 'json':
      return <FileJson className="h-3.5 w-3.5 text-primary/70" />
    case 'md':
    case 'txt':
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />
    default:
      return <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
  }
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
}

export function FileTabs({ tabs, activePath, onSelect, onClose, className }: FileTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeTabRef = useRef<HTMLDivElement>(null)

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
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                  transition={{ duration: 0.15 }}
                />
              )}

              {getFileIcon(filename)}

              <span className="max-w-[120px] truncate">{filename}</span>

              {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}

              <button
                type="button"
                className={cn(
                  'ml-0.5 flex h-4 w-4 items-center justify-center rounded-none',
                  'opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100',
                  isActive && 'opacity-60'
                )}
                onClick={(e) => {
                  e.stopPropagation()
                  onClose(tab.path)
                }}
                aria-label={`Close ${filename}`}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
