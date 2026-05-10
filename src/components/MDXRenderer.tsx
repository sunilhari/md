import React, { useEffect, useState, Component, useMemo } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { evaluate } from '@mdx-js/mdx'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import ReactMarkdown from 'react-markdown'
import { createComponentsMap } from './index'
import { extractHeadings } from '../utils/headings'
import type { Heading } from '../utils/headings'

interface Props {
  content: string
  fileName: string
  onHeadings: (h: Heading[]) => void
}

type MDXContent = React.ComponentType<{ components?: Record<string, React.ComponentType> }>

// ── Error boundary ─────────────────────────────────────────────────────────

class RenderBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null }

  static getDerivedStateFromError(e: Error) {
    return { err: e.message }
  }

  componentDidCatch(_e: Error, _i: ErrorInfo) { /* err captured in state */ }

  render() {
    if (this.state.err) {
      return (
        <div className="render-error">
          <strong>Render error</strong>
          <pre>{this.state.err}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

// ── react-markdown HTML overrides (for .md fallback) ──────────────────────
// Extracted from components map so react-markdown gets compatible types

function FallbackMarkdown({ content }: { content: string }) {
  const components = useMemo(() => createComponentsMap(), [])
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={components as Parameters<typeof ReactMarkdown>[0]['components']}
    >
      {content}
    </ReactMarkdown>
  )
}

// ── Scan source for PascalCase JSX component names ─────────────────────────

function scanComponentNames(source: string): string[] {
  const seen = new Set<string>()
  for (const [, name] of source.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
    seen.add(name)
  }
  return [...seen]
}

// ── Main renderer ──────────────────────────────────────────────────────────

export function MDXRenderer({ content, fileName, onHeadings }: Props) {
  const [MDXComp, setMDXComp]         = useState<MDXContent | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [useFallback, setUseFallback]   = useState(false)
  const [extraNames, setExtraNames]     = useState<string[]>([])

  const isMdx = fileName.endsWith('.mdx')
  const components = useMemo(() => createComponentsMap(extraNames), [extraNames])

  useEffect(() => {
    onHeadings(extractHeadings(content))
  }, [content, onHeadings])

  useEffect(() => {
    let cancelled = false
    setMDXComp(null)
    setCompileError(null)
    setUseFallback(false)
    setExtraNames(scanComponentNames(content))

    evaluate(content, {
      Fragment,
      jsx:  jsx  as Parameters<typeof evaluate>[1]['jsx'],
      jsxs: jsxs as Parameters<typeof evaluate>[1]['jsxs'],
      remarkPlugins: [remarkGfm],
    })
      .then(({ default: Comp }) => {
        if (!cancelled) setMDXComp(() => Comp as MDXContent)
      })
      .catch(err => {
        if (cancelled) return
        if (!isMdx) {
          setUseFallback(true)
        } else {
          setCompileError(String((err as Error).message ?? err))
        }
      })

    return () => { cancelled = true }
  }, [content, isMdx])

  if (compileError) {
    return (
      <div className="render-error">
        <strong>MDX compile error</strong>
        <pre>{compileError}</pre>
      </div>
    )
  }

  if (useFallback) {
    return (
      <article className="mdx-content">
        <FallbackMarkdown content={content} />
      </article>
    )
  }

  if (!MDXComp) {
    return <div className="render-loading">Rendering…</div>
  }

  return (
    <article className="mdx-content">
      <RenderBoundary>
        <MDXComp components={components as Record<string, React.ComponentType>} />
      </RenderBoundary>
    </article>
  )
}
