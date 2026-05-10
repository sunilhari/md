import { useState, Children } from 'react'
import type { ReactNode } from 'react'

interface Props {
  labels: string[]
  children?: ReactNode
}

export function Tabs({ labels, children }: Props) {
  const [active, setActive] = useState(0)
  const tabs = Children.toArray(children)

  return (
    <div className="tabs-container">
      <div className="tabs-header" role="tablist">
        {labels.map((label, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={active === i}
            className={`tab-btn ${active === i ? 'active' : ''}`}
            onClick={() => setActive(i)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="tab-content" role="tabpanel">
        {tabs[active] ?? null}
      </div>
    </div>
  )
}
