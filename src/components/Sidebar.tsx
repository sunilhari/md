import { useEffect, useState } from 'react'
import type { Heading } from '../utils/headings'

interface Props {
  headings: Heading[]
}

export function Sidebar({ headings }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => {
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      entries => {
        // find the topmost intersecting heading
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-8% 0px -82% 0px' },
    )

    const els = headings.map(h => document.getElementById(h.id)).filter(Boolean)
    els.forEach(el => observer.observe(el!))
    return () => observer.disconnect()
  }, [headings])

  return (
    <aside className="sidebar">
      {headings.length > 0 && (
        <>
          <div className="sidebar-label">on this page</div>
          <nav className="toc">
            {headings.map(h => (
              <a
                key={h.id}
                href={`#${h.id}`}
                data-level={h.level}
                className={`toc-link ${activeId === h.id ? 'active' : ''}`}
                style={{ paddingLeft: `${(h.level - 1) * 12 + 16}px` }}
                onClick={e => {
                  e.preventDefault()
                  const el = document.getElementById(h.id)
                  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  setActiveId(h.id)
                }}
              >
                {h.text}
              </a>
            ))}
          </nav>
        </>
      )}
    </aside>
  )
}
