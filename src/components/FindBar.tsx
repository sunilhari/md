import { useState, useEffect, useRef, useCallback } from 'react'

interface Props {
  open: boolean
  onClose: () => void
}

// Uses the CSS Custom Highlight API (Chromium 105+ / Tauri WebView)
const HL_ALL    = 'find-match'
const HL_ACTIVE = 'find-active'

function clearHighlights() {
  // @ts-ignore
  if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
    // @ts-ignore
    CSS.highlights.delete(HL_ALL)
    // @ts-ignore
    CSS.highlights.delete(HL_ACTIVE)
  }
}

function setHighlight(name: string, ranges: Range[]) {
  // @ts-ignore
  if (typeof CSS === 'undefined' || !('highlights' in CSS) || !('Highlight' in window)) return
  // @ts-ignore
  CSS.highlights.set(name, new Highlight(...ranges))
}

function collectMatches(query: string): Range[] {
  const container = document.querySelector('.mdx-content')
  if (!container || !query) return []

  const ranges: Range[] = []
  const lq = query.toLowerCase()
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

  let node: Node | null
  while ((node = walker.nextNode())) {
    const text = node.textContent ?? ''
    const lt = text.toLowerCase()
    let idx = 0
    while ((idx = lt.indexOf(lq, idx)) !== -1) {
      const r = document.createRange()
      r.setStart(node, idx)
      r.setEnd(node, idx + query.length)
      ranges.push(r)
      idx += query.length
    }
  }
  return ranges
}

export function FindBar({ open, onClose }: Props) {
  const [query, setQuery]       = useState('')
  const [count, setCount]       = useState(0)
  const [active, setActive]     = useState(0)
  const inputRef                = useRef<HTMLInputElement>(null)
  const rangesRef               = useRef<Range[]>([])

  // Focus on open, clear on close
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      clearHighlights()
      setQuery('')
      setCount(0)
      rangesRef.current = []
    }
  }, [open])

  const applyAt = useCallback((ranges: Range[], idx: number) => {
    clearHighlights()
    if (ranges.length === 0) return
    setHighlight(HL_ALL, ranges)
    if (ranges[idx]) {
      setHighlight(HL_ACTIVE, [ranges[idx]])
      ranges[idx].startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [])

  // Re-run search when query changes (debounced)
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      const ranges = collectMatches(query)
      rangesRef.current = ranges
      setCount(ranges.length)
      setActive(0)
      applyAt(ranges, 0)
    }, 80)
    return () => clearTimeout(id)
  }, [query, open, applyAt])

  const navigate = useCallback((dir: 1 | -1) => {
    const ranges = rangesRef.current
    if (ranges.length === 0) return
    setActive(prev => {
      const next = ((prev + dir) % ranges.length + ranges.length) % ranges.length
      applyAt(ranges, next)
      return next
    })
  }, [applyAt])

  if (!open) return null

  return (
    <div className="find-bar" role="search">
      <input
        ref={inputRef}
        className="find-input"
        placeholder="Find in document…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? navigate(-1) : navigate(1) }
          if (e.key === 'Escape') { e.preventDefault(); onClose() }
        }}
      />
      <span className="find-count">
        {query
          ? count === 0
            ? 'No results'
            : `${active + 1} / ${count}`
          : ''}
      </span>
      <button className="find-nav-btn" onClick={() => navigate(-1)} title="Previous (Shift+Enter)">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 8l4-4 4 4"/>
        </svg>
      </button>
      <button className="find-nav-btn" onClick={() => navigate(1)} title="Next (Enter)">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 4l4 4 4-4"/>
        </svg>
      </button>
      <button className="find-close-btn" onClick={onClose} title="Close (Esc)">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M1 1l10 10M11 1L1 11" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  )
}
