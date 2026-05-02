'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X as IconX } from 'lucide-react'
import type { SidebarSection } from './SidebarRail'
import {
  Folder as IconProjects,
  Bot as IconAgents,
  Search as IconSearch,
  GitBranch as IconGit,
  Globe as IconDeploy,
  History as IconHistory,
} from 'lucide-react'

interface MobileSidebarItem {
  id: SidebarSection
  label: string
}

const NAV_ITEMS: MobileSidebarItem[] = [
  { id: 'files', label: 'Files' },
  { id: 'agents', label: 'Active Agents' },
  { id: 'search', label: 'Search' },
  { id: 'git', label: 'Source Control' },
  { id: 'deploy', label: 'Deploy & Preview' },
  { id: 'tasks', label: 'Task History' },
]

const ICON_MAP: Record<SidebarSection, typeof IconProjects> = {
  files: IconProjects,
  agents: IconAgents,
  search: IconSearch,
  git: IconGit,
  deploy: IconDeploy,
  tasks: IconHistory,
}

interface MobileSidebarSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeSection: SidebarSection
  onSectionChange: (section: SidebarSection) => void
}

export function MobileSidebarSheet({
  open,
  onOpenChange,
  activeSection,
  onSectionChange,
}: MobileSidebarSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-background/80"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] border-t border-border bg-background"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <Dialog.Title className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-foreground">
                    Navigate
                  </Dialog.Title>
                  <Dialog.Close className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground">
                    <IconX className="h-4 w-4" />
                  </Dialog.Close>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border p-px">
                  {NAV_ITEMS.map((item) => {
                    const Icon = ICON_MAP[item.id]
                    const isActive = item.id === activeSection
                    return (
                      <Dialog.Close key={item.id} asChild>
                        <button
                          type="button"
                          onClick={() => {
                            onSectionChange(item.id)
                            onOpenChange(false)
                          }}
                          className={`flex flex-col items-center gap-2 p-4 transition-colors ${
                            isActive
                              ? 'bg-surface-2 text-primary'
                              : 'hover:bg-surface-1 bg-background text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                            {item.label}
                          </span>
                        </button>
                      </Dialog.Close>
                    )
                  })}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
