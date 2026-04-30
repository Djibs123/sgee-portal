export type PageId = 'dashboard' | 'general' | 'cursus' | 'paiements' | 'rib' | 'documents';

export type StudentDocumentStatus =
  | 'REQUIRED'
  | 'PENDING'
  | 'VALIDATED'
  | 'REJECTED'

export type StudentRibStatus = 'PENDING' | 'VALIDATED' | 'REJECTED'
