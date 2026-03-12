'use client'

import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  path?: string
  isFile?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  projectName: string
  projectId: string
  className?: string
}

export function Breadcrumb({ items, projectName, projectId, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        href="/projects"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />

      <Link
        href={`/projects/${projectId}`}
        className="font-mono text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        {projectName}
      </Link>

      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          {item.path && index < items.length - 1 ? (
            <Link
              href={item.path}
              className="font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span
              className={cn(
                'font-mono text-xs',
                index === items.length - 1 && item.isFile ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}

export function buildBreadcrumbItems(filePath: string | null): BreadcrumbItem[] {
  if (!filePath) return []

  const parts = filePath.split('/')
  return parts.map((part, index) => ({
    label: part,
    isFile: index === parts.length - 1,
  }))
}
