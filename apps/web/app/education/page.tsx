'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Bot,
  Brain,
  FileSearch,
  FolderTree,
  MessageSquare,
  Monitor,
  PanelLeft,
  PanelRight,
  Terminal,
  Workflow,
  Wrench,
  Shield,
  Target,
  GitBranch,
  Search,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicNav } from '@/components/layout/PublicNav'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { cn } from '@/lib/utils'
import {
  chatDetails,
  explorerDetails,
  interfaceMap,
  specDetails,
  workspaceDetails,
  workflowSteps,
} from '@/lib/product/capabilities'

function DetailCard({
  item,
  index,
}: {
  item: { name: string; role: string; userValue: string }
  index: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
      className="border border-border bg-background p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
          {item.name}
        </h4>
        <span className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <p className="text-sm text-foreground">{item.role}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.userValue}</p>
    </motion.div>
  )
}

const sectionIcons = {
  explorer: PanelLeft,
  workspace: Monitor,
  chat: PanelRight,
  inspector: Shield,
} as const

export default function EducationPage() {
  return (
    <div className="dot-grid min-h-screen bg-background">
      <PublicNav />

      <main id="main-content" className="pb-24 pt-28 lg:pb-32 lg:pt-36">
        <section className="pb-16 lg:pb-20">
          <div className="container">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45 }}
                className="lg:col-span-7"
              >
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-3">
                    <span className="h-px w-8 bg-primary" />
                    <span className="text-label text-muted-foreground">
                      Education / How Panda works
                    </span>
                  </div>

                  <h1 className="text-display text-4xl sm:text-5xl lg:text-6xl">
                    Learn how Panda’s web workbench fits together.
                  </h1>

                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    This page explains Panda as it exists today: what the{' '}
                    <span className="font-mono text-foreground">Explorer</span>,{' '}
                    <span className="font-mono text-foreground">Workspace</span>, and{' '}
                    <span className="font-mono text-foreground">Chat Panel</span> do, how the{' '}
                    <span className="font-mono text-foreground">Inspector</span> supports plan and
                    run review, and how to move from idea to verified output without leaving the
                    browser.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Link href="/projects">
                      <Button className="shadow-sharp-md rounded-none font-mono tracking-wide">
                        Open Panda
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <a href="#interface-map">
                      <Button variant="outline" className="rounded-none font-mono tracking-wide">
                        Jump to Interface Map
                      </Button>
                    </a>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="lg:col-span-5"
              >
                <div className="shadow-sharp-lg relative border border-border bg-background">
                  <div className="surface-2 border-b border-border px-4 py-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Panda mental model
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start gap-3">
                      <FolderTree className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Explorer selects context
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Choose files and locate code paths fast.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Wrench className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Workspace executes work
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Edit code, inspect timeline, and run terminal commands.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bot className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Chat orchestrates the loop
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Prompt the agent, review plans, and manage active execution.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Inspector explains state
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Track plan status, run history, memory, and evals.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-3 -right-3 -z-10 h-full w-full border border-primary/20" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="interface-map" className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-px w-8 bg-primary" />
                  <span className="text-label text-muted-foreground">Interface Map</span>
                </div>
                <h2 className="text-display text-3xl sm:text-4xl">
                  The 4 surfaces that drive Panda
                </h2>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Explorer → Workspace → Chat → Inspector
              </div>
            </div>

            <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
              {interfaceMap.map((section, index) => {
                const Icon = sectionIcons[section.iconKey]
                return (
                  <motion.a
                    key={section.id}
                    href={`#${section.id}`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.08 }}
                    className="hover:bg-surface-1 group block border border-transparent bg-background p-6 transition-colors"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                        {section.label}
                      </span>
                      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                    <h3 className="mb-3 text-xl font-semibold">{section.title}</h3>
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      {section.summary}
                    </p>
                    <ul className="space-y-2">
                      {section.bullets.map((bullet) => (
                        <li
                          key={bullet}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <span className="mt-1 h-1.5 w-1.5 bg-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.a>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-8 bg-primary" />
                <span className="text-label text-muted-foreground">Workflow</span>
              </div>
              <h2 className="text-display max-w-3xl text-3xl sm:text-4xl">
                The Panda browser workflow
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-5">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'border border-border bg-background p-4',
                    index === 1 || index === 3 ? 'surface-1' : ''
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-primary">
                      Step {index + 1}
                    </span>
                    <Workflow className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="explorer" className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <PanelLeft className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Explorer
                  </span>
                </div>
                <h2 className="text-display text-3xl">What the Explorer does</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Explorer is your entry point into project context. In Panda&apos;s workbench
                  implementation, users can switch between an{' '}
                  <span className="font-mono text-foreground">Explorer</span> tab and a{' '}
                  <span className="font-mono text-foreground">Search</span> tab on both desktop and
                  mobile. The goal is simple: find the right file fast, then route that selection
                  into the editor and chat workflow.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <FolderTree className="h-3.5 w-3.5 text-primary" /> Browse
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Navigate folders/files in a structured tree.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Search className="h-3.5 w-3.5 text-primary" /> Search
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Jump directly to matches when the tree is too slow.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <FileSearch className="h-3.5 w-3.5 text-primary" /> Target
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pass selected file paths into the workspace and chat context.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {explorerDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="workspace" className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Workspace
                  </span>
                </div>
                <h2 className="text-display text-3xl">What the Workspace does</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Workspace is where code work happens. Panda&apos;s{' '}
                  <span className="font-mono text-foreground">Workbench</span> combines file tabs,
                  an editor, timeline context, and terminal execution into a responsive browser
                  layout. This keeps editing, execution, and inspection inside one continuous loop.
                </p>
                <div className="mt-4 border border-border bg-background p-4">
                  <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
                    Layout behavior (current implementation)
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Desktop uses resizable panels. Smaller layouts keep the same workbench surfaces
                    available without forcing you out of the project session.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaceDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="chat" className="border-y border-border py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Chat Panel
                  </span>
                </div>
                <h2 className="text-display text-3xl">What the Chat Panel does</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Chat Panel is more than a prompt box. It is Panda&apos;s orchestration surface
                  for planning, asking, building, permission review, and message history. In the
                  current project page, the panel includes inspector toggles, plan review actions,
                  chat history, and a feature-rich input with mode/model controls and file mentions.
                </p>

                <div className="mt-4 grid gap-px bg-border sm:grid-cols-3">
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      Plan + Run
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Inline plan review cards and run status surfaces keep execution visible in the
                      chat flow.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      Permissions
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Risky commands and other gated actions can be reviewed in the browser before
                      they proceed.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      Share + History
                    </div>
                    <p className="text-sm text-muted-foreground">
                      The current chat can be shared, and the active run history can be reopened
                      from the same panel.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {chatDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="inspector" className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Inspector
                  </span>
                </div>
                <h2 className="text-display text-3xl">How the Inspector supports the workbench</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Inspector is Panda&apos;s control surface for understanding what the agent is
                  doing and what happens next. It keeps the current run, saved plan, project memory,
                  and eval tooling close to the active chat instead of scattering them across
                  separate pages.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">RUN</div>
                    <p className="text-sm text-muted-foreground">
                      Inspect persisted run events, progress, and execution history.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">PLAN</div>
                    <p className="text-sm text-muted-foreground">
                      Review, approve, and build from the current implementation plan.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">
                      MEMORY / EVALS
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Preserve context and validate repeatable agent behavior.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {specDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>

            <div className="bg-surface-1 mt-12 border border-border p-6 lg:p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-xl font-semibold">Plan review and run recovery</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Panda&apos;s current browser workflow centers on explicit plan review for
                    structured work and resumable runs for interrupted execution. When a run pauses,
                    Panda can surface a recovery path instead of forcing you to restart from
                    scratch.
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex -space-x-2">
                      <Shield className="h-8 w-8 rounded-full border border-background bg-primary/10 p-1.5 text-primary" />
                      <GitBranch className="h-8 w-8 rounded-full border border-background bg-primary/10 p-1.5 text-primary" />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Reviewable + Recoverable
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Build from plan</h4>
                      <p className="text-xs text-muted-foreground">
                        Approve the saved plan, then use it as the execution contract for build.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Browser approvals</h4>
                      <p className="text-xs text-muted-foreground">
                        Review risky command execution directly in the web interface.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Run history + sharing</h4>
                      <p className="text-xs text-muted-foreground">
                        Reopen what happened and share the active chat when you need outside review.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container">
            <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <div className="border border-border bg-background p-5">
                  <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                    Power-user tips
                  </h2>
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <li>
                      Use <span className="font-mono text-foreground">@file-path</span> mentions in
                      chat to pull exact files into the request context.
                    </li>
                    <li>Use the chat actions menu to open run history or share the active chat.</li>
                    <li>
                      Open the inspector when you need Run, Plan, Memory, or Evals without leaving
                      the project page.
                    </li>
                    <li>Review the plan before using Build for larger implementation tasks.</li>
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="shadow-sharp-md surface-1 border border-border p-5">
                  <h2 className="mb-3 text-xl font-semibold">Why this layout matters</h2>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Panda reduces context switching by keeping navigation, editing, execution,
                    approval, and review in one synchronized browser workspace. Instead of jumping
                    across separate IDE, terminal, chat, and review tools, each surface updates the
                    others as you work.
                  </p>
                  <Link href="/projects">
                    <Button className="rounded-none font-mono tracking-wide">
                      Start in the Workbench
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
