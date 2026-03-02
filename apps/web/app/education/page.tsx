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
import { ThemeToggle } from '@/components/settings/ThemeToggle'
import { PandaLogo } from '@/components/ui/panda-logo'
import { cn } from '@/lib/utils'

const interfaceMap = [
  {
    id: 'explorer',
    label: '01',
    title: 'Explorer',
    icon: PanelLeft,
    summary:
      'Browse files, search the project, and choose the exact code context you want to work on.',
    bullets: [
      'File tree navigation',
      'Project search panel',
      'Fast file selection for editor + chat',
    ],
  },
  {
    id: 'workspace',
    label: '02',
    title: 'Workspace',
    icon: Monitor,
    summary:
      'Edit code, preview results, view timeline context, and run terminal commands in one place.',
    bullets: [
      'Tabbed editor + preview + timeline',
      'Integrated terminal',
      'Status-aware, mobile-friendly layout',
    ],
  },
  {
    id: 'chat',
    label: '03',
    title: 'Chat Panel',
    icon: PanelRight,
    summary:
      'Talk to the agent, inspect runs, manage memory, and evaluate responses without leaving the project.',
    bullets: [
      'Message history + streaming input',
      'Run / Memory / Evals inspector',
      'Plan and debug dialogs',
    ],
  },
  {
    id: 'specs',
    label: '04',
    title: 'Spec System',
    icon: Shield,
    summary:
      'Formalize intent through specifications that drive agent behavior, validate outputs, and evolve with your code.',
    bullets: [
      'Three-tier intent classification',
      'Editable requirements and constraints',
      'Living specs with drift detection',
    ],
  },
]

const explorerDetails = [
  {
    name: 'FileTree',
    role: 'Primary explorer for browsing folders and files.',
    userValue: 'Select, create, rename, or delete files and send them into the editor quickly.',
  },
  {
    name: 'ProjectSearchPanel',
    role: 'Project-wide search panel living beside the explorer tab.',
    userValue: 'Jump to the right file faster when you know what you need but not where it lives.',
  },
  {
    name: 'Selection wiring',
    role: 'File selection flows into `selectedFilePath` and can include line/column targets.',
    userValue: 'Clicking from search or AI results can open the right file at the right location.',
  },
]

const workspaceDetails = [
  {
    name: 'FileTabs',
    role: 'Tracks open files and tab state, including dirty status.',
    userValue: 'Work across multiple files without losing place.',
  },
  {
    name: 'EditorContainer',
    role: 'Main code editing surface for the selected file.',
    userValue: 'Write and save code directly in the workbench instead of switching tools.',
  },
  {
    name: 'Preview',
    role: 'Dedicated preview surface inside the workspace.',
    userValue: 'Check output and behavior while staying in the same interface.',
  },
  {
    name: 'Timeline',
    role: 'Chat-linked timeline view (`Timeline chatId={currentChatId}`).',
    userValue: 'Understand what changed and when in the context of the active conversation.',
  },
  {
    name: 'Terminal',
    role: 'Integrated command execution panel tied to the current project.',
    userValue: 'Run installs, tests, and scripts without leaving Panda.',
  },
]

const chatDetails = [
  {
    name: 'MessageList',
    role: 'Shows the conversation history and streaming assistant output.',
    userValue: 'Keeps the full reasoning and action context visible while you work.',
  },
  {
    name: 'ChatInput',
    role: 'Prompt composer with mode selection, model controls, reasoning variant, and `@` file mentions.',
    userValue: 'You can direct the agent precisely and attach project context inline.',
  },
  {
    name: 'RunProgressPanel',
    role: 'Live and historical run progress with tool-level event visibility.',
    userValue:
      'See what the agent is doing in real time and inspect runs when something looks off.',
  },
  {
    name: 'MemoryBankEditor',
    role: 'Editable persistent memory for project-specific instructions and context.',
    userValue: 'Teach Panda how your project works so future runs stay aligned.',
  },
  {
    name: 'EvalPanel',
    role: 'Run evaluation scenarios against recent prompt/reply context.',
    userValue: 'Validate behavior and quality without leaving the chat surface.',
  },
]

const specDetails = [
  {
    name: 'Intent Classifier',
    role: 'Automatically detects task complexity to set the Spec Tier (Instant, Ambient, or Explicit).',
    userValue:
      'Simple tasks stay fast, while complex architecture changes get the rigor they need.',
  },
  {
    name: 'SpecPanel',
    role: 'Dedicated surface for reviewing EARS-style requirements and typed constraints.',
    userValue: 'You can align with the agent on the "what" and "how" before any code is written.',
  },
  {
    name: 'SpecBadge / Drawer',
    role: 'Ambient status indicators in the StatusBar and quick-view drawer for Tier 2 tasks.',
    userValue: 'Monitor spec-verification progress without losing focus on your code.',
  },
  {
    name: 'Drift Detection',
    role: 'Plugin-based monitoring that detects when manual code changes diverge from the spec.',
    userValue: 'Keeps your documentation and implementation in sync automatically.',
  },
]

const workflowSteps = [
  {
    title: 'Pick context in Explorer',
    description:
      'Use the file tree or search panel to choose the files you want to inspect. This sets up the workspace and gives you precise context to mention in chat.',
  },
  {
    title: 'Edit and inspect in Workspace',
    description:
      'Open multiple files as tabs, edit code, switch to preview or timeline, and run terminal commands while staying in the same project session.',
  },
  {
    title: 'Ask Panda to plan/code/debug',
    description:
      'Use the chat input mode selector and send a request. Panda classifies your intent into a Spec Tier (v1.5+).',
  },
  {
    title: 'Review and Refine Specs',
    description:
      'For complex tasks, use the SpecPanel to edit requirements and constraints. Approve the spec to trigger execution.',
  },
  {
    title: 'Inspect the run',
    description:
      'Open the inspector to view Run, Memory, and Evals. Use Plan and Debug actions for deeper control during longer or more complex tasks.',
  },
  {
    title: 'Apply, verify, repeat',
    description:
      'Review changes in the workspace, run commands in terminal, and continue the conversation with updated project state and context.',
  },
]

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

export default function EducationPage() {
  return (
    <div className="dot-grid min-h-screen bg-background">
      <nav className="surface-1 fixed left-0 right-0 top-0 z-50 border-b border-border">
        <div className="container flex h-14 items-center justify-between gap-4">
          <Link href="/" className="transition-sharp hover:opacity-70">
            <PandaLogo size="md" variant="full" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link href="/projects">
              <Button className="rounded-none font-mono text-sm tracking-wide">
                Launch App
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

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
                    Understand the full Panda workflow.
                  </h1>

                  <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    This page explains how Panda is organized for users: what the{' '}
                    <span className="font-mono text-foreground">Explorer</span>,{' '}
                    <span className="font-mono text-foreground">Workspace</span>, and{' '}
                    <span className="font-mono text-foreground">Chat Panel</span> do, how they
                    connect, and how to move from idea to validated code without leaving the app.
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
                          Edit code, preview, inspect timeline, run terminal commands.
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
                          Prompt the agent, inspect runs, manage memory, and evaluate results.
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
                <h2 className="text-display text-3xl sm:text-4xl">The 3 panels that drive Panda</h2>
              </div>
              <div className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                Explorer → Workspace → Chat → Spec → Verify
              </div>
            </div>

            <div className="grid gap-px bg-border md:grid-cols-3">
              {interfaceMap.map((section, index) => {
                const Icon = section.icon
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
                The Panda Spec-Code Loop
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
                  <span className="font-mono text-foreground">Workbench</span> component combines
                  file tabs, an editor, preview, timeline, and terminal into a responsive layout
                  that changes for desktop, compact desktop, and mobile. This keeps editing,
                  execution, and inspection inside one continuous loop.
                </p>
                <div className="mt-4 border border-border bg-background p-4">
                  <div className="mb-2 font-mono text-xs uppercase tracking-widest text-primary">
                    Layout behavior (current implementation)
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Desktop uses resizable panels. Mobile switches between{' '}
                    <span className="font-mono text-foreground">Files</span>,{' '}
                    <span className="font-mono text-foreground">Editor</span>, and{' '}
                    <span className="font-mono text-foreground">Terminal</span> tabs so users can
                    still work effectively on smaller screens.
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
                  for conversation, agent runs, memory, and evaluation. In the current project page,
                  the panel includes a context usage indicator, inspector toggles, Plan/Debug
                  actions, message history, and a feature-rich chat input with mode/model controls
                  and file mentions.
                </p>

                <div className="mt-4 grid gap-px bg-border sm:grid-cols-3">
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Terminal className="h-3.5 w-3.5 text-primary" />
                      Run Inspector
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono text-foreground">RunProgressPanel</span> shows live
                      steps, tool activity, and debugging detail.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                      Memory
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono text-foreground">MemoryBankEditor</span> stores
                      project-specific context the agent should retain.
                    </p>
                  </div>
                  <div className="border border-transparent bg-background p-4">
                    <div className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-wide">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                      Evals
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-mono text-foreground">EvalPanel</span> helps test and
                      validate agent responses against scenarios.
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

        <section id="specs" className="py-16 lg:py-20">
          <div className="container">
            <div className="mb-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                    Specification System
                  </span>
                </div>
                <h2 className="text-display text-3xl">Specification-Native Development</h2>
              </div>
              <div className="lg:col-span-8">
                <p className="text-base leading-relaxed text-muted-foreground">
                  Panda transforms from a reactive IDE into a spec-native system where formal
                  specifications are first-class primitives. This ensures that every change is tied
                  to a validated intent, reducing drift and increasing architectural integrity.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">
                      TIER 1: INSTANT
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Direct AI response for simple edits. No spec overhead.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">
                      TIER 2: AMBIENT
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Spec generated silently. Verified via the StatusBar badge.
                    </p>
                  </div>
                  <div className="border border-border bg-background p-4">
                    <div className="mb-2 font-mono text-xs font-bold text-primary">
                      TIER 3: EXPLICIT
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Full SpecPanel review. User approves before execution.
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
                  <h3 className="mb-4 text-xl font-semibold">Living Specs & Drift Detection</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Unlike traditional waterfall specs, Panda&apos;s specs are{' '}
                    <strong>living documents</strong>. If you manually edit code that is covered by
                    an active specification, the
                    <span className="mx-1 font-mono text-foreground">Drift Detection</span> plugin
                    identifies the divergence and offers to reconcile the spec with the new
                    implementation.
                  </p>
                  <div className="mt-6 flex items-center gap-4">
                    <div className="flex -space-x-2">
                      <Shield className="h-8 w-8 rounded-full border border-background bg-primary/10 p-1.5 text-primary" />
                      <GitBranch className="h-8 w-8 rounded-full border border-background bg-primary/10 p-1.5 text-primary" />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                      Continuous Bidirectional Sync
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Target className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">EARS Requirements</h4>
                      <p className="text-xs text-muted-foreground">
                        Easy Approach to Requirements Syntax for clear, verifiable behavior.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Shield className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Typed Constraints</h4>
                      <p className="text-xs text-muted-foreground">
                        Enforce structural, behavioral, or security rules across the run.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-1 h-4 w-4 text-primary" />
                    <div>
                      <h4 className="text-sm font-semibold">Automated Verification</h4>
                      <p className="text-xs text-muted-foreground">
                        Every spec step is verified post-execution to ensure intent matches output.
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
                    <li>
                      Toggle the chat panel with{' '}
                      <span className="font-mono text-foreground">Cmd/Ctrl + B</span>.
                    </li>
                    <li>
                      Toggle the artifact panel with{' '}
                      <span className="font-mono text-foreground">Cmd/Ctrl + Shift + A</span>.
                    </li>
                    <li>
                      Open the command palette with{' '}
                      <span className="font-mono text-foreground">Ctrl + K</span> (shown in the
                      workbench empty state).
                    </li>
                  </ul>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="shadow-sharp-md surface-1 border border-border p-5">
                  <h2 className="mb-3 text-xl font-semibold">Why this layout matters</h2>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                    Panda reduces context switching by keeping navigation, editing, execution, and
                    agent interaction in one synchronized workspace. Instead of jumping across
                    separate IDE, terminal, chat, and notes tools, each panel updates the others as
                    you work.
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
    </div>
  )
}
