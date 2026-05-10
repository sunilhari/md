import { createContext, useContext } from 'react'

/** Absolute directory of the currently-open file (set only in Tauri). */
export const FilePathContext = createContext<string | null>(null)
export const useFilePath = () => useContext(FilePathContext)
