'use client'

import { usePathname } from 'next/navigation'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { DashboardHeader } from './components/DashboardHeader'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // Hide dashboard header on project workbench pages (they have their own unified header)
  const isProjectWorkbench =
    pathname?.startsWith('/projects/') && pathname?.length > '/projects/'.length

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {!isProjectWorkbench && <DashboardHeader />}
        <main
          id="main-content"
          className={cn('container', !isProjectWorkbench && 'py-6')}
          tabIndex={-1}
        >
          {children}
        </main>
        <CommandPalette />
      </div>
    </ProtectedRoute>
  )
}
