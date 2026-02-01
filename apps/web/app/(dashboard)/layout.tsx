import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardHeader } from './components/DashboardHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container py-6">{children}</main>
      </div>
    </ProtectedRoute>
  )
}
