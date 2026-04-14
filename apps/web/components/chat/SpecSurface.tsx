'use client'

import { AnimatePresence, motion } from 'framer-motion'
import type { FormalSpecification } from '@/lib/agent/spec/types'
import { SpecDrawer } from '@/components/chat/SpecDrawer'

export type SpecSurfaceMode = 'closed' | 'approval' | 'inspect'

interface SpecSurfaceProps {
  mode: SpecSurfaceMode
  spec: FormalSpecification | null
  onApprove: (spec: FormalSpecification) => void
  onEdit: (spec: FormalSpecification) => void
  onCancel: () => void
  onClose: () => void
  children?: React.ReactNode
}

export function SpecSurface({
  mode,
  spec,
  onApprove,
  onEdit,
  onCancel,
  onClose,
  children,
}: SpecSurfaceProps) {
  if (mode === 'closed' || !spec) return null

  if (mode === 'inspect') {
    return children ?? <SpecDrawer spec={spec} isOpen={true} onClose={onClose} />
  }

  return (
    <AnimatePresence>
      <>
        <motion.button
          type="button"
          aria-label="Close spec editor"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-20 bg-background/55 backdrop-blur-[1px]"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="shadow-sharp-lg absolute inset-x-0 bottom-0 z-30 max-h-[90vh] border-t border-border bg-background sm:inset-x-3 sm:bottom-3 sm:border"
        >
          {children ?? (
            <div className="p-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-label font-mono">Specification Review</h3>
                <button
                  onClick={onClose}
                  className="rounded-none border border-border px-2 py-1 font-mono text-xs"
                >
                  Close
                </button>
              </div>
              <div className="mt-3 space-y-2">
                <p className="font-mono text-sm">
                  <strong>Goal:</strong> {spec.intent.goal}
                </p>
                {spec.plan.steps.length > 0 && (
                  <div className="font-mono text-sm">
                    <strong>Steps:</strong>
                    <ol className="ml-4 list-decimal">
                      {spec.plan.steps.map((step, i) => (
                        <li key={step.id ?? i}>{step.description}</li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onApprove(spec)}
                    className="rounded-none bg-primary px-4 py-2 font-mono text-xs text-primary-foreground"
                  >
                    Execute
                  </button>
                  <button
                    onClick={() => onEdit(spec)}
                    className="rounded-none border border-border px-4 py-2 font-mono text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={onCancel}
                    className="rounded-none border border-border px-4 py-2 font-mono text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </>
    </AnimatePresence>
  )
}
