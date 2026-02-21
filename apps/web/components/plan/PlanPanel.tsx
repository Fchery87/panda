'use client'

import { useState, useMemo } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MermaidRenderer } from './MermaidRenderer'
import { FileText, GitGraph, Check, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface PlanPanelProps {
  planDraft: string
  onChange: (value: string) => void
  onSave: () => void
  isSaving: boolean
  lastSavedAt: number | null
}

export function PlanPanel({ planDraft, onChange, onSave, isSaving, lastSavedAt }: PlanPanelProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const mermaidBlocks = useMemo(() => extractMermaidBlocks(planDraft), [planDraft])
  const markdownContent = useMemo(() => removeMermaidBlocks(planDraft), [planDraft])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitGraph className="h-4 w-4 text-primary" />
          <span className="font-mono text-sm uppercase tracking-wider">Plan Draft</span>
        </div>

        <div className="flex items-center gap-2">
          {lastSavedAt && (
            <span className="font-mono text-xs text-muted-foreground">
              Saved{' '}
              {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            className="h-7 rounded-none px-3 font-mono text-xs"
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3 w-3" />
                Save
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}
        className="flex-1 overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-border bg-transparent px-4">
          <TabsTrigger
            value="edit"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <FileText className="h-3.5 w-3.5" />
            Edit
          </TabsTrigger>
          <TabsTrigger
            value="preview"
            className="gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 font-mono text-xs uppercase tracking-wider data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            <GitGraph className="h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="m-0 h-[calc(100%-48px)] overflow-auto">
          <Textarea
            value={planDraft}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`# Project Plan

## Phase 1: Setup
- Initialize project
- Configure build tools

## Phase 2: Implementation
- Create components
- Add routing

## Diagram
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
\`\`\``}
            className="h-full min-h-[400px] resize-none rounded-none border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
          />
        </TabsContent>

        <TabsContent value="preview" className="m-0 h-[calc(100%-48px)] overflow-auto p-4">
          <div className="prose prose-sm dark:prose-invert prose-headings:font-mono prose-headings:uppercase prose-headings:tracking-wider max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdownContent}</ReactMarkdown>
          </div>

          {mermaidBlocks.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Diagrams
              </div>
              {mermaidBlocks.map((block, index) => (
                <MermaidRenderer key={index} content={block} className="border border-border" />
              ))}
            </div>
          )}

          {planDraft.trim() === '' && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto h-8 w-8 opacity-50" />
                <p className="mt-2 font-mono text-sm">No plan content</p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function extractMermaidBlocks(content: string): string[] {
  const regex = /```mermaid\n([\s\S]*?)```/g
  const blocks: string[] = []
  let match
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1].trim())
  }
  return blocks
}

function removeMermaidBlocks(content: string): string {
  return content.replace(/```mermaid[\s\S]*?```/g, '').trim()
}
