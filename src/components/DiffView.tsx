import { useEffect, useState } from 'react'
import type { ThemedToken } from 'shiki'
import { diffLines } from '../utils/diff'
import { getHighlighter, normLang } from '../utils/shiki'
import { useTheme } from '../context/theme'
import type { DiffLine } from '../utils/diff'

interface Props {
  before: string
  after: string
  lang?: string
}

type TokenMap = Map<number, ThemedToken[]>

export function DiffView({ before, after, lang }: Props) {
  const safeLang = normLang(lang)
  const { shikiTheme } = useTheme()
  const { left, right } = diffLines(before, after)

  const [beforeTokens, setBeforeTokens] = useState<TokenMap>(new Map())
  const [afterTokens, setAfterTokens]   = useState<TokenMap>(new Map())

  useEffect(() => {
    let cancelled = false
    getHighlighter().then(hl => {
      if (cancelled) return
      try {
        const bt = hl.codeToTokens(before, { lang: safeLang, theme: shikiTheme }).tokens
        const at = hl.codeToTokens(after,  { lang: safeLang, theme: shikiTheme }).tokens
        // line numbers are 1-based
        setBeforeTokens(new Map(bt.map((toks, i) => [i + 1, toks])))
        setAfterTokens(new Map(at.map((toks, i) => [i + 1, toks])))
      } catch { /* fall back to plain text */ }
    })
    return () => { cancelled = true }
  }, [before, after, safeLang, shikiTheme])

  const renderLine = (dl: DiffLine, tokenMap: TokenMap) => {
    if (dl.type === 'empty') {
      return (
        <div key="empty" className="diff-line empty">
          <span className="diff-gutter" />
          <span className="diff-sign" />
          <span className="diff-code" />
        </div>
      )
    }

    const sign = dl.type === 'removed' ? '−' : dl.type === 'added' ? '+' : ' '
    const tokens = dl.lineNum !== undefined ? tokenMap.get(dl.lineNum) : undefined

    return (
      <div className={`diff-line ${dl.type}`}>
        <span className="diff-gutter">{dl.lineNum}</span>
        <span className="diff-sign">{sign}</span>
        <span className="diff-code">
          {tokens
            ? tokens.map((tok, ti) => (
                <span key={ti} style={tok.color ? { color: tok.color } : undefined}>
                  {tok.content}
                </span>
              ))
            : dl.content}
        </span>
      </div>
    )
  }

  return (
    <div className="diff-view">
      <div className="diff-header">
        <span className="diff-col-label">before</span>
        <span className="diff-col-label">after</span>
      </div>
      <div className="diff-body">
        <div className="diff-col">
          {left.map((dl, i) => (
            <div key={i}>{renderLine(dl, beforeTokens)}</div>
          ))}
        </div>
        <div className="diff-col">
          {right.map((dl, i) => (
            <div key={i}>{renderLine(dl, afterTokens)}</div>
          ))}
        </div>
      </div>
    </div>
  )
}
