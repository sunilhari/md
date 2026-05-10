import { useState, useCallback, useRef, useEffect } from 'react'
import { DropZone }      from './components/DropZone'
import { Sidebar }       from './components/Sidebar'
import { MDXRenderer }   from './components/MDXRenderer'
import { SettingsPanel } from './components/SettingsPanel'
import { FindBar }       from './components/FindBar'
import { ThemeProvider, useTheme } from './context/theme'
import { SettingsProvider } from './context/settings'
import { RecentFilesProvider, useRecentFiles } from './context/recentFiles'
import type { Heading } from './utils/headings'
import type { RecentFile } from './context/recentFiles'

interface FileState { content: string; name: string }

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// ── Tauri APIs ────────────────────────────────────────────────────────────

async function tauriOpenFile(): Promise<{ content: string; name: string; path: string } | null> {
  const { open }         = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const path = await open({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'mdx'] }],
  })
  if (!path || typeof path !== 'string') return null
  const content = await readTextFile(path)
  const name    = path.split('/').pop() ?? path.split('\\').pop() ?? 'file.md'
  return { content, name, path }
}

async function tauriReadFile(path: string): Promise<string | null> {
  try {
    const { readTextFile } = await import('@tauri-apps/plugin-fs')
    return await readTextFile(path)
  } catch { return null }
}

// ── Header icons ──────────────────────────────────────────────────────────

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
  const [splitView, setSplitView]         = useState(false)
  const [sidebarWidth, setSidebarWidth]   = useState(220)
  const [zoom, setZoom]                   = useState(1.0)
  const [currentPath, setCurrentPath]     = useState<string | null>(null)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const unwatchRef    = useRef<(() => void | Promise<void>) | null>(null)
  const isDraggingRef = useRef(false)

  const { recent, push: pushRecent } = useRecentFiles()

  // ── Load file ───────────────────────────────────────────────────────────

  const loadFile = useCallback((content: string, name: string, path?: string) => {
    setHeadings([])
    setFile({ content, name })
    setFindOpen(false)
    if (path !== undefined) setCurrentPath(path)
    pushRecent({ name, path, openedAt: Date.now() })
  }, [pushRecent])

  const reopenRecent = useCallback(async (rf: RecentFile) => {
    if (rf.path && isTauri) {
      const content = await tauriReadFile(rf.path)
      if (content !== null) loadFile(content, rf.name, rf.path)
    }
  }, [loadFile])

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
        const { watch } = fsPlugin as any
        const unwatch = await watch(currentPath, async () => {
          if (!active) return
          const content = await tauriReadFile(currentPath)
          if (content !== null && active) {
            setFile(prev => prev ? { ...prev, content } : null)
            setHeadings([])
          }
        }, { recursive: false })
        unwatchRef.current = unwatch
      } catch { /* watch not available */ }
    }

    setupWatch()
    return () => {
      active = false
      unwatchRef.current?.()
      unwatchRef.current = null
    }
  }, [currentPath])

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
      if (mod && e.key === 'f')          { e.preventDefault(); if (file) setFindOpen(s => !s) }
      if (mod && e.key === '\\')         { e.preventDefault(); if (file) setSplitView(s => !s) }
      if (mod && e.key === 'p')          { e.preventDefault(); if (file) window.print() }
      if (mod && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(z => Math.min(2, Math.round((z + 0.1) * 10) / 10)) }
      if (mod && e.key === '-')          { e.preventDefault(); setZoom(z => Math.max(0.5, Math.round((z - 0.1) * 10) / 10)) }
      if (mod && e.key === '0')          { e.preventDefault(); setZoom(1) }
      if (e.key === 'Escape')            { setSettingsOpen(false); setFindOpen(false) }

      // ⌘1–⌘9 reopen recent
      if (mod && !e.shiftKey && !e.altKey) {
        const n = parseInt(e.key)
        if (n >= 1 && n <= 9 && recent[n - 1]) {
          e.preventDefault()
          reopenRecent(recent[n - 1])
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPicker, file, recent, reopenRecent])

  // ── Sidebar drag resize ─────────────────────────────────────────────────

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDraggingRef.current = true
    const startX = e.clientX
    const startW = sidebarWidth

    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return
      setSidebarWidth(Math.max(140, Math.min(420, startW + ev.clientX - startX)))
    }
    const onUp = () => {
      isDraggingRef.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [sidebarWidth])

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.mdx"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {!file ? (
        /* ── Landing screen ─────────────────────────────────────────── */
        <div className="app-empty">
          <div className="app-logo-row">
            <div className="app-logo-large">
              <span className="logo-mdx">md</span>
              <span className="logo-browser">render</span>
            </div>
            <div className="app-logo-actions">
              <ThemeToggle />
              <button className="header-btn theme-toggle" onClick={() => setSettingsOpen(s => !s)} title="Settings (⌘,)">
                <GearIcon />
              </button>
            </div>
          </div>

          <DropZone onFile={loadFile} />
          <p className="landing-hint">or press <kbd>⌘O</kbd> to open a file</p>

          {recent.length > 0 && (
            <div className="recent-files">
              <div className="recent-label">recent files</div>
              {recent.slice(0, 9).map((rf, i) => (
                <button
                  key={`${rf.name}-${rf.openedAt}`}
                  className="recent-item"
                  onClick={() => reopenRecent(rf)}
                  title={rf.path ?? rf.name}
                >
                  <kbd className="recent-kbd">⌘{i + 1}</kbd>
                  <span className="recent-name">{rf.name}</span>
                  {rf.path && (
                    <span className="recent-path">{rf.path.replace(/\/[^/]+$/, '')}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── Document view ──────────────────────────────────────────── */
        <div className="app">
          <header className="app-header">
            <span className="header-logo">md render</span>
            <span className="header-filename">{file.name}</span>
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
            <button className="header-btn theme-toggle" onClick={() => setSettingsOpen(s => !s)} title="Settings (⌘,)">
              <GearIcon />
            </button>
            <button className="header-btn" onClick={() => setFindOpen(s => !s)} title="Find (⌘F)">find</button>
            <button className="header-btn" onClick={() => window.print()} title="Print (⌘P)">print</button>
            <button className="header-btn" onClick={openPicker}>open file</button>
          </header>

          <FindBar open={findOpen} onClose={() => setFindOpen(false)} />

          <div className={`app-body${splitView ? ' split-view' : ''}`}>
            {!splitView && (
              <>
                <Sidebar headings={headings} width={sidebarWidth} />
                <div
                  className="resize-handle"
                  onMouseDown={handleResizeStart}
                  title="Drag to resize"
                />
              </>
            )}

            <main
              className="app-main"
              style={splitView ? undefined : undefined}
            >
              <MDXRenderer
                content={file.content}
                fileName={file.name}
                onHeadings={setHeadings}
              />
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
    </>
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
