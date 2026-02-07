import { describe, expect, it } from 'bun:test'
import {
  describeStepMeta,
  extractTargetFilePaths,
  formatElapsed,
  groupProgressSteps,
  mapLatestRunProgressSteps,
  mapRunEventsToProgressSteps,
  type LiveProgressStep,
} from './live-run-utils'

describe('live run utils', () => {
  it('formats elapsed durations', () => {
    expect(formatElapsed(0)).toBe('0s')
    expect(formatElapsed(9_000)).toBe('9s')
    expect(formatElapsed(65_000)).toBe('1m 05s')
  })

  it('groups progress steps by category in stable order', () => {
    const steps: LiveProgressStep[] = [
      {
        id: '1',
        content: 'Tool completed: read_files',
        status: 'completed',
        category: 'tool',
        createdAt: 1,
      },
      {
        id: '2',
        content: 'Iteration 1: analyzing context',
        status: 'running',
        category: 'analysis',
        createdAt: 2,
      },
      {
        id: '3',
        content: 'Plan mode guardrail triggered',
        status: 'running',
        category: 'rewrite',
        createdAt: 3,
      },
    ]

    const groups = groupProgressSteps(steps)

    expect(groups.map((g) => g.key)).toEqual(['analysis', 'rewrite', 'tool'])
    expect(groups[0]?.steps[0]?.id).toBe('2')
    expect(groups[1]?.steps[0]?.id).toBe('3')
    expect(groups[2]?.steps[0]?.id).toBe('1')
  })

  it('formats step metadata with args, duration, and error', () => {
    const meta = describeStepMeta({
      id: 's1',
      content: 'Tool failed: write_files',
      status: 'error',
      category: 'tool',
      createdAt: 1,
      details: {
        toolName: 'write_files',
        argsSummary: '{"files":[{"path":"a.ts"}]}',
        durationMs: 1320,
        errorExcerpt: 'Permission denied while writing a.ts',
      },
    })

    expect(meta.primary).toContain('write_files')
    expect(meta.primary).toContain('1.3s')
    expect(meta.secondary).toContain('files')
    expect(meta.error).toContain('Permission denied')
  })

  it('extracts target file paths from read/write tool args', () => {
    const fromWrite = extractTargetFilePaths('write_files', {
      files: [{ path: 'src/app.tsx', content: 'x' }],
    })
    const fromRead = extractTargetFilePaths('read_files', {
      paths: ['src/lib/a.ts', 'src/lib/b.ts'],
    })

    expect(fromWrite).toEqual(['src/app.tsx'])
    expect(fromRead).toEqual(['src/lib/a.ts', 'src/lib/b.ts'])
  })

  it('maps persisted run events to live progress steps', () => {
    const steps = mapRunEventsToProgressSteps([
      {
        _id: 'ev1',
        type: 'progress_step',
        content: 'Executing tool: write_files',
        status: 'running',
        progressCategory: 'tool',
        progressToolName: 'write_files',
        args: { files: [{ path: 'src/a.ts', content: 'x' }] },
        targetFilePaths: ['src/a.ts'],
        progressHasArtifactTarget: true,
        createdAt: 100,
      },
      {
        _id: 'ev2',
        type: 'progress_step',
        content: 'Tool completed: write_files',
        status: 'completed',
        progressCategory: 'tool',
        progressToolName: 'write_files',
        durationMs: 820,
        createdAt: 200,
      },
    ])

    expect(steps.length).toBe(2)
    expect(steps[0]?.details?.targetFilePaths).toEqual(['src/a.ts'])
    expect(steps[0]?.details?.hasArtifactTarget).toBe(true)
    expect(steps[1]?.details?.durationMs).toBe(820)
  })

  it('maps only latest run progress steps when multiple runs exist', () => {
    const steps = mapLatestRunProgressSteps([
      {
        _id: 'ev-old',
        runId: 'run-old',
        type: 'progress_step',
        content: 'Old run step',
        status: 'completed',
        createdAt: 100,
      },
      {
        _id: 'ev-new-1',
        runId: 'run-new',
        type: 'progress_step',
        content: 'New run step 1',
        status: 'running',
        createdAt: 200,
      },
      {
        _id: 'ev-new-2',
        runId: 'run-new',
        type: 'progress_step',
        content: 'New run step 2',
        status: 'completed',
        createdAt: 300,
      },
    ])

    expect(steps.map((s) => s.content)).toEqual(['New run step 1', 'New run step 2'])
  })
})
