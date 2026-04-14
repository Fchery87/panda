import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function NotFound() {
  return (
    <main className="dot-grid flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <PandaLogo className="h-12 w-12" />
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="text-label text-primary">404</span>
        <h1 className="font-mono text-2xl font-bold">Page not found</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Try heading back to
          the homepage or the workbench.
        </p>
      </div>
      <div className="flex gap-3">
        <Button asChild className="rounded-none font-mono">
          <Link href="/">Go Home</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-none font-mono">
          <Link href="/projects">Open Workbench</Link>
        </Button>
      </div>
    </main>
  )
}
