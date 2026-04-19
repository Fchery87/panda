'use client'

export type StreamingMarkdownBlock =
  | {
      type: 'markdown'
      content: string
      isSettled: boolean
    }
  | {
      type: 'code'
      language: string
      code: string
      isSettled: boolean
    }
  | {
      type: 'list'
      ordered: boolean
      items: string[]
      isSettled: boolean
    }
  | {
      type: 'table'
      rows: string[][]
      isSettled: boolean
    }
  | {
      type: 'quote'
      content: string
      isSettled: boolean
    }

type CurrentBlock =
  | { type: 'markdown'; lines: string[] }
  | { type: 'code'; language: string; lines: string[] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; rows: string[][] }
  | { type: 'quote'; lines: string[] }

function isFenceStart(line: string): boolean {
  return line.trimStart().startsWith('```')
}

function parseFenceLanguage(line: string): string {
  return line.trimStart().slice(3).trim()
}

function parseListMarker(line: string): { ordered: boolean; content: string } | null {
  const trimmed = line.trimStart()
  const unordered = trimmed.match(/^[-*]\s+(.+)$/)
  if (unordered) {
    return { ordered: false, content: unordered[1] }
  }

  const ordered = trimmed.match(/^\d+[.)]\s+(.+)$/)
  if (ordered) {
    return { ordered: true, content: ordered[1] }
  }

  return null
}

function isContinuationLine(line: string): boolean {
  return /^\s{2,}\S/.test(line)
}

function parseTableRow(line: string): string[] | null {
  if (!line.includes('|')) return null
  const cells = line
    .split('|')
    .map((cell) => cell.trim())
    .filter((cell, index, array) => !(array.length > 1 && index === 0 && cell === ''))
    .filter(
      (cell, index, array) => !(array.length > 1 && index === array.length - 1 && cell === '')
    )

  return cells.length > 0 ? cells : null
}

function parseQuoteLine(line: string): string | null {
  const trimmed = line.trimStart()
  const match = trimmed.match(/^>\s?(.*)$/)
  return match ? match[1] : null
}

function finalizeBlock(current: CurrentBlock, isSettled: boolean): StreamingMarkdownBlock {
  switch (current.type) {
    case 'markdown':
      return {
        type: 'markdown',
        content: repairInlineMarkdownForDisplay(current.lines.join('\n').trim()),
        isSettled,
      }
    case 'code':
      return {
        type: 'code',
        language: current.language,
        code: current.lines.join('\n'),
        isSettled,
      }
    case 'list':
      return {
        type: 'list',
        ordered: current.ordered,
        items: current.items.map((item) => repairInlineMarkdownForDisplay(item)),
        isSettled,
      }
    case 'table':
      return {
        type: 'table',
        rows: current.rows.map((row) => row.map((cell) => repairInlineMarkdownForDisplay(cell))),
        isSettled,
      }
    case 'quote':
      return {
        type: 'quote',
        content: repairInlineMarkdownForDisplay(current.lines.join('\n').trim()),
        isSettled,
      }
  }
}

export function parseStreamingMarkdown(content: string): StreamingMarkdownBlock[] {
  if (!content.trim()) return []

  const lines = content.split('\n')
  const blocks: StreamingMarkdownBlock[] = []
  let current: CurrentBlock | null = null

  const pushCurrent = (isSettled: boolean) => {
    if (!current) return
    blocks.push(finalizeBlock(current, isSettled))
    current = null
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const trimmed = line.trim()

    if (current?.type === 'code') {
      if (isFenceStart(line)) {
        pushCurrent(true)
      } else {
        current.lines.push(line)
      }
      continue
    }

    if (!trimmed) {
      pushCurrent(true)
      continue
    }

    if (isFenceStart(line)) {
      pushCurrent(true)
      current = { type: 'code', language: parseFenceLanguage(line), lines: [] }
      continue
    }

    const quoteLine = parseQuoteLine(line)
    if (quoteLine !== null) {
      if (current?.type !== 'quote') {
        pushCurrent(true)
        current = { type: 'quote', lines: [] }
      }
      current.lines.push(quoteLine)
      continue
    }

    const listMarker = parseListMarker(line)
    if (listMarker) {
      if (current?.type !== 'list' || current.ordered !== listMarker.ordered) {
        pushCurrent(true)
        current = { type: 'list', ordered: listMarker.ordered, items: [] }
      }
      current.items.push(listMarker.content)
      continue
    }

    if (current?.type === 'list' && isContinuationLine(line) && current.items.length > 0) {
      current.items[current.items.length - 1] =
        `${current.items[current.items.length - 1]} ${trimmed}`
      continue
    }

    const tableRow = parseTableRow(line)
    if (tableRow) {
      if (current?.type !== 'table') {
        pushCurrent(true)
        current = { type: 'table', rows: [] }
      }
      current.rows.push(tableRow)
      continue
    }

    if (current?.type !== 'markdown') {
      pushCurrent(true)
      current = { type: 'markdown', lines: [] }
    }
    current.lines.push(line)
  }

  pushCurrent(false)
  return blocks.filter((block) => {
    switch (block.type) {
      case 'markdown':
      case 'quote':
        return block.content.length > 0
      case 'code':
        return block.code.length > 0 || block.language.length > 0
      case 'list':
        return block.items.length > 0
      case 'table':
        return block.rows.length > 0
    }
  })
}

export function repairInlineMarkdownForDisplay(content: string): string {
  let repaired = content

  const backtickCount = repaired.match(/`/g)?.length ?? 0
  if (backtickCount % 2 === 1) {
    repaired += '`'
  }

  const unmatchedLinkLabel = repaired.match(/\[[^\]]*\]\([^)]*$/)
  if (unmatchedLinkLabel) {
    return `${repaired})`
  }

  const unmatchedLinkText = repaired.match(/\[[^\]]*$/)
  if (unmatchedLinkText) {
    return `${repaired}]`
  }

  const trailingBold = repaired.match(/\*\*[^*\n]+$/)
  if (trailingBold) {
    return `${repaired}**`
  }

  const trailingDoubleUnderscore = repaired.match(/__[^_\n]+$/)
  if (trailingDoubleUnderscore) {
    return `${repaired}__`
  }

  return repaired
}
