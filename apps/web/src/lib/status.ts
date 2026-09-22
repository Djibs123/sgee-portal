export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

/** Correspondance statut métier → ton visuel, partagée par les pages. */
export function toneOfStatus(status: string): StatusTone {
  switch (status) {
    case 'VALIDATED':
    case 'APPROVED':
    case 'ACTIVE':
    case 'PAID':
      return 'success'
    case 'REJECTED':
    case 'CANCELLED':
      return 'danger'
    case 'REQUIRED':
    case 'INCOMPLETE':
    case 'SUSPENDED':
      return 'warning'
    case 'PENDING':
    case 'SUBMITTED':
    case 'UNDER_REVIEW':
      return 'info'
    default:
      return 'neutral'
  }
}
