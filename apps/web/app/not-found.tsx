import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <PandaLogo className="h-12 w-12" />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-mono text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button asChild className="rounded-none font-mono">
        <Link href="/">Go Home</Link>
      </Button>
    </div>
  )
}
