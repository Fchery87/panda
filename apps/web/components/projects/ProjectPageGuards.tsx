'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { PandaLogo } from '@/components/ui/panda-logo'

export function ProjectNotFoundGuard() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="space-y-6 text-center"
      >
        <span className="text-label text-primary">404</span>
        <h1 className="font-mono text-2xl font-bold">Project not found</h1>
        <p className="font-mono text-sm text-muted-foreground">
          This project doesn&apos;t exist or was deleted. Your other projects are safe.
        </p>
        <Button
          variant="outline"
          className="rounded-none font-mono"
          onClick={() => {
            window.location.href = '/projects'
          }}
        >
          Back to Projects
        </Button>
      </motion.div>
    </div>
  )
}

export function ProjectLoadingGuard({ projectLoaded }: { projectLoaded: boolean }) {
  return (
    <div className="dot-grid flex h-screen w-full items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="space-y-6 text-center"
      >
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="flex justify-center"
        >
          <PandaLogo size="xl" variant="icon" />
        </motion.div>
        <p className="font-mono text-sm text-muted-foreground">
          {projectLoaded ? 'Loading files...' : 'Loading project...'}
        </p>
      </motion.div>
    </div>
  )
}
