import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

// ── Available options ─────────────────────────────────────────────────────

export const PROSE_FONTS: { label: string; value: string }[] = [
  { label: 'IBM Plex Sans', value: "'IBM Plex Sans', system-ui, sans-serif" },
  { label: 'System',        value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { label: 'Georgia',       value: "Georgia, 'Times New Roman', serif" },
  { label: 'Inter',         value: "'Inter', system-ui, sans-serif" },
]

export const CODE_FONTS: { label: string; value: string }[] = [
  { label: 'IBM Plex Mono',   value: "'IBM Plex Mono', 'Fira Code', monospace" },
  { label: 'Menlo',           value: "Menlo, Monaco, monospace" },
  { label: 'Fira Code',       value: "'Fira Code', 'Cascadia Code', monospace" },
  { label: 'JetBrains Mono',  value: "'JetBrains Mono', monospace" },
]

export const LINE_WIDTHS: { label: string; value: number }[] = [
  { label: 'Narrow',  value: 660  },
  { label: 'Normal',  value: 780  },
  { label: 'Wide',    value: 980  },
  { label: 'Full',    value: 9999 },
]

export const LINE_HEIGHTS: { label: string; value: number }[] = [
  { label: 'Compact',  value: 1.5  },
  { label: 'Normal',   value: 1.75 },
  { label: 'Relaxed',  value: 2.0  },
]

// ── Settings shape ────────────────────────────────────────────────────────

export interface Settings {
  fontSize:    number   // 12–22
  proseFont:   string   // CSS font-family value
  codeFont:    string   // CSS font-family value
  lineWidth:   number   // px (9999 = full)
  lineHeight:  number   // unitless
}

const DEFAULTS: Settings = {
  fontSize:   15,
  proseFont:  PROSE_FONTS[0].value,
  codeFont:   CODE_FONTS[0].value,
  lineWidth:  LINE_WIDTHS[1].value,
  lineHeight: LINE_HEIGHTS[1].value,
}

function load(): Settings {
  try {
    const raw = localStorage.getItem('mdx-settings')
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch { return DEFAULTS }
}

function apply(s: Settings) {
  const r = document.documentElement.style
  r.setProperty('--user-prose-size', `${s.fontSize}px`)
  r.setProperty('--user-prose-font', s.proseFont)
  r.setProperty('--user-code-font',  s.codeFont)
  r.setProperty('--user-content-width', s.lineWidth >= 9000 ? '100%' : `${s.lineWidth}px`)
  r.setProperty('--user-prose-lh',   String(s.lineHeight))
}

// ── Context ───────────────────────────────────────────────────────────────

interface Ctx {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}

const SettingsContext = createContext<Ctx>({
  settings: DEFAULTS,
  update: () => {},
})

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    apply(settings)
    try { localStorage.setItem('mdx-settings', JSON.stringify(settings)) } catch {}
  }, [settings])

  const update = (patch: Partial<Settings>) =>
    setSettings(prev => ({ ...prev, ...patch }))

  return (
    <SettingsContext.Provider value={{ settings, update }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => useContext(SettingsContext)
