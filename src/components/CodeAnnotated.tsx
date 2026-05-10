import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { ThemedToken } from 'shiki'

type PlainToken = Pick<ThemedToken, 'content' | 'color'>
import { getHighlighter, normLang } from '../utils/shiki'
import { useTheme } from '../context/theme'

interface Annotation {
  line: number
  comment: string
}

interface Props {
  lang?: string
  annotations?: Annotation[]
  children?: ReactNode
}

export function CodeAnnotated({ lang, annotations = [], children }: Props) {
  const code = (typeof children === 'string' ? children : String(children ?? '')).trim()
  const safeLang = normLang(lang)
  const { shikiTheme } = useTheme()
  const [lines, setLines] = useState<PlainToken[][] | null>(null)
  const [fg, setFg] = useState('var(--text2)')

  const annotationMap = new Map(annotations.map(a => [a.line, a.comment]))

  useEffect(() => {
    let cancelled = false
    getHighlighter().then(hl => {
      if (cancelled) return
      try {
        const result = hl.codeToTokens(code, { lang: safeLang, theme: shikiTheme })
        setLines(result.tokens as PlainToken[][])
        setFg(result.fg ?? 'var(--text2)')
      } catch {
        setLines(null)
      }
    })
    return () => { cancelled = true }
  }, [code, safeLang, shikiTheme])

  return (
    <div className="code-annotated">
      {lang && <div className="ca-header">{lang}</div>}
      <div className="ca-body" style={{ color: fg }}>
        {(lines ?? code.split('\n').map(l => [{ content: l, color: fg }] as PlainToken[])).map((lineTokens, i) => {
          const lineNum = i + 1
          const annotation = annotationMap.get(lineNum)
          return (
            <div key={i} className={`ca-line ${annotation ? 'annotated' : ''}`}>
              <span className="ca-lineno">{lineNum}</span>
              <span className="ca-code">
                {lineTokens.map((tok, ti) => (
                  <span key={ti} style={tok.color ? { color: tok.color } : undefined}>
                    {tok.content}
                  </span>
                ))}
              </span>
              {annotation && (
                <span className="ca-annotation">{annotation}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
