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
  Eye,
  Clock,
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
      className="border border-border bg-background p-6"
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
  work: Monitor,
  chat: PanelRight,
  inspector: Shield,
} as const

const faqItems = [
  {
    question: 'Do I need to install anything?',
    answer:
      'No desktop setup is required. Panda is browser-first and uses a server-backed fallback when browser execution is unavailable.',
  },
  {
    question: 'What happens when an Agent run gets interrupted?',
    answer:
      'Panda saves run events, receipts, and checkpoints. If a run pauses or disconnects, the recovery path stays attached to the same work thread.',
  },
  {
    question: 'Can I review code changes before they are applied?',
    answer:
      'Yes. Plan mode produces a reviewable execution contract before larger work begins. During Agent runs, Guided mode prompts for more review, Autopilot can apply safe changes, and risky commands or sensitive actions pause for explicit approval. Changed work remains inspectable through the Editor and Review Diff.',
  },
  {
    question: 'Does Panda remember context between sessions?',
    answer:
      'Yes. Convex persists projects, chats, plans, memory, runs, and changed-work records so context can survive across sessions and devices.',
  },
  {
    question: 'Which AI providers does Panda support?',
    answer:
      'Panda supports multiple hosted model providers and OpenAI-compatible endpoints. You bring your own API key, and available models are shown through the model catalog in the IDE.',
  },
  {
    question: 'Can I share my project session with someone else?',
    answer:
      'Yes. Panda creates a public projection of the active chat so collaborators can inspect the thread without exposing private workspace data.',
  },
  {
    question: 'Are custom subagents separate modes?',
    answer:
      'No. Ask, Plan, and Agent are the primary user-facing modes. Custom subagents are delegated workers inside Agent runs; they use capability presets and attached Skills while reporting back through the parent run evidence and review surfaces.',
  },
]

export default function EducationPage() {
  return (
    <div className="dot-grid min-h-screen bg-background">
      <PublicNav />

      <main id="main-content" className="pb-24 pt-28 lg:pb-32 lg:pt-36">
        {/* Hero */}
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
                    <span className="bg-primary/60 h-px w-10" />
                    <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                      How Panda works
                    </span>
                  </div>

                  <h1 className="text-display text-4xl sm:text-5xl lg:text-6xl">
                    Ask, plan, and run agents from one reviewable browser IDE.
                  </h1>

                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Panda is a browser-first AI coding IDE with server fallback. Ask for
                    understanding, create reviewable plans, then run Agent in Guided or Autopilot
                    mode while editor-owned files, approvals, receipts, changed work, and
                    checkpoints stay attached to one project session.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Link href="/projects">
                      <Button className="shadow-sharp-md rounded-none font-mono tracking-wide">
                        Open Panda IDE
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                    <a href="#interface-map">
                      <Button variant="outline" className="rounded-none font-mono tracking-wide">
                        Read the operating model
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
                    The mental model
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-start gap-3">
                      <FolderTree size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Explorer selects context
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Find the files, symbols, and context that should shape the next turn.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Wrench size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Editor holds the active work
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Edit files, inspect diffs, review changed work, and run commands beside
                          the current objective.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Bot size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Chat directs the agent
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Choose Ask, Plan, or Agent. Inside Agent, select Guided or Autopilot based
                          on how much autonomy the run should have.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Shield size={16} className="mt-0.5 shrink-0 text-primary" />
                      <div>
                        <p className="font-mono text-xs uppercase tracking-wide">
                          Inspector rail reviews state
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Inspect run events, receipts, plans, changes, memory, delegated work, and
                          checkpoints.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-primary/20 absolute -bottom-3 -right-3 -z-10 h-full w-full border" />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Three promises */}
        <section className="border-y border-border py-20 lg:py-24">
          <div className="container">
            <div className="grid gap-px bg-border sm:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="border border-transparent bg-background p-8"
              >
                <Eye size={20} className="mb-4 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Transparent</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Plans, run events, file edits, and terminal commands stay visible beside the work
                  they affect.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.08 }}
                className="border border-transparent bg-background p-8"
              >
                <Shield size={20} className="mb-4 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Reviewable</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Plan artifacts, Agent handoffs, and risky commands create deliberate approval
                  points before execution continues.
                </p>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.16 }}
                className="border border-transparent bg-background p-8"
              >
                <Clock size={20} className="mb-4 text-primary" />
                <h3 className="mb-2 text-lg font-semibold">Recoverable</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Receipts and checkpoints make interrupted work inspectable and resumable instead
                  of disposable.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Interface Map */}
        <section id="interface-map" className="py-20 lg:py-24">
          <div className="container">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className="bg-primary/60 h-px w-10" />
                  <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    Interface Map
                  </span>
                </div>
                <h2 className="text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                  The operating surfaces of the Panda IDE
                </h2>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Explorer {'->'} Editor {'->'} Chat {'->'} Run / Changes / Context
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
                    className={cn(
                      'group block border border-transparent bg-background p-6 transition-colors hover:bg-surface-1',
                      section.id === 'work' && 'md:col-span-2'
                    )}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                        {section.label}
                      </span>
                      <Icon
                        size={16}
                        className="text-muted-foreground transition-colors group-hover:text-foreground"
                      />
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
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 bg-primary" />
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

        {/* Workflow */}
        <section className="border-y border-border py-20 lg:py-24">
          <div className="container">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="bg-primary/60 h-px w-10" />
                <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  Workflow
                </span>
              </div>
              <h2 className="max-w-3xl text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                From context to verified result in six steps
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                Panda&apos;s default workflow is simple: orient the project, choose the right mode,
                review the execution contract, approve gated work, inspect run evidence, then verify
                or resume without losing the active thread.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {workflowSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'border border-border bg-background p-4',
                    index % 2 === 1 ? 'surface-1' : ''
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-widest text-primary">
                      Step {index + 1}
                    </span>
                    <Workflow size={16} className="text-muted-foreground" />
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

        {/* Explorer */}
        <section id="explorer" className="py-20 lg:py-24">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <PanelLeft size={16} className="text-primary" />
                  <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    Explorer
                  </span>
                </div>
                <h2 className="text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                  Select the right context, fast
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Explorer is the entry point for bounded project context. Use the{' '}
                  <span className="font-mono text-foreground">Explorer</span> tab when structure is
                  useful and the <span className="font-mono text-foreground">Search</span> tab when
                  you need to jump by concept. Selected files route into the editor and chat
                  context.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <FolderTree size={14} className="text-primary" /> Browse
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Navigate project folders without loading unnecessary file content.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Search size={14} className="text-primary" /> Search
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Find symbols, filenames, or concepts when the path is not obvious.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <FileSearch size={14} className="text-primary" /> Route
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Route selected files into the Editor and the next agent turn.
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

        {/* Editor */}
        <section id="work" className="border-y border-border py-20 lg:py-24">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Monitor size={16} className="text-primary" />
                  <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    Editor
                  </span>
                </div>
                <h2 className="text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                  Edit, inspect, and verify in one place
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Editor surface combines file tabs, editor state, generated-file review, Review
                  Diff, terminal execution, run evidence, and timeline context. Browser execution is
                  preferred when available, and server fallback keeps command work unblocked.
                </p>
                <div className="mt-4 border border-border bg-background p-4">
                  <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
                    Responsive layout
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Desktop uses resizable panels. Smaller screens preserve the same Explorer,
                    Editor, Chat, and Inspector Rail model without forcing you out of the project
                    session.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {workspaceDetails.map((item, index) => (
                <DetailCard key={item.name} item={item} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* Chat Panel */}
        <section id="chat" className="py-20 lg:py-24">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <MessageSquare size={16} className="text-primary" />
                  <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    Chat Panel
                  </span>
                </div>
                <h2 className="text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                  Orchestrate the agent without losing context
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  The Chat Panel is Panda&apos;s orchestration surface. It carries the canonical
                  Ask, Plan, and Agent modes, Agent autonomy controls for Guided or Autopilot, model
                  controls, file mentions, permission review, and message history. Plans and run
                  status surface inline so the handoff from strategy to execution stays visible.
                </p>

                <div className="mt-4 grid gap-px bg-border sm:grid-cols-3">
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Terminal size={14} className="text-primary" />
                      Plan + Agent Run
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Saved plans, Agent run status, and approval gates keep execution visible
                      before and during work.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Brain size={14} className="text-primary" />
                      Permissions
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Risky commands and sensitive actions pause for browser-native approval.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Bot size={14} className="text-primary" />
                      Share + History
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Share a redacted work thread or reopen past run history from the same panel.
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

        {/* Inspector Rail */}
        <section id="inspector" className="border-y border-border py-20 lg:py-24">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Shield size={16} className="text-primary" />
                  <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                    Inspector Rail
                  </span>
                </div>
                <h2 className="text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                  Review run evidence, changes, context, and next steps
                </h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  Panda&apos;s inspector rail keeps Run, Changes, and Context close to the active
                  chat. Inspect run events, receipts, checkpoints, saved plans, changed work,
                  project memory, delegated work, and recovery signals without leaving the project
                  session.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">RUN</div>
                    <p className="text-sm text-muted-foreground">
                      Inspect run events, receipts, approvals, checkpoints, and recovery state.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">CHANGES</div>
                    <p className="text-sm text-muted-foreground">
                      Inspect generated files, changed work, and Review Diff entry points.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">CONTEXT</div>
                    <p className="text-sm text-muted-foreground">
                      Review plans, memory, selected files, Skills, Subagents, and handoff context.
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

            <div className="mt-12 border border-border bg-surface-1 p-6 lg:p-8">
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h3 className="mb-4 text-xl font-semibold">Plan review and run recovery</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Panda&apos;s workflow centers on explicit plan review for structured work and
                    resumable runs for interrupted execution. When a run pauses, Panda keeps the
                    plan, receipt, changed work, and checkpoint connected so you can inspect before
                    continuing.
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex -space-x-2">
                      <Shield
                        size={32}
                        className="bg-primary/10 rounded-full border border-background p-1.5 text-primary"
                      />
                      <GitBranch
                        size={32}
                        className="bg-primary/10 rounded-full border border-background p-1.5 text-primary"
                      />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Reviewable + Recoverable
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target size={16} className="mt-1 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Run from plan</h4>
                      <p className="text-xs text-muted-foreground">
                        Approve the saved plan artifact, then use it as the execution contract for
                        an Agent run.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield size={16} className="mt-1 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Browser approvals</h4>
                      <p className="text-xs text-muted-foreground">
                        Review risky command execution directly in the web interface.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="mt-1 shrink-0 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Run history + sharing</h4>
                      <p className="text-xs text-muted-foreground">
                        Reopen past execution and share a redacted public projection with a link.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Power-user tips + CTA */}
        <section className="py-20 lg:py-24">
          <div className="container">
            <div className="grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="bg-background p-5 lg:p-8">
                <div className="border border-border bg-background p-5">
                  <h2 className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-primary">
                    Power-user tips
                  </h2>
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    <li>
                      Use <span className="font-mono text-foreground">@file-path</span> mentions in
                      chat to pull exact files into the request context.
                    </li>
                    <li>
                      Use Ask for explanation, Plan for scope, and Agent for implementation. Choose
                      Guided for review-heavy edits or Autopilot for broader execution.
                    </li>
                    <li>
                      Use the chat actions menu to open run history or share the active thread.
                    </li>
                    <li>
                      Open the inspector rail when you need Run, Changes, Context, receipts,
                      checkpoints, delegated work, or memory without leaving the project page.
                    </li>
                    <li>Review the plan before starting a larger Agent run.</li>
                    <li>
                      Use custom subagents as delegated workers for bounded subtasks; they inherit
                      the parent run&apos;s intent and review boundary rather than becoming separate
                      primary modes.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="surface-1 p-5 lg:p-8">
                <div className="shadow-sharp-md surface-1 border border-border p-5">
                  <h2 className="mb-3 text-xl font-semibold">Ready to try it?</h2>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Panda keeps navigation, editing, execution, approval, run evidence, and
                    changed-work review in one synchronized browser IDE. The objective stays visible
                    while the work moves.
                  </p>
                  <Link href="/projects">
                    <Button className="rounded-none font-mono tracking-wide">
                      Open Panda IDE
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border py-20 lg:py-24">
          <div className="container">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <span className="bg-primary/60 h-px w-10" />
                <span className="font-mono text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  FAQ
                </span>
              </div>
              <h2 className="text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
                Common questions
              </h2>
            </div>

            <div className="mx-auto max-w-3xl divide-y divide-border">
              {faqItems.map((item, index) => (
                <motion.div
                  key={item.question}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="py-6 first:pt-0 last:pb-0"
                >
                  <h3 className="mb-2 font-semibold">{item.question}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="surface-1 border-t border-border py-20 lg:py-24">
          <div className="container text-center">
            <h2 className="mb-4 text-4xl font-bold leading-[1.1] -tracking-[0.025em]">
              Start building with Panda
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-muted-foreground">
              Create a project, choose Ask, Plan, or Agent, review the plan, approve what matters,
              inspect receipts and changed work, then keep moving. No desktop install required.
            </p>
            <Link href="/projects">
              <Button className="shadow-sharp-md rounded-none font-mono tracking-wide">
                Launch Panda IDE
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}
