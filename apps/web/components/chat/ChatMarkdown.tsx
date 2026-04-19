'use client'

import { memo, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import type { Components } from 'react-markdown'
import { parseStreamingMarkdown, type StreamingMarkdownBlock } from './streaming-markdown-parser'

interface CodeBlockProps {
  lang: string
  code: string
  resolvedTheme: string | undefined
}

function CodeBlock({ lang, code, resolvedTheme }: CodeBlockProps) {
  const [highlighted, setHighlighted] = useState<React.ReactNode | null>(null)

  useEffect(() => {
    let cancelled = false

    async function highlight() {
      try {
        const { codeToHast } = await import('shiki/bundle/web')
        const { toJsxRuntime } = await import('hast-util-to-jsx-runtime')
        const { Fragment, jsx, jsxs } = await import('react/jsx-runtime')

        const theme = resolvedTheme === 'dark' ? 'github-dark' : 'github-light'
        const hast = await codeToHast(code, { lang: lang || 'text', theme })
        const node = toJsxRuntime(hast, { Fragment, jsx, jsxs })

        if (!cancelled) {
          setHighlighted(node as React.ReactNode)
        }
      } catch {
        // Silently fall back to plain rendering
      }
    }

    void highlight()
    return () => {
      cancelled = true
    }
  }, [code, lang, resolvedTheme])

  if (highlighted) {
    return (
      <div className="my-3 overflow-x-auto rounded-none border border-border text-[12px] leading-5 [&_pre]:p-3">
        {highlighted}
      </div>
    )
  }

  // Fallback while Shiki loads
  return (
    <pre className="my-3 overflow-x-auto rounded-none border border-border bg-muted/40 p-3 font-mono text-[12px] leading-5">
      <code>{code}</code>
    </pre>
  )
}

const INLINE_CODE_CLASS = 'rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground'

interface ChatMarkdownProps {
  content: string
  className?: string
}

interface StreamingChatMarkdownProps {
  content: string
  className?: string
  batchMs?: number
}

function useBatchedContent(content: string, batchMs: number): string {
  const [batchedContent, setBatchedContent] = useState(content)

  useEffect(() => {
    if (content === batchedContent) return
    if (batchMs <= 0) {
      setBatchedContent(content)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setBatchedContent(content)
    }, batchMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [batchMs, batchedContent, content])

  return batchedContent
}

function useMarkdownComponents(resolvedTheme: string | undefined): Components {
  return useMemo(
    () => ({
      code({ className: cls, children, ...props }) {
        const match = /language-(\w+)/.exec(cls ?? '')
        const isBlock = match !== null

        if (isBlock) {
          return (
            <CodeBlock
              lang={match[1]}
              code={String(children).replace(/\n$/, '')}
              resolvedTheme={resolvedTheme}
            />
          )
        }

        return (
          <code className={INLINE_CODE_CLASS} {...props}>
            {children}
          </code>
        )
      },

      pre({ children }) {
        return <>{children}</>
      },

      p({ children }) {
        return (
          <p className="mb-2 min-w-0 leading-6 tracking-[0.01em] [overflow-wrap:anywhere] last:mb-0">
            {children}
          </p>
        )
      },

      ul({ children }) {
        return (
          <ul className="mb-2 min-w-0 space-y-1 pl-4 text-[13px] leading-6 last:mb-0 xl:text-sm">
            {children}
          </ul>
        )
      },

      ol({ children }) {
        return (
          <ol className="mb-2 min-w-0 space-y-1 pl-4 text-[13px] leading-6 last:mb-0 xl:text-sm">
            {children}
          </ol>
        )
      },

      li({ children }) {
        return <li className="list-disc marker:text-primary/70">{children}</li>
      },

      strong({ children }) {
        return <strong className="font-semibold text-foreground">{children}</strong>
      },

      em({ children }) {
        return <em className="italic text-foreground">{children}</em>
      },

      a({ href, children }) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        )
      },

      blockquote({ children }) {
        return (
          <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        )
      },

      h1({ children }) {
        return <h1 className="mb-2 mt-3 font-mono text-base font-semibold">{children}</h1>
      },

      h2({ children }) {
        return <h2 className="mb-2 mt-3 font-mono text-sm font-semibold">{children}</h2>
      },

      h3({ children }) {
        return <h3 className="mb-1 mt-2 font-mono text-sm font-medium">{children}</h3>
      },
    }),
    [resolvedTheme]
  )
}

const MarkdownBlock = memo(function MarkdownBlock({
  content,
  components,
}: {
  content: string
  components: Components
}) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  )
})

const StreamingMarkdownRenderer = memo(function StreamingMarkdownRenderer({
  block,
  components,
  resolvedTheme,
}: {
  block: StreamingMarkdownBlock
  components: Components
  resolvedTheme: string | undefined
}) {
  switch (block.type) {
    case 'markdown':
      return <MarkdownBlock content={block.content} components={components} />
    case 'code':
      return <CodeBlock lang={block.language} code={block.code} resolvedTheme={resolvedTheme} />
    case 'list':
      return block.ordered ? (
        <ol className="mb-2 min-w-0 space-y-1 pl-4 text-[13px] leading-6 last:mb-0 xl:text-sm">
          {block.items.map((item, index) => (
            <li
              key={`streaming-ol-${index}`}
              className="list-decimal marker:font-mono marker:text-muted-foreground"
            >
              <MarkdownBlock content={item} components={components} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="mb-2 min-w-0 space-y-1 pl-4 text-[13px] leading-6 last:mb-0 xl:text-sm">
          {block.items.map((item, index) => (
            <li key={`streaming-ul-${index}`} className="list-disc marker:text-primary/70">
              <MarkdownBlock content={item} components={components} />
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="my-3 overflow-x-auto rounded-none border border-border bg-muted/20">
          <table className="min-w-full border-collapse text-left text-[13px] xl:text-sm">
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={`streaming-row-${rowIndex}`}
                  className="border-b border-border/70 last:border-b-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`streaming-cell-${rowIndex}-${cellIndex}`}
                      className="px-3 py-2 align-top"
                    >
                      <MarkdownBlock content={cell} components={components} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    case 'quote':
      return (
        <blockquote className="my-2 border-l-2 border-primary/40 pl-3 text-muted-foreground">
          <MarkdownBlock content={block.content} components={components} />
        </blockquote>
      )
  }
})

export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  const { resolvedTheme } = useTheme()
  const components = useMarkdownComponents(resolvedTheme)

  return (
    <div
      className={cn(
        'min-w-0 break-words text-[13px] leading-relaxed [overflow-wrap:anywhere] xl:text-sm',
        className
      )}
    >
      <MarkdownBlock content={content} components={components} />
    </div>
  )
}

export function StreamingChatMarkdown({
  content,
  className,
  batchMs = 16,
}: StreamingChatMarkdownProps) {
  const { resolvedTheme } = useTheme()
  const components = useMarkdownComponents(resolvedTheme)
  const batchedContent = useBatchedContent(content, batchMs)
  const blocks = useMemo(() => parseStreamingMarkdown(batchedContent), [batchedContent])

  return (
    <div
      className={cn(
        'min-w-0 break-words text-[13px] leading-relaxed [overflow-wrap:anywhere] xl:text-sm',
        className
      )}
    >
      {blocks.map((block, index) => (
        <StreamingMarkdownRenderer
          key={`stream-block-${index}-${block.type}-${block.isSettled ? 'settled' : 'live'}`}
          block={block}
          components={components}
          resolvedTheme={resolvedTheme}
        />
      ))}
    </div>
  )
}
