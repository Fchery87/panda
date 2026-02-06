'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { FileText, Terminal, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FileWritePayload {
  filePath: string
  content: string
  originalContent?: string | null
}

interface CommandRunPayload {
  command: string
  workingDirectory?: string
}

interface Artifact {
  id: string
  type: 'file_write' | 'command_run'
  payload: FileWritePayload | CommandRunPayload
  status: 'pending' | 'applied' | 'rejected'
  createdAt: number
  description?: string
}

interface ArtifactCardProps {
  artifact: Artifact
  onApply: (id: string) => void
  onReject: (id: string) => void
  isBatchAction?: boolean
}

function isFileWritePayload(payload: unknown): payload is FileWritePayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'filePath' in payload &&
    typeof (payload as FileWritePayload).filePath === 'string'
  )
}

function isCommandRunPayload(payload: unknown): payload is CommandRunPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'command' in payload &&
    typeof (payload as CommandRunPayload).command === 'string'
  )
}

export function ArtifactCard({
  artifact,
  onApply,
  onReject,
  isBatchAction = false,
}: ArtifactCardProps) {
  const isFileWrite = artifact.type === 'file_write'
  const isPending = artifact.status === 'pending'
  const isApplied = artifact.status === 'applied'
  const isRejected = artifact.status === 'rejected'

  const payload = artifact.payload

  const getArtifactTitle = () => {
    if (isFileWritePayload(payload)) {
      return payload.filePath.split('/').pop() || 'Unknown File'
    }
    if (isCommandRunPayload(payload)) {
      return payload.command.split(' ')[0] || 'Unknown Command'
    }
    return 'Unknown Artifact'
  }

  const getArtifactSubtitle = () => {
    if (isFileWritePayload(payload)) {
      return payload.filePath
    }
    if (isCommandRunPayload(payload)) {
      return payload.command
    }
    return ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      layout
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all',
          'border-l-2',
          isPending && 'border-l-border',
          isApplied && 'border-l-primary/50',
          isRejected && 'border-l-muted-foreground/50',
          'hover:border-primary/20'
        )}
      >
        <CardHeader className="relative z-10 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className={cn('border p-2', isFileWrite ? 'text-foreground' : 'text-foreground')}
              >
                {isFileWrite ? <FileText className="h-5 w-5" /> : <Terminal className="h-5 w-5" />}
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base font-semibold tracking-tight">
                  {getArtifactTitle()}
                </CardTitle>
                <CardDescription className="line-clamp-1 font-mono text-xs">
                  {getArtifactSubtitle()}
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="text-xs font-medium uppercase tracking-wider">
              {artifact.status}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="relative z-10 pt-2">
          {isFileWritePayload(payload) && payload.originalContent !== undefined && (
            <div className="mb-4">
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Changes Preview
              </div>
              <div className="overflow-hidden border bg-muted p-3 font-mono text-xs">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    {payload.originalContent && (
                      <div className="text-muted-foreground line-through opacity-60">
                        - {payload.originalContent.slice(0, 60)}
                        {payload.originalContent.length > 60 ? '...' : ''}
                      </div>
                    )}
                    <div className="text-foreground">
                      + {payload.content.slice(0, 60)}
                      {payload.content.length > 60 ? '...' : ''}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isCommandRunPayload(payload) && (
            <div className="mb-4">
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Command Details
              </div>
              <div className="border bg-muted p-3 font-mono text-xs">
                <span className="text-muted-foreground">$</span> {payload.command}
                {payload.workingDirectory && (
                  <div className="mt-1 text-muted-foreground">cd {payload.workingDirectory}</div>
                )}
              </div>
            </div>
          )}

          {artifact.description && (
            <p className="mb-3 text-sm italic text-muted-foreground">{artifact.description}</p>
          )}

          {isPending && !isBatchAction && (
            <div className="flex gap-2">
              <Button
                onClick={() => onApply(artifact.id)}
                className="flex-1 rounded-none"
                size="sm"
              >
                <Check className="mr-1.5 h-4 w-4" />
                Apply
              </Button>
              <Button
                onClick={() => onReject(artifact.id)}
                variant="outline"
                className="flex-1 rounded-none"
                size="sm"
              >
                <X className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
