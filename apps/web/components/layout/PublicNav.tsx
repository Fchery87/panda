'use client'

import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
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
        <Link href="/" className="transition-refined hover:opacity-75">
          <PandaLogo size="md" variant="full" />
        </Link>
        <div className="flex items-center gap-4">
          {showEducationLink && (
            <Link
              href="/education"
              className="transition-refined hidden items-center gap-1.5 font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground sm:inline-flex"
            >
              <BookOpen size={14} />
              How It Works
            </Link>
          )}
          <a
            href="https://github.com/Fchery87/panda"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-refined hidden font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground hover:text-foreground sm:inline"
          >
            Source
          </a>
          <ThemeToggle />
          <Link href="/projects">
            <Button className="rounded-none font-mono text-sm tracking-[0.04em]">
              Launch App
              <ArrowRight className="ml-2" size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
