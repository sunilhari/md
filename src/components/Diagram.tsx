import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { childrenToText } from '../utils/headings'
import { useTheme } from '../context/theme'

let mermaidMod: typeof import('mermaid')['default'] | null = null

async function getMermaid() {
  if (!mermaidMod) {
    const m = await import('mermaid')
    mermaidMod = m.default
  }
  return mermaidMod
}

function themeConfig(mode: 'dark' | 'light') {
  if (mode === 'dark') {
    return {
      theme: 'base' as const,
      darkMode: true,
      themeVariables: {
        background:          '#1a1b26',
        mainBkg:             '#1f2335',
        nodeBorder:          '#292e42',
        clusterBkg:          '#16161e',
        titleColor:          '#c0caf5',
        edgeLabelBackground: '#1f2335',
        lineColor:           '#7aa2f7',
        primaryColor:        '#1f2335',
        primaryTextColor:    '#c0caf5',
        primaryBorderColor:  '#292e42',
        secondaryColor:      '#16161e',
        tertiaryColor:       '#13141f',
        textColor:           '#a9b1d6',
        labelTextColor:      '#c0caf5',
        actorBkg:            '#1f2335',
        actorBorder:         '#292e42',
        actorTextColor:      '#c0caf5',
        signalColor:         '#7aa2f7',
        signalTextColor:     '#c0caf5',
      },
    }
  }
  return {
    theme: 'base' as const,
    darkMode: false,
    themeVariables: {
      background:          '#f7f7fb',
      mainBkg:             '#ffffff',
      nodeBorder:          '#dde0eb',
      clusterBkg:          '#f0f0f5',
      titleColor:          '#1a1d2e',
      edgeLabelBackground: '#ffffff',
      lineColor:           '#2f5de1',
      primaryColor:        '#f0f0f5',
      primaryTextColor:    '#1a1d2e',
      primaryBorderColor:  '#dde0eb',
      secondaryColor:      '#e8e8f0',
      tertiaryColor:       '#f6f8fa',
      textColor:           '#3d4260',
      labelTextColor:      '#1a1d2e',
      actorBkg:            '#ffffff',
      actorBorder:         '#dde0eb',
      actorTextColor:      '#1a1d2e',
      signalColor:         '#2f5de1',
      signalTextColor:     '#1a1d2e',
    },
  }
}

let idSeq = 0

interface Props {
  type?: string
  children?: ReactNode
  code?: string
}

export function Diagram({ type: _type = 'mermaid', children, code: codeProp }: Props) {
  const ref              = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { mode } = useTheme()

  const code = (codeProp ?? childrenToText(children)).trim()

  useEffect(() => {
    if (!code) return
    let cancelled = false
    setError(null)
    setLoading(true)

    const id = `mdx-diagram-${++idSeq}`

    getMermaid()
      .then(mermaid => {
        mermaid.initialize({ startOnLoad: false, ...themeConfig(mode) })
        return mermaid.render(id, code)
      })
      .then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(String((err as Error).message ?? err))
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [code, mode])

  if (error) {
    return (
      <div className="diagram-error">
        <strong>Diagram error</strong>
        <pre>{error}</pre>
      </div>
    )
  }

  return (
    <div className="diagram-wrapper">
      {loading && <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }}>loading diagram…</span>}
      <div ref={ref} />
    </div>
  )
}
