'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const result = useQuery(api.admin.checkIsAdmin)

  // Loading state - don't make any decisions yet
  if (result === undefined) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Not admin - show access denied and redirect
  if (!result.isAdmin) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access the admin dashboard.
        </p>
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Home
        </Button>
      </div>
    )
  }

  const { isAdmin, adminRole } = result

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 h-screen w-64 border-r border-border bg-background">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center border-b border-border px-6">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center bg-primary font-mono text-sm font-bold text-primary-foreground">
                A
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-sm font-bold">ADMIN</span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {adminRole || 'admin'}
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="space-y-1 px-3">
              {adminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              ))}
            </nav>

            <Separator className="my-4" />

            {/* Back to app */}
            <div className="px-3">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-none px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to App
              </Link>
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-border p-4">
            <p className="font-mono text-xs text-muted-foreground">Panda.ai Admin Console</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 pl-64">
        <div className="h-full">{children}</div>
      </main>
    </div>
  )
}
