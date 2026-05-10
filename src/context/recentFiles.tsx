import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface RecentFile {
  name: string
  path?: string   // set when opened via Tauri native picker
  openedAt: number
}

const STORAGE_KEY = 'md-render-recent'
const MAX = 10

function load(): RecentFile[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') }
  catch { return [] }
}
function persist(files: RecentFile[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(files)) } catch {}
}

interface Ctx {
  recent: RecentFile[]
  push: (f: RecentFile) => void
  clear: () => void
}

const Ctx = createContext<Ctx>({ recent: [], push: () => {}, clear: () => {} })

export function RecentFilesProvider({ children }: { children: ReactNode }) {
  const [recent, setRecent] = useState<RecentFile[]>(load)

  const push = useCallback((f: RecentFile) => {
    setRecent(prev => {
      const next = [
        f,
        ...prev.filter(r => !(r.path ? r.path === f.path : r.name === f.name)),
      ].slice(0, MAX)
      persist(next)
      return next
    })
  }, [])

  const clear = useCallback(() => { setRecent([]); persist([]) }, [])

  return <Ctx.Provider value={{ recent, push, clear }}>{children}</Ctx.Provider>
}

export const useRecentFiles = () => useContext(Ctx)
