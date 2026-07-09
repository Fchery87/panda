'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'

interface PublicNavProps {
  showEducationLink?: boolean
}

export function PublicNav({ showEducationLink = false }: PublicNavProps) {
  return (
    <nav className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="bg-card/85 shadow-sharp-md mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-border pl-5 pr-2 backdrop-blur-md">
        <Link href="/" className="flex items-center" aria-label="Panda home">
          <PandaLogo size="md" variant="full" />
        </Link>

        <div className="flex items-center gap-1">
          {showEducationLink ? (
            <Link
              href="/education"
              className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:block"
            >
              How it works
            </Link>
          ) : null}
          <a
            href="https://github.com/Fchery87/panda"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:block"
          >
            Source
          </a>
          <div className="hidden px-1 sm:block">
            <ThemeToggle />
          </div>
          <Link href="/projects">
            <Button className="gap-1.5">
              Launch app
              <ArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
