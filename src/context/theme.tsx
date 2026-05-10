import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { ShikiTheme } from '../utils/shiki'

export type ThemeName = 'tokyo-night' | 'one-dark-pro' | 'github-light' | 'one-light'

interface ThemeDef {
  name: ThemeName
  label: string
  mode: 'dark' | 'light'
  shikiTheme: ShikiTheme
}

export const THEMES: ThemeDef[] = [
  { name: 'tokyo-night',  label: 'Tokyo Night',   mode: 'dark',  shikiTheme: 'tokyo-night'  },
  { name: 'one-dark-pro', label: 'Atom One Dark',  mode: 'dark',  shikiTheme: 'one-dark-pro' },
  { name: 'github-light', label: 'GitHub Light',   mode: 'light', shikiTheme: 'github-light' },
  { name: 'one-light',    label: 'Atom One Light', mode: 'light', shikiTheme: 'one-light'    },
]

interface ThemeCtx {
  themeName: ThemeName
  mode: 'dark' | 'light'
  shikiTheme: ShikiTheme
  setTheme: (name: ThemeName) => void
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  themeName: 'tokyo-night',
  mode: 'dark',
  shikiTheme: 'tokyo-night',
  setTheme: () => {},
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    try {
      const saved = localStorage.getItem('theme') as ThemeName
      return THEMES.find(t => t.name === saved) ? saved : 'tokyo-night'
    } catch { return 'tokyo-night' }
  })

  const def = THEMES.find(t => t.name === themeName)!

  useEffect(() => {
    document.documentElement.dataset.theme = def.mode
    localStorage.setItem('theme', themeName)
  }, [themeName, def.mode])

  const value: ThemeCtx = {
    themeName,
    mode: def.mode,
    shikiTheme: def.shikiTheme,
    setTheme: setThemeName,
    toggle: () => {
      const nextMode = def.mode === 'dark' ? 'light' : 'dark'
      const next = THEMES.find(t => t.mode === nextMode)
      if (next) setThemeName(next.name)
    },
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
