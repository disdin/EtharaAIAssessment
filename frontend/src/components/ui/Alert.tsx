import type { HTMLAttributes } from 'react'

import './ui.css'

type Tone = 'error' | 'success' | 'info'

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  tone: Tone
}

export function Alert({ tone, className = '', children, ...props }: AlertProps) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`hrms-alert hrms-alert--${tone} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
