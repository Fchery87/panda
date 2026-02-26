'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User, Shield, Settings, BookOpen, Keyboard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'

interface UserMenuProps {
  compact?: boolean
  className?: string
}

export function UserMenu({ compact = false, className }: UserMenuProps = {}) {
  const router = useRouter()
  const { signOut } = useAuthActions()
  const user = useQuery(api.users.getCurrent)
  const adminCheck = useQuery(api.admin.checkIsAdmin)
  const openCommandPalette = useCommandPaletteStore((state) => state.open)

  if (!user) return null
  const displayName = user.name || 'User'
  const displayEmail = user.email || ''
  const avatarSrc = user.avatarUrl || user.image || undefined
  const avatarAlt = displayEmail ? `${displayName} (${displayEmail})` : displayName
  const isAdmin = adminCheck?.isAdmin ?? false

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            compact ? 'h-9 w-9 sm:h-9 sm:w-9' : 'h-11 w-11',
            'rounded-none p-0',
            className
          )}
          aria-label="User menu"
        >
          <Avatar className={cn(compact ? 'h-8 w-8 sm:h-8 sm:w-8' : 'h-11 w-11', 'rounded-none')}>
            <AvatarImage src={avatarSrc} alt={avatarAlt} />
            <AvatarFallback className="rounded-none">
              <User className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-none border-border">
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-9 w-9 rounded-none border border-border">
            <AvatarImage src={avatarSrc} alt={avatarAlt} />
            <AvatarFallback className="rounded-none">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{displayName}</span>
            <span className="max-w-[170px] truncate text-xs text-muted-foreground">
              {displayEmail}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-none">
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer rounded-none"
          onSelect={() => router.push('/settings#llm')}
        >
          <BookOpen className="mr-2 h-4 w-4" />
          LLM Providers
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild className="cursor-pointer rounded-none">
            <Link href="/admin">
              <Shield className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openCommandPalette} className="cursor-pointer rounded-none">
          <Keyboard className="mr-2 h-4 w-4" />
          Keyboard Shortcuts
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-none">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
