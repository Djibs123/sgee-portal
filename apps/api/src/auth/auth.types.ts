import type { Request } from 'express';

export type AuthTokenPayload = {
  sub: string;
  studentId: string;
  codeEtudiant: string;
};

export type AuthenticatedRequest = Request & {
  auth?: AuthTokenPayload;
};
