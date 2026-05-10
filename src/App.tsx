import { useState, useCallback, useRef, useEffect } from 'react'
import { DropZone } from './components/DropZone'
import { Sidebar } from './components/Sidebar'
import { MDXRenderer } from './components/MDXRenderer'
import { SettingsPanel } from './components/SettingsPanel'
import { ThemeProvider, useTheme } from './context/theme'
import { SettingsProvider } from './context/settings'
import type { Heading } from './utils/headings'

interface FileState { content: string; name: string }

// Tauri APIs — imported lazily so the web fallback still works
const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function tauriOpenFile(): Promise<FileState | null> {
  const { open }         = await import('@tauri-apps/plugin-dialog')
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  const path = await open({
    multiple: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'mdx'] }],
  })
  if (!path || typeof path !== 'string') return null
  const content = await readTextFile(path)
  const name    = path.split('/').pop() ?? path.split('\\').pop() ?? 'file.md'
  return { content, name }
}

// ── Theme toggle icon ─────────────────────────────────────────────────────
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

// ── Gear icon ─────────────────────────────────────────────────────────────
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
  const [file, setFile]           = useState<FileState | null>(null)
  const [headings, setHeadings]   = useState<Heading[]>([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadFile = useCallback((content: string, name: string) => {
    setHeadings([])
    setFile({ content, name })
  }, [])

  const openPicker = useCallback(async () => {
    if (isTauri) {
      const result = await tauriOpenFile()
      if (result) loadFile(result.content, result.name)
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') { e.preventDefault(); openPicker() }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); setSettingsOpen(s => !s) }
      if (e.key === 'Escape') setSettingsOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPicker])

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
        <div className="app-empty">
          <div className="app-logo-row">
            <div className="app-logo-large">
              <span className="logo-mdx">mdx</span>
              <span className="logo-browser">browser</span>
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
        </div>
      ) : (
        <div className="app">
          <header className="app-header">
            <span className="header-logo">mdx browser</span>
            <span className="header-filename">{file.name}</span>
            <ThemeToggle />
            <button className="header-btn theme-toggle" onClick={() => setSettingsOpen(s => !s)} title="Settings (⌘,)">
              <GearIcon />
            </button>
            <button className="header-btn" onClick={openPicker}>open file</button>
          </header>
          <div className="app-body">
            <Sidebar headings={headings} />
            <main className="app-main">
              <MDXRenderer
                content={file.content}
                fileName={file.name}
                onHeadings={setHeadings}
              />
            </main>
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
        <AppInner />
      </SettingsProvider>
    </ThemeProvider>
  )
}
