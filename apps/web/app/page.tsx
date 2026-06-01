'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock, GitBranch, Shield, Terminal, Zap } from 'lucide-react'
import { useConvexAuth } from 'convex/react'

import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const heroSignals = ['ASK', 'PLAN', 'AGENT'] as const

const trustRows = [
  ['MODE', 'Ask / Plan / Agent', 'Guided and Autopilot define the Agent trust boundary.'],
  ['RUNTIME', 'Browser first', 'Server fallback keeps command work available when needed.'],
  [
    'RUN',
    'Receipts + checkpoints',
    'Changed files, approvals, commands, and recovery state stay inspectable.',
  ],
]

const featureRows = [
  {
    icon: Shield,
    title: 'Files stay editor-owned',
    detail:
      'The central Editor owns file opening, editing, generated files, and Review Diff. Chat directs the work without becoming the file system.',
  },
  {
    icon: GitBranch,
    title: 'Plans become contracts',
    detail:
      'Plan mode captures scope, constraints, and acceptance checks before an Agent run starts changing files or running commands.',
  },
  {
    icon: Clock,
    title: 'Runs leave receipts',
    detail:
      'Agent runs preserve bounded receipts, approval decisions, command summaries, changed work, and checkpoint state.',
  },
]

const workflowRows = [
  ['01', 'Orient', 'Select files, objective, memory, and project context in the IDE.'],
  [
    '02',
    'Choose',
    'Use Ask for understanding, Plan for a reviewable contract, or Agent for implementation.',
  ],
  [
    '03',
    'Control',
    'Run Agent as Guided or Autopilot and approve gated actions when risk increases.',
  ],
  [
    '04',
    'Review',
    'Move through Review Diff, Run evidence, receipts, checkpoints, and next action without losing the thread.',
  ],
]

export default function Home() {
  const { isAuthenticated } = useConvexAuth()

  return (
    <main id="main-content" className="dot-grid min-h-screen bg-background text-foreground">
      <PublicNav showEducationLink />

      <section className="px-3 pb-14 pt-20 sm:px-5 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="bg-background/92 shadow-sharp-lg mx-auto max-w-[1500px] border border-border">
          <nav
            className="grid border-b border-border bg-card sm:grid-cols-3"
            aria-label="Panda workflow modes"
          >
            {heroSignals.map((mode, index) => (
              <div
                key={mode}
                className={cn(
                  'flex min-h-11 items-center justify-between border-b border-border px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:border-b-0 sm:border-r',
                  mode === 'AGENT' && 'bg-primary/10 text-foreground',
                  index === heroSignals.length - 1 && 'sm:border-r-0'
                )}
              >
                <span>{mode}</span>
                {mode === 'AGENT' ? <span className="text-primary">GUIDED / AUTOPILOT</span> : null}
              </div>
            ))}
          </nav>

          <div className="bg-foreground/80 grid gap-px lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.28fr)]">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="bg-background px-5 py-8 sm:px-7 lg:px-9 lg:py-12"
            >
              <div className="max-w-3xl">
                <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Calm under load. Exact during risk.
                </p>
                <h2 className="text-[clamp(3rem,8vw,5.5rem)] font-extrabold leading-[0.92] tracking-tight text-foreground">
                  Ask, plan, and run agents from one browser IDE.
                </h2>
                <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  Panda is a browser-first AI coding IDE for technically fluent users. Ask for
                  understanding, draft reviewable plans, then run Agent in Guided or Autopilot mode
                  while the Editor, approvals, receipts, checkpoints, and changed work stay attached
                  to the same project session.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/projects">
                    <Button className="h-11 rounded-none border border-border px-5 font-mono text-xs uppercase tracking-[0.16em] shadow-none">
                      {isAuthenticated ? 'Open Panda IDE' : 'Start Panda IDE'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/education">
                    <Button
                      variant="outline"
                      className="h-11 rounded-none border-border bg-card px-5 font-mono text-xs uppercase tracking-[0.16em]"
                    >
                      Read operating model
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-10 grid gap-px bg-border sm:grid-cols-3">
                {trustRows.map(([label, value, detail]) => (
                  <div key={label} className="bg-card p-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {label}
                    </p>
                    <p className="mt-2 font-mono text-xs uppercase tracking-[0.12em] text-foreground">
                      {value}
                    </p>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{detail}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: 0.06 }}
              className="bg-card p-3 sm:p-5 lg:p-7"
            >
              <WorkbenchPreview />
            </motion.div>
          </div>
        </div>
      </section>

      <section className="px-3 pb-16 sm:px-5 lg:px-8">
        <div className="bg-foreground/80 mx-auto grid max-w-[1500px] gap-px lg:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-card p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
              Operating model
            </p>
            <h2 className="mt-4 max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              Designed around reviewable Agent work, not chat theatrics.
            </h2>
          </div>
          <div className="grid gap-px bg-border">
            {workflowRows.map(([step, label, detail]) => (
              <div
                key={step}
                className="grid gap-3 bg-background p-5 sm:grid-cols-[72px_140px_1fr]"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
                  {step}
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.16em] text-foreground">
                  {label}
                </span>
                <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-3 pb-20 sm:px-5 lg:px-8">
        <div className="mx-auto grid max-w-[1500px] gap-px bg-border md:grid-cols-3">
          {featureRows.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="bg-card p-6">
                <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
                <h3 className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}

function WorkbenchPreview() {
  return (
    <div className="shadow-sharp-md min-h-[560px] overflow-hidden border border-border bg-background">
      <div className="grid min-h-12 items-center border-b border-border bg-secondary px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:grid-cols-[180px_1fr_auto]">
        <div className="flex items-center gap-2 border-b border-border py-3 sm:border-b-0 sm:border-r">
          <span className="h-2 w-2 border border-border bg-primary" />
          Project / panda
        </div>
        <div className="hidden px-3 sm:block">Search files, commands, settings</div>
        <div className="flex gap-2 py-3 sm:py-0">
          <span className="border border-border bg-card px-2 py-1">Agent · Guided</span>
          <span className="bg-primary/10 border border-primary px-2 py-1 text-foreground">
            run evidence ready
          </span>
        </div>
      </div>

      <div className="grid min-h-[390px] grid-cols-[46px_1fr] md:grid-cols-[52px_180px_minmax(0,1fr)_230px]">
        <div className="bg-foreground text-background">
          {['SE', 'FI', 'GI', 'AG', 'PR'].map((code, index) => (
            <div
              key={code}
              className={cn(
                'border-background/15 grid h-12 place-items-center border-b font-mono text-[10px] font-bold',
                index === 0 && 'bg-primary text-foreground'
              )}
            >
              {code}
            </div>
          ))}
        </div>

        <div className="bg-secondary/70 hidden border-r border-border md:block">
          <PanelHeader label="Explorer" />
          {['app/page.tsx', 'components/workbench', 'convex/runs.ts', 'docs/DESIGN.md'].map(
            (file, index) => (
              <div
                key={file}
                className={cn(
                  'border-b border-border px-3 py-3 font-mono text-[11px]',
                  index === 1 ? 'bg-primary/10 text-foreground' : 'text-muted-foreground'
                )}
              >
                {file}
              </div>
            )
          )}
        </div>

        <div className="min-w-0 bg-card">
          <PanelHeader label="Reviewable plan" />
          <div className="p-4 sm:p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
              Awaiting owner approval
            </p>
            <h3 className="mt-3 max-w-xl text-2xl font-bold tracking-tight">
              Update Panda through a reviewable Agent run.
            </h3>
            <div className="mt-5 grid gap-px bg-border">
              {[
                ['01', 'Update the affected editor-owned files'],
                ['02', 'Keep Ask / Plan / Agent copy consistent'],
                ['03', 'Verify Review Diff, receipts, and checkpoint state'],
              ].map(([step, text]) => (
                <div key={step} className="grid grid-cols-[42px_1fr] bg-background">
                  <span className="border-r border-border p-3 font-mono text-[10px] text-primary">
                    {step}
                  </span>
                  <span className="p-3 text-sm text-muted-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden border-l border-border bg-background md:block">
          <PanelHeader label="Inspector rail" />
          <div className="grid gap-px bg-border">
            {[
              ['RUN', '3 steps ready'],
              ['RECEIPT', 'pending'],
              ['CHANGES', '2 files'],
              ['CHECKPOINT', 'saved'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between bg-card px-3 py-3">
                <span className="font-mono text-[10px] text-muted-foreground">{label}</span>
                <span className="font-mono text-[10px] uppercase text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="bg-primary/10 m-3 border border-primary p-3">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em]">
              <Check className="h-3.5 w-3.5 text-primary" />
              Run evidence saved
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Raw logs stay behind inspection. The default surface shows bounded run evidence.
            </p>
          </div>
        </div>
      </div>

      <div className="grid border-t border-border bg-card text-muted-foreground sm:grid-cols-[1fr_220px]">
        <div className="p-3 font-mono text-[11px]">
          <Terminal className="mr-2 inline h-3.5 w-3.5" aria-hidden="true" />
          bun run typecheck && bun run lint
        </div>
        <div className="border-background/20 border-t p-3 font-mono text-[10px] uppercase tracking-[0.16em] sm:border-l sm:border-t-0">
          <Zap className="mr-2 inline h-3 w-3" aria-hidden="true" />
          runtime active
        </div>
      </div>
    </div>
  )
}

function PanelHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-border bg-secondary px-3 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </div>
  )
}
