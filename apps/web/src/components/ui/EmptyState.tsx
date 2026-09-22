import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-title">{title}</p>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}
