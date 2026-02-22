import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { DashboardHeader } from './components/DashboardHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-primary focus:p-4 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <DashboardHeader />
        <main id="main-content" className="container py-6" tabIndex={-1}>
          {children}
        </main>
        <CommandPalette />
      </div>
    </ProtectedRoute>
  )
}
