import type { ReactNode } from 'react'
import type { StatusTone } from '../../lib/status'

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'validated',
  warning: 'required',
  danger: 'rejected',
  info: 'pending',
  neutral: 'neutral',
}

/** Pastille de statut : la couleur n'est jamais la seule information (texte toujours présent). */
export function StatusPill({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span className={`status-pill ${TONE_CLASS[tone]}`}>{children}</span>
}
