'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MessageSquare, Search, MessageSquarePlus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWorkspace } from '@/contexts/WorkspaceContext'

interface SidebarHistoryPanelProps {
  projectId: Id<'projects'>
  activeChatId?: Id<'chats'>
  onSelectChat: (chatId: Id<'chats'>) => void
}

type Scope = 'project' | 'all'

export function SidebarHistoryPanel({
  projectId,
  activeChatId,
  onSelectChat,
}: SidebarHistoryPanelProps) {
  const { onNewChat } = useWorkspace()
  const [scope, setScope] = useState<Scope>('project')
  const [search, setSearch] = useState('')

  const chats = useQuery(api.chats.list, { projectId })

  const filteredChats = (chats ?? []).filter((chat) => {
    const title = chat.title ?? 'Untitled'
    return title.toLowerCase().includes(search.toLowerCase())
  })

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
          <Search className="h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-transparent font-mono text-xs placeholder:text-muted-foreground/50 focus:outline-none"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="border-b border-border p-2">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 border border-border bg-primary px-3 py-2 font-mono text-xs text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <ScrollArea className="flex-1">
        <div className="p-1">
          {filteredChats.length === 0 ? (
            <p className="px-3 py-6 text-center font-mono text-xs text-muted-foreground">
              No conversations yet
            </p>
          ) : (
            filteredChats.map((chat) => {
              const isActive = chat._id === activeChatId
              const title = chat.title ?? 'Untitled'
              const date = new Date(chat.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })

              return (
                <button
                  key={chat._id}
                  onClick={() => onSelectChat(chat._id)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-150 ${
                    isActive
                      ? 'bg-primary/10 text-foreground'
                      : 'hover:bg-surface-2 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{date}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
