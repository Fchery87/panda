'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Settings,
  BarChart3,
  Shield,
  ArrowLeft,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
  },
  {
    title: 'System Controls',
    href: '/admin/system',
    icon: Settings,
  },
  {
    title: 'Security',
    href: '/admin/security',
    icon: Shield,
  },
]

function isActiveAdminRoute(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === href
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname() ?? '/admin'
  const result = useQuery(api.admin.checkIsAdmin)

  // Loading state - don't make any decisions yet
  if (result === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  // Not admin - show access denied and redirect
  if (!result.isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle size={64} className="text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access the admin dashboard.
        </p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft size={16} className="mr-2" />
          Return to Home
        </Button>
      </div>
    )
  }

  const { adminRole } = result

  return (
    <>
      <div className="dot-grid flex min-h-screen bg-background text-foreground">
        {/* Sidebar */}
        <aside className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-foreground bg-foreground p-3 text-background">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="border-background/20 bg-background/5 border">
              <Link href="/admin" className="flex h-14 items-center gap-2 px-3">
                <div className="flex h-8 w-8 items-center justify-center border border-background bg-primary font-mono text-sm font-bold text-primary-foreground">
                  A
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-sm font-bold">ADMIN</span>
                  <span className="text-background/60 text-xs uppercase tracking-wider">
                    {adminRole || 'admin'}
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <ScrollArea className="border-background/20 bg-background/5 mt-3 flex-1 border py-3">
              <nav className="space-y-px px-2">
                {adminNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActiveAdminRoute(pathname, item.href) ? 'page' : undefined}
                    className={cn(
                      'flex min-h-10 items-center gap-3 rounded-none border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors',
                      isActiveAdminRoute(pathname, item.href)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'text-background/65 hover:border-background/25 hover:bg-background/10 border-transparent hover:text-background'
                    )}
                  >
                    <item.icon size={16} />
                    {item.title}
                  </Link>
                ))}
              </nav>

              <Separator className="bg-background/20 my-3" />

              {/* Back to app */}
              <div className="px-3">
                <Link
                  href="/"
                  className="text-background/65 hover:border-background/25 hover:bg-background/10 flex min-h-10 items-center gap-3 rounded-none border border-transparent px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors hover:text-background"
                >
                  <ArrowLeft size={16} />
                  Back to App
                </Link>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-background/20 bg-background/5 mt-3 border p-3">
              <p className="text-background/60 font-mono text-xs">Panda.ai Admin Console</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main id="main-content" className="flex-1 pl-64">
          <div className="min-h-screen p-3 sm:p-5 lg:p-8">
            <div className="bg-background/92 shadow-sharp-lg min-h-[calc(100vh-4rem)] border border-foreground">
              {children}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
