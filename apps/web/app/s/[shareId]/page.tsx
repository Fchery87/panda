'use client'

import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { notFound } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl p-4">
        <header className="mb-6 border-b border-border pb-4">
          <h1 className="font-mono text-xl font-medium">
            {sharedChat.chat.title || 'Shared Chat'}
          </h1>
          <div className="mt-2 flex items-center gap-4 font-mono text-sm text-muted-foreground">
            <span>Mode: {sharedChat.chat.mode}</span>
            <span>Shared: {new Date(sharedChat.sharedAt).toLocaleDateString()}</span>
          </div>
        </header>

        <div className="space-y-4">
          {sharedChat.messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                'flex gap-3',
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              )}
            >
              <Avatar className="h-8 w-8 rounded-none">
                <AvatarFallback
                  className={cn(
                    'rounded-none',
                    message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}
                >
                  {message.role === 'user' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div
                className={cn(
                  'flex-1 border border-border p-4',
                  message.role === 'user' ? 'bg-muted' : 'surface-1'
                )}
              >
                <div className="whitespace-pre-wrap font-mono text-sm">{message.content}</div>
              </div>
            </motion.div>
          ))}
        </div>

        <footer className="mt-8 border-t border-border pt-4 text-center font-mono text-xs text-muted-foreground">
          Shared via Panda.ai
        </footer>
      </div>
    </div>
  )
}
