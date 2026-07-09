'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, FolderGit2, Plus, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/auth/UserMenu'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'

const navItems = [
  { href: '/projects', label: 'Projects', icon: FolderGit2 },
  { href: '/education', label: 'Learn', icon: BookOpen },
]

export function DashboardHeader() {
  const pathname = usePathname()
  const openCommandPalette = useCommandPaletteStore((state) => state.open)

  return (
    <header className="bg-background/85 sticky top-0 z-50 w-full border-b border-border backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-5 sm:px-8">
        <Link href="/" className="mr-4 flex shrink-0 items-center" aria-label="Panda home">
          <PandaLogo size="md" variant="full" />
        </Link>

        <nav className="flex items-center gap-1" aria-label="Workspace">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-oxblood/25 text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* Command palette trigger */}
        <button
          type="button"
          className="hidden items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-oxblood/70 hover:text-foreground md:flex"
          onClick={openCommandPalette}
          aria-label="Open command palette"
        >
          <Search size={14} />
          <span>Search</span>
          <kbd className="ml-2 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Ctrl K
          </kbd>
        </button>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
          onClick={openCommandPalette}
          aria-label="Open command palette"
        >
          <Search size={16} />
        </button>

        {pathname === '/projects' ? (
          <Button
            className="gap-1.5"
            onClick={() => window.dispatchEvent(new Event('panda:create-project'))}
          >
            <Plus size={15} />
            <span className="hidden md:inline">New project</span>
          </Button>
        ) : (
          <Link href="/projects?create=1">
            <Button className="gap-1.5">
              <Plus size={15} />
              <span className="hidden md:inline">New project</span>
            </Button>
          </Link>
        )}

        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <UserMenu compact />
      </div>
    </header>
  )
}
