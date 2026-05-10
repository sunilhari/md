import { useCallback, useRef, useState } from 'react'

interface Props {
  onFile: (content: string, name: string) => void
}

export function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const readFile = useCallback((file: File) => {
    if (!file.name.match(/\.(md|mdx)$/i)) {
      setError('Only .md and .mdx files are supported.')
      return
    }
    setError(null)
    const reader = new FileReader()
    reader.onload = e => onFile(e.target?.result as string, file.name)
    reader.readAsText(file)
  }, [onFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }, [readFile])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) readFile(file)
    e.target.value = ''
  }, [readFile])

  return (
    <div className="dropzone-wrapper">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        <svg className="dropzone-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="6" width="28" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
          <path d="M28 6v10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M16 28h16M24 20v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="dropzone-title">Drop a .md or .mdx file</p>
        <p className="dropzone-sub">or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".md,.mdx"
          className="dropzone-input"
          onChange={handleChange}
        />
      </div>
      {error && <p className="dropzone-error">{error}</p>}
    </div>
  )
}
