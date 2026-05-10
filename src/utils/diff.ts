export type LineType = 'unchanged' | 'removed' | 'added' | 'empty'

export interface DiffLine {
  type: LineType
  content: string
  lineNum?: number
}

function computeLCS(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

export function diffLines(
  before: string,
  after: string,
): { left: DiffLine[]; right: DiffLine[] } {
  const bLines = before.split('\n')
  const aLines = after.split('\n')
  const dp = computeLCS(bLines, aLines)

  const edits: Array<{ type: 'same' | 'remove' | 'add'; line: string }> = []
  let i = bLines.length
  let j = aLines.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && bLines[i - 1] === aLines[j - 1]) {
      edits.unshift({ type: 'same', line: bLines[i - 1] })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      edits.unshift({ type: 'add', line: aLines[j - 1] })
      j--
    } else {
      edits.unshift({ type: 'remove', line: bLines[i - 1] })
      i--
    }
  }

  const left: DiffLine[] = []
  const right: DiffLine[] = []
  let ln = 1 // left line number
  let rn = 1 // right line number

  for (const edit of edits) {
    if (edit.type === 'same') {
      left.push({ type: 'unchanged', content: edit.line, lineNum: ln++ })
      right.push({ type: 'unchanged', content: edit.line, lineNum: rn++ })
    } else if (edit.type === 'remove') {
      left.push({ type: 'removed', content: edit.line, lineNum: ln++ })
      right.push({ type: 'empty', content: '' })
    } else {
      left.push({ type: 'empty', content: '' })
      right.push({ type: 'added', content: edit.line, lineNum: rn++ })
    }
  }

  return { left, right }
}
