'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Bot, User } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export type SharedTranscriptMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type PublicReviewSummary = {
  outcome: string
  validation: string
  changedFiles: number
  reviewNote: string
}

interface SharedTranscriptProps {
  messages: SharedTranscriptMessage[]
  publicReviewSummary?: PublicReviewSummary | null
}

function PublicReviewSummaryCard({ summary }: { summary: PublicReviewSummary }) {
  return (
    <section className="shadow-sharp-sm surface-1 border border-border p-4">
      <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Public review summary
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="bg-background/80 border border-border px-2 py-1.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Outcome
          </div>
          <div className="mt-1 font-mono text-xs text-foreground">{summary.outcome}</div>
        </div>
        <div className="bg-background/80 border border-border px-2 py-1.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Validation
          </div>
          <div className="mt-1 font-mono text-xs text-foreground">{summary.validation}</div>
        </div>
        <div className="bg-background/80 border border-border px-2 py-1.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            Changed files
          </div>
          <div className="mt-1 font-mono text-xs text-foreground">{summary.changedFiles}</div>
        </div>
      </div>
      <p className="mt-3 font-mono text-xs leading-relaxed text-muted-foreground">
        {summary.reviewNote}
      </p>
    </section>
  )
}

export function SharedTranscript({ messages, publicReviewSummary }: SharedTranscriptProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <div className="space-y-4">
      {publicReviewSummary ? <PublicReviewSummaryCard summary={publicReviewSummary} /> : null}
      {messages.map((message, index) => (
        <motion.div
          key={`${message.role}-${index}`}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{
            delay: shouldReduceMotion ? 0 : index * 0.05,
            duration: shouldReduceMotion ? 0.01 : undefined,
          }}
          className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback
              className={cn(
                '',
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
