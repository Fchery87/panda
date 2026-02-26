import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { DashboardHeader } from './components/DashboardHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main id="main-content" className="container py-6" tabIndex={-1}>
          {children}
        </main>
        <CommandPalette />
      </div>
    </ProtectedRoute>
  )
}
