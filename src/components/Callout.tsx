import type { ReactNode } from 'react'

type CalloutType = 'info' | 'warn' | 'tip' | 'danger'

const ICONS: Record<CalloutType, string> = {
  info:   'ℹ',
  warn:   '⚠',
  tip:    '✦',
  danger: '✕',
}

interface Props {
  type?: CalloutType
  children?: ReactNode
}

export function Callout({ type = 'info', children }: Props) {
  const safeType: CalloutType = (['info', 'warn', 'tip', 'danger'] as const).includes(type as CalloutType)
    ? (type as CalloutType)
    : 'info'

  return (
    <div className={`callout callout-${safeType}`}>
      <span className="callout-icon" aria-hidden="true">{ICONS[safeType]}</span>
      <div className="callout-body">{children}</div>
    </div>
  )
}
