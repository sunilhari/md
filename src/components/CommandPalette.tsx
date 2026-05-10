import { useState, useEffect, useRef, useCallback } from 'react'

export interface PaletteItem {
  id: string
  label: string
  description?: string
  kbd?: string
  group: 'action' | 'heading' | 'file'
  onSelect: () => void
}

interface Props {
  open: boolean
  onClose: () => void
  items: PaletteItem[]
}

const GROUP_ORDER: PaletteItem['group'][] = ['action', 'heading', 'file']
const GROUP_LABELS: Record<PaletteItem['group'], string> = {
  action:  'Actions',
  heading: 'Headings',
  file:    'Recent Files',
}

function score(item: PaletteItem, q: string): number {
  const l = item.label.toLowerCase()
  const ql = q.toLowerCase()
  if (l === ql) return 3
  if (l.startsWith(ql)) return 2
  if (l.includes(ql)) return 1
  if (item.description?.toLowerCase().includes(ql)) return 0.5
  return -1
}

function filter(items: PaletteItem[], q: string): PaletteItem[] {
  if (!q.trim()) return items
  return items
    .map(item => ({ item, s: score(item, q.trim()) }))
    .filter(({ s }) => s >= 0)
    .sort((a, b) => b.s - a.s)
    .map(({ item }) => item)
}

export function CommandPalette({ open, onClose, items }: Props) {
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)
  const inputRef            = useRef<HTMLInputElement>(null)
  const listRef             = useRef<HTMLDivElement>(null)

  const filtered = filter(items, query)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-palette-idx="${active}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const selectItem = useCallback((item: PaletteItem) => {
    item.onSelect()
    onClose()
  }, [onClose])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); if (filtered[active]) selectItem(filtered[active]) }
    if (e.key === 'Escape')    { e.preventDefault(); onClose() }
  }, [filtered, active, selectItem, onClose])

  if (!open) return null

  // Group filtered items
  const grouped: Partial<Record<PaletteItem['group'], PaletteItem[]>> = {}
  let globalIdx = 0
  const itemIdx = new Map<PaletteItem, number>()
  filtered.forEach(item => { itemIdx.set(item, globalIdx++) })

  for (const g of GROUP_ORDER) {
    const grp = filtered.filter(i => i.group === g)
    if (grp.length) grouped[g] = grp
  }

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette-modal" onClick={e => e.stopPropagation()} onKeyDown={handleKey}>
        <div className="palette-input-wrap">
          <svg className="palette-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search commands, headings, files…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button className="palette-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        <div className="palette-results" ref={listRef}>
          {filtered.length === 0 && (
            <div className="palette-empty">No results for "{query}"</div>
          )}

          {GROUP_ORDER.map(g => {
            const grpItems = grouped[g]
            if (!grpItems?.length) return null
            return (
              <div key={g} className="palette-group">
                <div className="palette-group-label">{GROUP_LABELS[g]}</div>
                {grpItems.map(item => {
                  const idx = itemIdx.get(item)!
                  return (
                    <button
                      key={item.id}
                      data-palette-idx={idx}
                      className={`palette-item ${active === idx ? 'active' : ''}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => selectItem(item)}
                    >
                      <span className="palette-item-label">{item.label}</span>
                      {item.description && (
                        <span className="palette-item-desc">{item.description}</span>
                      )}
                      {item.kbd && (
                        <kbd className="palette-item-kbd">{item.kbd}</kbd>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
