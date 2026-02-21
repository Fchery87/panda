'use client'

import Link from 'next/link'
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
import { LogOut, User, Shield, Settings } from 'lucide-react'

export function UserMenu() {
  const { signOut } = useAuthActions()
  const user = useQuery(api.users.getCurrent)
  const adminCheck = useQuery(api.admin.checkIsAdmin)

  if (!user) return null
  const displayName = user.name || 'User'
  const displayEmail = user.email || ''
  const avatarSrc = user.avatarUrl || user.image || undefined
  const avatarAlt = displayEmail ? `${displayName} (${displayEmail})` : displayName
  const isAdmin = adminCheck?.isAdmin ?? false

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-11 w-11 rounded-none p-0">
          <Avatar className="h-11 w-11 rounded-none">
            <AvatarImage src={avatarSrc} alt={avatarAlt} />
            <AvatarFallback className="rounded-none">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none">
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-muted-foreground">{displayEmail}</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer rounded-none">
          <Link href="/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
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
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-none">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
