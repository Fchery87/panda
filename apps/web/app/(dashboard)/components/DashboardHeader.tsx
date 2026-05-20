'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { BookOpen, FolderGit2, Plus, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/auth/UserMenu'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'

const navItems = [
  { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/education', label: 'Education', icon: BookOpen },
]

export function DashboardHeader() {
  const pathname = usePathname()
  const openCommandPalette = useCommandPaletteStore((state) => state.open)

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 z-50 w-full px-3 py-3 sm:px-5 lg:px-8"
    >
      <div className="shadow-sharp-sm bg-card/95 mx-auto grid h-14 max-w-[1500px] grid-cols-[auto_auto_minmax(120px,1fr)_auto] border border-border text-foreground">
        {/* Logo */}
        <Link
          href="/"
          className="hover:bg-background/70 flex shrink-0 items-center border-r border-border px-3 transition-colors sm:px-4"
        >
          <PandaLogo size="md" variant="full" />
        </Link>

        {/* Navigation */}
        <nav
          className="flex shrink-0 items-center border-r border-foreground"
          aria-label="Workspace"
        >
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex h-full items-center gap-2 border-r border-border px-3 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors last:border-r-0 sm:px-4',
                  isActive
                    ? 'bg-primary/10 text-foreground'
                    : 'hover:bg-background/70 text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Command Palette Trigger */}
        <button
          type="button"
          className="bg-background/70 flex min-w-0 items-center gap-2 px-3 text-left font-mono text-xs text-muted-foreground transition-colors hover:bg-background hover:text-foreground sm:px-4"
          onClick={openCommandPalette}
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span className="truncate max-sm:hidden">Search commands...</span>
          <span className="truncate sm:hidden">Search…</span>
          <div className="ml-auto hidden items-center gap-1 sm:flex">
            <kbd className="border border-border bg-card px-1.5 py-0.5 text-[10px]">Ctrl</kbd>
            <kbd className="border border-border bg-card px-1.5 py-0.5 text-[10px]">K</kbd>
          </div>
        </button>

        {/* Right side */}
        <div className="flex shrink-0 items-center border-l border-border">
          {/* New Project CTA */}
          <Link
            href="/projects"
            className="hover:bg-primary/90 flex h-full items-center gap-2 border-r border-border bg-primary px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-primary-foreground transition-colors sm:px-4"
          >
            <Plus size={14} />
            <span className="hidden md:inline">New Project</span>
          </Link>

          <div className="hidden h-full items-center border-r border-border px-2 sm:flex">
            <ThemeToggle />
          </div>

          {/* User Menu (profile + admin + sign out) */}
          <div className="flex h-full items-center px-2">
            <UserMenu compact />
          </div>
        </div>
      </div>
    </motion.header>
  )
}
