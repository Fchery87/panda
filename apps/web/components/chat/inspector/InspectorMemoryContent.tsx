'use client'

import { useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { MemoryBankEditor } from '@/components/chat/MemoryBankEditor'
import {
  appendApprovedMemoryProposal,
  proposeMemoryBullets,
  type MemoryProposal,
} from '@/lib/agent/continual-learning'

export interface InspectorMemoryContentProps {
  memoryBank: string | null | undefined
  onSaveMemoryBank: (content: string) => Promise<void>
  projectId: Id<'projects'>
}

export function InspectorMemoryContent({
  memoryBank,
  onSaveMemoryBank,
  projectId,
}: InspectorMemoryContentProps) {
  const latestSummary = useQuery(api.sessionSummaries.getLatest, projectId ? { projectId } : 'skip')
  const proposals = useMemo(
    () =>
      proposeMemoryBullets({
        sessionSummary: latestSummary?.summary,
        existingMemoryBank: memoryBank,
      }),
    [latestSummary?.summary, memoryBank]
  )

  const handleApproveProposal = async (proposal: MemoryProposal) => {
    await onSaveMemoryBank(appendApprovedMemoryProposal(memoryBank, proposal.text))
  }

  return (
    <div className="m-0 space-y-3">
      <div className="bg-background/80 border border-border px-3 py-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Project memory
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Keep durable instructions and project context here so future runs stay aligned without
          repeating yourself.
        </p>
      </div>
      <div className="border border-border bg-background">
        <MemoryBankEditor
          memoryBank={memoryBank}
          onSave={onSaveMemoryBank}
          proposals={proposals}
          onApproveProposal={handleApproveProposal}
        />
      </div>
    </div>
  )
}
