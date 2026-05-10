#!/usr/bin/env node
/**
 * mdx-term — render a .mdx or .md file to the terminal
 *
 * Usage:
 *   mdx-term <file.mdx>
 *   mdx-watch ./          # watch directory mode
 */

import { readFileSync, existsSync } from 'node:fs'
import { extname, resolve, basename } from 'node:path'
import { createRequire } from 'node:module'

// ── lazy require so import errors surface cleanly ──────────────────────────
const _req = createRequire(import.meta.url)

async function loadDeps() {
  const { default: chalk } = await import('chalk')
  const { default: Table } = await import('cli-table3')
  return { chalk, Table }
}

// ── ANSI renderer ──────────────────────────────────────────────────────────

/** Wrap text to a given column width */
function wrap(text, width) {
  if (text.length <= width) return text
  const words = text.split(' ')
  const lines = []
  let cur = ''
  for (const word of words) {
    if ((cur + ' ' + word).trim().length > width) {
      if (cur) lines.push(cur)
      cur = word
    } else {
      cur = (cur ? cur + ' ' : '') + word
    }
  }
  if (cur) lines.push(cur)
  return lines.join('\n')
}

/** Strip inline markdown formatting from a string */
function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
}

/** Inline markdown with ANSI colors */
function renderInline(text, chalk) {
  return text
    .replace(/\*\*(.+?)\*\*/g, (_, t) => chalk.bold(t))
    .replace(/\*(.+?)\*/g, (_, t) => chalk.italic(t))
    .replace(/_(.+?)_/g, (_, t) => chalk.italic(t))
    .replace(/`(.+?)`/g, (_, t) => chalk.hex('#00e5a0').bgHex('#111')(` ${t} `))
    .replace(/~~(.+?)~~/g, (_, t) => chalk.strikethrough(t))
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, label, url) => chalk.hex('#4d7cff').underline(label) + chalk.dim(` (${url})`))
}

/** Parse a JSX-like prop string into a JS object (best-effort) */
function parseJSXProps(attrString) {
  const props = {}
  if (!attrString) return props

  // Match: key={...} or key="..." or key='...' or bare flags
  const re = /(\w+)=\{([^}]*)\}|(\w+)="([^"]*)"|(\w+)='([^']*)'|(\w+)/g
  let m
  while ((m = re.exec(attrString)) !== null) {
    if (m[1] && m[2] !== undefined) {
      // key={...} — attempt JSON parse, fall back to string
      try { props[m[1]] = JSON.parse(m[2]) } catch { props[m[1]] = m[2] }
    } else if (m[3] && m[4] !== undefined) {
      props[m[3]] = m[4]
    } else if (m[5] && m[6] !== undefined) {
      props[m[5]] = m[6]
    } else if (m[7]) {
      props[m[7]] = true
    }
  }
  return props
}

const COLS = process.stdout.columns || 100
const CONTENT_WIDTH = Math.min(COLS - 4, 90)

async function renderMDX(source, chalk, Table) {
  const lines = source.split('\n')
  const out = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // ── headings ─────────────────────────────────────────────────────────
    const hMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (hMatch) {
      const level = hMatch[1].length
      const text = renderInline(hMatch[2], chalk)
      if (level === 1) {
        out.push('')
        out.push(chalk.hex('#00e5a0').bold(text))
        out.push(chalk.hex('#2a2a2a')('─'.repeat(Math.min(stripInline(hMatch[2]).length + 2, CONTENT_WIDTH))))
      } else if (level === 2) {
        out.push('')
        out.push(chalk.hex('#4d7cff').bold(text.toUpperCase()))
        out.push(chalk.hex('#2a2a2a')('─'.repeat(CONTENT_WIDTH)))
      } else if (level === 3) {
        out.push('')
        out.push(chalk.hex('#00e5a0')(text))
      } else {
        out.push(chalk.bold(text))
      }
      i++; continue
    }

    // ── fenced code block ─────────────────────────────────────────────────
    const codeStart = line.match(/^```(\w*)/)
    if (codeStart) {
      const lang = codeStart[1] || ''
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```

      const header = lang ? chalk.dim(`  [${lang}]`) : ''
      const border = chalk.dim('  ' + '─'.repeat(CONTENT_WIDTH - 2))
      if (header) out.push(header)
      out.push(border)
      for (const cl of codeLines) {
        out.push(chalk.hex('#aaaaaa')('  ' + cl))
      }
      out.push(border)
      continue
    }

    // ── JSX component ─────────────────────────────────────────────────────
    const jsxMatch = line.match(/^<(\w+)([^>]*)>/)
    const selfCloseMatch = line.match(/^<(\w+)([^>]*)\/>\s*$/)

    if (selfCloseMatch) {
      const [, name, attrs] = selfCloseMatch
      const props = parseJSXProps(attrs.trim())
      await renderComponent(name, props, '', out, chalk, Table)
      i++; continue
    }

    if (jsxMatch && !line.trimStart().startsWith('</')) {
      const [, name, attrs] = jsxMatch
      const props = parseJSXProps(attrs.trim())

      // Collect children lines until closing tag
      const closeTag = `</${name}>`
      const children = []
      i++
      // If the opening tag is self-closing with content on same line, handle it
      while (i < lines.length && !lines[i].trimStart().startsWith(closeTag)) {
        children.push(lines[i])
        i++
      }
      i++ // skip closing tag

      await renderComponent(name, props, children.join('\n'), out, chalk, Table)
      continue
    }

    // ── horizontal rule ───────────────────────────────────────────────────
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      out.push(chalk.dim('─'.repeat(CONTENT_WIDTH)))
      i++; continue
    }

    // ── blockquote ────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      out.push(chalk.hex('#00e5a0')('▎ ') + chalk.dim(renderInline(line.slice(2), chalk)))
      i++; continue
    }

    // ── unordered list ────────────────────────────────────────────────────
    const ulMatch = line.match(/^(\s*)([-*+])\s+(.+)$/)
    if (ulMatch) {
      const indent = ulMatch[1].length
      const text = renderInline(ulMatch[3], chalk)
      out.push(' '.repeat(indent) + chalk.dim('•') + ' ' + text)
      i++; continue
    }

    // ── ordered list ──────────────────────────────────────────────────────
    const olMatch = line.match(/^(\s*)(\d+)\.\s+(.+)$/)
    if (olMatch) {
      const indent = olMatch[1].length
      const num = olMatch[2]
      const text = renderInline(olMatch[3], chalk)
      out.push(' '.repeat(indent) + chalk.dim(num + '.') + ' ' + text)
      i++; continue
    }

    // ── GFM table ─────────────────────────────────────────────────────────
    if (line.startsWith('|')) {
      const tableLines = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }

      const rows = tableLines
        .filter(l => !l.match(/^\|[\s:-]+\|/))
        .map(l => l.split('|').slice(1, -1).map(c => stripInline(c.trim())))

      if (rows.length > 0) {
        const headers = rows[0]
        const table = new Table({
          head: headers.map(h => chalk.hex('#888888')(h)),
          style: { head: [], border: ['dim'] },
          chars: {
            top: '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
            bottom: '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
            left: '│', 'left-mid': '├', mid: '─', 'mid-mid': '┼',
            right: '│', 'right-mid': '┤', middle: '│',
          },
        })
        for (const row of rows.slice(1)) {
          table.push(row.map(c => chalk.hex('#cccccc')(c)))
        }
        out.push(table.toString())
      }
      continue
    }

    // ── blank line ────────────────────────────────────────────────────────
    if (line.trim() === '') {
      out.push('')
      i++; continue
    }

    // ── paragraph ─────────────────────────────────────────────────────────
    out.push(renderInline(line, chalk))
    i++
  }

  return out.join('\n')
}

async function renderComponent(name, props, children, out, chalk, Table) {
  switch (name) {

    case 'Callout': {
      const type = props.type || 'info'
      const colors = { info: '#4d7cff', warn: '#ffaa00', tip: '#a78bfa', danger: '#ff6b6b' }
      const icons  = { info: 'ℹ', warn: '⚠', tip: '✦', danger: '✕' }
      const color  = colors[type] || colors.info
      const icon   = icons[type]  || icons.info
      const border = chalk.hex(color)('┃')
      out.push('')
      const text = children.trim() || stripInline(Object.values(props).filter(v => typeof v === 'string').join(' '))
      for (const l of text.split('\n')) {
        if (l.trim()) {
          out.push(border + ' ' + chalk.hex(color)(icon) + ' ' + renderInline(l.trim(), chalk))
        }
      }
      out.push('')
      break
    }

    case 'Tabs': {
      const labels = Array.isArray(props.labels) ? props.labels : []
      out.push('')
      out.push(chalk.dim('┌ ') + labels.map((l, i) => chalk.hex('#4d7cff').underline(l)).join(chalk.dim(' │ ')))
      out.push(chalk.dim('│'))
      // Flatten content — each <div> section is shown under its label
      const sections = children.split(/<\/?div>/g).filter(s => s.trim())
      for (let si = 0; si < Math.min(sections.length, labels.length); si++) {
        out.push(chalk.dim('│ ') + chalk.bold(labels[si]))
        for (const l of sections[si].trim().split('\n')) {
          out.push(chalk.dim('│ ') + (l.trim() ? renderInline(l.trim(), chalk) : ''))
        }
        if (si < sections.length - 1) out.push(chalk.dim('│ ─────'))
      }
      out.push(chalk.dim('└'))
      out.push('')
      break
    }

    case 'DataTable': {
      const { columns = [], data = [] } = props
      if (columns.length > 0) {
        const table = new Table({
          head: columns.map(h => chalk.hex('#888888')(h)),
          style: { head: [], border: ['dim'] },
        })
        for (const row of data) {
          table.push(row.map(c => chalk.hex('#cccccc')(String(c))))
        }
        out.push(table.toString())
      }
      break
    }

    case 'Diagram': {
      out.push('')
      out.push(chalk.dim('┌─ diagram ') + chalk.dim('─'.repeat(Math.max(0, CONTENT_WIDTH - 12))) + chalk.dim('┐'))
      for (const l of children.trim().split('\n')) {
        out.push(chalk.dim('│  ') + chalk.hex('#4d7cff')(l))
      }
      out.push(chalk.dim('└') + chalk.dim('─'.repeat(CONTENT_WIDTH - 1)) + chalk.dim('┘'))
      out.push(chalk.dim('  (open in browser for rendered SVG)'))
      out.push('')
      break
    }

    case 'CodeAnnotated': {
      const annotations = Array.isArray(props.annotations) ? props.annotations : []
      const annMap = new Map(annotations.map(a => [a.line, a.comment]))
      const lang = props.lang || ''
      if (lang) out.push(chalk.dim(`  [${lang}]`))
      out.push(chalk.dim('  ' + '─'.repeat(CONTENT_WIDTH - 2)))
      children.trim().split('\n').forEach((l, idx) => {
        const lineNum = idx + 1
        const annotation = annMap.get(lineNum)
        const lineStr = chalk.dim(String(lineNum).padStart(3) + ' ') + chalk.hex('#aaaaaa')(l)
        const annoStr = annotation ? chalk.hex('#ffaa00')(`  ← ${annotation}`) : ''
        out.push(lineStr + annoStr)
      })
      out.push(chalk.dim('  ' + '─'.repeat(CONTENT_WIDTH - 2)))
      break
    }

    case 'ExportButton': {
      const fmt = props.format || 'json'
      out.push('')
      out.push(chalk.hex('#00e5a0')(`  [ Copy ${fmt.toUpperCase()} ]`) + chalk.dim('  (interactive in browser)'))
      out.push('')
      break
    }

    case 'Slider': {
      const { label = '', min = 0, max = 100, defaultValue = 50, unit = '' } = props
      const val = defaultValue
      const pct = Math.round(((val - min) / (max - min)) * 20)
      const bar = '█'.repeat(pct) + '░'.repeat(20 - pct)
      out.push('')
      out.push(chalk.hex('#cccccc')(label) + '  ' + chalk.hex('#00e5a0').bold(`${val}${unit}`))
      out.push(chalk.hex('#2a2a2a')(`  ${min}${unit} `) + chalk.hex('#00e5a0')(bar) + chalk.hex('#2a2a2a')(` ${max}${unit}`))
      out.push('')
      break
    }

    case 'Timeline': {
      const events = Array.isArray(props.events) ? props.events : []
      out.push('')
      for (let ei = 0; ei < events.length; ei++) {
        const ev = events[ei]
        const dot = ei === 0 ? '◉' : '○'
        out.push(chalk.hex('#00e5a0')(dot) + '  ' + chalk.dim(ev.date))
        out.push(chalk.dim('│') + '  ' + chalk.bold(ev.title))
        if (ev.desc) out.push(chalk.dim('│') + '  ' + chalk.hex('#888')(ev.desc))
        if (ei < events.length - 1) out.push(chalk.dim('│'))
      }
      out.push('')
      break
    }

    case 'DiffView': {
      const { before = '', after = '', lang: dlang = '' } = props
      const beforeLines = before.split('\n')
      const afterLines = after.split('\n')
      if (dlang) out.push(chalk.dim(`  [diff: ${dlang}]`))
      out.push(chalk.dim('  before') + '  ' + chalk.dim('after'))
      out.push(chalk.dim('  ' + '─'.repeat(CONTENT_WIDTH - 2)))
      const maxLen = Math.max(beforeLines.length, afterLines.length)
      for (let li = 0; li < maxLen; li++) {
        const bl = beforeLines[li] ?? ''
        const al = afterLines[li] ?? ''
        if (bl !== al) {
          if (bl) out.push(chalk.hex('#ff6b6b')('- ') + chalk.hex('#ff6b6b')(bl))
          if (al) out.push(chalk.hex('#00e5a0')('+ ') + chalk.hex('#00e5a0')(al))
        } else {
          out.push(chalk.dim('  ') + chalk.dim(bl))
        }
      }
      out.push('')
      break
    }

    default: {
      // Unknown component — show a labeled placeholder
      out.push(chalk.dim(`  <${name}> `) + chalk.dim('(not rendered in terminal)'))
      break
    }
  }
}

// ── CLI entry ──────────────────────────────────────────────────────────────

async function main() {
  const { chalk, Table } = await loadDeps()

  const args = process.argv.slice(2)
  const watchMode = args[0] === 'watch' || args[0] === '--watch'
  const filePath = watchMode ? args[1] : args[0]

  if (!filePath) {
    console.error(chalk.red('Usage: mdx-term <file.mdx>'))
    console.error(chalk.dim('       mdx-term watch <file.mdx>'))
    process.exit(1)
  }

  const absPath = resolve(filePath)

  if (!existsSync(absPath)) {
    console.error(chalk.red(`File not found: ${absPath}`))
    process.exit(1)
  }

  const ext = extname(absPath).toLowerCase()
  if (ext !== '.md' && ext !== '.mdx') {
    console.error(chalk.red('Only .md and .mdx files are supported'))
    process.exit(1)
  }

  async function render() {
    const source = readFileSync(absPath, 'utf8')
    // Clear screen between renders in watch mode
    if (watchMode) process.stdout.write('\x1Bc')

    const output = await renderMDX(source, chalk, Table)
    console.log('')
    console.log(output)
    console.log('')
    if (watchMode) {
      console.log(chalk.dim(`  watching ${basename(absPath)} — Ctrl+C to stop`))
    }
  }

  await render()

  if (watchMode) {
    const { default: chokidar } = await import('chokidar')
    const watcher = chokidar.watch(absPath, { persistent: true })
    let debounce = null
    watcher.on('change', () => {
      clearTimeout(debounce)
      debounce = setTimeout(render, 300)
    })
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
