import { useState, useCallback, useRef, useEffect, useMemo, useReducer } from 'react'
import { DropZone }         from './components/DropZone'
import { Sidebar }          from './components/Sidebar'
import { MDXRenderer }      from './components/MDXRenderer'
import { SettingsPanel }    from './components/SettingsPanel'
import { FindBar }          from './components/FindBar'
import { CommandPalette }   from './components/CommandPalette'
import type { PaletteItem } from './components/CommandPalette'
import { ThemeProvider, useTheme, THEMES } from './context/theme'
import type { ThemeName } from './context/theme'
import { SettingsProvider }  from './context/settings'
import { RecentFilesProvider, useRecentFiles } from './context/recentFiles'
import { FilePathContext }   from './context/filePath'
import type { Heading } from './utils/headings'
import type { RecentFile } from './context/recentFiles'

interface FileState { content: string; name: string }
interface HistEntry { content: string; name: string; path?: string }

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// ── File history reducer ──────────────────────────────────────────────────

type NavState  = { history: HistEntry[]; idx: number }
type NavAction = { type: 'push'; entry: HistEntry } | { type: 'back' } | { type: 'forward' }

function navReducer(s: NavState, a: NavAction): NavState {
  switch (a.type) {
    case 'push':    return { history: [...s.history.slice(0, s.idx + 1), a.entry], idx: s.idx + 1 }
    case 'back':    return s.idx > 0 ? { ...s, idx: s.idx - 1 } : s
    case 'forward': return s.idx < s.history.length - 1 ? { ...s, idx: s.idx + 1 } : s
  }
}

// ── Doc stats ─────────────────────────────────────────────────────────────

function getDocStats(content: string) {
  const text = content
    .replace(/^---[\s\S]*?---\n?/, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]+`/g, ' ')
    .replace(/[#*_~[\]()!|]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0
  const minutes = Math.max(1, Math.round(words / 200))
  return { words, minutes }
}

// ── Tauri helpers ─────────────────────────────────────────────────────────

async function tauriOpenFile(): Promise<{ content: string; name: string; path: string } | null> {
  const { open }         = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const path = await open({ multiple: false, filters: [{ name: 'Markdown', extensions: ['md', 'mdx'] }] })
  if (!path || typeof path !== 'string') return null
  const content = await readTextFile(path)
  const name    = path.split('/').pop() ?? path.split('\\').pop() ?? 'file.md'
  return { content, name, path }
}

async function tauriReadFile(path: string): Promise<string | null> {
  try { const { readTextFile } = await import('@tauri-apps/plugin-fs'); return await readTextFile(path) }
  catch { return null }
}

// ── Icons ─────────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { mode, toggle } = useTheme()
  return (
    <button className="header-btn theme-toggle" onClick={toggle} title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
      {mode === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

// ── Main app ──────────────────────────────────────────────────────────────

function AppInner() {
  const [file, setFile]                   = useState<FileState | null>(null)
  const [headings, setHeadings]           = useState<Heading[]>([])
  const [settingsOpen, setSettingsOpen]   = useState(false)
  const [findOpen, setFindOpen]           = useState(false)
  const [paletteOpen, setPaletteOpen]     = useState(false)
  const [splitView, setSplitView]         = useState(false)
  const [sidebarWidth, setSidebarWidth]   = useState(220)
  const [zoom, setZoom]                   = useState(1.0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [currentPath, setCurrentPath]     = useState<string | null>(null)

  const [nav, dispatchNav] = useReducer(navReducer, { history: [], idx: -1 })

  const fileInputRef   = useRef<HTMLInputElement>(null)
  const unwatchRef     = useRef<(() => void | Promise<void>) | null>(null)
  const isDraggingRef  = useRef(false)
  const mainRef        = useRef<HTMLDivElement>(null)

  const { recent, push: pushRecent } = useRecentFiles()
  const { setTheme } = useTheme()

  // ── File directory (for local image resolution) ────────────────────────
  const fileDir = useMemo(() => {
    if (!currentPath) return null
    const sep = currentPath.includes('/') ? '/' : '\\'
    return currentPath.split(sep).slice(0, -1).join(sep)
  }, [currentPath])

  // ── Load file ───────────────────────────────────────────────────────────

  const loadFile = useCallback((content: string, name: string, path?: string) => {
    setHeadings([])
    setFile({ content, name })
    setFindOpen(false)
    if (path !== undefined) setCurrentPath(path)
    dispatchNav({ type: 'push', entry: { content, name, path } })
    pushRecent({ name, path, openedAt: Date.now() })
  }, [pushRecent])

  const reopenRecent = useCallback(async (rf: RecentFile) => {
    if (rf.path && isTauri) {
      const content = await tauriReadFile(rf.path)
      if (content !== null) loadFile(content, rf.name, rf.path)
    }
  }, [loadFile])

  // Navigate back/forward through file history
  const navigateHistory = useCallback((dir: 1 | -1) => {
    const next = nav.idx + dir
    if (next < 0 || next >= nav.history.length) return
    const entry = nav.history[next]
    dispatchNav({ type: dir === -1 ? 'back' : 'forward' })
    setFile({ content: entry.content, name: entry.name })
    setHeadings([])
    if (entry.path !== undefined) setCurrentPath(entry.path ?? null)
  }, [nav])

  // ── Web file input ──────────────────────────────────────────────────────

  const openPicker = useCallback(async () => {
    if (isTauri) {
      const result = await tauriOpenFile()
      if (result) loadFile(result.content, result.name, result.path)
    } else {
      fileInputRef.current?.click()
    }
  }, [loadFile])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    if (!f.name.match(/\.(md|mdx)$/i)) return
    const reader = new FileReader()
    reader.onload = ev => loadFile(ev.target?.result as string, f.name)
    reader.readAsText(f)
  }, [loadFile])

  // ── File watching ───────────────────────────────────────────────────────

  useEffect(() => {
    if (!isTauri || !currentPath) return
    let active = true
    const setupWatch = async () => {
      if (unwatchRef.current) { await unwatchRef.current(); unwatchRef.current = null }
      try {
        const fsPlugin = await import('@tauri-apps/plugin-fs')
        if (typeof (fsPlugin as any).watch !== 'function') return
        const unwatch = await (fsPlugin as any).watch(currentPath, async () => {
          if (!active) return
          const content = await tauriReadFile(currentPath)
          if (content !== null && active) { setFile(prev => prev ? { ...prev, content } : null); setHeadings([]) }
        }, { recursive: false })
        unwatchRef.current = unwatch
      } catch { /* watch not available */ }
    }
    setupWatch()
    return () => { active = false; unwatchRef.current?.(); unwatchRef.current = null }
  }, [currentPath])

  // ── Scroll progress ─────────────────────────────────────────────────────

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el
      const max = scrollHeight - clientHeight
      setScrollProgress(max > 0 ? scrollTop / max : 0)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [file]) // re-attach when file changes (new content, new scroll height)

  // ── Zoom CSS variable ───────────────────────────────────────────────────

  useEffect(() => {
    document.documentElement.style.setProperty('--user-zoom', String(zoom))
  }, [zoom])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'o')          { e.preventDefault(); openPicker() }
      if (mod && e.key === ',')          { e.preventDefault(); setSettingsOpen(s => !s) }
      if (mod && e.key === 'k')          { e.preventDefault(); setPaletteOpen(s => !s) }
      if (mod && e.key === 'f')          { e.preventDefault(); if (file) setFindOpen(s => !s) }
      if (mod && e.key === '\\')         { e.preventDefault(); if (file) setSplitView(s => !s) }
      if (mod && e.key === 'p')          { e.preventDefault(); if (file) window.print() }
      if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => Math.min(2, +(z + 0.1).toFixed(1))) }
      if (mod && e.key === '-')          { e.preventDefault(); setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1))) }
      if (mod && e.key === '0')          { e.preventDefault(); setZoom(1) }
      if (mod && e.key === '[')          { e.preventDefault(); navigateHistory(-1) }
      if (mod && e.key === ']')          { e.preventDefault(); navigateHistory(1) }
      if (e.key === 'Escape')            { setSettingsOpen(false); setFindOpen(false); setPaletteOpen(false) }
      if (mod && !e.shiftKey && !e.altKey) {
        const n = parseInt(e.key)
        if (n >= 1 && n <= 9 && recent[n - 1]) { e.preventDefault(); reopenRecent(recent[n - 1]) }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPicker, file, recent, reopenRecent, navigateHistory])

  // ── Sidebar drag resize ─────────────────────────────────────────────────

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    const startX = e.clientX, startW = sidebarWidth
    const onMove = (ev: MouseEvent) => { if (isDraggingRef.current) setSidebarWidth(Math.max(140, Math.min(420, startW + ev.clientX - startX))) }
    const onUp   = () => { isDraggingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  // ── Command palette items ───────────────────────────────────────────────

  const paletteItems: PaletteItem[] = useMemo(() => {
    const actions: PaletteItem[] = [
      { id: 'open',       label: 'Open File',          kbd: '⌘O',  group: 'action', onSelect: openPicker },
      { id: 'find',       label: 'Find in Document',   kbd: '⌘F',  group: 'action', onSelect: () => { setFindOpen(true); setPaletteOpen(false) } },
      { id: 'split',      label: splitView ? 'Close Split View' : 'Open Split View', kbd: '⌘\\', group: 'action', onSelect: () => setSplitView(s => !s) },
      { id: 'print',      label: 'Print / Export PDF', kbd: '⌘P',  group: 'action', onSelect: () => window.print() },
      { id: 'zoom-in',    label: 'Zoom In',            kbd: '⌘+',  group: 'action', onSelect: () => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1))) },
      { id: 'zoom-out',   label: 'Zoom Out',           kbd: '⌘-',  group: 'action', onSelect: () => setZoom(z => Math.max(0.5, +(z - 0.1).toFixed(1))) },
      { id: 'zoom-reset', label: 'Reset Zoom',         kbd: '⌘0',  group: 'action', onSelect: () => setZoom(1) },
      ...THEMES.map(t => ({
        id: `theme-${t.name}`,
        label: `Theme: ${t.label}`,
        group: 'action' as const,
        onSelect: () => setTheme(t.name as ThemeName),
      })),
    ]
    const hItems: PaletteItem[] = headings.map(h => ({
      id:          `h-${h.id}`,
      label:       h.text,
      description: `H${h.level}`,
      group:       'heading' as const,
      onSelect:    () => document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    }))
    const rItems: PaletteItem[] = recent.map((rf, i) => ({
      id:          `r-${rf.name}-${rf.openedAt}`,
      label:       rf.name,
      description: rf.path ? rf.path.replace(/\/[^/]+$/, '') : undefined,
      kbd:         i < 9 ? `⌘${i + 1}` : undefined,
      group:       'file' as const,
      onSelect:    () => reopenRecent(rf),
    }))
    return [...actions, ...hItems, ...rItems]
  }, [openPicker, splitView, headings, recent, reopenRecent, setTheme])

  const stats = useMemo(() => file ? getDocStats(file.content) : null, [file])
  const canBack    = nav.idx > 0
  const canForward = nav.idx < nav.history.length - 1

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <FilePathContext.Provider value={fileDir}>
      <input ref={fileInputRef} type="file" accept=".md,.mdx" style={{ display: 'none' }} onChange={handleInputChange} />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />

      {!file ? (
        /* ── Landing screen ───────────────────────────────────────────── */
        <div className="app-empty">
          <div className="app-logo-row">
            <div className="app-logo-large">
              <span className="logo-mdx">md</span>
              <span className="logo-browser">render</span>
            </div>
            <div className="app-logo-actions">
              <ThemeToggle />
              <button className="header-btn theme-toggle" onClick={() => setSettingsOpen(s => !s)} title="Settings (⌘,)"><GearIcon /></button>
              <button className="header-btn theme-toggle" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
              </button>
            </div>
          </div>

          <DropZone onFile={loadFile} />
          <p className="landing-hint">or press <kbd>⌘O</kbd> to open · <kbd>⌘K</kbd> for commands</p>

          {recent.length > 0 && (
            <div className="recent-files">
              <div className="recent-label">recent files</div>
              {recent.slice(0, 9).map((rf, i) => (
                <button key={`${rf.name}-${rf.openedAt}`} className="recent-item" onClick={() => reopenRecent(rf)} title={rf.path ?? rf.name}>
                  <kbd className="recent-kbd">⌘{i + 1}</kbd>
                  <span className="recent-name">{rf.name}</span>
                  {rf.path && <span className="recent-path">{rf.path.replace(/\/[^/]+$/, '')}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Document view ────────────────────────────────────────────── */
        <div className="app">
          {/* Scroll progress bar */}
          <div className="scroll-progress" style={{ width: `${scrollProgress * 100}%` }} />

          <header className="app-header">
            <span className="header-logo">md render</span>

            <div className="header-nav">
              <button className="header-nav-btn" disabled={!canBack} onClick={() => navigateHistory(-1)} title="Back (⌘[)">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 2L4 6l4 4"/></svg>
              </button>
              <button className="header-nav-btn" disabled={!canForward} onClick={() => navigateHistory(1)} title="Forward (⌘])">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 2l4 4-4 4"/></svg>
              </button>
            </div>

            <span className="header-filename">{file.name}</span>

            {stats && (
              <span className="header-stats">{stats.words.toLocaleString()} words · ~{stats.minutes} min</span>
            )}
            {zoom !== 1.0 && (
              <span className="header-zoom">{Math.round(zoom * 100)}%</span>
            )}

            <ThemeToggle />
            <button
              className={`header-btn theme-toggle ${splitView ? 'active-btn' : ''}`}
              onClick={() => setSplitView(s => !s)}
              title="Split view (⌘\)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>
              </svg>
            </button>
            <button className="header-btn theme-toggle" onClick={() => setPaletteOpen(true)} title="Command palette (⌘K)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
            </button>
            <button className="header-btn theme-toggle" onClick={() => setSettingsOpen(s => !s)} title="Settings (⌘,)"><GearIcon /></button>
            <button className="header-btn" onClick={() => setFindOpen(s => !s)} title="Find (⌘F)">find</button>
            <button className="header-btn" onClick={() => window.print()} title="Print (⌘P)">print</button>
            <button className="header-btn" onClick={openPicker}>open file</button>
          </header>

          <FindBar open={findOpen} onClose={() => setFindOpen(false)} />

          <div className={`app-body${splitView ? ' split-view' : ''}`}>
            {!splitView && (
              <>
                <Sidebar headings={headings} width={sidebarWidth} />
                <div className="resize-handle" onMouseDown={handleResizeStart} title="Drag to resize" />
              </>
            )}

            <main className="app-main" ref={mainRef}>
              <MDXRenderer content={file.content} fileName={file.name} onHeadings={setHeadings} />
            </main>

            {splitView && (
              <div className="split-source">
                <div className="split-source-label">source</div>
                <pre className="split-source-pre">{file.content}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </FilePathContext.Provider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <RecentFilesProvider>
          <AppInner />
        </RecentFilesProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
