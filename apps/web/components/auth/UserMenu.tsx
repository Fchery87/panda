'use client'

import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, User } from 'lucide-react'

export function UserMenu() {
  const { signOut } = useAuthActions()
  const user = useQuery(api.users.getCurrent)

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-none p-0">
          <Avatar className="h-8 w-8 rounded-none">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.name || user.email} />
            <AvatarFallback className="rounded-none">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none">
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col">
            <span className="text-sm font-medium">{user.name || 'User'}</span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-none">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
