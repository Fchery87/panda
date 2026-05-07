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
    <nav className="fixed left-0 right-0 top-0 z-50 px-3 pt-3 sm:px-5 lg:px-8">
      <div className="shadow-sharp-sm bg-card/95 mx-auto grid h-14 max-w-[1500px] grid-cols-[auto_1fr_auto] border border-foreground text-foreground">
        <Link
          href="/"
          className="hover:bg-background/70 flex items-center border-r border-foreground px-4 transition-colors sm:px-5"
        >
          <PandaLogo size="md" variant="full" />
        </Link>

        <div className="hidden min-w-0 items-center sm:flex">
          {showEducationLink ? (
            <Link
              href="/education"
              className="hover:bg-background/70 flex h-full items-center gap-2 border-r border-border px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <BookOpen size={14} />
              How It Works
            </Link>
          ) : null}
          <a
            href="https://github.com/Fchery87/panda"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-background/70 flex h-full items-center border-r border-border px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
          >
            Source
          </a>
        </div>

        <div className="flex items-center border-l border-foreground">
          <div className="hidden h-full items-center border-r border-border px-2 sm:flex">
            <ThemeToggle />
          </div>
          <Link href="/projects" className="h-full">
            <Button className="h-full rounded-none border-0 px-4 font-mono text-xs uppercase tracking-[0.16em] shadow-none sm:px-5">
              Launch App
              <ArrowRight className="ml-2" size={14} />
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
