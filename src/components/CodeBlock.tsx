import { useEffect, useState } from 'react'
import { getHighlighter, normLang } from '../utils/shiki'
import { useTheme } from '../context/theme'

interface Props {
  children: string
  lang?: string
}

export function CodeBlock({ children, lang }: Props) {
  const [html, setHtml] = useState<string | null>(null)
  const { shikiTheme } = useTheme()
  const code = children.trim()
  const safeLang = normLang(lang)

  useEffect(() => {
    let cancelled = false
    getHighlighter().then(hl => {
      if (cancelled) return
      try {
        const result = hl.codeToHtml(code, { lang: safeLang, theme: shikiTheme })
        setHtml(result)
      } catch {
        setHtml(null)
      }
    })
    return () => { cancelled = true }
  }, [code, safeLang, shikiTheme])

  if (!html) {
    return (
      <pre className="code-fallback">
        <code>{code}</code>
      </pre>
    )
  }

  return <div className="shiki-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
}
