import type { RequestStatus } from '../../generated/prisma/client';

export type RequestActor = 'OWNER' | 'ADMIN';

/**
 * Machine à états d'une demande (renouvellement ou candidature).
 * OWNER = boursier ou candidat propriétaire de la demande.
 *
 *   DRAFT ──submit──▶ SUBMITTED ──start-review──▶ UNDER_REVIEW
 *                        │  ▲                        │
 *                        │  └──resubmit── INCOMPLETE ◀┘ request-info
 *                        ▼                           ▼
 *                  APPROVED / REJECTED (décision)   WITHDRAWN (retrait avant décision)
 */
const TRANSITIONS: Record<
  RequestStatus,
  Partial<Record<RequestStatus, readonly RequestActor[]>>
> = {
  DRAFT: { SUBMITTED: ['OWNER'], WITHDRAWN: ['OWNER'] },
  SUBMITTED: {
    UNDER_REVIEW: ['ADMIN'],
    INCOMPLETE: ['ADMIN'],
    APPROVED: ['ADMIN'],
    REJECTED: ['ADMIN'],
    WITHDRAWN: ['OWNER'],
  },
  UNDER_REVIEW: {
    INCOMPLETE: ['ADMIN'],
    APPROVED: ['ADMIN'],
    REJECTED: ['ADMIN'],
    WITHDRAWN: ['OWNER'],
  },
  INCOMPLETE: { SUBMITTED: ['OWNER'], WITHDRAWN: ['OWNER'] },
  APPROVED: {},
  REJECTED: {},
  WITHDRAWN: {},
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumise',
  UNDER_REVIEW: 'En cours d’instruction',
  INCOMPLETE: 'Complément demandé',
  APPROVED: 'Acceptée',
  REJECTED: 'Refusée',
  WITHDRAWN: 'Retirée',
};

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: RequestStatus,
    readonly to: RequestStatus,
  ) {
    super(
      `Transition impossible : « ${REQUEST_STATUS_LABELS[from]} » vers « ${REQUEST_STATUS_LABELS[to]} »`,
    );
  }
}

export function canTransition(
  from: RequestStatus,
  to: RequestStatus,
  actor: RequestActor,
) {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

export function assertTransition(
  from: RequestStatus,
  to: RequestStatus,
  actor: RequestActor,
) {
  if (!canTransition(from, to, actor)) {
    throw new InvalidTransitionError(from, to);
  }
}

/** Le demandeur ne peut modifier son dossier qu'en brouillon ou sur demande de complément. */
export const isEditableByOwner = (status: RequestStatus) =>
  status === 'DRAFT' || status === 'INCOMPLETE';

export const isFinal = (status: RequestStatus) =>
  Object.keys(TRANSITIONS[status]).length === 0;

/** Demandes « vivantes » : bloquent une nouvelle demande sur la même campagne. */
export const isActiveRequest = (status: RequestStatus) =>
  status !== 'WITHDRAWN';
