'use client'

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { cn } from '@/lib/utils'
import { File as FileIcon, Bot, Folder, Globe } from 'lucide-react'
import { agents } from '@/lib/agent/harness'

export interface MentionItem {
  id: string
  name: string
  type: 'file' | 'agent' | 'folder' | 'url'
  description?: string
}

export interface MentionPickerHandle {
  moveActive: (direction: 'next' | 'prev') => void
  selectActive: () => void
  hasItems: () => boolean
}

interface MentionPickerProps {
  /** Full list of file paths in the project */
  filePaths: string[]
  /** The search text after the @ symbol */
  query: string
  /** DOM id for the listbox container */
  listId: string
  /** Notify the owner which option is active for aria-activedescendant */
  onActiveDescendantChange?: (id?: string) => void
  /** Called when the user selects an item */
  onSelect: (path: string) => void
}

export const MentionPicker = forwardRef<MentionPickerHandle, MentionPickerProps>(
  function MentionPicker(
    { filePaths, query, listId, onActiveDescendantChange, onSelect }: MentionPickerProps,
    ref
  ) {
    const [activeIdx, setActiveIdx] = useState(0)
    const listRef = useRef<HTMLDivElement>(null)
    const shouldReduceMotion = useReducedMotion()

    const builtInSubagents = useMemo(() => agents.listSubagents(), [])
    const userSubagents = useQuery(api.subagents.list)

    const items = useMemo((): MentionItem[] => {
      const q = query.toLowerCase()

      const builtInAgentItems: MentionItem[] = builtInSubagents
        .filter((a) => a.name.toLowerCase().includes(q))
        .map((a) => ({
          id: `agent:${a.name.toLowerCase()}`,
          name: a.name,
          type: 'agent' as const,
          description: a.description,
        }))

      const userAgentItems: MentionItem[] = (userSubagents || [])
        .filter((a) => a.name.toLowerCase().includes(q))
        .map((a) => ({
          id: `agent:${a.name.toLowerCase().replace(/\s+/g, '-')}`,
          name: a.name,
          type: 'agent' as const,
          description: a.description,
        }))

      const agentItems = [...builtInAgentItems, ...userAgentItems]

      const folderPaths = Array.from(
        new Set(
          filePaths
            .map((p) => {
              const parts = p.split('/')
              parts.pop()
              return parts.join('/')
            })
            .filter(Boolean)
        )
      )

      const folderItems: MentionItem[] = folderPaths
        .filter((p) => p.toLowerCase().includes(q))
        .slice(0, 3)
        .map((p) => ({
          id: `folder:${p}`,
          name: p.split('/').pop() || p,
          type: 'folder' as const,
          description: p,
        }))

      const isUrl = /^https?:\/\//i.test(q)
      const urlItems: MentionItem[] = isUrl
        ? [
            {
              id: q,
              name: q,
              type: 'url' as const,
              description: 'Include documentation context',
            },
          ]
        : []

      const fileItems: MentionItem[] = filePaths
        .filter((p) => p.toLowerCase().includes(q))
        .slice(0, 8 - (agentItems.length + folderItems.length + urlItems.length))
        .map((p) => ({
          id: p,
          name: p.split('/').pop() || p,
          type: 'file' as const,
          description: p.split('/').slice(0, -1).join('/'),
        }))

      return [...urlItems, ...agentItems, ...folderItems, ...fileItems]
    }, [filePaths, query, builtInSubagents, userSubagents])

    // Reset selection when results change
    useEffect(() => {
      setActiveIdx(0)
    }, [query])

    // Scroll active item into view
    useEffect(() => {
      const active = listRef.current?.querySelector('[data-active="true"]')
      active?.scrollIntoView({ block: 'nearest' })
    }, [activeIdx])

    useEffect(() => {
      onActiveDescendantChange?.(items[activeIdx] ? `${listId}-option-${activeIdx}` : undefined)
    }, [activeIdx, items, listId, onActiveDescendantChange])

    useImperativeHandle(
      ref,
      () => ({
        moveActive(direction) {
          setActiveIdx((index) => {
            if (items.length === 0) return 0
            if (direction === 'next') {
              return Math.min(index + 1, items.length - 1)
            }
            return Math.max(index - 1, 0)
          })
        },
        selectActive() {
          if (items[activeIdx]) {
            onSelect(items[activeIdx].id)
          }
        },
        hasItems() {
          return items.length > 0
        },
      }),
      [activeIdx, items, onSelect]
    )

    if (items.length === 0) return null

    const agentCount = items.filter((i) => i.type === 'agent').length
    const fileCount = items.filter((i) => i.type === 'file').length
    const folderCount = items.filter((i) => i.type === 'folder').length
    const urlCount = items.filter((i) => i.type === 'url').length

    const getHeaderParts = () => {
      const parts = []
      if (urlCount > 0) parts.push(`${urlCount} url${urlCount > 1 ? 's' : ''}`)
      if (agentCount > 0) parts.push(`${agentCount} agent${agentCount > 1 ? 's' : ''}`)
      if (folderCount > 0) parts.push(`${folderCount} folder${folderCount > 1 ? 's' : ''}`)
      if (fileCount > 0) parts.push(`${fileCount} file${fileCount > 1 ? 's' : ''}`)
      return parts.join(' · ')
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.97 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.12 }}
          className={cn(
            'absolute bottom-full left-0 z-50 mb-2 w-80',
            'border border-border bg-background shadow-xl'
          )}
          role="presentation"
        >
          {/* Header */}
          <div className="border-b border-border px-3 py-1.5">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              {getHeaderParts()}
            </span>
          </div>

          {/* Item list */}
          <div
            id={listId}
            ref={listRef}
            role="listbox"
            aria-label="Mention suggestions"
            className="max-h-52 overflow-y-auto"
          >
            {items.map((item, idx) => (
              <button
                id={`${listId}-option-${idx}`}
                key={item.id}
                type="button"
                data-active={idx === activeIdx}
                role="option"
                aria-selected={idx === activeIdx}
                onClick={() => onSelect(item.id)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIdx(idx)}
                className={cn(
                  'flex w-full items-center gap-2.5 px-3 py-2 text-left',
                  'transition-colors duration-75',
                  idx === activeIdx
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {item.type === 'agent' ? (
                  <Bot className="h-3.5 w-3.5 shrink-0 text-primary" />
                ) : item.type === 'folder' ? (
                  <Folder className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                ) : item.type === 'url' ? (
                  <Globe className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                ) : (
                  <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-mono text-[12px] font-medium">{item.name}</div>
                  {item.description && (
                    <div className="truncate font-mono text-xs text-muted-foreground/60">
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="border-t border-border px-3 py-1">
            <span className="font-mono text-xs text-muted-foreground/50">
              ↑↓ navigate · Enter select · Esc dismiss
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    )
  }
)
