import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-mono text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          This dashboard page doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild className="rounded-none font-mono">
        <Link href="/projects">Back to Projects</Link>
      </Button>
    </div>
  )
}
