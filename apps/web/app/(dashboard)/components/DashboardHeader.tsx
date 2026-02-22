'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FolderGit2, Plus, Settings, User, Keyboard, BookOpen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'

const navItems = [{ href: '/projects', label: 'Projects', icon: FolderGit2 }]

export function DashboardHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const openCommandPalette = useCommandPaletteStore((state) => state.open)

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="surface-1 sticky top-0 z-50 w-full border-b border-border"
    >
      <div className="container flex h-14 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <PandaLogo size="md" />
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 rounded-none font-mono text-xs',
                    isActive && 'border-b-2 border-primary bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Command Palette Trigger */}
        <button
          type="button"
          className="mx-4 flex flex-1 items-center gap-2 rounded-none border border-border bg-muted/50 px-3 py-1.5 text-left font-mono text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
          onClick={openCommandPalette}
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search commands...</span>
          <kbd className="ml-auto rounded-none bg-background px-1.5 py-0.5 text-[10px]">Ctrl</kbd>
          <kbd className="rounded-none bg-background px-1.5 py-0.5 text-[10px]">K</kbd>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-1">
          {/* New Project CTA */}
          <Link href="/projects">
            <Button size="sm" className="gap-1.5 rounded-none font-mono text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
          </Link>

          <ThemeToggle />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-none"
                aria-label="User menu"
              >
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-none border-border">
              <DropdownMenuItem
                className="cursor-pointer rounded-none"
                onSelect={() => router.push('/settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer rounded-none"
                onSelect={() => router.push('/settings#llm')}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                LLM Providers
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer rounded-none"
                onSelect={openCommandPalette}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Keyboard Shortcuts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  )
}
