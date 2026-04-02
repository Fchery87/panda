'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { notFound } from 'next/navigation'
import { SharedTranscript } from '@/components/chat/SharedTranscript'

interface SharedChatPageProps {
  params: Promise<{ shareId: string }>
}

export default async function SharedChatPage({ params }: SharedChatPageProps) {
  const { shareId } = await params
  return <SharedChatContent shareId={shareId} />
}

function SharedChatContent({ shareId }: { shareId: string }) {
  const sharedChat = useQuery(api.sharing.getSharedChat, { shareId })

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

        <SharedTranscript messages={sharedChat.messages} />

        <footer className="mt-8 border-t border-border pt-4 text-center font-mono text-xs text-muted-foreground">
          Shared via Panda.ai
        </footer>
      </div>
    </main>
  )
}
