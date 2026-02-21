'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { cn } from '@/lib/utils'

interface MermaidRendererProps {
  content: string
  className?: string
}

export function MermaidRenderer({ content, className }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [svg, setSvg] = useState<string | null>(null)
  const [id] = useState(() => `mermaid-${Math.random().toString(36).slice(2, 11)}`)

  useEffect(() => {
    let isMounted = true

    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'strict',
          fontFamily: 'ui-monospace, monospace',
        })

        const { svg } = await mermaid.render(id, content)

        if (isMounted) {
          setSvg(svg)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to render diagram')
          setSvg(null)
        }
      }
    }

    renderDiagram()

    return () => {
      isMounted = false
    }
  }, [content, id])

  if (error) {
    return (
      <div className={cn('rounded-none border border-red-500/50 bg-red-500/10 p-3', className)}>
        <div className="font-mono text-xs uppercase tracking-wider text-red-500">Diagram Error</div>
        <pre className="mt-1 font-mono text-xs text-red-400">{error}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn('mermaid-diagram overflow-auto rounded-none bg-muted/30 p-4', className)}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    >
      {!svg && (
        <div className="flex items-center justify-center py-8">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}
    </div>
  )
}
