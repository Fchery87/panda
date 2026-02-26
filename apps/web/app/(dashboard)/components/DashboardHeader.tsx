'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { FolderGit2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/auth/UserMenu'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'

const navItems = [{ href: '/projects', label: 'Projects', icon: FolderGit2 }]

export function DashboardHeader() {
  const pathname = usePathname()
  const openCommandPalette = useCommandPaletteStore((state) => state.open)

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="surface-1 sticky top-0 z-50 w-full border-b border-border"
    >
      <div className="container flex h-14 min-w-0 items-center gap-2 sm:gap-4">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <PandaLogo size="md" />
        </Link>

        {/* Navigation */}
        <nav className="flex shrink-0 items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'h-8 gap-1 rounded-none px-2 font-mono text-xs sm:h-9 sm:gap-2 sm:px-3',
                    isActive && 'border-b-2 border-primary bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden xs:inline sm:inline">{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Command Palette Trigger */}
        <button
          type="button"
          className="ml-1 flex min-w-0 flex-1 items-center gap-2 rounded-none border border-border bg-muted/50 px-2 py-1.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground sm:mx-4 sm:px-3"
          onClick={openCommandPalette}
          aria-label="Open command palette"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="truncate max-sm:hidden">Search commands...</span>
          <span className="truncate sm:hidden">Search…</span>
          <div className="ml-auto hidden items-center gap-1 sm:flex">
            <kbd className="rounded-none bg-background px-1.5 py-0.5 text-[10px]">Ctrl</kbd>
            <kbd className="rounded-none bg-background px-1.5 py-0.5 text-[10px]">K</kbd>
          </div>
        </button>

        {/* Right side */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {/* New Project CTA */}
          <Link href="/projects">
            <Button size="sm" className="h-8 gap-1 rounded-none px-2 font-mono text-xs sm:h-9 sm:gap-1.5 sm:px-3">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">New Project</span>
            </Button>
          </Link>

          <ThemeToggle />

          {/* User Menu (profile + admin + sign out) */}
          <UserMenu compact />
        </div>
      </div>
    </motion.header>
  )
}
