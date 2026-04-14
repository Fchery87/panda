import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-label text-primary">404</span>
        <h1 className="font-mono text-2xl font-bold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          This dashboard page doesn&apos;t exist or has been moved. Head back to your projects.
        </p>
      </div>
      <Button asChild className="rounded-none font-mono">
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Link>
      </Button>
    </div>
  )
}
