import { DashboardHeader } from './components/DashboardHeader'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      <main className="container py-6">{children}</main>
    </div>
  )
}
