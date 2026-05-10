import { useState } from 'react'

type Format = 'json' | 'md' | 'prompt'

interface Props {
  format?: Format
  data?: unknown
  label?: string
}

function serialize(format: Format, data: unknown): string {
  if (format === 'json') {
    return JSON.stringify(data, null, 2)
  }
  if (format === 'md') {
    return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  }
  // prompt — wrap for pasting into Claude
  const inner = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
  return `\`\`\`\n${inner}\n\`\`\``
}

export function ExportButton({ format = 'json', data, label }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(serialize(format, data ?? ''))
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  const defaultLabel = `Copy ${format.toUpperCase()}`
  const displayLabel =
    state === 'copied' ? '✓ Copied' :
    state === 'error'  ? '✗ Failed' :
    (label ?? defaultLabel)

  return (
    <div className="export-btn-wrapper">
      <button
        className={`export-btn ${state === 'copied' ? 'copied' : ''}`}
        onClick={handleClick}
      >
        {state === 'idle' && (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="5" y="5" width="9" height="9" rx="1.5" />
            <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" />
          </svg>
        )}
        {displayLabel}
      </button>
    </div>
  )
}
