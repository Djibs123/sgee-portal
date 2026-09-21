import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuditActor } from '../audit/audit.service';
import type { AuthenticatedRequest } from './auth.types';

export const CurrentStudent = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return request.auth;
  },
);

/** Étudiant connecté sous forme d'acteur d'audit (identifiant + IP). */
export const StudentActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditActor => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return {
      type: 'STUDENT',
      id: request.auth?.studentId ?? null,
      ip: request.ip ?? null,
    };
  },
);
