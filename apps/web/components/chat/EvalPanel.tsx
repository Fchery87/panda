'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@convex/_generated/api'
import type { Id } from '@convex/_generated/dataModel'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  buildEvalScorecard,
  containsTextScorer,
  createEvalTemplateScenarios,
  exactMatchScorer,
  normalizedTextExactScorer,
  regexTextScorer,
  runEvalSuite,
  type EvalTemplate,
  type EvalScenario,
} from '@/lib/agent/harness'
import { ChevronDown, ChevronRight, FlaskConical, Play, Plus } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface EvalPanelProps {
  projectId: Id<'projects'>
  chatId?: Id<'chats'> | null
  lastUserPrompt?: string | null
  lastAssistantReply?: string | null
  onRunScenario?: (scenario: {
    input?: unknown
    prompt?: string
    expected?: unknown
    mode?: string
    evalMode?: 'read_only' | 'full'
  }) => Promise<{
    output: string
    error?: string
    usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  }>
}

type EvalSuiteDoc = {
  _id: Id<'evalSuites'>
  name: string
  description?: string
  status: 'draft' | 'active' | 'archived'
  scenarios: unknown[]
  lastRunAt?: number
}

type EvalRunDoc = {
  _id: Id<'evalRuns'>
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startedAt: number
  completedAt?: number
  scorecard?: Record<string, unknown>
  error?: string
}

type EvalRunResultDoc = {
  _id: Id<'evalRunResults'>
  status: 'passed' | 'failed' | 'error'
  scenarioName: string
  score: number
  reason?: string
  error?: string
  tags: string[]
}

type EvalScenarioRecord = EvalScenario & {
  prompt?: string
  mode?: string
}

const DEFAULT_SCENARIOS_JSON = JSON.stringify(
  [
    {
      id: 'smoke-1',
      name: 'Example exact-match case',
      input: 'hello',
      expected: 'hello',
      tags: ['smoke'],
    },
  ],
  null,
  2
)

export function EvalPanel({
  projectId,
  chatId,
  lastUserPrompt,
  lastAssistantReply,
  onRunScenario,
}: EvalPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedSuiteId, setSelectedSuiteId] = useState<Id<'evalSuites'> | null>(null)
  const [suiteName, setSuiteName] = useState('')
  const [suiteDescription, setSuiteDescription] = useState('')
  const [scenarioNameDraft, setScenarioNameDraft] = useState('')
  const [scenariosJson, setScenariosJson] = useState(DEFAULT_SCENARIOS_JSON)
  const [isCreating, setIsCreating] = useState(false)
  const [startingRunSuiteId, setStartingRunSuiteId] = useState<Id<'evalSuites'> | null>(null)
  const [evalMode, setEvalMode] = useState<'read_only' | 'full'>('read_only')
  const [scorerKind, setScorerKind] = useState<'exact' | 'contains' | 'regex' | 'normalized'>(
    'exact'
  )

  const suites = useQuery(api.evals.listSuitesByProject, {
    projectId,
    limit: 20,
  }) as EvalSuiteDoc[] | undefined

  const selectedSuite = useMemo(
    () => suites?.find((suite) => suite._id === selectedSuiteId) ?? null,
    [suites, selectedSuiteId]
  )

  useEffect(() => {
    if (!suites || suites.length === 0) {
      setSelectedSuiteId(null)
      return
    }
    if (!selectedSuiteId || !suites.some((suite) => suite._id === selectedSuiteId)) {
      setSelectedSuiteId(suites[0]!._id)
    }
  }, [suites, selectedSuiteId])

  const runs = useQuery(
    api.evals.listRunsBySuite,
    selectedSuiteId ? { suiteId: selectedSuiteId, limit: 10 } : 'skip'
  ) as EvalRunDoc[] | undefined

  const latestRunId = runs?.[0]?._id ?? null

  const latestRunBundle = useQuery(
    api.evals.getRunWithResults,
    latestRunId ? { runId: latestRunId } : 'skip'
  ) as { run: EvalRunDoc; results: EvalRunResultDoc[] } | undefined
  const suiteTrend = useQuery(
    api.evals.getSuiteTrend,
    selectedSuiteId ? { suiteId: selectedSuiteId, limit: 8 } : 'skip'
  ) as
    | {
        passRateDelta: number | null
        trendDirection: 'up' | 'down' | 'flat'
        latest?: { passRate: number } | null
        previous?: { passRate: number } | null
      }
    | undefined

  const createSuite = useMutation(api.evals.createSuite)
  const startRun = useMutation(api.evals.startRun)
  const appendRunResults = useMutation(api.evals.appendRunResults)
  const completeRun = useMutation(api.evals.completeRun)
  const failRun = useMutation(api.evals.failRun)

  const failingResults = useMemo(() => {
    const results = latestRunBundle?.results ?? []
    return results.filter((result) => result.status !== 'passed').slice(0, 8)
  }, [latestRunBundle])

  const appendScenarioToDraft = (scenario: Record<string, unknown>) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(scenariosJson)
    } catch {
      toast.error('Scenarios JSON must be valid before appending')
      return
    }
    if (!Array.isArray(parsed)) {
      toast.error('Scenarios JSON must be an array before appending')
      return
    }

    const next = [...parsed, scenario]
    setScenariosJson(JSON.stringify(next, null, 2))
  }

  const buildScenarioId = () => `eval-${Date.now()}`
  const appendTemplate = (template: EvalTemplate) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(scenariosJson)
    } catch {
      toast.error('Scenarios JSON must be valid before adding a template')
      return
    }
    if (!Array.isArray(parsed)) {
      toast.error('Scenarios JSON must be an array before adding a template')
      return
    }
    const next = [...parsed, ...createEvalTemplateScenarios(template)]
    setScenariosJson(JSON.stringify(next, null, 2))
    toast.success('Template scenarios added')
  }

  const handleAppendLastUserPrompt = () => {
    const prompt = lastUserPrompt?.trim()
    if (!prompt) {
      toast.error('No recent user prompt found in this chat')
      return
    }

    appendScenarioToDraft({
      id: buildScenarioId(),
      name: scenarioNameDraft.trim() || 'From last user prompt',
      prompt,
      tags: ['chat-captured'],
    })
    setScenarioNameDraft('')
    toast.success('Added scenario from last user prompt')
  }

  const handleAppendLastExchange = () => {
    const prompt = lastUserPrompt?.trim()
    if (!prompt) {
      toast.error('No recent user prompt found in this chat')
      return
    }

    appendScenarioToDraft({
      id: buildScenarioId(),
      name: scenarioNameDraft.trim() || 'From last exchange',
      prompt,
      ...(lastAssistantReply?.trim() ? { expected: lastAssistantReply.trim() } : {}),
      tags: ['chat-captured', 'regression'],
    })
    setScenarioNameDraft('')
    toast.success('Added scenario from last exchange')
  }

  const handleCreateSuite = async () => {
    const trimmedName = suiteName.trim()
    if (!trimmedName) {
      toast.error('Suite name is required')
      return
    }

    let parsedScenarios: unknown
    try {
      parsedScenarios = JSON.parse(scenariosJson)
    } catch {
      toast.error('Scenarios must be valid JSON')
      return
    }

    if (!Array.isArray(parsedScenarios)) {
      toast.error('Scenarios JSON must be an array')
      return
    }

    for (const scenario of parsedScenarios) {
      if (!scenario || typeof scenario !== 'object') {
        toast.error('Each scenario must be an object')
        return
      }
      const record = scenario as Record<string, unknown>
      if (typeof record.id !== 'string' || typeof record.name !== 'string') {
        toast.error('Each scenario needs string "id" and "name"')
        return
      }
    }

    setIsCreating(true)
    try {
      const newSuiteId = await createSuite({
        projectId,
        ...(chatId ? { chatId } : {}),
        name: trimmedName,
        description: suiteDescription.trim() || undefined,
        scenarios: parsedScenarios,
        status: 'active',
      })
      setSuiteName('')
      setSuiteDescription('')
      setSelectedSuiteId(newSuiteId)
      toast.success('Eval suite created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create eval suite')
    } finally {
      setIsCreating(false)
    }
  }

  const handleStartRun = async (suiteId: Id<'evalSuites'>) => {
    if (!onRunScenario) {
      toast.error('Eval runner is not connected yet')
      return
    }
    setStartingRunSuiteId(suiteId)
    let createdRunId: Id<'evalRuns'> | null = null
    try {
      const runId = await startRun({
        suiteId,
        runner: 'browser-ui',
        mode: evalMode,
        policy:
          evalMode === 'read_only'
            ? {
                deniedTools: ['write_files', 'run_command', 'update_memory_bank', 'task'],
                allowedTools: [
                  'read_files',
                  'list_directory',
                  'search_codebase',
                  'search_code',
                  'search_code_ast',
                ],
              }
            : { policy: 'full_harness' },
        ...(chatId ? { chatId } : {}),
      })
      createdRunId = runId

      const suite = suites?.find((s) => s._id === suiteId)
      if (!suite) {
        throw new Error('Eval suite not found in UI state')
      }

      const scenarios = suite.scenarios as EvalScenarioRecord[]
      const selectedScorer = (
        scenario: EvalScenario<unknown, unknown>,
        output: { output: string }
      ) => {
        if (scorerKind === 'contains') {
          return containsTextScorer()(scenario as EvalScenario<unknown, string>, output)
        }
        if (scorerKind === 'regex') {
          return regexTextScorer()(scenario as EvalScenario<unknown, string>, output)
        }
        if (scorerKind === 'normalized') {
          return normalizedTextExactScorer()(scenario as EvalScenario<unknown, string>, output)
        }
        return exactMatchScorer()(scenario, output)
      }
      const report = await runEvalSuite({
        suiteId: String(suiteId),
        scenarios,
        runner: async (scenario) => {
          const scenarioExt = scenario as unknown as EvalScenarioRecord
          const exec = await onRunScenario({
            input: scenarioExt.input,
            prompt: scenarioExt.prompt,
            expected: scenarioExt.expected,
            mode: scenarioExt.mode,
            evalMode,
          })
          if (exec.error) {
            throw new Error(exec.error)
          }
          return {
            output: exec.output,
            metadata: exec.usage ? { usage: exec.usage } : undefined,
          }
        },
        scorer: selectedScorer,
      })

      const scorecard = buildEvalScorecard(report)

      await appendRunResults({
        runId,
        results: report.results.map((result, index) => ({
          scenarioId: result.scenarioId,
          scenarioName: result.scenarioName,
          sequence: index + 1,
          status: result.status,
          score: result.score,
          input: result.input,
          expected: result.expected,
          output: result.output,
          reason: result.reason,
          error: result.error,
          tags: result.tags,
          durationMs: result.durationMs,
          metadata: result.metadata,
        })),
      })

      await completeRun({
        runId,
        scorecard,
        summary: `Pass rate ${Math.round(scorecard.passRate * 100)}% (${scorecard.passed}/${scorecard.total})`,
      })

      toast.success(`Eval run complete: ${Math.round(scorecard.passRate * 100)}% pass`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run eval suite'
      if (createdRunId) {
        try {
          await failRun({ runId: createdRunId, error: errorMessage })
        } catch {
          // Best-effort failure finalization
        }
      }
      toast.error(errorMessage)
    } finally {
      setStartingRunSuiteId(null)
    }
  }

  const latestRun = latestRunBundle?.run
  const scorecard = latestRun?.scorecard as
    | {
        total?: number
        passed?: number
        failed?: number
        errored?: number
        passRate?: number
        averageScore?: number
      }
    | undefined

  return (
    <div className="surface-2 border-b border-border px-3 py-2">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 text-left"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <FlaskConical className="h-3 w-3" />
          <span>Eval Suites</span>
        </span>
        <span className="ml-auto font-mono text-xs text-muted-foreground/70">
          {suites ? `${suites.length} suites` : 'loading'}
        </span>
      </button>

      {!isOpen ? null : (
        <div className="mt-2 grid gap-2">
          <div className="grid gap-2 border border-border bg-background/70 p-2">
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                Create Suite
              </div>
              <Badge variant="outline" className="rounded-none font-mono text-[10px]">
                JSON Scenarios
              </Badge>
            </div>
            <Input
              value={suiteName}
              onChange={(e) => setSuiteName(e.target.value)}
              placeholder="Smoke: build harness"
              className="h-8 rounded-none font-mono text-xs"
            />
            <Input
              value={suiteDescription}
              onChange={(e) => setSuiteDescription(e.target.value)}
              placeholder="Optional description"
              className="h-8 rounded-none font-mono text-xs"
            />
            <div className="grid gap-1 border border-border p-2">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Scenario Builder (Chat)
              </div>
              <Input
                value={scenarioNameDraft}
                onChange={(e) => setScenarioNameDraft(e.target.value)}
                placeholder="Optional scenario name override"
                className="h-8 rounded-none font-mono text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-[10px]"
                  onClick={handleAppendLastUserPrompt}
                >
                  Use Last User Prompt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-[10px]"
                  onClick={handleAppendLastExchange}
                >
                  Use Last Exchange
                </Button>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                “Last Exchange” uses the latest user prompt and latest assistant reply as expected
                output.
              </div>
            </div>
            <div className="grid gap-1 border border-border p-2">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Templates
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-[10px]"
                  onClick={() => appendTemplate('ask-smoke-exact')}
                >
                  Ask Exact
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-[10px]"
                  onClick={() => appendTemplate('ask-smoke-contains')}
                >
                  Ask Contains
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-[10px]"
                  onClick={() => appendTemplate('architect-plan-regex')}
                >
                  Architect Plan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-none font-mono text-[10px]"
                  onClick={() => appendTemplate('code-readonly-regression')}
                >
                  Code Read-only
                </Button>
              </div>
            </div>
            <Textarea
              value={scenariosJson}
              onChange={(e) => setScenariosJson(e.target.value)}
              className="min-h-28 rounded-none font-mono text-xs"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-none font-mono text-xs"
              onClick={handleCreateSuite}
              disabled={isCreating}
            >
              <Plus className="mr-1 h-3 w-3" />
              {isCreating ? 'Creating...' : 'Create Eval Suite'}
            </Button>
          </div>

          <div className="grid gap-2 border border-border bg-background/70 p-2">
            <div className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              Suites
            </div>
            {!suites ? (
              <div className="font-mono text-xs text-muted-foreground">Loading suites...</div>
            ) : suites.length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">
                No eval suites yet. Create one above.
              </div>
            ) : (
              <ScrollArea className="max-h-40">
                <div className="space-y-1 pr-2">
                  {suites.map((suite) => {
                    const isSelected = suite._id === selectedSuiteId
                    return (
                      <button
                        key={suite._id}
                        type="button"
                        onClick={() => setSelectedSuiteId(suite._id)}
                        className={cn(
                          'w-full border px-2 py-1 text-left font-mono text-xs transition-colors',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-background hover:bg-muted/30'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span className="truncate">{suite.name}</span>
                          <Badge
                            variant="outline"
                            className="ml-auto rounded-none px-1.5 font-mono text-[10px]"
                          >
                            {suite.status}
                          </Badge>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {suite.scenarios.length} scenarios
                        </div>
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="grid gap-2 border border-border bg-background/70 p-2">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  Latest Run
                </div>
                <div className="truncate font-mono text-xs">
                  {selectedSuite ? selectedSuite.name : 'Select a suite'}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 rounded-none font-mono text-xs"
                disabled={!selectedSuiteId || startingRunSuiteId === selectedSuiteId}
                onClick={() => selectedSuiteId && handleStartRun(selectedSuiteId)}
              >
                <Play className="mr-1 h-3 w-3" />
                {startingRunSuiteId === selectedSuiteId ? 'Starting...' : 'Start Run'}
              </Button>
            </div>

            <div className="grid gap-1">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Scorer
              </div>
              <Select
                value={scorerKind}
                onValueChange={(value) =>
                  setScorerKind(value as 'exact' | 'contains' | 'regex' | 'normalized')
                }
              >
                <SelectTrigger className="h-8 rounded-none font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="exact" className="font-mono text-xs">
                    Exact
                  </SelectItem>
                  <SelectItem value="contains" className="font-mono text-xs">
                    Contains
                  </SelectItem>
                  <SelectItem value="regex" className="font-mono text-xs">
                    Regex
                  </SelectItem>
                  <SelectItem value="normalized" className="font-mono text-xs">
                    Normalized Exact
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                Eval Mode
              </div>
              <Select
                value={evalMode}
                onValueChange={(value) => setEvalMode(value as 'read_only' | 'full')}
              >
                <SelectTrigger className="h-8 rounded-none font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="read_only" className="font-mono text-xs">
                    Read-only (Recommended)
                  </SelectItem>
                  <SelectItem value="full" className="font-mono text-xs">
                    Full harness
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="font-mono text-[10px] text-muted-foreground">
                {evalMode === 'read_only'
                  ? 'Denies writes, commands, memory updates, and subagent delegation.'
                  : 'Runs with normal harness capabilities and may modify project state.'}
              </div>
            </div>

            {!selectedSuiteId ? (
              <div className="font-mono text-xs text-muted-foreground">
                Select a suite to inspect.
              </div>
            ) : !runs ? (
              <div className="font-mono text-xs text-muted-foreground">Loading runs...</div>
            ) : runs.length === 0 ? (
              <div className="font-mono text-xs text-muted-foreground">
                No runs yet for this suite.
              </div>
            ) : (
              <div className="space-y-2">
                {suiteTrend && suiteTrend.latest ? (
                  <div className="border border-border p-2 font-mono text-xs">
                    <div className="mb-1 text-muted-foreground">Trend (recent completed runs)</div>
                    <div className="flex items-center gap-2">
                      <span>pass rate: {Math.round((suiteTrend.latest.passRate ?? 0) * 100)}%</span>
                      <Badge
                        variant="outline"
                        className={cn(
                          'rounded-none px-1.5 font-mono text-[10px]',
                          suiteTrend.trendDirection === 'up' &&
                            'border-green-600/50 text-green-700',
                          suiteTrend.trendDirection === 'down' &&
                            'border-destructive/60 text-destructive'
                        )}
                      >
                        {suiteTrend.passRateDelta === null
                          ? 'baseline'
                          : `${suiteTrend.passRateDelta >= 0 ? '+' : ''}${Math.round(
                              suiteTrend.passRateDelta * 100
                            )}%`}
                      </Badge>
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  <div className="border border-border p-2">
                    <div className="text-muted-foreground">Status</div>
                    <div className="mt-1 uppercase">{latestRun?.status ?? 'unknown'}</div>
                  </div>
                  <div className="border border-border p-2">
                    <div className="text-muted-foreground">Results</div>
                    <div className="mt-1">{latestRunBundle?.results.length ?? 0} cases</div>
                  </div>
                </div>

                {'mode' in (latestRun ?? {}) ? (
                  <div className="border border-border p-2 font-mono text-xs">
                    <span className="text-muted-foreground">Mode:</span>{' '}
                    <span className="uppercase">
                      {String((latestRun as Record<string, unknown>).mode ?? 'unknown')}
                    </span>
                  </div>
                ) : null}

                <div className="border border-border p-2">
                  <div className="mb-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Scorecard
                  </div>
                  {scorecard ? (
                    <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                      <div className="border border-border p-1.5">
                        <div className="text-[10px] text-muted-foreground">Pass Rate</div>
                        <div>{Math.round((Number(scorecard.passRate ?? 0) || 0) * 100)}%</div>
                      </div>
                      <div className="border border-border p-1.5">
                        <div className="text-[10px] text-muted-foreground">Passed</div>
                        <div>{Number(scorecard.passed ?? 0)}</div>
                      </div>
                      <div className="border border-border p-1.5">
                        <div className="text-[10px] text-muted-foreground">Failed</div>
                        <div>{Number(scorecard.failed ?? 0) + Number(scorecard.errored ?? 0)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-muted-foreground">
                      No scorecard persisted yet for the latest run.
                    </div>
                  )}
                </div>

                <div className="border border-border p-2">
                  <div className="mb-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                    Failing Scenarios
                  </div>
                  {failingResults.length === 0 ? (
                    <div className="font-mono text-xs text-muted-foreground">
                      {latestRunBundle?.results?.length
                        ? 'No failing scenarios in the latest run.'
                        : 'No per-scenario results persisted yet.'}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {failingResults.map((result) => (
                        <div
                          key={result._id}
                          className="border border-border p-1.5 font-mono text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate">{result.scenarioName}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'ml-auto rounded-none px-1.5 font-mono text-[10px]',
                                result.status !== 'passed' &&
                                  'border-destructive/60 text-destructive'
                              )}
                            >
                              {result.status}
                            </Badge>
                          </div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            score: {Math.round(result.score * 100)}%
                          </div>
                          {result.reason ? (
                            <div className="truncate text-[10px] text-muted-foreground">
                              {result.reason}
                            </div>
                          ) : null}
                          {result.error ? (
                            <div className="truncate text-[10px] text-destructive">
                              {result.error}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
