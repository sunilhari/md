import { createHighlighter, type Highlighter } from 'shiki'

export const SHIKI_LANGS = [
  'javascript', 'typescript', 'tsx', 'jsx',
  'python', 'bash', 'sh', 'json', 'yaml', 'toml',
  'css', 'html', 'markdown', 'mdx',
  'rust', 'go', 'sql', 'text', 'diff', 'dockerfile',
] as const

export type ShikiLang  = (typeof SHIKI_LANGS)[number]
export type ShikiTheme = 'tokyo-night' | 'github-light'

let _promise: Promise<Highlighter> | null = null

export function getHighlighter(): Promise<Highlighter> {
  if (!_promise) {
    _promise = createHighlighter({
      themes: ['tokyo-night', 'github-light'],
      langs: [...SHIKI_LANGS],
    })
  }
  return _promise
}

export function normLang(lang: string | undefined): ShikiLang {
  return (SHIKI_LANGS as readonly string[]).includes(lang ?? '')
    ? (lang as ShikiLang)
    : 'text'
}
