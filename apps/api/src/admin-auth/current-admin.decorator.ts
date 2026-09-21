import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuditActor } from '../audit/audit.service';
import type { AuthenticatedAdminRequest } from './admin-auth.types';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedAdminRequest>();

    return request.admin;
  },
);

/** Admin connecté sous forme d'acteur d'audit (identifiant + IP). */
export const AdminActor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditActor => {
    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedAdminRequest>();

    return {
      type: 'ADMIN',
      id: request.admin?.adminId ?? null,
      ip: request.ip ?? null,
    };
  },
);
