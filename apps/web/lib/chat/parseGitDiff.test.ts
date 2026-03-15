import { describe, it, expect } from 'bun:test'
import { parseGitDiff } from './parseGitDiff'

describe('parseGitDiff', () => {
  it('returns empty array for empty string', () => {
    expect(parseGitDiff('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(parseGitDiff('   \n  ')).toEqual([])
  })

  it('parses a single-file unified diff', () => {
    const diff = `diff --git a/src/foo.ts b/src/foo.ts
index abc..def 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,4 +1,4 @@
 line1
-line2 old
+line2 new
 line3
 line4`

    const result = parseGitDiff(diff)
    expect(result).toHaveLength(1)
    expect(result[0].filePath).toBe('src/foo.ts')
    expect(result[0].hunks).toHaveLength(1)

    const hunk = result[0].hunks[0]
    expect(hunk.oldStart).toBe(1)
    expect(hunk.oldCount).toBe(4)
    expect(hunk.newStart).toBe(1)
    expect(hunk.newCount).toBe(4)
    expect(hunk.lines).toHaveLength(5)
    expect(hunk.lines[0]).toEqual({ type: 'context', content: 'line1' })
    expect(hunk.lines[1]).toEqual({ type: 'remove', content: 'line2 old' })
    expect(hunk.lines[2]).toEqual({ type: 'add', content: 'line2 new' })
    expect(hunk.lines[3]).toEqual({ type: 'context', content: 'line3' })
    expect(hunk.lines[4]).toEqual({ type: 'context', content: 'line4' })
  })

  it('parses a multi-file diff', () => {
    const diff = `diff --git a/src/a.ts b/src/a.ts
--- a/src/a.ts
+++ b/src/a.ts
@@ -1,2 +1,2 @@
-old a
+new a
diff --git a/src/b.ts b/src/b.ts
--- a/src/b.ts
+++ b/src/b.ts
@@ -5,3 +5,3 @@
 context
-old b
+new b`

    const result = parseGitDiff(diff)
    expect(result).toHaveLength(2)
    expect(result[0].filePath).toBe('src/a.ts')
    expect(result[1].filePath).toBe('src/b.ts')
    expect(result[0].hunks[0].lines).toHaveLength(2)
    expect(result[1].hunks[0].lines).toHaveLength(3)
  })

  it('skips binary file entries gracefully', () => {
    const diff = `diff --git a/image.png b/image.png
index abc..def 100644
Binary files a/image.png and b/image.png differ
diff --git a/src/text.ts b/src/text.ts
--- a/src/text.ts
+++ b/src/text.ts
@@ -1,1 +1,1 @@
-old
+new`

    const result = parseGitDiff(diff)
    // Binary file gets a file entry but with no hunks
    const binaryFile = result.find((f) => f.filePath === 'image.png')
    expect(binaryFile?.hunks).toHaveLength(0)

    const textFile = result.find((f) => f.filePath === 'src/text.ts')
    expect(textFile?.hunks).toHaveLength(1)
  })

  it('handles diff with only additions', () => {
    const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+line1
+line2
+line3`

    const result = parseGitDiff(diff)
    expect(result).toHaveLength(1)
    const hunk = result[0].hunks[0]
    expect(hunk.lines.every((l) => l.type === 'add')).toBe(true)
    expect(hunk.lines).toHaveLength(3)
  })

  it('handles diff with only deletions', () => {
    const diff = `diff --git a/src/deleted.ts b/src/deleted.ts
deleted file mode 100644
--- a/src/deleted.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line1
-line2
-line3`

    const result = parseGitDiff(diff)
    expect(result).toHaveLength(1)
    const hunk = result[0].hunks[0]
    expect(hunk.lines.every((l) => l.type === 'remove')).toBe(true)
    expect(hunk.lines).toHaveLength(3)
  })

  it('parses hunk header with single-line counts (no comma)', () => {
    const diff = `diff --git a/src/x.ts b/src/x.ts
--- a/src/x.ts
+++ b/src/x.ts
@@ -5 +5 @@
-old
+new`

    const result = parseGitDiff(diff)
    const hunk = result[0].hunks[0]
    expect(hunk.oldStart).toBe(5)
    expect(hunk.oldCount).toBe(1)
    expect(hunk.newStart).toBe(5)
    expect(hunk.newCount).toBe(1)
  })

  it('parses multiple hunks in one file', () => {
    const diff = `diff --git a/src/big.ts b/src/big.ts
--- a/src/big.ts
+++ b/src/big.ts
@@ -1,3 +1,3 @@
 ctx
-old1
+new1
@@ -10,3 +10,3 @@
 ctx
-old2
+new2`

    const result = parseGitDiff(diff)
    expect(result).toHaveLength(1)
    expect(result[0].hunks).toHaveLength(2)
  })
})
