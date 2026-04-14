'use client'

import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'

interface PublicNavProps {
  showEducationLink?: boolean
}

export function PublicNav({ showEducationLink = false }: PublicNavProps) {
  return (
    <nav className="surface-1 fixed left-0 right-0 top-0 z-50 border-b border-border">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="transition-sharp hover:opacity-70">
          <PandaLogo size="md" variant="full" />
        </Link>
        <div className="flex items-center gap-4">
          {showEducationLink && (
            <Link
              href="/education"
              className="transition-sharp hidden items-center gap-1.5 font-mono text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <BookOpen className="h-3.5 w-3.5" />
              How It Works
            </Link>
          )}
          <a
            href="https://github.com/Fchery87/panda"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-sharp hidden font-mono text-xs uppercase tracking-wide text-muted-foreground hover:text-foreground sm:inline"
          >
            Source
          </a>
          <ThemeToggle />
          <Link href="/projects">
            <Button className="rounded-none font-mono text-sm tracking-wide">
              Launch App
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
