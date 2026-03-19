import type { ReactNode } from 'react'

import './ui.css'

export type EmptyStateProps = {
  title: string
  description?: string
  children?: ReactNode
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="hrms-empty">
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {children}
    </div>
  )
}
