import { describe, expect, it } from 'bun:test'
import { selectTimelineEvents } from './timeline-utils'

describe('selectTimelineEvents', () => {
  it('includes persisted timeline event types and uses real metadata for labels', () => {
    const result = selectTimelineEvents([
      {
        _id: 'rs1',
        type: 'run_started',
        content: 'Resume previous run',
        createdAt: 1,
      },
      {
        _id: 'ignored',
        type: 'reasoning',
        content: 'thinking',
        createdAt: 2,
      },
      {
        _id: 'p1',
        type: 'progress_step',
        progressCategory: 'analysis',
        content: 'Inspecting files',
        createdAt: 3,
      },
      {
        _id: 'tc1',
        type: 'tool_call',
        toolName: 'read_files',
        targetFilePaths: ['a.ts', 'b.ts'],
        createdAt: 4,
      },
      {
        _id: 'tr1',
        type: 'tool_result',
        toolName: 'read_files',
        status: 'completed',
        createdAt: 5,
      },
      {
        _id: 'am1',
        type: 'assistant_message',
        content: 'done',
        createdAt: 6,
      },
      {
        _id: 'e1',
        type: 'error',
        error: 'boom',
        createdAt: 7,
      },
    ])

    expect(result.items.map((item) => item.event.type)).toEqual([
      'run_started',
      'progress_step',
      'tool_call',
      'tool_result',
      'assistant_message',
      'error',
    ])
    expect(result.hasSnapshots).toBe(false)
    expect(result.title).toBe('Run Timeline')
    expect(result.items[0]?.label).toBe('Run Started')
    expect(result.items[1]?.label).toBe('Analysis Step')
    expect(result.items[2]?.label).toBe('Tool Call: read_files')
    expect(result.items[2]?.fileCount).toBe(2)
    expect(result.items[3]?.label).toBe('Tool Result: read_files')
    expect(result.items[4]?.label).toBe('Assistant Response')
    expect(result.items[5]?.isError).toBe(true)
  })

  it('keeps snapshots and switches title to checkpoints when present', () => {
    const result = selectTimelineEvents([
      {
        _id: 's1',
        type: 'snapshot',
        content: 'Checkpoint after write',
        targetFilePaths: ['src/a.ts'],
        createdAt: 1,
      },
    ])

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.isSnapshot).toBe(true)
    expect(result.items[0]?.label).toBe('Checkpoint Created')
    expect(result.hasSnapshots).toBe(true)
    expect(result.title).toBe('History Checkpoints')
  })
})
