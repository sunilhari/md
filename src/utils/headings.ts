import type { ReactNode } from 'react'
import React from 'react'

export interface Heading {
  level: number
  text: string
  id: string
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`*_[\](){}#!@$%^&+=|\\<>?]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function childrenToText(children: ReactNode): string {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(childrenToText).join('')
  if (React.isValidElement(children)) {
    return childrenToText((children.props as { children?: ReactNode }).children)
  }
  return ''
}

export function extractHeadings(source: string): Heading[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm
  const headings: Heading[] = []
  let match
  while ((match = headingRegex.exec(source)) !== null) {
    const raw = match[2].replace(/[*_`[\]()]/g, '').trim()
    headings.push({
      level: match[1].length,
      text: raw,
      id: slugify(raw),
    })
  }
  return headings
}
