import type { RequestHistoryEntry } from '../../lib/api'
import { formatDateTime } from '../../lib/format'

type Perspective = 'owner' | 'admin'

const ACTOR_LABELS: Record<Perspective, Record<RequestHistoryEntry['actorType'], string>> = {
  owner: { STUDENT: 'vous', APPLICANT: 'vous', ADMIN: 'le SGEE', SYSTEM: 'le système' },
  admin: { STUDENT: 'le boursier', APPLICANT: 'le candidat', ADMIN: 'un agent', SYSTEM: 'le système' },
}

/** Historique chronologique de la demande (liste ordonnée), du point de vue du demandeur ou de l'instruction. */
export function RequestTimeline({
  history,
  perspective = 'owner',
}: {
  history: RequestHistoryEntry[]
  perspective?: Perspective
}) {
  return (
    <ol className="timeline" aria-label="Historique de la demande">
      {history.map((entry, index) => (
        <li key={`${entry.createdAt}-${index}`}>
          <p className="timeline-title">
            {entry.toStatusLabel}
            <span className="timeline-actor"> – par {ACTOR_LABELS[perspective][entry.actorType]}</span>
          </p>
          <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
          {entry.comment && <p className="timeline-comment">{entry.comment}</p>}
        </li>
      ))}
    </ol>
  )
}
