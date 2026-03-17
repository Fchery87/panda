'use client'

import { IconBreadcrumbSeparator, IconFile, IconFolder } from '@/components/ui/icons'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  path?: string
  isFile?: boolean
  /** Folder path for Explorer reveal (new) */
  folderPath?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  projectName: string
  projectId: string
  className?: string
  /** Callback when a folder breadcrumb is clicked to reveal in Explorer */
  onRevealInExplorer?: (folderPath: string) => void
}

export function Breadcrumb({
  items,
  projectName,
  projectId,
  className,
  onRevealInExplorer,
}: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        href="/projects"
        className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <IconFile className="h-3.5 w-3.5" weight="duotone" />
      </Link>

      <IconBreadcrumbSeparator className="h-3.5 w-3.5 text-muted-foreground/50" />

      <Link
        href={`/projects/${projectId}`}
        className="font-mono text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        {projectName}
      </Link>

      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-1">
          <IconBreadcrumbSeparator className="h-3.5 w-3.5 text-muted-foreground/50" />
          {item.folderPath && onRevealInExplorer && index < items.length - 1 ? (
            <button
              type="button"
              onClick={() => onRevealInExplorer(item.folderPath!)}
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              title={`Reveal ${item.label} in Explorer`}
            >
              <IconFolder className="h-3 w-3" weight="duotone" />
              {item.label}
            </button>
          ) : item.path && index < items.length - 1 ? (
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

export function buildBreadcrumbItems(
  filePath: string | null,
  basePath: string = ''
): BreadcrumbItem[] {
  if (!filePath) return []

  const parts = filePath.split('/')
  return parts.map((part, index) => {
    const isFile = index === parts.length - 1
    // Build folder path for all non-file segments
    const folderPath = isFile
      ? undefined
      : basePath
        ? `${basePath}/${parts.slice(0, index + 1).join('/')}`
        : parts.slice(0, index + 1).join('/')

    return {
      label: part,
      isFile,
      folderPath,
    }
  })
}
