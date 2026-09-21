import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '../generated/prisma/client';

export const ROLES_KEY = 'adminRoles';

/**
 * Restreint une route ou un contrôleur admin à certains rôles.
 * `SUPER_ADMIN` a toujours accès. Sans décorateur : tout admin authentifié.
 */
export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_KEY, roles);
