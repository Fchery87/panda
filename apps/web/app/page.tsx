'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Check, FileCode2, GitBranch, ReceiptText, ShieldCheck } from 'lucide-react'
import { useConvexAuth } from 'convex/react'

import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/button'

const runSteps = [
  { label: 'Spec approved', detail: 'fix the auth redirect loop', state: 'done' },
  { label: 'Plan reviewed', detail: '3 steps · 2 acceptance checks', state: 'done' },
  { label: 'Files changed', detail: 'middleware.ts · login/page.tsx · +1', state: 'done' },
  { label: 'Checks passed', detail: 'bun test — 14 pass, 0 fail', state: 'verified' },
  { label: 'Checkpoint saved', detail: 'replayable from step 2', state: 'active' },
] as const

const workflow = [
  {
    step: '01',
    mode: 'Ask',
    detail: 'Explore the codebase in plain language before anything changes.',
  },
  {
    step: '02',
    mode: 'Plan',
    detail: 'The agent drafts a reviewable contract: scope, steps, acceptance checks.',
  },
  {
    step: '03',
    mode: 'Agent',
    detail: 'Guided or autopilot — risky actions pause for your approval either way.',
  },
  {
    step: '04',
    mode: 'Review',
    detail: 'Walk the diff, the receipts, and the checkpoints. Keep it or roll it back.',
  },
]

const features = [
  {
    icon: FileCode2,
    title: 'Files stay editor-owned',
    detail:
      'The editor owns every file open, edit, and diff. Chat directs the work without becoming the file system.',
  },
  {
    icon: GitBranch,
    title: 'Plans become contracts',
    detail:
      'A plan captures scope, constraints, and acceptance checks before the agent touches a file or runs a command.',
  },
  {
    icon: ReceiptText,
    title: 'Runs leave receipts',
    detail:
      'Every run preserves its approvals, commands, changed files, and a checkpoint you can restore.',
  },
]

export default function Home() {
  const { isAuthenticated } = useConvexAuth()
  const reduceMotion = useReducedMotion()

  return (
    <main id="main-content" className="dot-grid min-h-screen bg-background text-foreground">
      <PublicNav showEducationLink />

      {/* Hero — paper on the left, the agent's ink on the right */}
      <section className="mx-auto max-w-6xl px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
          >
            <p className="text-sm font-medium text-oxblood">The spec-native IDE</p>
            <h1 className="font-display mt-4 text-balance text-[clamp(2.6rem,6vw,4.4rem)] font-semibold leading-[1.04] tracking-tight">
              Every agent run, on&nbsp;the&nbsp;record.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Panda is a browser IDE where you set the spec, the agent plans in the open, and every
              change ships with receipts, approvals, and checkpoints you can replay.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/projects">
                <Button size="lg" className="gap-2 text-base">
                  {isAuthenticated ? 'Open Panda' : 'Start building'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link
                href="/education"
                className="text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                See how a run works
              </Link>
            </div>
            <p className="mt-10 text-sm text-muted-foreground">
              Browser-first runtime · Plans you approve · Nothing changes without a trace
            </p>
          </motion.div>

          {/* Run receipt — an ink panel, the signature surface */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease: [0.2, 0, 0, 1] }}
          >
            <div className="ink-panel shadow-sharp-lg rounded-xl p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Agent run</p>
                  <p className="mt-1 font-mono text-sm text-foreground">fix-auth-redirect</p>
                </div>
                <span className="badge-md" data-status="complete">
                  <Check className="h-3 w-3" />
                  verified
                </span>
              </div>

              <ol className="mt-6 space-y-0">
                {runSteps.map((step, index) => (
                  <motion.li
                    key={step.label}
                    initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.35 + index * 0.12 }}
                    className="relative flex gap-4 pb-5 last:pb-0"
                  >
                    {index < runSteps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute left-[7px] top-5 h-full w-px bg-border"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className={
                        step.state === 'verified'
                          ? 'mt-1 h-[15px] w-[15px] shrink-0 rounded-full bg-teal'
                          : step.state === 'active'
                            ? 'mt-1 h-[15px] w-[15px] shrink-0 rounded-full bg-oxblood'
                            : 'mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-oxblood/60 bg-transparent'
                      }
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight text-foreground">
                        {step.label}
                      </p>
                      <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                        {step.detail}
                      </p>
                    </div>
                  </motion.li>
                ))}
              </ol>

              <div className="mt-6 flex items-center justify-between rounded-lg bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">Receipt saved to this project</p>
                <ShieldCheck className="h-4 w-4 text-teal" aria-hidden="true" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How a run works — a real sequence, so it earns its numbers */}
      <section className="border-t border-border bg-card/60">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              How a run works
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Four modes, one thread. Each step narrows what the agent is allowed to do next.
            </p>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item) => (
              <div key={item.step}>
                <p className="font-mono text-sm text-oxblood">{item.step}</p>
                <h3 className="font-display mt-3 text-xl font-semibold tracking-tight">
                  {item.mode}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature trio */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
        <div className="grid gap-6 md:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.title}
                className="shadow-sharp-sm hover-accent-border rounded-xl border border-border bg-card p-7"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-oxblood/25">
                  <Icon className="h-5 w-5 text-oxblood" aria-hidden="true" />
                </span>
                <h3 className="font-display mt-5 text-lg font-semibold tracking-tight">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <PublicFooter />
    </main>
  )
}
