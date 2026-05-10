import React, { useEffect, useState, Component, useMemo, useRef } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { evaluate } from '@mdx-js/mdx'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import ReactMarkdown from 'react-markdown'
import { createComponentsMap } from './index'
import { extractHeadings } from '../utils/headings'
import type { Heading } from '../utils/headings'
import { parseFrontmatter, stripImports } from '../utils/frontmatter'

interface Props {
  content: string
  fileName: string
  onHeadings: (h: Heading[]) => void
}

type MDXContent = React.ComponentType<{ components?: Record<string, React.ComponentType> }>

// ── Error boundary ─────────────────────────────────────────────────────────

class RenderBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  componentDidCatch(_e: Error, _i: ErrorInfo) {}
  render() {
    if (this.state.err) return <ErrorView error={this.state.err} source="" />
    return this.props.children
  }
}

// ── Rich compile error display ─────────────────────────────────────────────

function parseErrorLoc(msg: string): { line: number; col: number } | null {
  const m = msg.match(/(\d+):(\d+)/)
  return m ? { line: +m[1], col: +m[2] } : null
}

function ErrorView({ error, source }: { error: string; source: string }) {
  const loc = parseErrorLoc(error)
  const lines = source.split('\n')

  if (!loc || lines.length === 0) {
    return (
      <div className="render-error">
        <strong>MDX compile error</strong>
        <pre>{error}</pre>
      </div>
    )
  }

  const { line, col } = loc
  const start = Math.max(0, line - 3)
  const end   = Math.min(lines.length - 1, line + 1)
  const snippet = lines.slice(start, end + 1)

  return (
    <div className="render-error rich-error">
      <div className="error-header">
        <strong>MDX compile error</strong>
        <span className="error-loc">line {line} · col {col}</span>
      </div>
      <div className="error-snippet">
        {snippet.map((l, i) => {
          const n = start + i + 1
          const isErr = n === line
          return (
            <div key={n} className={`error-line${isErr ? ' error-line-active' : ''}`}>
              <span className="error-lineno">{n}</span>
              <span className="error-linetext">{l || ' '}</span>
              {isErr && (
                <span className="error-caret" style={{ marginLeft: `${col + 4}ch` }}>^</span>
              )}
            </div>
          )
        })}
      </div>
      <pre className="error-message">{error}</pre>
    </div>
  )
}

// ── react-markdown fallback ────────────────────────────────────────────────

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
  for (const [, name] of source.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) seen.add(name)
  return [...seen]
}

// ── Import external components from esm.sh ────────────────────────────────

async function loadExternalComponents(
  spec: Record<string, string>,
): Promise<{ loaded: Record<string, React.ComponentType<any>>; errors: string[] }> {
  const loaded: Record<string, React.ComponentType<any>> = {}
  const errors: string[] = []

  await Promise.all(
    Object.entries(spec).map(async ([name, pkg]) => {
      try {
        const url = `https://esm.sh/${pkg}`
        const mod = await import(/* @vite-ignore */ url) as Record<string, unknown>
        // Try: named export matching component name, then default
        const comp = (mod[name] ?? mod['default']) as React.ComponentType<any> | undefined
        if (typeof comp === 'function') {
          loaded[name] = comp
        } else {
          errors.push(`${name}: no matching export in ${pkg}`)
        }
      } catch (e) {
        errors.push(`${name}: failed to load ${pkg} — ${(e as Error).message}`)
      }
    }),
  )

  return { loaded, errors }
}

// ── Main renderer ──────────────────────────────────────────────────────────

export function MDXRenderer({ content, fileName, onHeadings }: Props) {
  const [MDXComp, setMDXComp]               = useState<MDXContent | null>(null)
  const [compileError, setCompileError]     = useState<string | null>(null)
  const [useFallback, setUseFallback]       = useState(false)
  const [extraNames, setExtraNames]         = useState<string[]>([])
  const [externalComps, setExternalComps]   = useState<Record<string, React.ComponentType<any>>>({})
  const [externalBanner, setExternalBanner] = useState<string[]>([])
  const [loadingExt, setLoadingExt]         = useState(false)
  // Track stripped source for error display
  const strippedRef = useRef('')

  const isMdx = fileName.endsWith('.mdx')
  const components = useMemo(
    () => createComponentsMap(extraNames, externalComps),
    [extraNames, externalComps],
  )

  // Extract headings from raw source
  useEffect(() => {
    onHeadings(extractHeadings(content))
  }, [content, onHeadings])

  // Scroll to URL hash after headings load
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash) return
    const el = document.getElementById(hash)
    if (el) el.scrollIntoView({ block: 'start' })
  }, [MDXComp])

  // Compile MDX
  useEffect(() => {
    let cancelled = false
    setMDXComp(null)
    setCompileError(null)
    setUseFallback(false)

    // Parse frontmatter for external component specs
    const { components: extSpec, stripped } = parseFrontmatter(content)
    const cleaned = stripImports(stripped)
    strippedRef.current = cleaned
    setExtraNames(scanComponentNames(cleaned))

    // Load external components asynchronously
    const hasExternal = Object.keys(extSpec).length > 0
    if (hasExternal) {
      setLoadingExt(true)
      loadExternalComponents(extSpec).then(({ loaded, errors }) => {
        if (cancelled) return
        setExternalComps(loaded)
        setExternalBanner([
          ...Object.entries(extSpec).map(([n, p]) => `${n} (${p})`),
          ...errors.map(e => `⚠ ${e}`),
        ])
        setLoadingExt(false)
      })
    } else {
      setExternalComps({})
      setExternalBanner([])
    }

    evaluate(cleaned, {
      Fragment,
      jsx:  jsx  as Parameters<typeof evaluate>[1]['jsx'],
      jsxs: jsxs as Parameters<typeof evaluate>[1]['jsxs'],
      remarkPlugins: [remarkGfm, remarkMath],
      rehypePlugins: [rehypeKatex],
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
    return <ErrorView error={compileError} source={strippedRef.current} />
  }

  if (useFallback) {
    return (
      <article className="mdx-content">
        <FallbackMarkdown content={content} />
      </article>
    )
  }

  if (!MDXComp || loadingExt) {
    return <div className="render-loading">{loadingExt ? 'Loading external components…' : 'Rendering…'}</div>
  }

  return (
    <article className="mdx-content">
      {externalBanner.length > 0 && (
        <div className="import-banner">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
          <span>
            External components via <strong>esm.sh</strong>:{' '}
            {externalBanner.join(' · ')}
          </span>
        </div>
      )}
      <RenderBoundary>
        <MDXComp components={components as Record<string, React.ComponentType>} />
      </RenderBoundary>
    </article>
  )
}
