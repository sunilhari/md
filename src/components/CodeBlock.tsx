import { useEffect, useState } from 'react'
import { getHighlighter, normLang } from '../utils/shiki'
import { useTheme } from '../context/theme'

interface Props {
  children: string
  lang?: string
}

export function CodeBlock({ children, lang }: Props) {
  const [html, setHtml]     = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { shikiTheme } = useTheme()
  const code    = children.trim()
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable */ }
  }

  if (!html) {
    return (
      <div className="code-block-wrap">
        <button className="copy-btn" onClick={handleCopy} title="Copy code">
          {copied ? '✓' : 'Copy'}
        </button>
        <pre className="code-fallback"><code>{code}</code></pre>
      </div>
    )
  }

  return (
    <div className="code-block-wrap">
      <button className="copy-btn" onClick={handleCopy} title="Copy code">
        {copied ? '✓' : 'Copy'}
      </button>
      <div className="shiki-wrapper" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
