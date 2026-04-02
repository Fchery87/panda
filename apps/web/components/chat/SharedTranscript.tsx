'use client'

import { motion } from 'framer-motion'
import { Bot, User } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type SharedTranscriptMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface SharedTranscriptProps {
  messages: SharedTranscriptMessage[]
}

export function SharedTranscript({ messages }: SharedTranscriptProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <motion.div
          key={`${message.role}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
        >
          <Avatar className="h-8 w-8 rounded-none">
            <AvatarFallback
              className={cn(
                'rounded-none',
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              )}
            >
              {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              'flex-1 border border-border p-4',
              message.role === 'user' ? 'bg-muted' : 'surface-1'
            )}
          >
            <div className="mb-2 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              {message.role === 'user'
                ? 'User'
                : message.role === 'assistant'
                  ? 'Assistant'
                  : 'System'}
            </div>
            <div className="whitespace-pre-wrap font-mono text-sm">{message.content}</div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
