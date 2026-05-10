import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

type Mode = 'dark' | 'light'

interface ThemeCtx {
  mode: Mode
  shikiTheme: 'tokyo-night' | 'github-light'
  toggle: () => void
}

const ThemeContext = createContext<ThemeCtx>({
  mode: 'dark',
  shikiTheme: 'tokyo-night',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => {
    try { return (localStorage.getItem('theme') as Mode) || 'dark' }
    catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    localStorage.setItem('theme', mode)
  }, [mode])

  const value: ThemeCtx = {
    mode,
    shikiTheme: mode === 'dark' ? 'tokyo-night' : 'github-light',
    toggle: () => setMode(m => m === 'dark' ? 'light' : 'dark'),
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
