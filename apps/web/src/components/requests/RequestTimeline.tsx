import type { RequestHistoryEntry } from '../../lib/api'
import { formatDateTime } from '../../lib/format'

const ACTOR_LABELS: Record<RequestHistoryEntry['actorType'], string> = {
  STUDENT: 'vous',
  APPLICANT: 'vous',
  ADMIN: 'le SGEE',
  SYSTEM: 'le système',
}

/** Historique chronologique de la demande (liste ordonnée). */
export function RequestTimeline({ history }: { history: RequestHistoryEntry[] }) {
  return (
    <ol className="timeline" aria-label="Historique de la demande">
      {history.map((entry, index) => (
        <li key={`${entry.createdAt}-${index}`}>
          <p className="timeline-title">
            {entry.toStatusLabel}
            <span className="timeline-actor"> – par {ACTOR_LABELS[entry.actorType]}</span>
          </p>
          <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
          {entry.comment && <p className="timeline-comment">{entry.comment}</p>}
        </li>
      ))}
    </ol>
  )
}
