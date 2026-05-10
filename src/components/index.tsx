import React, { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { Diagram }       from './Diagram'
import { Tabs }          from './Tabs'
import { Callout }       from './Callout'
import { DataTable }     from './DataTable'
import { CodeAnnotated } from './CodeAnnotated'
import { ExportButton }  from './ExportButton'
import { Slider }        from './Slider'
import { Timeline }      from './Timeline'
import { DiffView }      from './DiffView'
import { CodeBlock }     from './CodeBlock'
import { childrenToText, slugify } from '../utils/headings'
import { useFilePath }   from '../context/filePath'

const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

// ── MDX custom components ─────────────────────────────────────────────────
const CUSTOM: Record<string, React.ComponentType<any>> = {
  Diagram, Tabs, Callout, DataTable,
  CodeAnnotated, ExportButton, Slider, Timeline, DiffView,
}

// ── HTML element overrides ────────────────────────────────────────────────

function makeHeading(level: 1|2|3|4|5|6) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements
  return function Heading({ children }: { children?: ReactNode }) {
    const id = slugify(childrenToText(children))
    return React.createElement(Tag, { id }, children)
  }
}

function Pre({ children }: { children?: ReactNode }) {
  // Suppress the default <pre> wrapper — CodeBlock renders its own shell
  return <>{children}</>
}

function Code({ className, children }: { className?: string; children?: ReactNode }) {
  const lang = className?.replace('language-', '')
  const code = String(children ?? '').replace(/\n$/, '')
  if (lang) return <CodeBlock lang={lang}>{code}</CodeBlock>
  return <code className="inline-code">{children}</code>
}

// ── Local image resolution ────────────────────────────────────────────────
function Img({ src, alt, ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const dir = useFilePath()
  const [resolvedSrc, setResolvedSrc] = useState(src)

  useEffect(() => {
    if (!src || !dir || !isTauri || /^(https?:|data:)/.test(src)) {
      setResolvedSrc(src)
      return
    }
    ;(async () => {
      try {
        const { convertFileSrc } = await import('@tauri-apps/api/core')
        const abs = src.startsWith('/') ? src : `${dir}/${src}`.replace(/\/\//g, '/')
        setResolvedSrc(convertFileSrc(abs))
      } catch { setResolvedSrc(src) }
    })()
  }, [src, dir])

  return <img src={resolvedSrc} alt={alt} {...rest} />
}

// ── Interactive task-list checkboxes ──────────────────────────────────────
function TaskInput({
  type,
  defaultChecked,
  checked: _checked,
  disabled: _disabled,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const [on, setOn] = useState(defaultChecked ?? _checked ?? false)
  if (type !== 'checkbox') return <input type={type} {...rest} />
  return (
    <input
      type="checkbox"
      checked={on}
      onChange={e => setOn(e.target.checked)}
      className="task-checkbox"
    />
  )
}

const HTML_OVERRIDES: Record<string, React.ComponentType<any>> = {
  h1: makeHeading(1), h2: makeHeading(2), h3: makeHeading(3),
  h4: makeHeading(4), h5: makeHeading(5), h6: makeHeading(6),
  pre: Pre,
  code: Code,
  img: Img,
  input: TaskInput,
}

// ── Unknown-component placeholder ─────────────────────────────────────────

function safeStringify(obj: Record<string, unknown>): string {
  const seen = new WeakSet()
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'function') return undefined        // skip functions
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return undefined                  // skip circulars
      seen.add(value)
    }
    return value
  }, 2)
}

function UnknownComponent({
  componentName,
  children,
  components: _components, // MDX always passes this — skip it
  ...rest
}: {
  componentName: string
  children?: ReactNode
  components?: unknown
  [k: string]: unknown
}) {
  const serialized = safeStringify(rest)
  const hasProps = serialized !== '{}'
  return (
    <div className="unknown-component">
      <span className="unknown-tag">&lt;{componentName}&gt;</span>
      {hasProps && (
        <pre className="unknown-props">{serialized}</pre>
      )}
      {children && <div className="unknown-body">{children}</div>}
    </div>
  )
}

// ── Component registry ────────────────────────────────────────────────────
// MDX spreads `components` into a plain object at runtime, so a Proxy getter
// for unknown names is lost. Instead, callers pass `extraNames` (scanned from
// the source) so every referenced component is pre-registered as a placeholder.

const ALL = { ...CUSTOM, ...HTML_OVERRIDES }

export function createComponentsMap(
  extraNames: string[] = [],
  external: Record<string, React.ComponentType<any>> = {},
): Record<string, React.ComponentType<any>> {
  // External components override built-ins; built-ins override placeholders
  const map: Record<string, React.ComponentType<any>> = { ...ALL, ...external }
  for (const name of extraNames) {
    if (name in map) continue
    const _name = name
    map[name] = function Placeholder({
      children,
      components: _components,
      ...rest
    }: { children?: ReactNode; components?: unknown; [k: string]: unknown }) {
      return React.createElement(UnknownComponent, { componentName: _name, ...rest }, children)
    }
  }
  return map
}
