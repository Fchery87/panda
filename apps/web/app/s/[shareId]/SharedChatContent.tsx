'use client'

import { usePaginatedQuery, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { SharedTranscript } from '@/components/chat/SharedTranscript'
import { Button } from '@/components/ui/button'

export function SharedChatContent({ shareId }: { shareId: string }) {
  const sharedChat = useQuery(api.sharing.getSharedChatHeader, { shareId })
  const {
    results: messages,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.sharing.listSharedMessagesPaginated,
    { shareId },
    { initialNumItems: 50 }
  )

  if (sharedChat === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!sharedChat) {
    notFound()
  }

  return (
    <main id="main-content" className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-4">
        <header className="mb-6 border-b border-border pb-4">
          <h1 className="font-mono text-xl font-medium">
            {sharedChat.chat.title || 'Shared Chat'}
          </h1>
          <div className="mt-2 flex items-center gap-4 font-mono text-sm text-muted-foreground">
            <span>Mode: {sharedChat.chat.mode}</span>
            <span>
              Shared:{' '}
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(sharedChat.sharedAt))}
            </span>
          </div>
        </header>

        <SharedTranscript messages={messages} />

        {status === 'CanLoadMore' && (
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => loadMore(50)}
              className="shadow-sharp-sm rounded-none border-border font-mono text-xs"
            >
              Load more messages
            </Button>
          </div>
        )}

        <footer className="mt-8 border-t border-border pt-4 text-center">
          <p className="mb-3 font-mono text-xs text-muted-foreground">Shared via Panda.ai</p>
          <Link href="/">
            <Button variant="outline" className="rounded-none font-mono text-xs">
              Try Panda.ai
            </Button>
          </Link>
        </footer>
      </div>
    </main>
  )
}
