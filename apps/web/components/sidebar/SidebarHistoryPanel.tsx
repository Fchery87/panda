'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageSquarePlus as IconNewChat, Search as IconSearch, List as IconList } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildSessionRailGroups, type SessionRailTask } from './session-rail'

interface SidebarHistoryPanelProps {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  onSelectChat: (chatId: Id<'chats'>) => void
  onNewChat: () => void
  activeRunStatus?: 'running' | 'blocked' | 'review' | 'complete' | 'idle'
}

type Scope = 'project' | 'all'

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return 'now'
}

export function SidebarHistoryPanel({
  projectId,
  activeChatId,
  onSelectChat,
  onNewChat,
  activeRunStatus = 'idle',
}: SidebarHistoryPanelProps) {
  const [scope, setScope] = useState<Scope>('project')
  const [search, setSearch] = useState('')

  const chats = useQuery(api.chats.listRecent, { projectId, limit: 25 })

  const filteredChats = (chats ?? []).filter((chat) => {
    const title = chat.title ?? 'Untitled'
    return title.toLowerCase().includes(search.toLowerCase())
  })

  const groupedSessions = buildSessionRailGroups(
    filteredChats.map<SessionRailTask>((chat) => {
      const isActive = chat._id === activeChatId
      return {
        id: String(chat._id),
        chatId: String(chat._id),
        title: chat.title ?? 'Untitled',
        status: isActive && activeRunStatus === 'running' ? 'running' : 'complete',
        lastActivity: formatRelativeTime(chat.updatedAt),
        changedFiles: 0,
      }
    })
  )

  return (
    <div className="flex h-full flex-col">
      {/* Scope toggle */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setScope('project')}
          className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150 ${
            scope === 'project'
              ? 'bg-surface-2 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          This Project
        </button>
        <button
          onClick={() => setScope('all')}
          className={`flex-1 py-2 font-mono text-[10px] uppercase tracking-widest transition-colors duration-150 ${
            scope === 'all'
              ? 'bg-surface-2 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Projects
        </button>
      </div>

      {/* Search input */}
      <div className="border-b border-border p-2">
        <div className="flex items-center gap-2 border border-border bg-background px-2 py-1.5">
          <IconSearch className="h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-transparent font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
      </div>

      {/* New execution session button */}
      <div className="border-b border-border p-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 border border-border bg-primary px-3 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <IconNewChat className="h-3.5 w-3.5" />
          New Session
        </button>
      </div>

      {/* Execution session list */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredChats.length === 0 ? (
            <p className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No execution sessions yet
            </p>
          ) : (
            groupedSessions.map((group) => (
              <section key={group.id} className="py-1" aria-label={group.label}>
                <div className="px-3 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                  {group.label}
                </div>
                {group.sessions.length === 0 ? (
                  <p className="px-3 py-2 font-mono text-[10px] text-muted-foreground/70">
                    No {group.label.toLowerCase()}.
                  </p>
                ) : (
                  group.sessions.map((session) => {
                    const chatId = session.chatId as Id<'chats'>
                    const isActive = String(activeChatId) === session.chatId
                    const showActiveRunMarker = isActive && activeRunStatus !== 'idle'

                    return (
                      <button
                        key={session.id}
                        onClick={() => onSelectChat(chatId)}
                        className={cn(
                          'flex w-full items-center gap-2 border border-transparent px-3 py-2 text-left transition-colors duration-150',
                          isActive
                            ? 'shadow-sharp-sm border-border bg-primary/10 text-foreground'
                            : 'hover:bg-surface-2 text-muted-foreground hover:border-border hover:text-foreground'
                        )}
                      >
                        <span className="relative flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center">
                          <IconList className="h-3.5 w-3.5" />
                          {showActiveRunMarker ? (
                            <span
                              className={cn(
                                'absolute -right-0.5 -top-0.5 h-1.5 w-1.5 border border-background',
                                activeRunStatus === 'running' && 'animate-pulse bg-primary',
                                activeRunStatus === 'blocked' && 'bg-destructive',
                                activeRunStatus === 'review' && 'bg-[hsl(var(--status-warning))]',
                                activeRunStatus === 'complete' && 'bg-[hsl(var(--status-success))]'
                              )}
                              aria-hidden="true"
                            />
                          ) : null}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs">{session.title}</p>
                          {showActiveRunMarker ? (
                            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                              {activeRunStatus === 'running'
                                ? 'Running'
                                : activeRunStatus === 'blocked'
                                  ? 'Needs attention'
                                  : activeRunStatus === 'review'
                                    ? 'Review ready'
                                    : 'Session complete'}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {session.lastActivity}
                        </span>
                      </button>
                    )
                  })
                )}
              </section>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
